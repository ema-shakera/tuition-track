const jwt = require("jsonwebtoken");

const { env } = require("../config/env");
const { ApiError } = require("./errorHandler");

const ALLOWED_ROLES = new Set(["teacher", "student"]);

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const requireAuth = (req, res, next) => {
  const token = extractBearerToken(req.header("authorization"));
  if (!token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const role = payload.role;

    if (!payload.sub || !ALLOWED_ROLES.has(role)) {
      throw new Error("Invalid token payload");
    }

    req.auth = {
      userId: String(payload.sub),
      role,
      teacherId: role === "teacher" ? String(payload.sub) : payload.teacherId || null,
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, "Unauthorized"));
  }
};

const requireRole = (allowedRoles) => {
  const roleSet = new Set(allowedRoles);

  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!roleSet.has(req.auth.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    return next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
