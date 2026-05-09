const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const {
  toggleSaveListing,
  getMySavedListings,
  getSavedListingById,
} = require("../controllers/savedListing.controller");

router.use(authenticate);
         
router.get("/", getMySavedListings);

router.get("/:propertyId", getSavedListingById);

router.post("/:propertyId", toggleSaveListing);

module.exports = router;
