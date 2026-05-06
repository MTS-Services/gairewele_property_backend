// Subscription plans definition.
// `price` is in NGN (Naira). Paystack expects amount in kobo (price * 100).
// `paystackPlanCode` resolved from .env at runtime.

const PLANS = {
  FREE: {
    key: "FREE",
    name: "Free",
    price: 0,
    currency: "NGN",
    paystackPlanCode: null,
    features: {
      maxListings: 3,
      maxImagesPerListing: 3,
      videoPerListing: 0,
      advancedAnalytics: false,
      specialRequest: false,
    },
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    price: 100,
    currency: "NGN",
    paystackPlanCode: process.env.PAYSTACK_PLAN_PRO || null,
    features: {
      maxListings: 10,
      maxImagesPerListing: 4,
      videoPerListing: 1,
      advancedAnalytics: false,
      specialRequest: false,
    },
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium",
    price: 200,
    currency: "NGN",
    paystackPlanCode: process.env.PAYSTACK_PLAN_PREMIUM || null,
    features: {
      maxListings: 20,
      maxImagesPerListing: 6,
      videoPerListing: 1,
      advancedAnalytics: false,
      specialRequest: false,
    },
  },
  PURPLE: {
    key: "PURPLE",
    name: "Purple",
    price: 300,
    currency: "NGN",
    paystackPlanCode: process.env.PAYSTACK_PLAN_PURPLE || null,
    features: {
      maxListings: null, // null = unlimited
      maxImagesPerListing: 15,
      videoPerListing: 1,
      advancedAnalytics: true,
      specialRequest: true,
    },
  },
};

const SUBSCRIBABLE_ROLES = ["AGENT", "DEVELOPER", "OWNER"];

const getPlan = (key) => PLANS[key] || null;

const getPaidPlans = () => Object.values(PLANS).filter((p) => p.key !== "FREE");

module.exports = { PLANS, SUBSCRIBABLE_ROLES, getPlan, getPaidPlans };
