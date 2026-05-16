const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllUsers,
  exportUsersCsv,
  getUserById,
  toggleSuspendUser,
  getAllListings,
  exportPaymentsCsv,
} = require("../controllers/admin.controller");

router.use(authenticate, authorize("ADMIN"));

router.get("/users", getAllUsers);
router.get("/users/export", exportUsersCsv);
router.get("/users/:id", getUserById);
router.patch("/users/:id/toggle-suspend", toggleSuspendUser);
router.get("/listings", getAllListings);
router.get("/payments/export", exportPaymentsCsv);

module.exports = router;
