const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const BLOG_IMAGE_DIR = path.join(__dirname, "../../uploads/blog");
const BLOG_PDF_DIR = path.join(__dirname, "../../uploads/blogPdf");

[BLOG_IMAGE_DIR, BLOG_PDF_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === "pdf" ? BLOG_PDF_DIR : BLOG_IMAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === "pdf") {
    if (file.mimetype === "application/pdf") return cb(null, true);
    return cb(new Error("Only PDF files are allowed for the pdf field"));
  }
  const ALLOWED_EXT = /jpeg|jpg|png|gif|webp|avif/;
  const ALLOWED_MIME = /image\/(jpeg|jpg|png|gif|webp|avif)/;
  const ext = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
  const mime = ALLOWED_MIME.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(
    new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, avif)"),
  );
};

// Handles: images[] (up to 10) + pdf (optional, 1 file)
const blogUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, 
}).fields([
  { name: "images", maxCount: 10 },
  { name: "pdf", maxCount: 1 },
]);

const blogImageUrl = (filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/blog/${filename}`;
};

const blogPdfUrl = (filename) => {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/blogPdf/${filename}`;
};

const removeFile = (fileUrl, subfolder) => {
  if (!fileUrl) return;
  const filename = path.basename(fileUrl);
  const filePath = path.join(__dirname, `../../uploads/${subfolder}`, filename);
  fs.promises.unlink(filePath).catch(() => {});
};

module.exports = { blogUpload, blogImageUrl, blogPdfUrl, removeFile };
