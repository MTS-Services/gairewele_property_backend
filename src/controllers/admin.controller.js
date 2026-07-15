const adminService = require("../services/admin.service");
const subscriptionService = require("../services/subscription.service");
const planFeaturesService = require("../services/planFeatures.service");
const ApiError = require("../utils/ApiError");
const { success } = require("../utils/response");
const { fileUrl } = require("../middleware/upload");

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const asString = String(value);
  if (/[",\n\r]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
};

const paymentsToCsv = (payments, totalRevenue) => {
  const headers = [
    "id",
    "reference",
    "plan",
    "amount",
    "currency",
    "status",
    "channel",
    "paidAt",
    "userFullName",
    "userEmail",
    "userRole",
    "companyName",
    "createdAt",
  ];

  const rows = payments.map((p) =>
    [
      p.id,
      p.reference,
      p.plan,
      p.amount,
      p.currency,
      p.status,
      p.channel,
      p.paidAt?.toISOString?.() || p.paidAt || "",
      p.subscription?.user?.fullName,
      p.subscription?.user?.email,
      p.subscription?.user?.role,
      p.subscription?.user?.companyName,
      p.createdAt?.toISOString?.() || p.createdAt,
    ]
      .map(csvEscape)
      .join(","),
  );

  const summary = `# Total Revenue (SUCCESS payments): ${totalRevenue.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGN`;
  return [summary, headers.join(","), ...rows].join("\n");
};

const usersToCsv = (users) => {
  const headers = [
    "id",
    "fullName",
    "email",
    "role",
    "phoneNumber",
    "whatsappNumber",
    "companyName",
    "isSuspended",
    "createdAt",
  ];

  const rows = users.map((user) =>
    [
      user.id,
      user.fullName,
      user.email,
      user.role,
      user.phoneNumber,
      user.whatsappNumber,
      user.companyName,
      user.isSuspended,
      user.createdAt?.toISOString?.() || user.createdAt,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};

const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page, pageSize } = req.query;
    const data = await adminService.getAllUsers({
      role: role ? role.toUpperCase() : null,
      search: search || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Users fetched");
  } catch (err) {
    next(err);
  }
};

const exportUsersCsv = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const users = await adminService.getUsersForExport({
      role: role ? role.toUpperCase() : null,
      search: search || null,
    });

    const now = new Date().toISOString().slice(0, 10);
    const csv = usersToCsv(users);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin-users-${now}.csv"`,
    );

    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const data = await adminService.getUserById({ userId: req.params.id });
    return success(res, data, "User fetched");
  } catch (err) {
    next(err);
  }
};

const toggleSuspendUser = async (req, res, next) => {
  try {
    const data = await adminService.toggleSuspendUser({
      userId: req.params.id,
      adminId: req.user.id,
    });
    return success(
      res,
      data,
      data.suspended ? "User suspended" : "User unsuspended",
    );
  } catch (err) {
    next(err);
  }
};

const updateOwnProfile = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = fileUrl("image", req.file.filename);
    }

    const user = await adminService.updateOwnProfile({
      adminId: req.user.id,
      fullName: data.fullName,
      email: data.email,
      image: data.image,
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    });

    return success(res, { user }, "Admin profile updated successfully");
  } catch (err) {
    next(err);
  }
};

const getAllListings = async (req, res, next) => {
  try {
    const { ownerRole, approvalStatus, search, page, pageSize } = req.query;
    const data = await adminService.getAllListings({
      ownerRole: ownerRole ? ownerRole.toUpperCase() : null,
      approvalStatus: approvalStatus ? approvalStatus.toUpperCase() : null,
      search: search || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Listings fetched");
  } catch (err) {
    next(err);
  }
};

const exportPaymentsCsv = async (req, res, next) => {
  try {
    const { plan, status, startDate, endDate } = req.query;
    const { payments, totalRevenue } =
      await subscriptionService.getPaymentsForExport({
        plan: plan ? plan.toUpperCase() : null,
        status: status ? status.toUpperCase() : null,
        startDate: startDate || null,
        endDate: endDate || null,
      });

    const now = new Date().toISOString().slice(0, 10);
    const csv = paymentsToCsv(payments, totalRevenue);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payment-report-${now}.csv"`,
    );

    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    next(err);
  }
};

// GET /admin/plans — list all plans with current DB-backed feature limits
const getPlanFeatures = async (_req, res, next) => {
  try {
    const plans = await planFeaturesService.getAllPlanFeatures();
    success(res, { plans }, "Plan features fetched");
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/plans/:plan — update editable feature limits for a plan
const updatePlanFeatures = async (req, res, next) => {
  try {
    const { plan } = req.params;
    const { maxListings, maxImagesPerListing, videoPerListing } = req.body;

    // Parse values: front-end may send strings or nulls
    const parsed = {};
    if (maxListings !== undefined)
      parsed.maxListings =
        maxListings === null || maxListings === ""
          ? null
          : parseInt(maxListings, 10);
    if (maxImagesPerListing !== undefined)
      parsed.maxImagesPerListing = parseInt(maxImagesPerListing, 10);
    if (videoPerListing !== undefined)
      parsed.videoPerListing = parseInt(videoPerListing, 10);

    const updated = await planFeaturesService.updatePlanFeatures(
      plan.toUpperCase(),
      parsed,
    );
    success(res, { plan: updated }, "Plan features updated");
  } catch (err) {
    next(err);
  }
};

// POST /admin/sub-admins — super admin creates a sub-admin
const createSubAdmin = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
      throw new ApiError(
        400,
        "fullName, email, password and role are required",
      );
    }
    const user = await adminService.createSubAdmin({
      fullName,
      email,
      password,
      role,
    });
    success(res, { user }, "Sub-admin created", 201);
  } catch (err) {
    next(err);
  }
};

// GET /admin/sub-admins — list all sub-admins
const getSubAdmins = async (_req, res, next) => {
  try {
    const subAdmins = await adminService.getSubAdmins();
    success(res, { subAdmins }, "Sub-admins fetched");
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/sub-admins/:id — revoke sub-admin access
const deleteSubAdmin = async (req, res, next) => {
  try {
    await adminService.deleteSubAdmin({
      userId: req.params.id,
      adminId: req.user.id,
    });
    success(res, null, "Sub-admin removed");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  exportUsersCsv,
  getUserById,
  toggleSuspendUser,
  updateOwnProfile,
  getAllListings,
  exportPaymentsCsv,
  getPlanFeatures,
  updatePlanFeatures,
  createSubAdmin,
  getSubAdmins,
  deleteSubAdmin,
};
