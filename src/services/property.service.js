const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const ALLOWED_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

// ─────────────────────────────────────────────────────────────────
// Create a new property listing (role: AGENT / DEVELOPER / OWNER)
// ─────────────────────────────────────────────────────────────────
const createProperty = async ({ ownerId, ownerRole, data }) => {
  if (!ALLOWED_ROLES.includes(ownerRole)) {
    throw new ApiError(
      403,
      "Only agents, developers and owners can create property listings",
    );
  }

  const {
    title,
    description,
    propertyType,
    condition,
    size,
    listingType,
    location,
    propertyAddress,
    gallery, // array of URLs
    videoUrl,
    askingPrice,
    whatsappNumber,
    companyName,
    officeAddress,
    phoneNumber,
  } = data;

  // Required fields validation
  if (
    !title ||
    !description ||
    !propertyType ||
    !condition ||
    !size ||
    !listingType ||
    !location ||
    !propertyAddress ||
    !askingPrice
  ) {
    throw new ApiError(
      400,
      "title, description, propertyType, condition, size, listingType, location, propertyAddress and askingPrice are required",
    );
  }

  const validPropertyTypes = [
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
  const validConditions = [
    "NEW",
    "RENOVATED",
    "FAIRLY_USED",
    "UNDER_CONSTRUCTION",
    "OFF_PLAN",
  ];
  const validListingTypes = ["FOR_SALE", "FOR_RENT", "FOR_LEASE", "OTHERS"];

  if (!validPropertyTypes.includes(propertyType))
    throw new ApiError(
      400,
      `Invalid propertyType. Valid values: ${validPropertyTypes.join(", ")}`,
    );
  if (!validConditions.includes(condition))
    throw new ApiError(
      400,
      `Invalid condition. Valid values: ${validConditions.join(", ")}`,
    );
  if (!validListingTypes.includes(listingType))
    throw new ApiError(
      400,
      `Invalid listingType. Valid values: ${validListingTypes.join(", ")}`,
    );

  const property = await prisma.property.create({
    data: {
      title,
      description,
      propertyType,
      condition,
      size,
      propertyTitle: listingType,
      listingType,
      location,
      propertyAddress,
      gallery: gallery || [],
      videoUrl: videoUrl || null,
      askingPrice,
      whatsappNumber: whatsappNumber || null,
      companyName: companyName || null,
      officeAddress: officeAddress || null,
      phoneNumber: phoneNumber || null,
      approvalStatus: "PENDING",
      ownerId,
    },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          companyName: true,
          image: true,
        },
      },
    },
  });

  return property;
};

// ─────────────────────────────────────────────────────────────────
// Update a property (owner only, only if PENDING or REJECTED)
// ─────────────────────────────────────────────────────────────────
const updateProperty = async ({ propertyId, ownerId, data }) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new ApiError(404, "Property not found");
  if (property.ownerId !== ownerId)
    throw new ApiError(403, "You can only edit your own properties");

  const allowedFields = [
    "title",
    "description",
    "propertyType",
    "condition",
    "size",
    "listingType",
    "location",
    "propertyAddress",
    "gallery",
    "videoUrl",
    "askingPrice",
    "whatsappNumber",
    "companyName",
    "officeAddress",
    "phoneNumber",
  ];
  const updateData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  if (data.listingType) updateData.propertyTitle = data.listingType;
  // Re-submit for review after edit
  updateData.approvalStatus = "PENDING";

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: updateData,
    include: {
      owner: { select: { id: true, fullName: true, email: true, role: true } },
    },
  });
  return updated;
};

// ─────────────────────────────────────────────────────────────────
// Delete a property (owner only, or admin)
// ─────────────────────────────────────────────────────────────────
const deleteProperty = async ({ propertyId, userId, userRole }) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new ApiError(404, "Property not found");

  if (userRole !== "ADMIN" && property.ownerId !== userId) {
    throw new ApiError(403, "You can only delete your own properties");
  }

  await prisma.property.delete({ where: { id: propertyId } });
};

// ─────────────────────────────────────────────────────────────────
// Get my own properties (owner)
// ─────────────────────────────────────────────────────────────────
const getMyProperties = async ({ ownerId, status, page = 1 }) => {
  const PAGE_SIZE = 10;
  const where = { ownerId };
  if (status) where.approvalStatus = status;

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page };
};

// ─────────────────────────────────────────────────────────────────
// Get a single property by ID
//   - Owner sees their own (any status)
//   - Logged-in users see PUBLISHED + FEATURED
//   - Admin sees all
// ─────────────────────────────────────────────────────────────────
const getPropertyById = async ({ propertyId, userId, userRole }) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          companyName: true,
          image: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
  });
  if (!property) throw new ApiError(404, "Property not found");

  if (userRole === "ADMIN") return property;
  if (property.ownerId === userId) return property;
  if (["PUBLISHED", "FEATURED"].includes(property.approvalStatus))
    return property;

  throw new ApiError(404, "Property not found");
};

// ─────────────────────────────────────────────────────────────────
// Public / authenticated listing (PUBLISHED + FEATURED only)
// ─────────────────────────────────────────────────────────────────
const getPublicProperties = async ({ filters = {}, page = 1 }) => {
  const PAGE_SIZE = 10;
  const where = {
    approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
  };

  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.listingType) where.listingType = filters.listingType;
  if (filters.condition) where.condition = filters.condition;
  if (filters.location)
    where.location = { contains: filters.location, mode: "insensitive" };
  if (filters.minPrice || filters.maxPrice) {
    where.askingPrice = {};
    if (filters.minPrice) where.askingPrice.gte = parseFloat(filters.minPrice);
    if (filters.maxPrice) where.askingPrice.lte = parseFloat(filters.maxPrice);
  }

  // Featured properties appear first
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [
        { approvalStatus: "desc" }, // FEATURED(3) > PUBLISHED(1) by enum definition order → FEATURED first
        { createdAt: "desc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            role: true,
            companyName: true,
            image: true,
          },
        },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page };
};

// ─────────────────────────────────────────────────────────────────
// Admin: Get ALL properties with optional status filter
// ─────────────────────────────────────────────────────────────────
const adminGetAllProperties = async ({ status, page = 1 }) => {
  const PAGE_SIZE = 10;
  const where = {};
  if (status) where.approvalStatus = status;

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            companyName: true,
          },
        },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page };
};

// ─────────────────────────────────────────────────────────────────
// Admin: Approve / Reject / Feature a property
// ─────────────────────────────────────────────────────────────────
const updateApprovalStatus = async ({ propertyId, status, adminId }) => {
  const validStatuses = ["PENDING", "PUBLISHED", "REJECTED", "FEATURED"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Valid values: ${validStatuses.join(", ")}`,
    );
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new ApiError(404, "Property not found");

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: { approvalStatus: status },
    include: {
      owner: { select: { id: true, fullName: true, email: true, role: true } },
    },
  });
  return updated;
};

module.exports = {
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPublicProperties,
  adminGetAllProperties,
  updateApprovalStatus,
};
