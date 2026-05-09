const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  userDashboard,
  agentDashboard,
  adminDashboard,
  adminSubscriptionDashboard,
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


router.get(
  "/admin/dashboard",
  authenticate,
  authorize("ADMIN"),
  adminDashboard,
);

// GET /api/admin/subscription-dashboard  — ADMIN only 
router.get(
  "/admin/subscription-dashboard",
  authenticate,
  authorize("ADMIN"),
  adminSubscriptionDashboard,
);

module.exports = router;
