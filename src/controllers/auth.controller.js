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

module.exports = { register, login, firebaseLogin, me };
