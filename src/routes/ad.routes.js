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
  exportAdsCsv,
} = require("../controllers/ad.controller");

// Accessible by ADMIN and SUB_ADMIN_ADVERTS
const adAdmin = [authenticate, authorize("ADMIN", "SUB_ADMIN_ADVERTS")];

router.get("/stats", ...adAdmin, getAdStats);
router.get("/export", ...adAdmin, exportAdsCsv);
router.get("/", ...adAdmin, adminGetAllAds);
router.post("/", ...adAdmin, adUpload, createAd);
router.get("/:id", ...adAdmin, getAdById);
router.patch("/:id", ...adAdmin, adUpload, updateAd);
router.patch("/:id/toggle-pause", ...adAdmin, togglePauseAd);
router.delete("/:id", ...adAdmin, deleteAd);

module.exports = router;
