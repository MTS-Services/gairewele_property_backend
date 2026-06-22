const newsletterService = require("../services/newsletter.service");
const ApiError = require("../utils/ApiError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, "A valid email is required");
    }

    const { record, isNew } = await newsletterService.subscribeToNewsletter(
      email.toLowerCase().trim(),
    );

    return res.status(200).json({
      success: true,
      isNew,
      message: isNew
        ? "Successfully subscribed to the newsletter"
        : "This email is already subscribed",
      data: {
        id: record.id,
        email: record.email,
        createdAt: record.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
    console.error("Newsletter subscribe error:", err);
    return next(new ApiError(500, "Failed to subscribe. Please try again."));
  }
};

module.exports = { subscribe };
