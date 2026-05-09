const savedListingService = require("../services/savedListing.service");
const { success } = require("../utils/response");

// POST /api/saved-listings/:propertyId  — toggle save/unsave
const toggleSaveListing = async (req, res, next) => {
  try {
    const data = await savedListingService.toggleSaveListing({
      userId: req.user.id,
      propertyId: req.params.propertyId,
    });
    const message = data.saved ? "Listing saved" : "Listing unsaved";
    return success(res, data, message);
  } catch (err) {
    next(err);
  }
};

const getMySavedListings = async (req, res, next) => {
  try {
    const { page, pageSize, propertyType } = req.query;
    const data = await savedListingService.getMySavedListings({
      userId: req.user.id,
      propertyType: propertyType ? propertyType.toUpperCase() : null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Saved listings fetched");
  } catch (err) {
    next(err);
  }
};


const getSavedListingById = async (req, res, next) => {
  try {
    const data = await savedListingService.getSavedListingById({
      userId: req.user.id,
      propertyId: req.params.propertyId,
    });
    return success(res, data, "Saved listing fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  toggleSaveListing,
  getMySavedListings,
  getSavedListingById,
};
