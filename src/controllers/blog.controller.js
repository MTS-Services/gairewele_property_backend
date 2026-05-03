const blogService = require("../services/blog.service");
const { success } = require("../utils/response");

// ─── Admin ────────────────────────────────────────────────────────

// GET /api/admin/blogs/stats
const getBlogStats = async (req, res, next) => {
  try {
    const data = await blogService.getBlogStats();
    return success(res, data, "Blog stats fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/blogs
const adminGetAllBlogs = async (req, res, next) => {
  try {
    const { category, status, search, page, pageSize } = req.query;
    const data = await blogService.adminGetAllBlogs({
      category: category ? category.toUpperCase() : null,
      status: status ? status.toUpperCase() : null,
      search: search || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Blogs fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/blogs/:id
const getAdminBlogById = async (req, res, next) => {
  try {
    const data = await blogService.getAdminBlogById({ blogId: req.params.id });
    return success(res, data, "Blog fetched");
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/blogs
const createBlog = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      content,
      metaDescription,
      urlSlug,
      category,
      tags,
      authorName,
      pdfTitle,
      publishDate,
      excerpt,
      status,
    } = req.body;

    const imageFiles = req.files?.images || [];
    const pdfFile = req.files?.pdf?.[0] || null;

    const data = await blogService.createBlog({
      imageFiles,
      pdfFile,
      title,
      subtitle,
      content,
      metaDescription,
      urlSlug,
      category: category ? category.toUpperCase() : null,
      tags,
      authorName,
      pdfTitle,
      publishDate,
      excerpt,
      status: status ? status.toUpperCase() : null,
      adminId: req.user.id,
    });
    return success(res, data, "Blog created", 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/blogs/:id
const updateBlog = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      content,
      metaDescription,
      urlSlug,
      category,
      tags,
      authorName,
      pdfTitle,
      publishDate,
      excerpt,
      status,
    } = req.body;

    const imageFiles = req.files?.images || [];
    const pdfFile = req.files?.pdf?.[0] || null;

    const data = await blogService.updateBlog({
      blogId: req.params.id,
      imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      pdfFile: pdfFile || undefined,
      title,
      subtitle,
      content,
      metaDescription,
      urlSlug,
      category: category ? category.toUpperCase() : undefined,
      tags,
      authorName,
      pdfTitle,
      publishDate,
      excerpt,
      status: status ? status.toUpperCase() : undefined,
    });
    return success(res, data, "Blog updated");
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/blogs/:id
const deleteBlog = async (req, res, next) => {
  try {
    const data = await blogService.deleteBlog({ blogId: req.params.id });
    return success(res, data, "Blog deleted");
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/blogs/:id/images
// Body: { imageUrl: "https://..." }
const deleteBlogImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      const { error } = require("../utils/response");
      return error(res, "imageUrl is required", 400);
    }
    const data = await blogService.deleteBlogImage({
      blogId: req.params.id,
      imageUrl,
    });
    return success(res, data, "Image removed");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/blogs/:id/status
// Body: { status: "PUBLISHED" | "DRAFT" | "ARCHIVED" }
const setBlogStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      const { error } = require("../utils/response");
      return error(res, "status is required", 400);
    }
    const data = await blogService.setBlogStatus({
      blogId: req.params.id,
      status: status.toUpperCase(),
    });
    return success(res, data, `Blog ${data.status.toLowerCase()}`);
  } catch (err) {
    next(err);
  }
};

// ─── Public ───────────────────────────────────────────────────────

// GET /api/blogs
const getPublicBlogs = async (req, res, next) => {
  try {
    const { category, search, tag, page, pageSize } = req.query;
    const data = await blogService.getPublicBlogs({
      category: category ? category.toUpperCase() : null,
      search: search || null,
      tag: tag || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 12,
    });
    return success(res, data, "Blogs fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/blogs/:slug
const getBlogBySlug = async (req, res, next) => {
  try {
    const data = await blogService.getBlogBySlug({ slug: req.params.slug });
    return success(res, data, "Blog fetched");
  } catch (err) {
    next(err);
  }
};

// GET /api/blogs/:blogId  (UUID)
const getBlogById = async (req, res, next) => {
  try {
    const data = await blogService.getBlogById({ blogId: req.params.blogId });
    return success(res, data, "Blog fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
