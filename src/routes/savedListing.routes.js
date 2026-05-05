const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const {
  toggleSaveListing,
  getMySavedListings,
  getSavedListingById,
} = require("../controllers/savedListing.controller");

// All routes require login — any role can save listings
router.use(authenticate);

// GET  /api/saved-listings            — all saved listings
router.get("/", getMySavedListings);

// GET  /api/saved-listings/:propertyId — single saved listing
router.get("/:propertyId", getSavedListingById);

// POST /api/saved-listings/:propertyId — toggle save / unsave
router.post("/:propertyId", toggleSaveListing);

module.exports = router;
