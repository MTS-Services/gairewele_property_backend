const propertyService = require("../services/property.service");
const { success } = require("../utils/response");
const ApiError = require("../utils/ApiError");
const { galleryFileUrl } = require("../middleware/propertyUpload");

// POST /api/properties
// Create a property listing (AGENT / DEVELOPER / OWNER)
const createProperty = async (req, res, next) => {
  try {
    // Handle gallery image uploads
    const galleryUrls = (req.files || []).map((f) =>
      galleryFileUrl(f.filename),
    );

    // Also accept pre-uploaded URLs passed as JSON array in body
    let extraGallery = [];
    if (req.body.gallery) {
      try {
        extraGallery = Array.isArray(req.body.gallery)
          ? req.body.gallery
          : JSON.parse(req.body.gallery);
      } catch {
        extraGallery = [req.body.gallery];
      }
    }

    const property = await propertyService.createProperty({
      ownerId: req.user.id,
      ownerRole: req.user.role,
      data: {
        ...req.body,
        gallery: [...galleryUrls, ...extraGallery],
      },
    });

    return success(res, property, "Property submitted for approval", 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/properties/:id
// Update own property (owner only)
const updateProperty = async (req, res, next) => {
  try {
    const galleryUrls = (req.files || []).map((f) =>
      galleryFileUrl(f.filename),
    );

    let extraGallery = [];
    if (req.body.gallery) {
      try {
        extraGallery = Array.isArray(req.body.gallery)
          ? req.body.gallery
          : JSON.parse(req.body.gallery);
      } catch {
        extraGallery = [req.body.gallery];
      }
    }

    const data = { ...req.body };
    if (galleryUrls.length > 0 || extraGallery.length > 0) {
      data.gallery = [...galleryUrls, ...extraGallery];
    }

    const property = await propertyService.updateProperty({
      propertyId: req.params.id,
      ownerId: req.user.id,
      data,
    });
    return success(
      res,
      property,
      "Property updated and re-submitted for approval",
    );
  } catch (err) {
    next(err);
  }
};

// DELETE /api/properties/:id
// Delete own property (owner) or any property (admin)
const deleteProperty = async (req, res, next) => {
  try {
    await propertyService.deleteProperty({
      propertyId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return success(res, {}, "Property deleted successfully");
  } catch (err) {
    next(err);
  }
};

// GET /api/properties/my
// My own property listings (owner)
const getMyProperties = async (req, res, next) => {
  try {
    const { status, page } = req.query;
    const data = await propertyService.getMyProperties({
      ownerId: req.user.id,
      status: status || null,
      page: parseInt(page, 10) || 1,
    });
    return success(res, data, "Your properties fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/properties/:id
// Single property detail
const getPropertyById = async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById({
      propertyId: req.params.id,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
    });
    return success(res, property, "Property fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/properties
// Public listing (PUBLISHED + FEATURED) — supports filters
const getPublicProperties = async (req, res, next) => {
  try {
    const {
      propertyType,
      listingType,
      condition,
      location,
      minPrice,
      maxPrice,
      page,
    } = req.query;
    const data = await propertyService.getPublicProperties({
      filters: {
        propertyType,
        listingType,
        condition,
        location,
        minPrice,
        maxPrice,
      },
      page: parseInt(page, 10) || 1,
    });
    return success(res, data, "Properties fetched");
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ONLY ───────────────────────────────────────────────────

// GET /api/properties/admin/all
// All properties (admin)
const adminGetAllProperties = async (req, res, next) => {
  try {
    const { status, page } = req.query;
    const data = await propertyService.adminGetAllProperties({
      status: status || null,
      page: parseInt(page, 10) || 1,
    });
    return success(res, data, "All properties fetched");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/properties/admin/:id/status
// Approve / Reject / Feature a property (admin)
const updateApprovalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ApiError(400, "status is required");

    const property = await propertyService.updateApprovalStatus({
      propertyId: req.params.id,
      status: status.toUpperCase(),
      adminId: req.user.id,
    });
    return success(
      res,
      property,
      `Property ${status.toLowerCase()}d successfully`,
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPublicProperties,
  adminGetAllProperties,
  updateApprovalStatus,
};
