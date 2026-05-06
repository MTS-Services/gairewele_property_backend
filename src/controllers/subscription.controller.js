const subscriptionService = require("../services/subscription.service");
const { success } = require("../utils/response");

const listPlans = (_req, res) =>
  success(res, { plans: subscriptionService.listPlans() }, "Plans fetched");

const getMySubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.getMySubscription({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Subscription fetched");
  } catch (err) {
    next(err);
  }
};

const initiateSubscription = async (req, res, next) => {
  try {
    const { planKey } = req.body;
    const data = await subscriptionService.initiateSubscription({
      userId: req.user.id,
      role: req.user.role,
      email: req.user.email,
      planKey: (planKey || "").toUpperCase(),
    });
    return success(
      res,
      data,
      "Payment initialized. Open authorizationUrl to pay.",
    );
  } catch (err) {
    next(err);
  }
};

const verifySubscription = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const data = await subscriptionService.verifyAndActivate({
      userId: req.user.id,
      reference,
    });
    return success(res, data, "Subscription activated");
  } catch (err) {
    next(err);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.cancelSubscription({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Subscription cancelled. Downgraded to FREE.");
  } catch (err) {
    next(err);
  }
};

const getMyPaymentHistory = async (req, res, next) => {
  try {
    const data = await subscriptionService.getMyPaymentHistory({
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, data, "Payment history fetched");
  } catch (err) {
    next(err);
  }
};

const paystackCallback = async (req, res, next) => {
  try {
    const reference = req.query.reference || req.query.trxref;
    const data = await subscriptionService.paystackCallback({ reference });
    return success(res, data, "Subscription activated");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPlans,
  getMySubscription,
  initiateSubscription,
  verifySubscription,
  cancelSubscription,
  getMyPaymentHistory,
  paystackCallback,
};
