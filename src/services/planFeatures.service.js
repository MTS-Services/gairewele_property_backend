/**
 * planFeatures.service.js
 *
 * Manages the admin-editable plan feature limits stored in the PlanFeature table.
 * The DB rows are the source of truth; static PLANS values are only used as defaults
 * when seeding or when a row doesn't exist yet.
 */

const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { PLANS } = require("../config/plans");

/**
 * Seed PlanFeature rows on server startup.
 * Uses upsert so existing admin overrides are never overwritten.
 */
const seedDefaultPlanFeatures = async () => {
  for (const p of Object.values(PLANS)) {
    await prisma.planFeature.upsert({
      where: { plan: p.key },
      update: {}, // never touch existing admin edits
      create: {
        plan: p.key,
        maxListings: p.features.maxListings,
        maxImagesPerListing: p.features.maxImagesPerListing,
        videoPerListing: p.features.videoPerListing,
      },
    });
  }
};

/**
 * Returns the effective (DB-backed) features for a single plan,
 * merged with the static fields (name, price, non-editable features).
 */
const getEffectivePlanFeatures = async (planKey) => {
  const key = planKey || "FREE";
  const staticPlan = PLANS[key] || PLANS["FREE"];
  const row = await prisma.planFeature.findUnique({ where: { plan: key } });

  const featureRow = row || staticPlan.features;
  return {
    planName: staticPlan.name,
    maxListings: featureRow.maxListings,
    maxImagesPerListing: featureRow.maxImagesPerListing,
    videoPerListing: featureRow.videoPerListing,
    advancedAnalytics: staticPlan.features.advancedAnalytics,
    specialRequest: staticPlan.features.specialRequest,
  };
};

/**
 * Returns all plan features rows merged with static plan metadata.
 * Used by the admin "GET /plans" endpoint.
 */
const getAllPlanFeatures = async () => {
  // Ensure all rows exist before reading
  const rows = await prisma.planFeature.findMany();

  // Build a map for quick lookup
  const rowMap = {};
  for (const r of rows) rowMap[r.plan] = r;

  return Object.values(PLANS).map((staticPlan) => {
    const row = rowMap[staticPlan.key];
    return {
      plan: staticPlan.key,
      name: staticPlan.name,
      price: staticPlan.price,
      currency: staticPlan.currency,
      maxListings: row ? row.maxListings : staticPlan.features.maxListings,
      maxImagesPerListing: row
        ? row.maxImagesPerListing
        : staticPlan.features.maxImagesPerListing,
      videoPerListing: row
        ? row.videoPerListing
        : staticPlan.features.videoPerListing,
      advancedAnalytics: staticPlan.features.advancedAnalytics,
      specialRequest: staticPlan.features.specialRequest,
      updatedAt: row?.updatedAt || null,
    };
  });
};

/**
 * Admin: update the editable feature limits for a plan.
 * maxListings: null = unlimited, any positive integer = hard limit.
 */
const updatePlanFeatures = async (
  planKey,
  { maxListings, maxImagesPerListing, videoPerListing },
) => {
  const validPlans = Object.keys(PLANS);
  if (!validPlans.includes(planKey)) {
    throw new ApiError(
      400,
      `Invalid plan. Valid values: ${validPlans.join(", ")}`,
    );
  }

  // Validate each provided field
  if (maxListings !== undefined) {
    if (
      maxListings !== null &&
      (!Number.isInteger(maxListings) || maxListings < 0)
    ) {
      throw new ApiError(
        400,
        "maxListings must be a non-negative integer or null (unlimited)",
      );
    }
  }

  if (maxImagesPerListing !== undefined) {
    if (!Number.isInteger(maxImagesPerListing) || maxImagesPerListing < 1) {
      throw new ApiError(400, "maxImagesPerListing must be a positive integer");
    }
  }

  if (videoPerListing !== undefined) {
    if (!Number.isInteger(videoPerListing) || videoPerListing < 0) {
      throw new ApiError(
        400,
        "videoPerListing must be a non-negative integer (0 = no video allowed)",
      );
    }
  }

  const data = {};
  if (maxListings !== undefined) data.maxListings = maxListings;
  if (maxImagesPerListing !== undefined)
    data.maxImagesPerListing = maxImagesPerListing;
  if (videoPerListing !== undefined) data.videoPerListing = videoPerListing;

  const staticPlan = PLANS[planKey];

  const updated = await prisma.planFeature.upsert({
    where: { plan: planKey },
    update: data,
    create: {
      plan: planKey,
      maxListings:
        maxListings !== undefined
          ? maxListings
          : staticPlan.features.maxListings,
      maxImagesPerListing:
        maxImagesPerListing !== undefined
          ? maxImagesPerListing
          : staticPlan.features.maxImagesPerListing,
      videoPerListing:
        videoPerListing !== undefined
          ? videoPerListing
          : staticPlan.features.videoPerListing,
    },
  });

  return {
    plan: updated.plan,
    name: staticPlan.name,
    price: staticPlan.price,
    currency: staticPlan.currency,
    maxListings: updated.maxListings,
    maxImagesPerListing: updated.maxImagesPerListing,
    videoPerListing: updated.videoPerListing,
    advancedAnalytics: staticPlan.features.advancedAnalytics,
    specialRequest: staticPlan.features.specialRequest,
    updatedAt: updated.updatedAt,
  };
};

module.exports = {
  seedDefaultPlanFeatures,
  getEffectivePlanFeatures,
  getAllPlanFeatures,
  updatePlanFeatures,
};
