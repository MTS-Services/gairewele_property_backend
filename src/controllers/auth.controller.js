const authService = require("../services/auth.service");
const { success } = require("../utils/response");
const ApiError = require("../utils/ApiError");

const register = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      image,
      role,
      phoneNumber,
      whatsappNumber,
      companyName,
      website,
      companyLogo,
    } = req.body;

    if (!fullName || !email || !password) {
      throw new ApiError(400, "fullName, email and password are required");
    }

    const result = await authService.register({
      fullName,
      email,
      password,
      image,
      role,
      phoneNumber,
      whatsappNumber,
      companyName,
      website,
      companyLogo,
    });

    const assignedRole = result.user.role;
    return success(res, result, `${assignedRole} registered successfully`, 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw new ApiError(400, "email and password are required");
    const result = await authService.login({ email, password });
    return success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, role, fullName, image } = req.body;
    if (!idToken) throw new ApiError(400, "idToken is required");
    const result = await authService.firebaseLogin({
      idToken,
      role,
      fullName,
      image,
    });
    return success(res, result, "Firebase login successful");
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  const { password, ...user } = req.user;
  return success(res, { user }, "Current user");
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "email is required");
    await authService.forgotPassword({ email });
    // Always return success to avoid revealing if email exists
    return success(
      res,
      {},
      "If that email is registered, an OTP has been sent",
    );
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "email is required");
    await authService.resendOtp({ email });
    return success(
      res,
      {},
      "If that email is registered, a new OTP has been sent",
    );
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new ApiError(400, "email and otp are required");
    const result = await authService.verifyOtp({ email, otp });
    return success(
      res,
      result,
      "OTP verified. Use the resetToken to set your new password.",
    );
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        400,
        "Reset token missing. Send it as: Authorization: Bearer <resetToken>",
      );
    }
    const resetToken = authHeader.split(" ")[1];
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) {
      throw new ApiError(400, "newPassword and confirmPassword are required");
    }
    if (newPassword.length < 6) {
      throw new ApiError(400, "newPassword must be at least 6 characters");
    }
    await authService.resetPassword({
      resetToken,
      newPassword,
      confirmPassword,
    });
    return success(res, {}, "Password reset successfully");
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new ApiError(
        400,
        "oldPassword, newPassword and confirmPassword are required",
      );
    }
    if (newPassword.length < 6) {
      throw new ApiError(400, "newPassword must be at least 6 characters");
    }
    await authService.changePassword({
      userId: req.user.id,
      oldPassword,
      newPassword,
      confirmPassword,
    });
    return success(res, {}, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const result = await authService.updateProfile({
      userId: req.user.id,
      data: req.body,
    });
    return success(res, result, "Profile updated successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  firebaseLogin,
  me,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  changePassword,
  updateProfile,
};
