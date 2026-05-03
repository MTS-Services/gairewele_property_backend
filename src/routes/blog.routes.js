const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { blogUpload } = require("../middleware/blogUpload");
const {
  getBlogStats,
  adminGetAllBlogs,
  getAdminBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  deleteBlogImage,
  setBlogStatus,
  getPublicBlogs,
  getBlogBySlug,
  getBlogById,
} = require("../controllers/blog.controller");

const isAdmin = [authenticate, authorize("ADMIN")];

// ─── Admin routes (mounted under /api/admin/blogs) ────────────────
router.get("/admin/blogs/stats", ...isAdmin, getBlogStats);
router.get("/admin/blogs", ...isAdmin, adminGetAllBlogs);
router.post("/admin/blogs", ...isAdmin, blogUpload, createBlog);
router.get("/admin/blogs/:id", ...isAdmin, getAdminBlogById);
router.patch("/admin/blogs/:id", ...isAdmin, blogUpload, updateBlog);
router.patch("/admin/blogs/:id/status", ...isAdmin, setBlogStatus);
router.delete("/admin/blogs/:id/images", ...isAdmin, deleteBlogImage);
router.delete("/admin/blogs/:id", ...isAdmin, deleteBlog);

// ─── Public routes (mounted under /api/blogs) ─────────────────────
router.get("/blogs", getPublicBlogs);
router.get("/blogs/:blogId", getBlogById); // GET /api/blogs/:id  (UUID)
router.get("/blogs/slug/:slug", getBlogBySlug); // GET /api/blogs/slug/:slug

module.exports = router;
