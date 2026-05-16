const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllUsers,
  exportUsersCsv,
  getUserById,
  toggleSuspendUser,
  getAllListings,
} = require("../controllers/admin.controller");

router.use(authenticate, authorize("ADMIN"));

router.get("/users", getAllUsers);
router.get("/users/export", exportUsersCsv);
router.get("/users/:id", getUserById);
router.patch("/users/:id/toggle-suspend", toggleSuspendUser);
router.get("/listings", getAllListings);

module.exports = router;
