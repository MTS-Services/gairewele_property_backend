const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { PLANS, SUBSCRIBABLE_ROLES, getPlan } = require("../config/plans");
const paystack = require("../utils/paystack");

// Ensure user has a subscription row. Creates a FREE one if missing.
const ensureSubscription = async (userId) => {
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { userId, plan: "FREE", isActive: true },
    });
  }
  return sub;
};

// Public: list available plans for the UI (with features + paystack info hidden).
const listPlans = () =>
  Object.values(PLANS).map((p) => ({
    key: p.key,
    name: p.name,
    price: p.price,
    currency: p.currency,
    features: p.features,
  }));

// Get the logged-in user's current subscription + plan details.
const getMySubscription = async ({ userId, role }) => {
  if (!SUBSCRIBABLE_ROLES.includes(role)) {
    throw new ApiError(
      403,
      "Only AGENT, DEVELOPER and OWNER have subscriptions",
    );
  }
  const sub = await ensureSubscription(userId);
  const plan = getPlan(sub.plan);

  // Auto-expire if endDate passed
  if (
    sub.endDate &&
    new Date(sub.endDate) < new Date() &&
    sub.plan !== "FREE"
  ) {
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: "FREE",
        endDate: null,
        isActive: true,
        paystackPlanCode: null,
      },
    });
    return { subscription: updated, plan: getPlan("FREE") };
  }

  return { subscription: sub, plan };
};

