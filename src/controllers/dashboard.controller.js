const { getUserDashboard } = require("../services/dashboard.service");
const { success } = require("../utils/response");

// GET /api/user/dashboard
const dashboard = async (req, res, next) => {
  try {
    const data = await getUserDashboard({ userId: req.user.id });
    return success(res, data, "Dashboard fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { dashboard };
