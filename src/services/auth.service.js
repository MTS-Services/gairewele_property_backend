const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const { admin } = require("../config/firebase");

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

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
};

module.exports = {
  register,
  login,
  firebaseLogin,
  sanitizeUser,
};
