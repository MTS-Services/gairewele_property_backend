const adminService = require("../services/admin.service");
const { success } = require("../utils/response");

// GET /api/admin/users
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

// GET /api/admin/users/:id
const getUserById = async (req, res, next) => {
  try {
    const data = await adminService.getUserById({ userId: req.params.id });
    return success(res, data, "User fetched");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/toggle-suspend
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

// GET /api/admin/listings
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
  getUserById,
  toggleSuspendUser,
  getAllListings,
};
