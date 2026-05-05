const prisma = require("../config/prisma");

// ─── USER dashboard ───────────────────────────────────────────────
const getUserDashboard = async ({ userId }) => {
  const [
    savedPropertiesCount,
    activeRequestsCount,
    unreadMessagesCount,
    recentSaved,
  ] = await Promise.all([
    prisma.savedListing.count({ where: { userId } }),
    prisma.propertyRequest.count({
      where: { userId, status: { in: ["NEW", "IN_PROCESS"] } },
    }),
    prisma.message.count({ where: { receiverId: userId, isRead: false } }),
    prisma.savedListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        property: { include: { images: { take: 1, select: { url: true } } } },
      },
    }),
  ]);

  return {
    stats: {
      savedProperties: savedPropertiesCount,
      activeRequests: activeRequestsCount,
      unreadMessages: unreadMessagesCount,
    },
    recentSavedProperties: recentSaved.map((s) => s.property),
  };
};

// ─── AGENT / DEVELOPER / OWNER dashboard ─────────────────────────
const getAgentDashboard = async ({ userId }) => {
  const [
    activeListingsCount,
    pendingApprovalCount,
    subscription,
    recentListings,
  ] = await Promise.all([
    // Active = PUBLISHED or FEATURED
    prisma.property.count({
      where: {
        ownerId: userId,
        approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
      },
    }),
    // Pending admin approval
    prisma.property.count({
      where: { ownerId: userId, approvalStatus: "PENDING" },
    }),
    // Subscription status
    prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, isActive: true, endDate: true },
    }),
    // Recent listings for the table
    prisma.property.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        location: true,
        approvalStatus: true,
        createdAt: true,
        images: { take: 1, select: { url: true } },
      },
    }),
  ]);

  return {
    stats: {
      activeListings: activeListingsCount,
      pendingApproval: pendingApprovalCount,
      subscription: subscription
        ? {
            plan: subscription.plan,
            isActive: subscription.isActive,
            endDate: subscription.endDate,
          }
        : { plan: null, isActive: false, endDate: null },
    },
    recentListings,
  };
};

// ─── ADMIN dashboard ───────────────────────────────────────────────
const getAdminDashboard = async ({ months = 6 } = {}) => {
  const now = new Date();

  // Start of current month for "monthly revenue" (sum of askingPrice of published listings this month)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Start date for revenue trend (go back `months` months)
  const trendStart = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  );

  const [
    totalUsers,
    totalListings,
    activeAdsCount,
    monthlyRevenue,
    recentListings,
  ] = await Promise.all([
    // Total non-admin users
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),

    // Total listings (all statuses)
    prisma.property.count(),

    // Active ads: not paused, within date range
    prisma.advertisement.count({
      where: {
        isPaused: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    // Monthly revenue = sum of askingPrice of properties published this month
    prisma.property.aggregate({
      _sum: { askingPrice: true },
      where: {
        approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
        createdAt: { gte: startOfMonth },
      },
    }),

    // Active listings management table — most recent 10
    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        location: true,
        askingPrice: true,
        approvalStatus: true,
        createdAt: true,
        images: { take: 1, select: { url: true } },
        owner: { select: { id: true, fullName: true, companyName: true } },
      },
    }),
  ]);

  // Revenue trend: count of published listings grouped by month for last N months
  const trendRaw = await prisma.property.groupBy({
    by: ["createdAt"],
    where: {
      approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
      createdAt: { gte: trendStart },
    },
    _sum: { askingPrice: true },
    _count: { _all: true },
  });

  // Aggregate by month label
  const trendMap = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = d.toLocaleString("en", { month: "short", year: "numeric" });
    trendMap[key] = { month: key, count: 0, revenue: 0 };
  }
  for (const row of trendRaw) {
    const d = new Date(row.createdAt);
    const key = d.toLocaleString("en", { month: "short", year: "numeric" });
    if (trendMap[key]) {
      trendMap[key].count += row._count._all;
      trendMap[key].revenue += Number(row._sum.askingPrice || 0);
    }
  }

  return {
    stats: {
      totalUsers,
      totalListings,
      monthlyRevenue: Number(monthlyRevenue._sum.askingPrice || 0),
      activeAds: activeAdsCount,
    },
    revenueTrend: Object.values(trendMap),
    recentListings,
  };
};

module.exports = {
  getUserDashboard,
  getAgentDashboard,
  getAdminDashboard,
  getAdminDashboard,
};
