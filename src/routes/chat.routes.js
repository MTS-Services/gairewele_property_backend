const router = require("express").Router();
const chatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth");
const { chatUpload } = require("../middleware/chatUpload");

router.use(authenticate);

router.post("/conversations", chatController.startOrGetConversation);
router.get("/conversations", chatController.getConversations);
router.get("/conversations/:id", chatController.getConversationMessages);

router.post(
  "/conversations/:id",
  chatUpload.single("media"),
  chatController.sendMessage,
);

router.put("/conversations/:id/read", chatController.markAsRead);
router.post("/upload", chatUpload.single("file"), chatController.uploadMedia);

module.exports = router;
