const router = require("express").Router();
const authRoutes = require("./auth.routes");
const chatRoutes = require("./chat.routes");

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);

module.exports = router;
