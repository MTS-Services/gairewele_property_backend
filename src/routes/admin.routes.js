const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllUsers,
  getUserById,
  toggleSuspendUser,
  getAllListings,
} = require("../controllers/admin.controller");

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// ─── Users ────────────────────────────────────────────────────────
// GET    /api/admin/users?role=USER&search=john&page=1&pageSize=20
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
// Single toggle: suspends if active, unsuspends if suspended
router.patch("/users/:id/toggle-suspend", toggleSuspendUser);

// ─── Listings ─────────────────────────────────────────────────────
// GET /api/admin/listings?ownerRole=AGENT&approvalStatus=PENDING&search=lagos
router.get("/listings", getAllListings);

module.exports = router;
