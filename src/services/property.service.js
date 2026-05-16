const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPlan } = require("../config/plans");
const { ensureSubscription } = require("./subscription.service");

const ALLOWED_ROLES = ["AGENT", "DEVELOPER", "OWNER"];
const VALID_PROPERTY_TYPES = [
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
const VALID_CONDITIONS = [
  "NEW",
  "RENOVATED",
  "FAIRLY_USED",
  "UNDER_CONSTRUCTION",
  "OFF_PLAN",
];
const VALID_LISTING_TYPES = ["FOR_SALE", "FOR_RENT", "FOR_LEASE", "OTHERS"];
const VALID_APPROVAL_STATUSES = [
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "FEATURED",
];

const PROPERTY_INCLUDE = {
  images: { orderBy: { createdAt: "asc" } },
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
};

const parsePropertySize = (size) => {
  const parsedSize = parseInt(size, 10);
  if (Number.isNaN(parsedSize) || parsedSize < 0) {
    throw new ApiError(400, "size must be a valid non-negative integer");
  }
  return parsedSize;
};

const normalizeSortBy = (sortBy) => {
  if (!sortBy) return "newest_listed";

  const normalized = String(sortBy)
    .trim()
    .toLowerCase()
    .replace(/[:\s]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (
    ["newest", "newest_listed", "latest", "latest_listed"].includes(normalized)
  ) {
    return "newest_listed";
  }

  if (["oldest", "oldest_listed"].includes(normalized)) {
    return "oldest_listed";
  }

  if (
    [
      "price_high_to_low",
      "high_to_low",
      "price_desc",
      "highest_price",
    ].includes(normalized)
  ) {
    return "price_high_to_low";
  }

  if (
    ["price_low_to_high", "low_to_high", "price_asc", "lowest_price"].includes(
      normalized,
    )
  ) {
    return "price_low_to_high";
  }

  return "newest_listed";
};

const getPublicPropertyOrderBy = (sortBy) => {
  switch (normalizeSortBy(sortBy)) {
    case "oldest_listed":
      return { createdAt: "asc" };
    case "price_high_to_low":
      return { askingPrice: "desc" };
    case "price_low_to_high":
      return { askingPrice: "asc" };
    case "newest_listed":
    default:
      return { createdAt: "desc" };
  }
};

const validateEnumFilter = (field, value, validValues) => {
  if (!value) return;
  if (!validValues.includes(value)) {
    throw new ApiError(
      400,
      `Invalid ${field}. Valid values: ${validValues.join(", ")}`,
    );
  }
};

// ─────────────────────────────────────────────────────────────────
// Create a new property listing (role: AGENT / DEVELOPER / OWNER)
// ─────────────────────────────────────────────────────────────────
const createProperty = async ({ ownerId, ownerRole, data, imageUrls = [] }) => {
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

  if (!VALID_PROPERTY_TYPES.includes(propertyType))
    throw new ApiError(
      400,
      `Invalid propertyType. Valid values: ${VALID_PROPERTY_TYPES.join(", ")}`,
    );
  if (!VALID_CONDITIONS.includes(condition))
    throw new ApiError(
      400,
      `Invalid condition. Valid values: ${VALID_CONDITIONS.join(", ")}`,
    );
  if (!VALID_LISTING_TYPES.includes(listingType))
    throw new ApiError(
      400,
      `Invalid listingType. Valid values: ${VALID_LISTING_TYPES.join(", ")}`,
    );

  const parsedSize = parsePropertySize(size);

  // ── Plan limits enforcement ───────────────────────────────────
  const sub = await ensureSubscription(ownerId);
  const plan = getPlan(sub.plan) || getPlan("FREE");

  if (plan.features.maxListings !== null) {
    const currentCount = await prisma.property.count({ where: { ownerId } });
    if (currentCount >= plan.features.maxListings) {
      throw new ApiError(
        403,
        `Your ${plan.name} plan allows only ${plan.features.maxListings} listings. Upgrade to add more.`,
      );
    }
  }

  if (imageUrls.length > plan.features.maxImagesPerListing) {
    throw new ApiError(
      403,
      `Your ${plan.name} plan allows only ${plan.features.maxImagesPerListing} images per listing.`,
    );
  }

  if (videoUrl && plan.features.videoPerListing < 1) {
    throw new ApiError(
      403,
      `Your ${plan.name} plan does not allow video uploads. Upgrade to add a video.`,
    );
  }

  const property = await prisma.property.create({
    data: {
      title,
      description,
      propertyType,
      condition,
      size: parsedSize,
      propertyTitle: listingType,
      listingType,
      location,
      propertyAddress,
      videoUrl: videoUrl || null,
      askingPrice,
      whatsappNumber: whatsappNumber || null,
      companyName: companyName || null,
      officeAddress: officeAddress || null,
      phoneNumber: phoneNumber || null,
      approvalStatus: "PENDING",
      ownerId,
      images: {
        create: imageUrls.map((url) => ({ url })),
      },
    },
    include: PROPERTY_INCLUDE,
  });

  return property;
};

// ─────────────────────────────────────────────────────────────────
// Update a property (owner only)
// ─────────────────────────────────────────────────────────────────
const updateProperty = async ({
  propertyId,
  ownerId,
  data,
  imageUrls = [],
}) => {
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
  if (data.size !== undefined) {
    updateData.size = parsePropertySize(data.size);
  }
  if (data.listingType) updateData.propertyTitle = data.listingType;
  updateData.approvalStatus = "PENDING";

  // Append new images — existing PropertyImage rows are untouched
  if (imageUrls.length > 0) {
    updateData.images = { create: imageUrls.map((url) => ({ url })) };
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: updateData,
    include: PROPERTY_INCLUDE,
  });
  return updated;
};

// ─────────────────────────────────────────────────────────────────
// Delete a single gallery image by its ID (owner only)
// ─────────────────────────────────────────────────────────────────
const deletePropertyImage = async ({ imageId, ownerId }) => {
  const image = await prisma.propertyImage.findUnique({
    where: { id: imageId },
    include: { property: { select: { ownerId: true } } },
  });
  if (!image) throw new ApiError(404, "Image not found");
  if (image.property.ownerId !== ownerId)
    throw new ApiError(
      403,
      "You can only delete images from your own properties",
    );

  await prisma.propertyImage.delete({ where: { id: imageId } });
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
      include: PROPERTY_INCLUDE,
    }),
    prisma.property.count({ where }),
  ]);

  return { properties, total, page };
};

