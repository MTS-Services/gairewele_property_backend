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

const https = require("https");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const resolveLocation = (input) =>
  new Promise((resolve) => {
    if (!input) return resolve(null);
    const encoded = encodeURIComponent(input);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_API_KEY}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.status === "OK" && json.results.length > 0) {
              // Use locality or administrative_area_level_1 as short name
              const components = json.results[0].address_components;
              const locality = components.find((c) =>
                c.types.includes("locality"),
              );
              const area = components.find((c) =>
                c.types.includes("administrative_area_level_1"),
              );
              resolve((locality || area)?.long_name || input);
            } else {
              resolve(input);
            }
          } catch {
            resolve(input);
          }
        });
      })
      .on("error", () => resolve(input));
  });

const getPublicProperties = async (req, res, next) => {
  try {
    const {
      search,
      approvalStatus,
      propertyType,
      listingType,
      condition,
      location,
      minPrice,
      maxPrice,
      bedrooms,
      page,
      pageSize,
    } = req.query;

    const resolvedLocation = await resolveLocation(location);

    const data = await propertyService.getPublicProperties({
      filters: {
        search: search || null,
        approvalStatus: approvalStatus ? approvalStatus.toUpperCase() : null,
        propertyType: propertyType ? propertyType.toUpperCase() : null,
        listingType: listingType ? listingType.toUpperCase() : null,
        condition: condition ? condition.toUpperCase() : null,
        location: resolvedLocation,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        bedrooms: bedrooms || null,
      },
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 10,
    });
    return success(res, data, "Properties fetched");
  } catch (err) {
    next(err);
  }
};

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

// GET /api/properties/location-suggestions?input=Lekki
// Returns place suggestions from Google Places Autocomplete
const getLocationSuggestions = async (req, res, next) => {
  try {
    const { input } = req.query;
    if (!input || input.trim().length < 2) {
      return success(res, { suggestions: [] }, "No input provided");
    }

    const encoded = encodeURIComponent(input.trim());
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&types=(cities)&key=${process.env.GOOGLE_API_KEY}`;

    const data = await new Promise((resolve, reject) => {
      https
        .get(url, (apiRes) => {
          let body = "";
          apiRes.on("data", (chunk) => (body += chunk));
          apiRes.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error("Failed to parse Google response"));
            }
          });
        })
        .on("error", reject);
    });

    const suggestions = (data.predictions || []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));

    return success(res, { suggestions }, "Suggestions fetched");
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
  getLocationSuggestions,
  adminGetAllProperties,
  updateApprovalStatus,
};
