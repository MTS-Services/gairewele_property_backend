const DEFAULT_ALLOWED_ORIGINS = [
  "https://prodev.property-file.com",
  "http://localhost:5173",
];

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const envOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);
const frontendUrlOrigins = parseOrigins(process.env.FRONTEND_URL);

const allowedOrigins = [
  ...new Set([
    ...envOrigins,
    ...frontendUrlOrigins,
    ...DEFAULT_ALLOWED_ORIGINS,
  ]),
];

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

const corsOriginHandler = (origin, callback) => {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
};

module.exports = {
  allowedOrigins,
  corsOriginHandler,
};
