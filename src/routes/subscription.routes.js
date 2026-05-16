const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/subscription.controller");

const subscriber = [authenticate, authorize("AGENT", "DEVELOPER", "OWNER")];

router.get("/plans", ctrl.listPlans);

// Paystack browser redirect after payment — no auth required
router.get("/callback", ctrl.paystackCallback);

router.get("/me", ...subscriber, ctrl.getMySubscription);
router.post("/initiate", ...subscriber, ctrl.initiateSubscription);
router.get("/verify/:reference", ...subscriber, ctrl.verifySubscription);
router.post("/cancel", ...subscriber, ctrl.cancelSubscription);
router.get("/payments", ...subscriber, ctrl.getMyPaymentHistory);
router.get("/payments/export-pdf", ...subscriber, ctrl.exportBillingPdf);

module.exports = router;
