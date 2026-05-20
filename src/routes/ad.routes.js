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

// Accessible by ADMIN (super) and SUB_ADMIN_ADVERTS
const advertAdmin = [authenticate, authorize("ADMIN", "SUB_ADMIN_ADVERTS")];

router.get("/stats", ...advertAdmin, getAdStats);
router.get("/export", ...advertAdmin, exportAdsCsv);
router.get("/", ...advertAdmin, adminGetAllAds);
router.get("/:id", ...advertAdmin, getAdById);
router.post("/", ...advertAdmin, adUpload, createAd);
router.patch("/:id", ...advertAdmin, adUpload, updateAd);
router.patch("/:id/toggle-pause", ...advertAdmin, togglePauseAd);
router.delete("/:id", ...advertAdmin, deleteAd);

module.exports = router;
