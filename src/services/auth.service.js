const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const { admin } = require("../config/firebase");
const { sendOtpEmail } = require("../utils/mailer");

const PROFESSIONAL_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

const register = async ({
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
}) => {
  const assignedRole = role && role !== "USER" ? role.toUpperCase() : "USER";

  if (PROFESSIONAL_ROLES.includes(assignedRole) && !phoneNumber) {
    throw new ApiError(
      400,
      "phoneNumber is required for AGENT, DEVELOPER and OWNER",
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already in use");

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashed,
      image,
      role: assignedRole,
      provider: "LOCAL",
      ...(PROFESSIONAL_ROLES.includes(assignedRole) && {
        phoneNumber,
        whatsappNumber,
        companyName,
        website,
        companyLogo,
      }),
    },
  });

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    throw new ApiError(401, "Invalid email or password");
  if (user.isSuspended) throw new ApiError(403, "Account suspended");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const firebaseLogin = async ({ idToken, role, fullName, image }) => {
  if (!admin || !admin.auth) {
    throw new ApiError(500, "Firebase admin not configured");
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    throw new ApiError(401, "Invalid Firebase ID token");
  }

  const { uid, email, name, picture } = decoded;
  if (!email) throw new ApiError(400, "Firebase token missing email");

  let user = await prisma.user.findFirst({
    where: { OR: [{ firebaseUid: uid }, { email }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName: fullName || name || email.split("@")[0],
        email,
        image: image || picture,
        firebaseUid: uid,
        provider: "FIREBASE",
        role:
          role && ["USER", "AGENT", "DEVELOPER", "OWNER"].includes(role)
            ? role
            : "USER",
      },
    });
  } else if (!user.firebaseUid) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: uid, provider: "FIREBASE" },
    });
  }

  if (user.isSuspended) throw new ApiError(403, "Account suspended");

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
};

// =====================
// Forgot Password — send OTP
// =====================
const OTP_EXPIRY_MINUTES = 10;

const generateOtp = () => String(crypto.randomInt(10000, 99999)); // always 5 digits

const forgotPassword = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Don't reveal whether the email exists
  if (!user) return;

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any previous unused OTPs for this email
  await prisma.otpToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  await prisma.otpToken.create({
    data: { email, otp, expiresAt },
  });

  await sendOtpEmail(email, otp);
};

// =====================
// Resend OTP
// =====================
const resendOtp = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent for security

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  await prisma.otpToken.create({
    data: { email, otp, expiresAt },
  });

  await sendOtpEmail(email, otp);
};

// =====================
// Verify OTP — returns a short-lived reset token
// =====================
const verifyOtp = async ({ email, otp }) => {
  const record = await prisma.otpToken.findFirst({
    where: { email, otp, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new ApiError(400, "Invalid OTP");
  if (record.expiresAt < new Date()) throw new ApiError(400, "OTP has expired");

  // Mark OTP as used now — cannot be reused
  await prisma.otpToken.update({
    where: { id: record.id },
    data: { used: true },
  });

  // Issue a 15-minute reset token that carries the email
  const jwt = require("jsonwebtoken");
  const resetToken = jwt.sign(
    { email, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  return { resetToken };
};

// =====================
// Reset Password — uses resetToken issued by verifyOtp
// =====================
const resetPassword = async ({ resetToken, newPassword, confirmPassword }) => {
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const jwt = require("jsonwebtoken");
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "Reset token is invalid or expired");
  }

  if (payload.purpose !== "password_reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const { email } = payload;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, "User not found");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hashed } });
};

// =====================
// Change Password (authenticated)
// =====================
const changePassword = async ({
  userId,
  oldPassword,
  newPassword,
  confirmPassword,
}) => {
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  if (!user.password) {
    throw new ApiError(
      400,
      "This account uses social login and has no password to change",
    );
  }

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw new ApiError(400, "Old password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
};

// =====================
// Update Profile (authenticated)
// =====================
const updateProfile = async ({ userId, data }) => {
  const allowedFields = [
    "fullName",
    "image",
    "phoneNumber",
    "whatsappNumber",
    "companyName",
    "website",
    "companyLogo",
  ];

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const updateData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields provided to update");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return { user: sanitizeUser(updated) };
};

// =====================
// Logout (authenticated)
// =====================
const logout = async ({ userId }) => {
  // Delete all refresh tokens for this user (cleanup)
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

module.exports = {
  register,
  login,
  firebaseLogin,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  changePassword,
  updateProfile,
  logout,
  sanitizeUser,
};
