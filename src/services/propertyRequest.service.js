const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const VALID_STATUSES = ["NEW", "IN_PROCESS", "COMPLETED"];
const AGENT_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

const PROPERTY_TYPES = [
  "APARTMENT",
  "HOUSE",
  "VILLA",
  "PENTHOUSE",
  "STUDIO",
  "TOWNHOUSE",
  "DETACHED",
  "SEMI_DETACHED",
  "TERRACE",
  "FLAT",
  "OFFICE_SPACE",
  "OTHERS",
];

// ─────────────────────────────────────────────────────────────────
// USER — create a new property request
// ─────────────────────────────────────────────────────────────────
const createRequest = async ({
  userId,
  propertyType,
  preferredLocation,
  bedrooms,
  bathrooms,
  budgetMin,
  budgetMax,
  areaMin,
  areaMax,
  preferredMoveInDate,
  fullName,
  email,
  phoneNumber,
  preferences,
}) => {
  if (!propertyType || !PROPERTY_TYPES.includes(propertyType))
    throw new ApiError(
      400,
      `Invalid propertyType. Valid: ${PROPERTY_TYPES.join(", ")}`,
    );
  if (!preferredLocation)
    throw new ApiError(400, "preferredLocation is required");
  if (bedrooms == null) throw new ApiError(400, "bedrooms is required");
  if (bathrooms == null) throw new ApiError(400, "bathrooms is required");
  if (budgetMin == null || budgetMax == null)
    throw new ApiError(400, "budgetMin and budgetMax are required");
  if (areaMin == null || areaMax == null)
    throw new ApiError(400, "areaMin and areaMax are required");
  if (!fullName) throw new ApiError(400, "fullName is required");
  if (!email) throw new ApiError(400, "email is required");
  if (!phoneNumber) throw new ApiError(400, "phoneNumber is required");

  let parsedMoveInDate = null;
  if (preferredMoveInDate) {
    parsedMoveInDate = new Date(preferredMoveInDate);
    if (isNaN(parsedMoveInDate))
      throw new ApiError(400, "Invalid preferredMoveInDate");
  }

  return prisma.propertyRequest.create({
    data: {
      propertyType,
      preferredLocation,
      bedrooms: parseInt(bedrooms, 10),
      bathrooms: parseInt(bathrooms, 10),
      budgetMin: parseFloat(budgetMin),
      budgetMax: parseFloat(budgetMax),
      areaMin: parseInt(areaMin, 10),
      areaMax: parseInt(areaMax, 10),
      preferredMoveInDate: parsedMoveInDate,
      fullName,
      email,
      phoneNumber,
      preferences: preferences || null,
      userId: userId || null,
    },
  });
};

// ─────────────────────────────────────────────────────────────────
// USER — get own requests + dashboard stats
// ─────────────────────────────────────────────────────────────────
const getMyRequests = async ({ userId, status, page = 1, pageSize = 20 }) => {
  const where = { userId };

  if (status) {
    if (!VALID_STATUSES.includes(status))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    where.status = status;
  }

  const [requests, total, totalCount, pendingCount, upcomingCount] =
    await Promise.all([
      prisma.propertyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.propertyRequest.count({ where }),
      prisma.propertyRequest.count({ where: { userId } }),
      prisma.propertyRequest.count({
        where: { userId, status: { in: ["NEW", "IN_PROCESS"] } },
      }),
      prisma.propertyRequest.count({ where: { userId, status: "COMPLETED" } }),
    ]);

  return {
    stats: {
      totalRequests: totalCount,
      pendingActions: pendingCount,
      completedRequests: upcomingCount,
    },
    requests,
    total,
    page,
    pageSize,
  };
};

// ─────────────────────────────────────────────────────────────────
// AGENT / DEVELOPER / OWNER — get all requests
// ─────────────────────────────────────────────────────────────────
const getAllRequests = async ({ status, search, page = 1, pageSize = 20 }) => {
  const where = {};

  if (status) {
    if (!VALID_STATUSES.includes(status))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    where.status = status;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { preferredLocation: { contains: search, mode: "insensitive" } },
      { propertyType: { equals: search.toUpperCase() } },
    ];
  }

  const [requests, total, newCount, inProcessCount, completedCount] =
    await Promise.all([
      prisma.propertyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, image: true },
          },
        },
      }),
      prisma.propertyRequest.count({ where }),
      prisma.propertyRequest.count({ where: { status: "NEW" } }),
      prisma.propertyRequest.count({ where: { status: "IN_PROCESS" } }),
      prisma.propertyRequest.count({ where: { status: "COMPLETED" } }),
    ]);

  return {
    requests,
    total,
    page,
    pageSize,
    countsByStatus: {
      NEW: newCount,
      IN_PROCESS: inProcessCount,
      COMPLETED: completedCount,
    },
  };
};

// ─────────────────────────────────────────────────────────────────
// Get single request by ID
// USER can only view own; AGENT/DEVELOPER/OWNER can view any
// ─────────────────────────────────────────────────────────────────
const getRequestById = async ({ requestId, actorId, actorRole }) => {
  const request = await prisma.propertyRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, fullName: true, email: true, image: true } },
    },
  });

  if (!request) throw new ApiError(404, "Property request not found");

  // If caller is a regular USER, they can only see their own request
  if (!AGENT_ROLES.includes(actorRole) && actorRole !== "ADMIN") {
    if (request.userId !== actorId) throw new ApiError(403, "Access denied");
  }

  return request;
};

// ─────────────────────────────────────────────────────────────────
// AGENT / DEVELOPER / OWNER — update request status
// ─────────────────────────────────────────────────────────────────
const updateRequestStatus = async ({ requestId, status }) => {
  if (!VALID_STATUSES.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
    );

  const request = await prisma.propertyRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new ApiError(404, "Property request not found");

  return prisma.propertyRequest.update({
    where: { id: requestId },
    data: { status },
  });
};

// ─────────────────────────────────────────────────────────────────
// Delete a request
// USER can only delete own; AGENT/DEVELOPER/OWNER can delete any
// ─────────────────────────────────────────────────────────────────
const deleteRequest = async ({ requestId, actorId, actorRole }) => {
  const request = await prisma.propertyRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new ApiError(404, "Property request not found");

  if (!AGENT_ROLES.includes(actorRole) && actorRole !== "ADMIN") {
    if (request.userId !== actorId) throw new ApiError(403, "Access denied");
  }

  await prisma.propertyRequest.delete({ where: { id: requestId } });
  return { id: requestId };
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
};
