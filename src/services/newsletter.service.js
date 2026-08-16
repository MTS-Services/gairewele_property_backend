const { subscribeToList } = require("../utils/brevo");
const ApiError = require("../utils/ApiError");

/**
 * Subscribe an email to the newsletter via Brevo (BREVO_NEWSLETTER_LIST_ID).
 */
//async function to subscribe to the newsletter
const subscribeToNewsletter = async (email) => {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_NEWSLETTER_LIST_ID;

  if (!apiKey || !listId) {
    throw new ApiError(500, "Newsletter subscription is not configured");
  }

  try {
    const { isNew, contactId } = await subscribeToList({
      apiKey,
      listId,
      email,
    });

    return {
      record: {
        id: contactId,
        email,
        createdAt: new Date().toISOString(),
      },
      isNew,
    };
  } catch (error) {
    const brevoBody = error.response?.body;
    const isDuplicate =
      brevoBody?.code === "duplicate_parameter" ||
      brevoBody?.message?.toLowerCase().includes("already exist");

    if (isDuplicate) {
      return {
        record: {
          id: null,
          email,
          createdAt: new Date().toISOString(),
        },
        isNew: false,
      };
    }

    throw error;
  }
};

module.exports = { subscribeToNewsletter };
