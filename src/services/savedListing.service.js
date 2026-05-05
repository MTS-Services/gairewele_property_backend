const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

// Toggle save/unsave — same call, same endpoint
const toggleSaveListing = async ({ userId, propertyId }) => {
  // Check property exists
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });
  if (!property) throw new ApiError(404, "Property not found");

  const existing = await prisma.savedListing.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });

  if (existing) {
    await prisma.savedListing.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return { saved: false, propertyId };
  }

  await prisma.savedListing.create({ data: { userId, propertyId } });
  return { saved: true, propertyId };
};

// Get all saved listings for logged-in user
const getMySavedListings = async ({
  userId,
  propertyType,
  page = 1,
  pageSize = 20,
}) => {
  const where = { userId };

  if (propertyType) {
    where.property = { propertyType };
  }

  const [savedListings, total] = await Promise.all([
    prisma.savedListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: {
          include: {
            images: { take: 1, select: { url: true } },
          },
        },
      },
    }),
    prisma.savedListing.count({ where }),
  ]);

  return { savedListings, total, page, pageSize };
};

// Get single saved listing by propertyId — checks it's actually saved by this user
const getSavedListingById = async ({ userId, propertyId }) => {
  const saved = await prisma.savedListing.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    include: {
      property: {
        include: { images: true },
      },
    },
  });

  if (!saved) throw new ApiError(404, "Listing not saved");
  return saved;
};

module.exports = {
  toggleSaveListing,
  getMySavedListings,
  getSavedListingById,
};
