const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const ActivityLog = require("../models/ActivityLog");
const { parsePagination } = require("../utils/query");

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const toResponse = (item) => ({
  id: String(item._id),
  teacherId: String(item.teacherId),
  actorId: String(item.actorId),
  actorRole: item.actorRole,
  entityType: item.entityType,
  entityId: String(item.entityId),
  action: item.action,
  metadata: item.metadata || {},
  createdAt: item.createdAt,
});

const listActivityLogs = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const filter = applyTeacherScope(req.auth, {});

  if (req.query.entityType) {
    filter.entityType = String(req.query.entityType).trim();
  }

  if (req.query.action) {
    filter.action = String(req.query.action).trim();
  }

  if (req.query.entityId) {
    filter.entityId = toObjectId(req.query.entityId, "entityId");
  }

  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    teacherId: String(teacherId),
    data: items.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

module.exports = {
  listActivityLogs,
};
