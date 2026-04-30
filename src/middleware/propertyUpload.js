const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const GALLERY_DIR = path.join(__dirname, "../../uploads/gallery");
if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GALLERY_DIR),
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

// Up to 20 gallery photos, 10 MB each
const galleryUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array("gallery", 20);

const galleryFileUrl = (filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/gallery/${filename}`;
};

module.exports = { galleryUpload, galleryFileUrl };
