const router = require("express").Router();
const { getAdsByPlacement, trackAd } = require("../controllers/ad.controller");


router.get("/:placement", getAdsByPlacement);
router.post("/:id/track", trackAd);

module.exports = router;
