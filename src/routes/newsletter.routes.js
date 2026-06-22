const router = require("express").Router();
const { subscribe } = require("../controllers/newsletter.controller");

// Public — no auth required
router.post("/subscribe", subscribe);

module.exports = router;
