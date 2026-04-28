const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/firebase-login", authController.firebaseLogin);
router.get("/me", authenticate, authController.me);

// Profile
router.patch("/profile", authenticate, authController.updateProfile);
router.patch("/change-password", authenticate, authController.changePassword);

// Forgot / Reset password
router.post("/forgot-password", authController.forgotPassword);
router.post("/resend-otp", authController.resendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
