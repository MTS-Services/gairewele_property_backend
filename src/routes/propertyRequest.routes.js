const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
} = require("../controllers/propertyRequest.controller");

// USER — submit a property request
router.post("/", authenticate, authorize("USER"), createRequest);

// USER — view own request history + stats
router.get("/my", authenticate, authorize("USER"), getMyRequests);

// AGENT / DEVELOPER / OWNER — view all requests
router.get(
  "/",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  getAllRequests,
);

// Any authenticated user — view single request (USER can only see own)
router.get("/:id", authenticate, getRequestById);

// AGENT / DEVELOPER / OWNER — change request status
router.patch(
  "/:id/status",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  updateRequestStatus,
);

// USER (own) / AGENT / DEVELOPER / OWNER — delete a request
router.delete("/:id", authenticate, deleteRequest);

module.exports = router;
