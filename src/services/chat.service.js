const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const PROFESSIONAL_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

const assertCanChat = (senderRole, receiverRole) => {
  if (
    PROFESSIONAL_ROLES.includes(senderRole) &&
    PROFESSIONAL_ROLES.includes(receiverRole)
  ) {
    throw new ApiError(
      403,
      "Agents, developers and owners cannot chat with each other",
    );
  }
};

const sortIds = (a, b) => (a < b ? [a, b] : [b, a]);

const sanitizeUser = (u) =>
  u && { id: u.id, fullName: u.fullName, image: u.image ?? null, role: u.role };

// ─────────────────────────────────────────────────────────────────
// Build the "conversation detail" object returned to the client
// ─────────────────────────────────────────────────────────────────
const getConversationDetail = async (conversationId, currentUserId) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, role: true, image: true },
          },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!conversation) return null;

  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== currentUserId,
  );
  const unreadCount = await prisma.message.count({
    where: { conversationId, receiverId: currentUserId, isRead: false },
  });

  return {
    id: conversation.id,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    otherUser: sanitizeUser(otherParticipant?.user ?? null),
    lastMessage: conversation.messages[0] ?? null,
    unreadCount,
  };
};

// ─────────────────────────────────────────────────────────────────
// Start or get a 1-on-1 conversation
// ─────────────────────────────────────────────────────────────────
const startOrGetConversation = async (currentUserId, receiverId) => {
  if (currentUserId === receiverId) {
    throw new ApiError(400, "You cannot start a conversation with yourself");
  }

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUserId } }),
    prisma.user.findUnique({ where: { id: receiverId } }),
  ]);
  if (!receiver) throw new ApiError(404, "User not found");
  if (!receiver.isActive)
    throw new ApiError(403, "This user's account is deactivated");
  assertCanChat(sender.role, receiver.role);

  // Find an existing 1-on-1 conversation between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: currentUserId } } },
        { participants: { some: { userId: receiverId } } },
      ],
    },
    include: { participants: true },
  });

  if (existing && existing.participants.length === 2) {
    return {
      conversation: await getConversationDetail(existing.id, currentUserId),
      isNew: false,
    };
  }

  const created = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: currentUserId }, { userId: receiverId }],
      },
    },
  });

  return {
    conversation: await getConversationDetail(created.id, currentUserId),
    isNew: true,
  };
};

// ─────────────────────────────────────────────────────────────────
// List all conversations for a user (inbox)
// ─────────────────────────────────────────────────────────────────
const getConversations = async (userId) => {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: "desc" } },
    select: { conversationId: true },
  });

  const conversations = await Promise.all(
    participations.map((p) => getConversationDetail(p.conversationId, userId)),
  );
  return conversations.filter(Boolean);
};

// ─────────────────────────────────────────────────────────────────
// Get paginated messages of a conversation
// ─────────────────────────────────────────────────────────────────
const getConversationMessages = async ({ conversationId, userId }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new ApiError(404, "Conversation not found");

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: { id: true, fullName: true, image: true, role: true },
      },
    },
  });

  await prisma.message.updateMany({
    where: { conversationId, receiverId: userId, isRead: false },
    data: { isRead: true },
  });

  return { conversationId, messages };
};

// ─────────────────────────────────────────────────────────────────
// Send a message inside an existing conversation
// ─────────────────────────────────────────────────────────────────
const sendMessage = async ({
  conversationId,
  senderId,
  content,
  mediaUrl,
  mediaType,
}) => {
  if (!content && !mediaUrl) {
    throw new ApiError(400, "Message must have content or a media attachment");
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const isParticipant = conversation.participants.some(
    (p) => p.userId === senderId,
  );
  if (!isParticipant)
    throw new ApiError(403, "You are not part of this conversation");

  const receiverParticipant = conversation.participants.find(
    (p) => p.userId !== senderId,
  );
  const receiverId = receiverParticipant.userId;

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, image: true, role: true },
        },
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return msg;
  });

  return message;
};

// ─────────────────────────────────────────────────────────────────
// Mark all incoming messages as read
// ─────────────────────────────────────────────────────────────────
const markAsRead = async ({ conversationId, userId }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new ApiError(404, "Conversation not found");

  const { count } = await prisma.message.updateMany({
    where: { conversationId, receiverId: userId, isRead: false },
    data: { isRead: true },
  });
  return { markedRead: count };
};

module.exports = {
  startOrGetConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
};
