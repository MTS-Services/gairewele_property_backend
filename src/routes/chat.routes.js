const router = require("express").Router();
const chatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth");
const { chatUpload } = require("../middleware/chatUpload");

router.use(authenticate);

// Start or retrieve a 1-on-1 conversation  { receiverId }
router.post("/conversations", chatController.startOrGetConversation);

// Inbox — list all my conversations
router.get("/conversations", chatController.getConversations);

// Get paginated messages  ?page=1&limit=50
router.get("/conversations/:id", chatController.getConversationMessages);

// Send a message (text + optional mediaUrl/mediaType in body, OR upload file directly)
router.post(
  "/conversations/:id",
  chatUpload.single("media"),
  chatController.sendMessage,
);

// Mark all incoming messages as read
router.put("/conversations/:id/read", chatController.markAsRead);

// Upload media separately → returns { url, type } to use in sendMessage
router.post("/upload", chatUpload.single("file"), chatController.uploadMedia);

module.exports = router;
