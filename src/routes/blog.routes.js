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

// Accessible by ADMIN (super) and SUB_ADMIN_BLOG
const blogAdmin = [authenticate, authorize("ADMIN", "SUB_ADMIN_BLOG")];

router.get("/admin/blogs/stats", ...blogAdmin, getBlogStats);
router.get("/admin/blogs", ...blogAdmin, adminGetAllBlogs);
router.post("/admin/blogs", ...blogAdmin, blogUpload, createBlog);
router.get("/admin/blogs/:id", ...blogAdmin, getAdminBlogById);
router.patch("/admin/blogs/:id", ...blogAdmin, blogUpload, updateBlog);
router.patch("/admin/blogs/:id/status", ...blogAdmin, setBlogStatus);
router.delete("/admin/blogs/:id/images", ...blogAdmin, deleteBlogImage);
router.delete("/admin/blogs/:id", ...blogAdmin, deleteBlog);

router.get("/blogs", getPublicBlogs);
router.get("/blogs/:blogId", getBlogById);
router.get("/blogs/slug/:slug", getBlogBySlug);

module.exports = router;
