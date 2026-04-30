const router = require("express").Router();
const authRoutes = require("./auth.routes");
const chatRoutes = require("./chat.routes");
const propertyRoutes = require("./property.routes");

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/properties", propertyRoutes);

module.exports = router;
