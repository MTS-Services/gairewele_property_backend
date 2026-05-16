const adminService = require("../services/admin.service");
const { success } = require("../utils/response");

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const asString = String(value);
  if (/[",\n\r]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
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

module.exports = {
  getAllUsers,
  exportUsersCsv,
  getUserById,
  toggleSuspendUser,
  getAllListings,
};
