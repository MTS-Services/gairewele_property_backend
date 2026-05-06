const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const ALLOWED_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

// Reusable include for property with images + owner
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
  const where = {
    approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
  };

  // Title search
  if (filters.search)
    where.title = { contains: filters.search, mode: "insensitive" };

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
      orderBy: [{ approvalStatus: "desc" }, { createdAt: "desc" }],
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
