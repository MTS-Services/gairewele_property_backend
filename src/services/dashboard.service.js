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


const getAgentDashboard = async ({ userId }) => {
  const [
    activeListingsCount,
    pendingApprovalCount,
    subscription,
    recentListings,
  ] = await Promise.all([
   
    prisma.property.count({
      where: {
        ownerId: userId,
        approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
      },
    }),
  
    prisma.property.count({
      where: { ownerId: userId, approvalStatus: "PENDING" },
    }),
   
    prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, isActive: true, endDate: true },
    }),
   
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

const getAdminDashboard = async ({ months = 6 } = {}) => {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);


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
  
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),

    prisma.property.count(),


    prisma.advertisement.count({
      where: {
        isPaused: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    prisma.property.aggregate({
      _sum: { askingPrice: true },
      where: {
        approvalStatus: { in: ["PUBLISHED", "FEATURED"] },
        createdAt: { gte: startOfMonth },
      },
    }),

  
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

// ─── ADMIN Subscription / Revenue dashboard ──────────────────────
const getAdminSubscriptionDashboard = async ({ year } = {}) => {
  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear + 1, 0, 1);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = thisMonthStart;

  const [
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    packagesSold,
    planCounts,
  ] = await Promise.all([
    // Total all-time revenue from successful payments
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS" },
    }),

   
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", paidAt: { gte: thisMonthStart } },
    }),

    // Revenue last month (for growth %)
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "SUCCESS",
        paidAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
    }),

  
    prisma.payment.count({ where: { status: "SUCCESS" } }),

    prisma.payment.groupBy({
      by: ["plan"],
      where: { status: "SUCCESS" },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);


  const thisMonthNum = Number(revenueThisMonth._sum.amount || 0);
  const lastMonthNum = Number(revenueLastMonth._sum.amount || 0);
  const revenueGrowth =
    lastMonthNum === 0
      ? null
      : Math.round(((thisMonthNum - lastMonthNum) / lastMonthNum) * 1000) / 10;

 
  const topPlan = planCounts.sort((a, b) => b._count._all - a._count._all)[0];

 
  const packageDistribution = planCounts.map((p) => ({
    plan: p.plan,
    count: p._count._all,
    revenue: Number(p._sum.amount || 0),
    percentage:
      packagesSold > 0
        ? Math.round((p._count._all / packagesSold) * 1000) / 10
        : 0,
  }));


  const monthlyPayments = await prisma.payment.findMany({
    where: { status: "SUCCESS", paidAt: { gte: yearStart, lt: yearEnd } },
    select: { amount: true, paidAt: true, plan: true },
  });

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const revenueOverview = monthNames.map((month, i) => ({
    month,
    revenue: 0,
    count: 0,
  }));

  for (const p of monthlyPayments) {
    const m = new Date(p.paidAt).getMonth();
    revenueOverview[m].revenue += Number(p.amount);
    revenueOverview[m].count += 1;
  }

  return {
    stats: {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      revenueThisMonth: thisMonthNum,
      revenueGrowthPercent: revenueGrowth,
      packagesSold,
      topSellingPackage: topPlan?.plan || null,
    },
    revenueOverview,
    packageDistribution,
  };
};

module.exports = {
  getUserDashboard,
  getAgentDashboard,
  getAdminDashboard,
  getAdminSubscriptionDashboard,
};
