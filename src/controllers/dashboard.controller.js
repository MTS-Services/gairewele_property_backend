const {
  getUserDashboard,
  getAgentDashboard,
  getAdminDashboard,
  getAdminSubscriptionDashboard,
} = require("../services/dashboard.service");
const { success } = require("../utils/response");

// GET /api/user/dashboard  — USER role
const userDashboard = async (req, res, next) => {
  try {
    const data = await getUserDashboard({ userId: req.user.id });
    return success(res, data, "Dashboard fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/team/dashboard  — AGENT / DEVELOPER / OWNER
const agentDashboard = async (req, res, next) => {
  try {
    const data = await getAgentDashboard({ userId: req.user.id });
    return success(res, data, "Dashboard fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/dashboard  — ADMIN only
const adminDashboard = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const data = await getAdminDashboard({ months });
    return success(res, data, "Dashboard fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/subscription-dashboard  — ADMIN only
const adminSubscriptionDashboard = async (req, res, next) => {
  try {
    const data = await getAdminSubscriptionDashboard({
      year: req.query.year,
    });
    return success(res, data, "Subscription dashboard fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  userDashboard,
  agentDashboard,
  adminDashboard,
  adminSubscriptionDashboard,
};
