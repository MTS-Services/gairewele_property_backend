const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const CHAT_DIR = path.join(UPLOAD_DIR, "chat");

if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CHAT_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});


const ALLOWED_MIME =
  /^(image\/(jpeg|jpg|png|gif|webp|avif)|video\/(mp4|webm|ogg|quicktime|x-matroska)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|zip|x-zip-compressed)|text\/plain)$/;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.test(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported file type for chat attachment"));
};

const chatUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, 
});

const detectAttachmentType = (mimetype = "") => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "file";
};

const chatFileUrl = (filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/chat/${filename}`;
};

module.exports = { chatUpload, chatFileUrl, detectAttachmentType };
