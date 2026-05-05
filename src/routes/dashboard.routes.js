const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { dashboard } = require("../controllers/dashboard.controller");

// GET /api/user/dashboard
router.get("/dashboard", authenticate, dashboard);

module.exports = router;
