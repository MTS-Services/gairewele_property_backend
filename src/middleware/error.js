const ApiError = require("../utils/ApiError");
const { error } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err instanceof ApiError) {
    return error(res, err.message, err.statusCode);
  }
  return error(res, err.message || "Internal Server Error", 500);
};

const notFound = (req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = { errorHandler, notFound };
