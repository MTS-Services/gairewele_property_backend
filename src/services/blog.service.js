const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const {
  blogImageUrl,
  blogPdfUrl,
  removeFile,
} = require("../middleware/blogUpload");

const CATEGORY_ENUM_TO_LABEL = {
  POLICY_REGULATION: "Policy & Regulation",
  PROPERTY_NEWS: "Property News",
  OPINION_COMMENTARY: "Opinion & Commentary",
  PROPERTY_INVESTMENT: "Property Investment",
  MARKET_ANALYSIS: "Market Analysis",
  DEVELOPERS_DEVELOPMENT: "Developers & Development",
  PROPERTY_LAW: "Property Law",
  FRAUD_ALERTS: "Fraud Alerts",
  PROPERTY_DISPUTES: "Property Disputes",
  NEWS: "News",
  LANDLORD_TENANTS: "Landlord & Tenants",
  MARKET_TRENDS: "Market Trends",
};
const VALID_CATEGORIES = Object.keys(CATEGORY_ENUM_TO_LABEL);
const VALID_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

const normalizeToken = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const CATEGORY_LOOKUP = (() => {
  const lookup = new Map();
  for (const [enumValue, label] of Object.entries(CATEGORY_ENUM_TO_LABEL)) {
    lookup.set(enumValue, enumValue);
    lookup.set(enumValue.toLowerCase(), enumValue);
    lookup.set(normalizeToken(enumValue), enumValue);

    lookup.set(label, enumValue);
    lookup.set(label.toLowerCase(), enumValue);
    lookup.set(normalizeToken(label), enumValue);
  }
  return lookup;
})();

const normalizeCategory = (value) => {
  if (value === undefined || value === null) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  return (
    CATEGORY_LOOKUP.get(raw) ||
    CATEGORY_LOOKUP.get(raw.toLowerCase()) ||
    CATEGORY_LOOKUP.get(normalizeToken(raw)) ||
    null
  );
};

const validCategoriesMessage = () =>
  `Invalid category. Valid: ${Object.values(CATEGORY_ENUM_TO_LABEL).join(", ")}`;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

// Auto-publish condition: DRAFT posts with a publishDate <= now appear publicly
const publicWhere = () => {
  const now = new Date();
  return {
    OR: [
      { status: "PUBLISHED" },
      { status: "DRAFT", publishDate: { not: null, lte: now } },
    ],
  };
};

// Computed fields added to every blog object returned to admin.
// If a DRAFT blog's publishDate has passed, promote it to PUBLISHED in the DB (fire-and-forget).
const decorateBlog = (blog) => {
  const now = new Date();
  let effectiveStatus = blog.status;
  if (
    blog.status === "DRAFT" &&
    blog.publishDate &&
    new Date(blog.publishDate) <= now
  ) {
    effectiveStatus = "PUBLISHED";
    // Persist promotion — no await, don't block the response
    prisma.blog
      .update({ where: { id: blog.id }, data: { status: "PUBLISHED" } })
      .catch(() => {}); // silent — next request will retry if it fails
  }
  return { ...blog, effectiveStatus };
};

const slugify = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ─────────────────────────────────────────────────────────────────
// ADMIN — CRUD
// ─────────────────────────────────────────────────────────────────

