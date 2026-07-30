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


router.post(
  "/",
  authenticate,
  authorize("USER", "AGENT", "DEVELOPER", "OWNER"),
  createRequest,
);

router.get(
  "/my",
  authenticate,
  authorize("USER", "AGENT", "DEVELOPER", "OWNER"),
  getMyRequests,
);


router.get(
  "/",
  authenticate,
  authorize("USER", "AGENT", "DEVELOPER", "OWNER"),
  getAllRequests,
);


router.get("/:id", authenticate, getRequestById);

router.patch(
  "/:id/status",
  authenticate,
  authorize("AGENT", "DEVELOPER", "OWNER"),
  updateRequestStatus,
);


router.delete("/:id", authenticate, deleteRequest);

module.exports = router;
