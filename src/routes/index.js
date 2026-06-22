const router = require("express").Router();
const authRoutes = require("./auth.routes");
const chatRoutes = require("./chat.routes");
const propertyRoutes = require("./property.routes");
const adminRoutes = require("./admin.routes");
const adRoutes = require("./ad.routes");
const publicAdRoutes = require("./publicAd.routes");
const blogRoutes = require("./blog.routes");
const propertyRequestRoutes = require("./propertyRequest.routes");
const savedListingRoutes = require("./savedListing.routes");
const userRoutes = require("./dashboard.routes");
const subscriptionRoutes = require("./subscription.routes");
const newsletterRoutes = require("./newsletter.routes");

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/properties", propertyRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/ads", adRoutes);
router.use("/ads", publicAdRoutes);
router.use("/", blogRoutes);
router.use("/property-requests", propertyRequestRoutes);
router.use("/saved-listings", savedListingRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/", userRoutes);

module.exports = router;