const createBlog = async ({
  imageFiles, // req.files["images"]
  pdfFile, // req.files["pdf"]?.[0]
  title,
  subtitle,
  content,
  metaDescription,
  urlSlug,
  category,
  tags, // comma-separated string or JSON array
  authorName,
  pdfTitle,
  publishDate,
  excerpt,
  status,
  adminId,
}) => {
  if (!title) throw new ApiError(400, "title is required");
  if (!content) throw new ApiError(400, "content is required");
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) throw new ApiError(400, validCategoriesMessage());

  if (status && !VALID_STATUSES.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
    );

  // Generate slug from title if not provided
  const finalSlug = urlSlug ? urlSlug.trim() : slugify(title);

  // Check slug uniqueness
  const existing = await prisma.blog.findUnique({
    where: { urlSlug: finalSlug },
  });
  if (existing)
    throw new ApiError(409, `URL slug "${finalSlug}" already in use`);

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try {
      parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
    } catch {
      parsedTags = String(tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  // Build image URL array
  const images = imageFiles
    ? imageFiles.map((f) => blogImageUrl(f.filename))
    : [];

  // PDF
  const pdfFileUrl = pdfFile ? blogPdfUrl(pdfFile.filename) : null;

  // Validate publishDate
  let parsedPublishDate = null;
  if (publishDate) {
    parsedPublishDate = new Date(publishDate);
    if (isNaN(parsedPublishDate))
      throw new ApiError(400, "Invalid publishDate");
  }
  // Create blog in DB
  const blog = await prisma.blog.create({
    data: {
      title,
      subtitle: subtitle || null,
      content,
      metaDescription: metaDescription || null,
      urlSlug: finalSlug,
      category: normalizedCategory,
      tags: parsedTags,
      images,
      authorId: adminId,
      authorName: authorName || null,
      pdfTitle: pdfTitle || null,
      pdfFileUrl,
      publishDate: parsedPublishDate,
      excerpt: excerpt || null,
      status: status || "DRAFT",
    },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return decorateBlog(blog);
};

// Partial update — only fields provided will be updated. Images and PDF are replaced if new files are uploaded.
const updateBlog = async ({
  blogId,
  imageFiles,
  pdfFile,
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
}) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new ApiError(404, "Blog not found");

  const data = {};

  if (title !== undefined) data.title = title;
  if (subtitle !== undefined) data.subtitle = subtitle || null;
  if (content !== undefined) data.content = content;
  if (metaDescription !== undefined)
    data.metaDescription = metaDescription || null;
  if (excerpt !== undefined) data.excerpt = excerpt || null;
  if (authorName !== undefined) data.authorName = authorName || null;
  if (pdfTitle !== undefined) data.pdfTitle = pdfTitle || null;

  if (urlSlug !== undefined) {
    const slug = urlSlug.trim();
    const existing = await prisma.blog.findUnique({ where: { urlSlug: slug } });
    if (existing && existing.id !== blogId)
      throw new ApiError(409, `URL slug "${slug}" already in use`);
    data.urlSlug = slug;
  }

  if (category !== undefined) {
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) throw new ApiError(400, validCategoriesMessage());
    data.category = normalizedCategory;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    data.status = status;
  }

  if (tags !== undefined) {
    try {
      data.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
    } catch {
      data.tags = String(tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  if (publishDate !== undefined) {
    if (publishDate === "" || publishDate === null) {
      data.publishDate = null;
    } else {
      const d = new Date(publishDate);
      if (isNaN(d)) throw new ApiError(400, "Invalid publishDate");
      data.publishDate = d;
    }
  }

  if (imageFiles && imageFiles.length > 0) {
    blog.images.forEach((url) => removeFile(url, "blog"));
    data.images = imageFiles.map((f) => blogImageUrl(f.filename));
  }

  if (pdfFile) {
    data.pdfFileUrl = blogPdfUrl(pdfFile.filename);
    removeFile(blog.pdfFileUrl, "blogPdf");
  }

  const updated = await prisma.blog.update({
    where: { id: blogId },
    data,
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return decorateBlog(updated);
};

const deleteBlog = async ({ blogId }) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new ApiError(404, "Blog not found");

  await prisma.blog.delete({ where: { id: blogId } });

  blog.images.forEach((url) => removeFile(url, "blog"));
  removeFile(blog.pdfFileUrl, "blogPdf");

  return { id: blogId };
};

const deleteBlogImage = async ({ blogId, imageUrl }) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new ApiError(404, "Blog not found");

  if (!blog.images.includes(imageUrl))
    throw new ApiError(404, "Image not found on this blog post");

  const updated = await prisma.blog.update({
    where: { id: blogId },
    data: { images: blog.images.filter((u) => u !== imageUrl) },
  });

  removeFile(imageUrl, "blog");
  return updated;
};

const setBlogStatus = async ({ blogId, status }) => {
  if (!VALID_STATUSES.includes(status))
    throw new ApiError(
      400,
      `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
    );

  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new ApiError(404, "Blog not found");

  const updated = await prisma.blog.update({
    where: { id: blogId },
    data: { status },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return decorateBlog(updated);
};

const adminGetAllBlogs = async ({
  category,
  status,
  search,
  page = 1,
  pageSize = 20,
}) => {
  const where = {};

  if (category) {
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) throw new ApiError(400, validCategoriesMessage());
    where.category = normalizedCategory;
  }

  if (status) {
    if (!VALID_STATUSES.includes(status))
      throw new ApiError(
        400,
        `Invalid status. Valid: ${VALID_STATUSES.join(", ")}`,
      );
    where.status = status;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
      { authorName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [blogs, total, byCategory, byStatus] = await Promise.all([
    prisma.blog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: { select: { id: true, fullName: true } } },
    }),
    prisma.blog.count({ where }),
    prisma.blog.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.blog.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countsByCategory = VALID_CATEGORIES.reduce(
    (a, c) => ({ ...a, [c]: 0 }),
    {},
  );
  for (const g of byCategory) countsByCategory[g.category] = g._count._all;

  const countsByStatus = VALID_STATUSES.reduce(
    (a, s) => ({ ...a, [s]: 0 }),
    {},
  );
  for (const g of byStatus) countsByStatus[g.status] = g._count._all;

  return {
    blogs: blogs.map(decorateBlog),
    total,
    page,
    pageSize,
    countsByCategory,
    countsByStatus,
  };
};

const getAdminBlogById = async ({ blogId }) => {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });
  if (!blog) throw new ApiError(404, "Blog not found");
  return decorateBlog(blog);
};

const getBlogStats = async () => {
  const [totals, bestEngagement, byCategory] = await Promise.all([
    prisma.blog.aggregate({
      _sum: { views: true },
      _count: { _all: true },
    }),
    prisma.blog.findMany({
      orderBy: { views: "desc" },
      take: 3,
      select: { id: true, title: true, views: true, urlSlug: true },
    }),
    prisma.blog.groupBy({
      by: ["category"],
      _sum: { views: true },
      _count: { _all: true },
    }),
  ]);

  const totalViews = totals._sum.views || 0;
  const totalPosts = totals._count._all;

  // SEO health: % of posts that have metaDescription
  const withMeta = await prisma.blog.count({
    where: { metaDescription: { not: null } },
  });
  const seoHealth =
    totalPosts > 0 ? Math.round((withMeta / totalPosts) * 100) : 0;

  return {
    totalViews,
    totalPosts,
    seoHealth,
    bestEngagement,
    byCategory: byCategory.map((g) => ({
      category: g.category,
      posts: g._count._all,
      views: g._sum.views || 0,
    })),
  };
};

const getPublicBlogs = async ({
  category,
  search,
  tag,
  page = 1,
  pageSize = 12,
}) => {
  const where = { ...publicWhere() };

  if (category) {
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) throw new ApiError(400, validCategoriesMessage());
    where.category = normalizedCategory;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { excerpt: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Get blogs
  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { publishDate: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        subtitle: true,
        excerpt: true,
        images: true,
        category: true,
        tags: true,
        urlSlug: true,
        authorName: true,
        publishDate: true,
        views: true,
        createdAt: true,
      },
    }),
    prisma.blog.count({ where }),
  ]);

  return { blogs, total, page, pageSize };
};

const _fetchPublicBlog = async (blog) => {
  if (!blog) throw new ApiError(404, "Blog not found");

  const now = new Date();
  const isVisible =
    blog.status === "PUBLISHED" ||
    (blog.status === "DRAFT" && blog.publishDate && blog.publishDate <= now);

  if (!isVisible) throw new ApiError(404, "Blog not found");

  // Increment view count (fire-and-forget)
  prisma.blog
    .update({ where: { id: blog.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return blog;
};

const getBlogBySlug = async ({ slug }) => {
  const blog = await prisma.blog.findUnique({
    where: { urlSlug: slug },
    include: { author: { select: { id: true, fullName: true } } },
  });
  return _fetchPublicBlog(blog);
};

const getBlogById = async ({ blogId }) => {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { author: { select: { id: true, fullName: true } } },
  });
  return _fetchPublicBlog(blog);
};

module.exports = {
  createBlog,
  updateBlog,
  deleteBlog,
  deleteBlogImage,
  setBlogStatus,
  adminGetAllBlogs,
  getAdminBlogById,
  getBlogStats,
  getPublicBlogs,
  getBlogBySlug,
  getBlogById,
  VALID_CATEGORIES,
  VALID_STATUSES,
};
