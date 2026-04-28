const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/prisma");
const { error } = require("../utils/response");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return error(res, "Unauthorized: token missing", 401);
    }

    const token = header.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return error(res, "Unauthorized: user not found", 401);
    if (user.isSuspended) return error(res, "Account suspended", 403);

    req.user = user;
    next();
  } catch (err) {
    return error(res, "Unauthorized: invalid or expired token", 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return error(res, "Unauthorized", 401);
    if (!roles.includes(req.user.role)) {
      return error(res, "Forbidden: insufficient role", 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
