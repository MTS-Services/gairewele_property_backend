const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const bcrypt = require("bcryptjs");

const SUB_ADMIN_ROLES = [
  "SUB_ADMIN_LISTING",
  "SUB_ADMIN_BLOG",
  "SUB_ADMIN_ADVERTS",
];
const VALID_ROLES = ["USER", "ADMIN", "AGENT", "DEVELOPER", "OWNER"];
// All roles visible in the users list (excludes only ADMIN/super-admin)
const ALL_LISTABLE_ROLES = [
  "USER",
  "AGENT",
  "DEVELOPER",
  "OWNER",
  ...SUB_ADMIN_ROLES,
];
const NON_ADMIN_ROLES = ["USER", "AGENT", "DEVELOPER", "OWNER"];

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

const buildUsersWhereClause = ({ role, search }) => {
  const where = { role: { in: ALL_LISTABLE_ROLES } };

  if (role) {
    if (!ALL_LISTABLE_ROLES.includes(role)) {
      throw new ApiError(
        400,
        `Invalid role. Valid: ${ALL_LISTABLE_ROLES.join(", ")}`,
      );
    }
    where.role = role;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
};

const getAllUsers = async ({ role, search, page = 1, pageSize = 20 }) => {
  const where = buildUsersWhereClause({ role, search });

  const [users, total, roleGroups] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ["role"],
      where: { role: { in: ALL_LISTABLE_ROLES } },
      _count: { _all: true },
    }),
  ]);

  const countsByRole = ALL_LISTABLE_ROLES.reduce((acc, r) => {
    acc[r] = 0;
    return acc;
  }, {});
  for (const g of roleGroups) countsByRole[g.role] = g._count._all;

  return {
    users: users.map(sanitizeUser),
    total,
    page,
    pageSize,
    countsByRole,
  };
};

const getUsersForExport = async ({ role, search }) => {
  const where = buildUsersWhereClause({ role, search });

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      phoneNumber: true,
      whatsappNumber: true,
      companyName: true,
      isSuspended: true,
      createdAt: true,
    },
  });
};

const getUserById = async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { properties: true } },
    },
  });
  if (!user) throw new ApiError(404, "User not found");
  return sanitizeUser(user);
};

// Toggle suspension (suspend if active, unsuspend if suspended) — does NOT delete
const toggleSuspendUser = async ({ userId, adminId }) => {
  if (userId === adminId)
    throw new ApiError(400, "You cannot suspend your own account");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "ADMIN")
    throw new ApiError(403, "Cannot suspend another admin");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: !user.isSuspended },
  });
  return {
    user: sanitizeUser(updated),
    suspended: updated.isSuspended,
  };
};

const updateOwnProfile = async ({
  adminId,
  fullName,
  email,
  image,
  oldPassword,
  newPassword,
  confirmPassword,
}) => {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(404, "Admin not found");

  const updateData = {};

  if (fullName !== undefined) {
    const normalizedFullName = String(fullName).trim();
    if (!normalizedFullName) throw new ApiError(400, "fullName cannot be empty");
    updateData.fullName = normalizedFullName;
  }

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ApiError(400, "Invalid email address");
    }

    if (normalizedEmail !== admin.email) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) throw new ApiError(409, "Email already in use");
      updateData.email = normalizedEmail;
    }
  }

  if (image !== undefined) updateData.image = image;

  if (newPassword !== undefined) {
    if (!oldPassword || !confirmPassword) {
      throw new ApiError(
        400,
        "oldPassword and confirmPassword are required to change password",
      );
    }
    if (!admin.password) {
      throw new ApiError(400, "This account has no password to change");
    }
    if (newPassword.length < 6) {
      throw new ApiError(400, "newPassword must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      throw new ApiError(400, "Passwords do not match");
    }
    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) throw new ApiError(400, "Old password is incorrect");
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields provided to update");
  }

  const updated = await prisma.user.update({
    where: { id: adminId },
    data: updateData,
  });
  return sanitizeUser(updated);
};

const PROPERTY_INCLUDE_ADMIN = {
  images: { orderBy: { createdAt: "asc" } },
  owner: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      companyName: true,
      isSuspended: true,
    },
  },
};

const getAllListings = async ({
  ownerRole,
  approvalStatus,
  search,
  page = 1,
  pageSize = 20,
}) => {
  const where = {};

  if (ownerRole) {
    if (!VALID_ROLES.includes(ownerRole))
      throw new ApiError(400, `Invalid role. Valid: ${VALID_ROLES.join(", ")}`);
    where.owner = { role: ownerRole };
  }

  if (approvalStatus) {
    const VALID_STATUSES = ["PENDING", "PUBLISHED", "REJECTED", "FEATURED"];
    if (!VALID_STATUSES.includes(approvalStatus))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    where.approvalStatus = approvalStatus;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { propertyAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  const [listings, total, listingsByCreatorRole, listingsByStatus] =
    await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: PROPERTY_INCLUDE_ADMIN,
      }),
      prisma.property.count({ where }),
      // Group by owner role (count of listings per role, ignoring filters)
      prisma.user.findMany({
        where: { role: { in: ["AGENT", "DEVELOPER", "OWNER"] } },
        select: {
          role: true,
          _count: { select: { properties: true } },
        },
      }),
      prisma.property.groupBy({
        by: ["approvalStatus"],
        _count: { _all: true },
      }),
    ]);

  const countsByCreatorRole = { AGENT: 0, DEVELOPER: 0, OWNER: 0 };
  for (const u of listingsByCreatorRole) {
    countsByCreatorRole[u.role] =
      (countsByCreatorRole[u.role] || 0) + u._count.properties;
  }

  const countsByStatus = { PENDING: 0, PUBLISHED: 0, REJECTED: 0, FEATURED: 0 };
  for (const g of listingsByStatus)
    countsByStatus[g.approvalStatus] = g._count._all;

  return {
    listings,
    total,
    page,
    pageSize,
    countsByCreatorRole,
    countsByStatus,
  };
};

// ── Sub-admin management (ADMIN / super-admin only) ───────────────────────────

const createSubAdmin = async ({ fullName, email, password, role }) => {
  if (!SUB_ADMIN_ROLES.includes(role)) {
    throw new ApiError(
      400,
      `Invalid sub-admin role. Valid: ${SUB_ADMIN_ROLES.join(", ")}`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, password: hashed, role },
  });
  return sanitizeUser(user);
};

const getSubAdmins = async () => {
  const users = await prisma.user.findMany({
    where: { role: { in: SUB_ADMIN_ROLES } },
    orderBy: { createdAt: "desc" },
  });
  return users.map(sanitizeUser);
};

const deleteSubAdmin = async ({ userId, adminId }) => {
  if (userId === adminId)
    throw new ApiError(400, "Cannot delete your own account");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "Sub-admin not found");
  if (!SUB_ADMIN_ROLES.includes(user.role))
    throw new ApiError(400, "User is not a sub-admin");

  await prisma.user.delete({ where: { id: userId } });
};

module.exports = {
  getAllUsers,
  getUsersForExport,
  getUserById,
  toggleSuspendUser,
  updateOwnProfile,
  getAllListings,
  createSubAdmin,
  getSubAdmins,
  deleteSubAdmin,
};
