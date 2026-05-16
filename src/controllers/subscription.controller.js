const subscriptionService = require("../services/subscription.service");
const { success } = require("../utils/response");
const PDFDocument = require("pdfkit");

const listPlans = async (_req, res, next) => {
  try {
    const plans = await subscriptionService.listPlans();
    success(res, { plans }, "Plans fetched");
  } catch (err) {
    next(err);
  }
};

const getMySubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.getMySubscription({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Subscription fetched");
  } catch (err) {
    next(err);
  }
};

const initiateSubscription = async (req, res, next) => {
  try {
    const { planKey } = req.body;
    const data = await subscriptionService.initiateSubscription({
      userId: req.user.id,
      role: req.user.role,
      email: req.user.email,
      planKey: (planKey || "").toUpperCase(),
    });
    return success(
      res,
      data,
      "Payment initialized. Open authorizationUrl to pay.",
    );
  } catch (err) {
    next(err);
  }
};

const verifySubscription = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const data = await subscriptionService.verifyAndActivate({
      userId: req.user.id,
      reference,
    });
    return success(res, data, "Subscription activated");
  } catch (err) {
    next(err);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.cancelSubscription({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Subscription cancelled. Downgraded to FREE.");
  } catch (err) {
    next(err);
  }
};

const getMyPaymentHistory = async (req, res, next) => {
  try {
    const data = await subscriptionService.getMyPaymentHistory({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Payment history fetched");
  } catch (err) {
    next(err);
  }
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const paystackCallback = async (req, res, next) => {
  try {
    const reference = req.query.reference || req.query.trxref;
    const data = await subscriptionService.paystackCallback({ reference });
    // Redirect browser to frontend success page with plan info
    const plan = data.subscription?.plan || "";
    return res.redirect(
      `${FRONTEND_URL}/subscription/success?reference=${reference}&plan=${plan}`,
    );
  } catch (err) {
    // Redirect to failure page so frontend can show error UI
    const reference = req.query.reference || req.query.trxref || "";
    return res.redirect(
      `${FRONTEND_URL}/subscription/failed?reference=${reference}`,
    );
  }
};

const exportBillingPdf = async (req, res, next) => {
  try {
    const { user, subscription, payments, totalPaid } =
      await subscriptionService.getBillingHistoryForPdf({
        userId: req.user.id,
        role: req.user.role,
      });

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `billing-history-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("Billing History", 50, 50);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Review your historical payment transactions", 50, 80);

    // ── User info ────────────────────────────────────────────────
    const infoY = 110;
    doc.fontSize(10).fillColor("#333333");
    doc.text(`Name:    ${user.fullName}`, 50, infoY);
    doc.text(`Email:   ${user.email}`, 50, infoY + 15);
    if (user.companyName)
      doc.text(`Company: ${user.companyName}`, 50, infoY + 30);
    doc.text(
      `Plan:    ${subscription.plan}  |  Status: ${subscription.isActive ? "Active" : "Inactive"}`,
      50,
      infoY + (user.companyName ? 45 : 30),
    );

    doc
      .moveTo(50, 175)
      .lineTo(545, 175)
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .stroke();

    // ── Table header ─────────────────────────────────────────────
    const tableTop = 190;
    const cols = { date: 50, plan: 170, amount: 310, status: 420, ref: 480 };

    doc
      .rect(50, tableTop - 5, 495, 22)
      .fill("#f4f4f8")
      .fillColor("#1a1a2e")
      .fontSize(9)
      .font("Helvetica-Bold");

    doc.text("DATE", cols.date, tableTop);
    doc.text("PLAN", cols.plan, tableTop);
    doc.text("AMOUNT", cols.amount, tableTop);
    doc.text("STATUS", cols.status, tableTop);
    doc.text("REFERENCE", cols.ref, tableTop);

    // ── Rows ──────────────────────────────────────────────────────
    const fmtDate = (d) =>
      d
        ? new Date(d).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

    const fmtAmount = (amount, currency) =>
      `${currency === "NGN" ? "₦" : currency}${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

    const statusColor = (s) =>
      s === "SUCCESS" ? "#16a34a" : s === "FAILED" ? "#dc2626" : "#d97706";

    let y = tableTop + 30;

    if (payments.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#999999")
        .text("No payment records found.", 50, y);
    }

    for (const p of payments) {
      if (y > 730) {
        doc.addPage();
        y = 50;
      }

      // Alternating row shade
      const rowIndex = payments.indexOf(p);
      if (rowIndex % 2 === 0) {
        doc.rect(50, y - 4, 495, 20).fill("#fafafa");
      }

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(fmtDate(p.paidAt || p.createdAt), cols.date, y, { width: 110 })
        .text(p.plan, cols.plan, y, { width: 130 })
        .text(fmtAmount(p.amount, p.currency), cols.amount, y, { width: 100 })
        .fillColor(statusColor(p.status))
        .text(p.status === "SUCCESS" ? "PAID" : p.status, cols.status, y, {
          width: 55,
        })
        .fillColor("#666666")
        .text(p.reference ? p.reference.slice(0, 18) + "…" : "—", cols.ref, y, {
          width: 115,
        });

      y += 22;
    }

    // ── Total ─────────────────────────────────────────────────────
    doc
      .moveTo(50, y + 5)
      .lineTo(545, y + 5)
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#1a1a2e")
      .text("Total Revenue (Paid)", cols.plan, y + 15)
      .fillColor("#16a34a")
      .text(
        fmtAmount(totalPaid, payments[0]?.currency || "NGN"),
        cols.amount,
        y + 15,
      );

    // ── Footer ────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .fillColor("#aaaaaa")
      .text(
        `Generated on ${new Date().toUTCString()}`,
        50,
        doc.page.height - 40,
        { align: "center" },
      );

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPlans,
  getMySubscription,
  initiateSubscription,
  verifySubscription,
  cancelSubscription,
  getMyPaymentHistory,
  exportBillingPdf,
  paystackCallback,
};
