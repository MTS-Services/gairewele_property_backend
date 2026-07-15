const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  getAllUsers,
  exportUsersCsv,
  getUserById,
  toggleSuspendUser,
  updateOwnProfile,
  getAllListings,
  exportPaymentsCsv,
  getPlanFeatures,
  updatePlanFeatures,
  createSubAdmin,
  deleteSubAdmin,
} = require("../controllers/admin.controller");

const superAdmin = [authenticate, authorize("ADMIN")];

const listingAdmin = [authenticate, authorize("ADMIN", "SUB_ADMIN_LISTING")];

router.patch("/profile", ...superAdmin, upload.single("image"), updateOwnProfile);

// Users
router.get("/users", ...superAdmin, getAllUsers);
router.get("/users/export", ...superAdmin, exportUsersCsv);
router.get("/users/:id", ...superAdmin, getUserById);
router.patch("/users/:id/toggle-suspend", ...superAdmin, toggleSuspendUser);

router.get("/listings", ...listingAdmin, getAllListings);

router.get("/payments/export", ...superAdmin, exportPaymentsCsv);

router.get("/plans", ...superAdmin, getPlanFeatures);
router.patch("/plans/:plan", ...superAdmin, updatePlanFeatures);

router.post("/sub-admins", ...superAdmin, createSubAdmin);
router.delete("/sub-admins/:id", ...superAdmin, deleteSubAdmin);

module.exports = router;
