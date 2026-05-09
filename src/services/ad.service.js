const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { adFileUrl } = require("../middleware/adUpload");
const path = require("path");
const fs = require("fs");

const VALID_PLACEMENTS = ["HOMEPAGE", "BLOG", "PROPERTIES", "REGISTER"];
const VALID_STATUSES = ["SPONSOR", "FEATURED", "STANDARD"];

const AD_INCLUDE = {
  createdBy: {
    select: { id: true, fullName: true, email: true, role: true },
  },
};

// Remove the file from disk if it lives under /uploads/ad/
const removeAdFile = (imageUrl) => {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(__dirname, "../../uploads/ad", filename);
  fs.promises.unlink(filePath).catch(() => {}); // ignore if missing
};

const validateDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end))
    throw new ApiError(400, "Invalid startDate or endDate");
  if (end <= start) throw new ApiError(400, "endDate must be after startDate");
  return { start, end };
};


const createAd = async ({
  file,
  title,
  description,
  liveLink,
  placement,
  status,
  startDate,
  endDate,
  adminId,
}) => {
  if (!file) throw new ApiError(400, "Ad image is required");
  if (!title) throw new ApiError(400, "Title is required");
  if (!liveLink)
    throw new ApiError(400, "Campaign link (liveLink) is required");
  if (!placement || !VALID_PLACEMENTS.includes(placement))
    throw new ApiError(
      400,
      `Invalid placement. Valid: ${VALID_PLACEMENTS.join(", ")}`,
    );
  if (status && !VALID_STATUSES.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
    );
  if (!startDate || !endDate)
    throw new ApiError(400, "startDate and endDate are required");

  const { start, end } = validateDates(startDate, endDate);

  const ad = await prisma.advertisement.create({
    data: {
      image: adFileUrl(file.filename),
      title,
      description: description || null,
      liveLink,
      placement,
      status: status || "STANDARD",
      startDate: start,
      endDate: end,
      createdById: adminId,
    },
    include: AD_INCLUDE,
  });

  return ad;
};

const adminGetAllAds = async ({
  placement,
  status,
  search,
  page = 1,
  pageSize = 20,
}) => {
  const where = {};

  if (placement) {
    if (!VALID_PLACEMENTS.includes(placement))
      throw new ApiError(
        400,
        `Invalid placement. Valid: ${VALID_PLACEMENTS.join(", ")}`,
      );
    where.placement = placement;
  }

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
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [ads, total, byPlacement, byStatus] = await Promise.all([
    prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: AD_INCLUDE,
    }),
    prisma.advertisement.count({ where }),
    prisma.advertisement.groupBy({
      by: ["placement"],
      _count: { _all: true },
    }),
    prisma.advertisement.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // Compute live/expired/scheduled/paused for each ad
  const now = new Date();
  const decorated = ads.map((ad) => ({
    ...ad,
    isPaused: ad.isPaused,
    isLive: !ad.isPaused && ad.startDate <= now && ad.endDate >= now,
    isExpired: !ad.isPaused && ad.endDate < now,
    isScheduled: !ad.isPaused && ad.startDate > now,
  }));

  const countsByPlacement = VALID_PLACEMENTS.reduce(
    (acc, p) => ({ ...acc, [p]: 0 }),
    {},
  );
  for (const g of byPlacement) countsByPlacement[g.placement] = g._count._all;

  const countsByStatus = VALID_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {},
  );
  for (const g of byStatus) countsByStatus[g.status] = g._count._all;

  return {
    ads: decorated,
    total,
    page,
    pageSize,
    countsByPlacement,
    countsByStatus,
  };
};

const getAdById = async ({ adId }) => {
  const ad = await prisma.advertisement.findUnique({
    where: { id: adId },
    include: AD_INCLUDE,
  });
  if (!ad) throw new ApiError(404, "Advertisement not found");
  return ad;
};

