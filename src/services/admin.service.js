const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const VALID_ROLES = ["USER", "ADMIN", "AGENT", "DEVELOPER", "OWNER"];
const NON_ADMIN_ROLES = VALID_ROLES.filter((r) => r !== "ADMIN");

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

const buildUsersWhereClause = ({ role, search }) => {
  const where = { role: { in: NON_ADMIN_ROLES } };

  if (role) {
    if (!NON_ADMIN_ROLES.includes(role)) {
      throw new ApiError(
        400,
        `Invalid role. Valid: ${NON_ADMIN_ROLES.join(", ")}`,
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
      where: { role: { in: NON_ADMIN_ROLES } },
      _count: { _all: true },
    }),
  ]);

  const countsByRole = NON_ADMIN_ROLES.reduce((acc, r) => {
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

  // Run main query and aggregate counts in parallel
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

module.exports = {
  getAllUsers,
  getUsersForExport,
  getUserById,
  toggleSuspendUser,
  getAllListings,
};
