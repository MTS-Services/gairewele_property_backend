const adService = require("../services/ad.service");
const { success } = require("../utils/response");

const createAd = async (req, res, next) => {
  try {
    const {
      title,
      description,
      liveLink,
      placement,
      status,
      startDate,
      endDate,
    } = req.body;
    const ad = await adService.createAd({
      file: req.file,
      title,
      description,
      liveLink,
      placement: placement ? placement.toUpperCase() : null,
      status: status ? status.toUpperCase() : null,
      startDate,
      endDate,
      adminId: req.user.id,
    });
    return success(res, ad, "Advertisement created", 201);
  } catch (err) {
    next(err);
  }
};


const adminGetAllAds = async (req, res, next) => {
  try {
    const { placement, status, search, page, pageSize } = req.query;
    const data = await adService.adminGetAllAds({
      placement: placement ? placement.toUpperCase() : null,
      status: status ? status.toUpperCase() : null,
      search: search || null,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    return success(res, data, "Advertisements fetched");
  } catch (err) {
    next(err);
  }
};


const getAdById = async (req, res, next) => {
  try {
    const ad = await adService.getAdById({ adId: req.params.id });
    return success(res, ad, "Advertisement fetched");
  } catch (err) {
    next(err);
  }
};


const updateAd = async (req, res, next) => {
  try {
    const {
      title,
      description,
      liveLink,
      placement,
      status,
      startDate,
      endDate,
    } = req.body;
    const ad = await adService.updateAd({
      adId: req.params.id,
      file: req.file,
      title,
      description,
      liveLink,
      placement: placement ? placement.toUpperCase() : undefined,
      status: status ? status.toUpperCase() : undefined,
      startDate,
      endDate,
    });
    return success(res, ad, "Advertisement updated");
  } catch (err) {
    next(err);
  }
};

const deleteAd = async (req, res, next) => {
  try {
    const data = await adService.deleteAd({ adId: req.params.id });
    return success(res, data, "Advertisement deleted");
  } catch (err) {
    next(err);
  }
};

const getAdsByPlacement = async (req, res, next) => {
  try {
    const { placement } = req.params;
    const { limit } = req.query;
    const ads = await adService.getAdsByPlacement({
      placement: placement ? placement.toUpperCase() : null,
      limit: parseInt(limit, 10) || 10,
    });
    return success(res, ads, "Ads fetched");
  } catch (err) {
    next(err);
  }
};

const trackAd = async (req, res, next) => {
  try {
    const { type } = req.body;
    const data = await adService.trackAd({
      adId: req.params.id,
      type: type ? type.toLowerCase() : null,
    });
    return success(res, data, `Ad ${type} tracked`);
  } catch (err) {
    next(err);
  }
};

const togglePauseAd = async (req, res, next) => {
  try {
    const data = await adService.togglePauseAd({ adId: req.params.id });
    return success(
      res,
      data,
      data.paused ? "Advertisement paused" : "Advertisement unpaused",
    );
  } catch (err) {
    next(err);
  }
};

const getAdStats = async (req, res, next) => {
  try {
    const data = await adService.getAdStats();
    return success(res, data, "Ad stats fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAd,
  adminGetAllAds,
  getAdById,
  updateAd,
  deleteAd,
  getAdsByPlacement,
  trackAd,
  togglePauseAd,
  getAdStats,
};