// Initialize an upgrade / new paid subscription.
// Returns Paystack authorization_url for the client to open.
const initiateSubscription = async ({ userId, role, email, planKey }) => {
  if (!SUBSCRIBABLE_ROLES.includes(role)) {
    throw new ApiError(403, "Only AGENT, DEVELOPER and OWNER can subscribe");
  }
  const plan = getPlan(planKey);
  if (!plan) throw new ApiError(400, "Invalid plan");
  if (plan.key === "FREE")
    throw new ApiError(
      400,
      "FREE plan does not require payment. Use cancel to downgrade.",
    );
  if (!plan.paystackPlanCode)
    throw new ApiError(
      500,
      `Paystack plan code not configured for ${plan.key}`,
    );

  const currentSub = await ensureSubscription(userId);

  // Block if already on an active paid plan
  if (currentSub.plan !== "FREE" && currentSub.isActive) {
    throw new ApiError(
      400,
      `You already have an active ${currentSub.plan} plan. Cancel your current plan first before subscribing to a new one.`,
    );
  }

  const reference = `sub_${userId.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  const init = await paystack.initializeTransaction({
    email,
    amount: plan.price * 100, // kobo
    reference,
    planCode: plan.paystackPlanCode,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    metadata: { userId, planKey: plan.key },
  });

  // Pre-create a PENDING payment row.
  await prisma.payment.create({
    data: {
      subscriptionId: currentSub.id,
      plan: plan.key,
      amount: plan.price,
      currency: plan.currency,
      reference,
      paystackPlanCode: plan.paystackPlanCode,
      status: "PENDING",
    },
  });

  return {
    authorizationUrl: init.data?.authorization_url,
    accessCode: init.data?.access_code,
    reference,
    plan: {
      key: plan.key,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
    },
  };
};

// Paystack browser callback — no userId, lookup by reference only.
const paystackCallback = async ({ reference }) => {
  if (!reference) throw new ApiError(400, "Missing reference");
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { subscription: true },
  });
  if (!payment) throw new ApiError(404, "Payment reference not found");
  if (payment.status === "SUCCESS") {
    const sub = await prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });
    return { subscription: sub, payment, alreadyVerified: true };
  }
  const verify = await paystack.verifyTransaction(reference);
  const data = verify?.data;
  const status = data?.status;
  if (status !== "success") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawPayload: data || null },
    });
    throw new ApiError(400, `Payment ${status || "not successful"}`);
  }
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const subscription = await prisma.subscription.update({
    where: { id: payment.subscriptionId },
    data: {
      plan: payment.plan,
      isActive: true,
      startDate: new Date(),
      endDate,
      paystackPlanCode: payment.paystackPlanCode,
      paystackCustomerCode: data?.customer?.customer_code || null,
    },
  });
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      channel: data?.channel || null,
      paidAt: data?.paid_at ? new Date(data.paid_at) : new Date(),
      rawPayload: data || null,
    },
  });
  return { subscription, payment: updatedPayment, alreadyVerified: false };
};

// Verify a transaction (called after Paystack callback or manually with reference).
const verifyAndActivate = async ({ userId, reference }) => {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { subscription: true },
  });
  if (!payment) throw new ApiError(404, "Payment reference not found");
  if (payment.subscription.userId !== userId)
    throw new ApiError(403, "This payment does not belong to you");

  // If already success, just return current state.
  if (payment.status === "SUCCESS") {
    const sub = await prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });
    return { subscription: sub, payment, alreadyVerified: true };
  }

  const verify = await paystack.verifyTransaction(reference);
  const data = verify?.data;
  const status = data?.status; // "success" | "failed" | "abandoned"

  if (status !== "success") {
    const failed = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawPayload: data || null },
    });
    throw new ApiError(400, `Payment ${status || "not successful"}`);
  }

  // Activate / upgrade subscription. End date = +30 days from now.
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const subscription = await prisma.subscription.update({
    where: { id: payment.subscriptionId },
    data: {
      plan: payment.plan,
      isActive: true,
      startDate: new Date(),
      endDate,
      paystackPlanCode: payment.paystackPlanCode,
      paystackCustomerCode: data?.customer?.customer_code || null,
    },
  });

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      channel: data?.channel || null,
      paidAt: data?.paid_at ? new Date(data.paid_at) : new Date(),
      rawPayload: data || null,
    },
  });

  return { subscription, payment: updatedPayment, alreadyVerified: false };
};

// Cancel paid plan -> downgrade to FREE immediately.
const cancelSubscription = async ({ userId, role }) => {
  if (!SUBSCRIBABLE_ROLES.includes(role)) {
    throw new ApiError(
      403,
      "Only AGENT, DEVELOPER and OWNER can manage subscriptions",
    );
  }
  const sub = await ensureSubscription(userId);
  if (sub.plan === "FREE") throw new ApiError(400, "Already on FREE plan");

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan: "FREE",
      endDate: null,
      isActive: true,
      paystackPlanCode: null,
    },
  });
  return { subscription: updated, plan: getPlan("FREE") };
};

// Admin: all payments for CSV export with optional filters.
const getPaymentsForExport = async ({ plan, status, startDate, endDate }) => {
  const VALID_PLANS = Object.keys(PLANS);
  const VALID_STATUSES = ["PENDING", "SUCCESS", "FAILED"];

  if (plan && !VALID_PLANS.includes(plan))
    throw new ApiError(400, `Invalid plan. Valid: ${VALID_PLANS.join(", ")}`);
  if (status && !VALID_STATUSES.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
    );

  const where = {};
  if (plan) where.plan = plan;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      if (isNaN(s)) throw new ApiError(400, "Invalid startDate");
      where.createdAt.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (isNaN(e)) throw new ApiError(400, "Invalid endDate");
      where.createdAt.lte = e;
    }
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      plan: true,
      amount: true,
      currency: true,
      status: true,
      channel: true,
      paidAt: true,
      createdAt: true,
      subscription: {
        select: {
          user: {
            select: {
              fullName: true,
              email: true,
              role: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  // Compute totals
  const totalRevenue = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return { payments, totalRevenue };
};

// Payment history for current user.
const getMyPaymentHistory = async ({ userId, role }) => {
  if (!SUBSCRIBABLE_ROLES.includes(role)) {
    throw new ApiError(
      403,
      "Only AGENT, DEVELOPER and OWNER have payment history",
    );
  }
  const sub = await ensureSubscription(userId);
  const payments = await prisma.payment.findMany({
    where: { subscriptionId: sub.id },
    orderBy: { createdAt: "desc" },
  });
  return { payments };
};

// Billing history for PDF export (AGENT / DEVELOPER / OWNER only).
const getBillingHistoryForPdf = async ({ userId, role }) => {
  if (!SUBSCRIBABLE_ROLES.includes(role)) {
    throw new ApiError(
      403,
      "Only AGENT, DEVELOPER and OWNER can export billing history",
    );
  }

  const sub = await ensureSubscription(userId);

  const [user, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, companyName: true, role: true },
    }),
    prisma.payment.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        plan: true,
        amount: true,
        currency: true,
        status: true,
        channel: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPaid = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return { user, subscription: sub, payments, totalPaid };
};

module.exports = {
  ensureSubscription,
  listPlans,
  getMySubscription,
  initiateSubscription,
  paystackCallback,
  verifyAndActivate,
  cancelSubscription,
  getMyPaymentHistory,
  getBillingHistoryForPdf,
  getPaymentsForExport,
};
