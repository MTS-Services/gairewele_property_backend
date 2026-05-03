const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { adUpload } = require("../middleware/adUpload");
const {
  createAd,
  adminGetAllAds,
  getAdById,
  updateAd,
  deleteAd,
  togglePauseAd,
  getAdStats,
} = require("../controllers/ad.controller");


router.use(authenticate, authorize("ADMIN"));

router.get("/stats", getAdStats);
router.get("/", adminGetAllAds);
router.get("/:id", getAdById);
router.post("/", adUpload, createAd);
router.patch("/:id", adUpload, updateAd);
router.patch("/:id/toggle-pause", togglePauseAd);
router.delete("/:id", deleteAd);

module.exports = router;
