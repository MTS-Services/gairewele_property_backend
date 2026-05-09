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
  getLocationSuggestions,
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

// GET /api/properties/location-suggestions  — Google Places autocomplete (public)
router.get("/location-suggestions", getLocationSuggestions);

// ─── Admin routes (must be before /:id to avoid param conflicts) ─
// GET  /api/properties/admin/all
router.get(
  "/admin/all",
  authenticate,
  authorize("ADMIN"),
  adminGetAllProperties,
);


router.patch(
  "/admin/:id/status",
  authenticate,
  authorize("ADMIN"),
  updateApprovalStatus,
);


router.post(
  "/",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  upload,
  createProperty,
);

router.get(
  "/my",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  getMyProperties,
);

router.patch(
  "/:id",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  upload,
  updateProperty,
);


router.delete(
  "/:id/gallery/:imageId",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  deletePropertyImage,
);

router.delete(
  "/:id",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER", "ADMIN"),
  deleteProperty,
);

router.get("/", getPublicProperties);

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
