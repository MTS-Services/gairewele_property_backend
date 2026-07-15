require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware/error");
const { seedDefaultPlanFeatures } = require("./services/planFeatures.service");

const app = express();
const allowedOrigins = [
  "https://property-file.com",
  "https://www.property-file.com",
  "https://prodev.property-file.com",
  "http://localhost:5173",
];

const corsOriginHandler = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
};

app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Gairewele Backend API is running",
    version: "1.0.0",
    docs: "/api/health",
  });
});

app.use("/api", routes);

// Seed plan feature defaults into DB (no-op if rows already exist)
seedDefaultPlanFeatures().catch((err) =>
  console.error("Failed to seed plan features:", err),
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
