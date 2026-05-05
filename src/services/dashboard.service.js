const prisma = require("../config/prisma");

const getUserDashboard = async ({ userId }) => {
  const [
    savedPropertiesCount,
    activeRequestsCount,
    unreadMessagesCount,
    recentSaved,
  ] = await Promise.all([
    // Total saved properties
    prisma.savedListing.count({ where: { userId } }),

    // Active requests: NEW or IN_PROCESS
    prisma.propertyRequest.count({
      where: { userId, status: { in: ["NEW", "IN_PROCESS"] } },
    }),

    // Unread messages received
    prisma.message.count({
      where: { receiverId: userId, isRead: false },
    }),

    // Recent 3 saved properties for the dashboard cards
    prisma.savedListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        property: {
          include: {
            images: { take: 1, select: { url: true } },
          },
        },
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

module.exports = { getUserDashboard };
