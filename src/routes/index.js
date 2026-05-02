const router = require("express").Router();
const authRoutes = require("./auth.routes");
const chatRoutes = require("./chat.routes");
const propertyRoutes = require("./property.routes");
const adminRoutes = require("./admin.routes");
const adRoutes = require("./ad.routes");
const publicAdRoutes = require("./publicAd.routes");

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/properties", propertyRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/ads", adRoutes);
router.use("/ads", publicAdRoutes);

module.exports = router;
