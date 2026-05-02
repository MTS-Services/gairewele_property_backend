const router = require("express").Router();
const { getAdsByPlacement, trackAd } = require("../controllers/ad.controller");

// Public — used by frontend to render ads on each portion of the site
// GET  /api/ads/:placement          placement = HOMEPAGE | BLOG | PROPERTIES | REGISTER
// POST /api/ads/:id/track           body: { type: "impression" | "click" }
router.get("/:placement", getAdsByPlacement);
router.post("/:id/track", trackAd);

module.exports = router;
