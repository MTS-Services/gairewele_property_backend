const propertyRequestService = require("../services/propertyRequest.service");
const { success, error } = require("../utils/response");


const createRequest = async (req, res, next) => {
  try {
    const {
      propertyType,
      preferredLocation,
      bedrooms,
      bathrooms,
      budgetMin,
      budgetMax,
      areaMin,
      areaMax,
      preferredMoveInDate,
      fullName,
      email,
      phoneNumber,
      preferences,
    } = req.body;

    const data = await propertyRequestService.createRequest({
      userId: req.user.id,
      propertyType: propertyType ? propertyType.toUpperCase() : null,
      preferredLocation,
      bedrooms,
      bathrooms,
      budgetMin,
      budgetMax,
      areaMin,
      areaMax,
      preferredMoveInDate,
      fullName,
      email,
      phoneNumber,
      preferences,
    });

    return success(res, data, "Property request submitted", 201);
  } catch (err) {
    next(err);
  }
};


const getMyRequests = async (req, res, next) => {
  try {
    const { status, page, pageSize } = req.query;
    const data = await propertyRequestService.getMyRequests({
      userId: req.user.id,
      status: status ? status.toUpperCase() : null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Requests fetched");
  } catch (err) {
    next(err);
  }
};


const getAllRequests = async (req, res, next) => {
  try {
    const { status, search, page, pageSize } = req.query;
    const data = await propertyRequestService.getAllRequests({
      status: status ? status.toUpperCase() : null,
      search: search || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Requests fetched");
  } catch (err) {
    next(err);
  }
};


const getRequestById = async (req, res, next) => {
  try {
    const data = await propertyRequestService.getRequestById({
      requestId: req.params.id,
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    return success(res, data, "Request fetched");
  } catch (err) {
    next(err);
  }
};


const updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return error(res, "status is required", 400);

    const data = await propertyRequestService.updateRequestStatus({
      requestId: req.params.id,
      status: status.toUpperCase(),
    });
    return success(res, data, `Request status updated to ${data.status}`);
  } catch (err) {
    next(err);
  }
};


const deleteRequest = async (req, res, next) => {
  try {
    const data = await propertyRequestService.deleteRequest({
      requestId: req.params.id,
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    return success(res, data, "Property request deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
};