const updateAd = async ({
  adId,
  file,
  title,
  description,
  liveLink,
  placement,
  status,
  startDate,
  endDate,
}) => {
  const ad = await prisma.advertisement.findUnique({ where: { id: adId } });
  if (!ad) throw new ApiError(404, "Advertisement not found");

  const data = {};

  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (liveLink !== undefined) data.liveLink = liveLink;

  if (placement !== undefined) {
    if (!VALID_PLACEMENTS.includes(placement))
      throw new ApiError(
        400,
        `Invalid placement. Valid: ${VALID_PLACEMENTS.join(", ")}`,
      );
    data.placement = placement;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    data.status = status;
  }

  if (startDate !== undefined || endDate !== undefined) {
    const newStart = startDate ? new Date(startDate) : ad.startDate;
    const newEnd = endDate ? new Date(endDate) : ad.endDate;
    if (isNaN(newStart) || isNaN(newEnd))
      throw new ApiError(400, "Invalid startDate or endDate");
    if (newEnd <= newStart)
      throw new ApiError(400, "endDate must be after startDate");
    data.startDate = newStart;
    data.endDate = newEnd;
  }

  // Replace image if a new one was uploaded
  if (file) {
    data.image = adFileUrl(file.filename);
    removeAdFile(ad.image);
  }

  const updated = await prisma.advertisement.update({
    where: { id: adId },
    data,
    include: AD_INCLUDE,
  });
  return updated;
};

const deleteAd = async ({ adId }) => {
  const ad = await prisma.advertisement.findUnique({ where: { id: adId } });
  if (!ad) throw new ApiError(404, "Advertisement not found");

  await prisma.advertisement.delete({ where: { id: adId } });
  removeAdFile(ad.image);
  return { id: adId };
};


// Ordered by status priority: SPONSOR > FEATURED > STANDARD, then newest first.
const getAdsByPlacement = async ({ placement, limit = 10 }) => {
  if (!VALID_PLACEMENTS.includes(placement))
    throw new ApiError(
      400,
      `Invalid placement. Valid: ${VALID_PLACEMENTS.join(", ")}`,
    );

  const now = new Date();
  const ads = await prisma.advertisement.findMany({
    where: {
      placement,
      isPaused: false,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    // Enum order in schema: SPONSOR=0, FEATURED=1, STANDARD=2 → asc puts SPONSOR first
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: limit,
  });

  return ads;
};


const trackAd = async ({ adId, type }) => {
  if (!adId) throw new ApiError(400, "Ad id is required");
  if (type !== "impression" && type !== "click")
    throw new ApiError(400, 'type must be "impression" or "click"');

  const ad = await prisma.advertisement.findUnique({ where: { id: adId } });
  if (!ad) throw new ApiError(404, "Advertisement not found");

  const updated = await prisma.advertisement.update({
    where: { id: adId },
    data:
      type === "impression"
        ? { impressions: { increment: 1 } }
        : { clicks: { increment: 1 } },
    select: { id: true, impressions: true, clicks: true },
  });

  return updated;
};


const togglePauseAd = async ({ adId }) => {
  const ad = await prisma.advertisement.findUnique({ where: { id: adId } });
  if (!ad) throw new ApiError(404, "Advertisement not found");

  const updated = await prisma.advertisement.update({
    where: { id: adId },
    data: { isPaused: !ad.isPaused },
    include: AD_INCLUDE,
  });

  return { ad: updated, paused: updated.isPaused };
};


const getAdStats = async () => {
  const [totals, byPlacement] = await Promise.all([
    prisma.advertisement.aggregate({
      _sum: { impressions: true, clicks: true },
      _count: { _all: true },
    }),
    // Per-placement CTR
    prisma.advertisement.groupBy({
      by: ["placement"],
      _sum: { impressions: true, clicks: true },
    }),
  ]);

  const totalImpressions = totals._sum.impressions || 0;
  const totalClicks = totals._sum.clicks || 0;
  const totalCampaigns = totals._count._all;
  const ctr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  const placementEfficiency = byPlacement.map((g) => {
    const imp = g._sum.impressions || 0;
    const clk = g._sum.clicks || 0;
    return {
      placement: g.placement,
      impressions: imp,
      clicks: clk,
      ctr: imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0,
    };
  });

  return {
    totalImpressions,
    totalClicks,
    totalCampaigns,
    ctr: parseFloat(ctr),
    placementEfficiency,
  };
};

module.exports = {
  createAd,
  adminGetAllAds,
  getAdById,
  updateAd,
  deleteAd,
  getAdsByPlacement,
  trackAd,
  togglePauseAd,
  getAdStats,
  VALID_PLACEMENTS,
  VALID_STATUSES,
};
