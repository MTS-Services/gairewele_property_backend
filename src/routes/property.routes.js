const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const { galleryUpload } = require("../middleware/propertyUpload");
const {
  createProperty,
  updateProperty,
  deletePropertyImage,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPublicProperties,
  adminGetAllProperties,
  updateApprovalStatus,
} = require("../controllers/property.controller");

// ─── Middleware helper: wrap multer so errors go to next() ───────
const upload = (req, res, next) => {
  galleryUpload(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

// ─── Admin routes (must be before /:id to avoid param conflicts) ─
// GET  /api/properties/admin/all
router.get(
  "/admin/all",
  authenticate,
  authorize("ADMIN"),
  adminGetAllProperties,
);

// PATCH /api/properties/admin/:id/status
router.patch(
  "/admin/:id/status",
  authenticate,
  authorize("ADMIN"),
  updateApprovalStatus,
);

// ─── Listing owner routes ─────────────────────────────────────────
// POST /api/properties  — create a new property
router.post(
  "/",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  upload,
  createProperty,
);

// GET /api/properties/my  — my own properties
router.get(
  "/my",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  getMyProperties,
);

// PATCH /api/properties/:id  — update own property
router.patch(
  "/:id",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  upload,
  updateProperty,
);

// DELETE /api/properties/:id/gallery/:imageId  — delete one image by UUID (owner)
router.delete(
  "/:id/gallery/:imageId",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  deletePropertyImage,
);

// DELETE /api/properties/:id  — delete (owner or admin)
router.delete(
  "/:id",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER", "ADMIN"),
  deleteProperty,
);

// ─── Public / semi-public routes ──────────────────────────────────
// GET /api/properties  — public listing (PUBLISHED + FEATURED)
router.get("/", getPublicProperties);

// GET /api/properties/:id  — single property detail
// Optional auth: owners see own pending, public sees published/featured
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return authenticate(req, res, next);
  }
  req.user = null;
  next();
};

router.get("/:id", optionalAuth, getPropertyById);

module.exports = router;
