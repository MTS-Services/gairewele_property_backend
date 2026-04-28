const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

// Accept image + companyLogo as multipart fields
const profileUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
]);

router.post("/register", profileUpload, authController.register);
router.post("/login", authController.login);
router.post("/firebase-login", authController.firebaseLogin);
router.get("/me", authenticate, authController.me);

// Profile
router.patch(
  "/profile",
  authenticate,
  profileUpload,
  authController.updateProfile,
);
router.patch("/change-password", authenticate, authController.changePassword);

// Forgot / Reset password
router.post("/forgot-password", authController.forgotPassword);
router.post("/resend-otp", authController.resendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
