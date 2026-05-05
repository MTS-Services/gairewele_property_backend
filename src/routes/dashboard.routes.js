const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  userDashboard,
  agentDashboard,
  adminDashboard,
} = require("../controllers/dashboard.controller");

// GET /api/user/dashboard  — USER only
router.get("/user/dashboard", authenticate, authorize("USER"), userDashboard);

// GET /api/team/dashboard  — AGENT / DEVELOPER / OWNER
router.get(
  "/team/dashboard",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  agentDashboard,
);

// GET /api/admin/dashboard  — ADMIN only
router.get(
  "/admin/dashboard",
  authenticate,
  authorize("ADMIN"),
  adminDashboard,
);

module.exports = router;
