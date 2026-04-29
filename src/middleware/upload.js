const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const IMAGE_DIR = path.join(UPLOAD_DIR, "image");
const LOGO_DIR = path.join(UPLOAD_DIR, "companyLogo");

// Ensure subdirectories exist
[UPLOAD_DIR, IMAGE_DIR, LOGO_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Destination: image → uploads/image/, companyLogo → uploads/companyLogo/
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dir = file.fieldname === "companyLogo" ? LOGO_DIR : IMAGE_DIR;
    cb(null, dir);
  },
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

const fileUrl = (subfolder, filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/${subfolder}/${filename}`;
};

module.exports = { upload, fileUrl };
