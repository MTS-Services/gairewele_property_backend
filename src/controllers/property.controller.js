const propertyService = require("../services/property.service");
const { success } = require("../utils/response");
const ApiError = require("../utils/ApiError");
const { galleryFileUrl } = require("../middleware/propertyUpload");

const createProperty = async (req, res, next) => {
  try {
    const imageUrls = (req.files || []).map((f) => galleryFileUrl(f.filename));

    const property = await propertyService.createProperty({
      ownerId: req.user.id,
      ownerRole: req.user.role,
      data: req.body,
      imageUrls,
    });

    return success(res, property, "Property submitted for approval", 201);
  } catch (err) {
    next(err);
  }
};


const updateProperty = async (req, res, next) => {
  try {
    const imageUrls = (req.files || []).map((f) => galleryFileUrl(f.filename));

    const property = await propertyService.updateProperty({
      propertyId: req.params.id,
      ownerId: req.user.id,
      data: req.body,
      imageUrls,
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


const deletePropertyImage = async (req, res, next) => {
  try {
    await propertyService.deletePropertyImage({
      imageId: req.params.imageId,
      ownerId: req.user.id,
    });
    return success(res, {}, "Image deleted successfully");
  } catch (err) {
    next(err);
  }
};


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
  deletePropertyImage,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPublicProperties,
  adminGetAllProperties,
  updateApprovalStatus,
};
