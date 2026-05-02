const chatService = require("../services/chat.service");
const { success } = require("../utils/response");
const ApiError = require("../utils/ApiError");
const {
  chatFileUrl,
  detectAttachmentType,
} = require("../middleware/chatUpload");
const { emitToUser } = require("../socket");

const startOrGetConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) throw new ApiError(400, "receiverId is required");

    const data = await chatService.startOrGetConversation(
      req.user.id,
      receiverId,
    );
    return success(
      res,
      data,
      data.isNew ? "Conversation started" : "Conversation found",
      data.isNew ? 201 : 200,
    );
  } catch (err) {
    next(err);
  }
};


const getConversations = async (req, res, next) => {
  try {
    const data = await chatService.getConversations(req.user.id);
    return success(res, data, "Conversations fetched");
  } catch (err) {
    next(err);
  }
};


const getConversationMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const data = await chatService.getConversationMessages({
      conversationId,
      userId: req.user.id,
    });
    return success(res, data, "Messages fetched");
  } catch (err) {
    next(err);
  }
};


const sendMessage = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { content, mediaUrl, mediaType } = req.body;


    const resolvedMediaUrl = req.file
      ? chatFileUrl(req.file.filename)
      : mediaUrl || null;
    const resolvedMediaType = req.file
      ? detectAttachmentType(req.file.mimetype)
      : mediaType || null;

    const message = await chatService.sendMessage({
      conversationId,
      senderId: req.user.id,
      content,
      mediaUrl: resolvedMediaUrl,
      mediaType: resolvedMediaType,
    });

    // Real-time delivery via Socket.IO
    emitToUser(message.receiverId, "message:new", message);
    emitToUser(req.user.id, "message:sent", message);

    return success(res, message, "Message sent", 201);
  } catch (err) {
    next(err);
  }
};


const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "No file uploaded");
    return success(
      res,
      {
        url: chatFileUrl(req.file.filename),
        type: detectAttachmentType(req.file.mimetype),
        mimeType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
      },
      "File uploaded successfully",
      201,
    );
  } catch (err) {
    next(err);
  }
};


const markAsRead = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const data = await chatService.markAsRead({
      conversationId,
      userId: req.user.id,
    });
    return success(res, data, "Messages marked as read");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startOrGetConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  uploadMedia,
  markAsRead,
};
