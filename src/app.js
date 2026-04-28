require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware/error");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Gairewele Backend API is running",
    version: "1.0.0",
    docs: "/api/health",
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
