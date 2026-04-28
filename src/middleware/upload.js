const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

const ALLOWED_EXT = /jpeg|jpg|png|gif|webp|avif/;
const ALLOWED_MIME = /image\/(jpeg|jpg|png|gif|webp|avif)/;

const fileFilter = (_req, file, cb) => {
  const ext = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
  const mime = ALLOWED_MIME.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(
    new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, avif)"),
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Build the public URL for an uploaded file.
 * @param {string} filename
 * @returns {string}
 */
const fileUrl = (filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/${filename}`;
};

module.exports = { upload, fileUrl };