const getPropertyById = async ({ propertyId, userId, userRole }) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: PROPERTY_INCLUDE,
  });
  if (!property) throw new ApiError(404, "Property not found");

  if (userRole === "ADMIN") return property;
  if (property.ownerId === userId) return property;
  if (["PUBLISHED", "FEATURED"].includes(property.approvalStatus))
    return property;

  throw new ApiError(404, "Property not found");
};

const getPublicProperties = async ({
  filters = {},
  page = 1,
  pageSize = 10,
}) => {
  const where = {};

  validateEnumFilter(
    "propertyType",
    filters.propertyType,
    VALID_PROPERTY_TYPES,
  );
  validateEnumFilter("listingType", filters.listingType, VALID_LISTING_TYPES);
  validateEnumFilter("condition", filters.condition, VALID_CONDITIONS);
  validateEnumFilter(
    "approvalStatus",
    filters.approvalStatus,
    VALID_APPROVAL_STATUSES,
  );

  if (filters.approvalStatus) {
    where.approvalStatus = filters.approvalStatus;
  } else {
    where.approvalStatus = { in: ["PUBLISHED", "FEATURED"] };
  }

  // Title search
  if (filters.search)
    where.title = { contains: filters.search, mode: "insensitive" };

  if (filters.size) where.size = parsePropertySize(filters.size);

  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.listingType) where.listingType = filters.listingType;
  if (filters.condition) where.condition = filters.condition;

  // Location — plain text contains (Google-resolved city/area passed from controller)
  if (filters.location)
    where.location = { contains: filters.location, mode: "insensitive" };

  // Price range
  if (filters.minPrice || filters.maxPrice) {
    where.askingPrice = {};
    if (filters.minPrice) where.askingPrice.gte = parseFloat(filters.minPrice);
    if (filters.maxPrice) where.askingPrice.lte = parseFloat(filters.maxPrice);
  }

  // Bedrooms
  if (filters.bedrooms) {
    const bed = parseInt(filters.bedrooms, 10);
    // If 5+ send bedrooms=5 meaning "5 or more"
    where.bedrooms = bed >= 5 ? { gte: bed } : bed;
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: getPublicPropertyOrderBy(filters.sortBy),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { orderBy: { createdAt: "asc" } },
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

  return { properties, total, page, pageSize };
};

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
        images: { orderBy: { createdAt: "asc" } },
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

const updateApprovalStatus = async ({ propertyId, status }) => {
  const validStatuses = ["PENDING", "PUBLISHED", "REJECTED", "FEATURED"];
  if (!validStatuses.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid values: ${validStatuses.join(", ")}`,
    );

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) throw new ApiError(404, "Property not found");

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: { approvalStatus: status },
    include: PROPERTY_INCLUDE,
  });
  return updated;
};

module.exports = {
  createProperty,
  updateProperty,
  deletePropertyImage,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  getPublicProperties,
  adminGetAllProperties,
  updateApprovalStatus,
};
