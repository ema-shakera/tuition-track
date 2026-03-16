const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const NotificationOutbox = require("../models/NotificationOutbox");
const { processOutboxBatch } = require("../services/notificationOutboxProcessor");
const { enqueueNotification } = require("../utils/notificationOutbox");
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
  type: item.type,
  toEmail: item.toEmail,
  payload: item.payload || {},
  status: item.status,
  retryCount: item.retryCount,
  idempotencyKey: item.idempotencyKey,
  scheduledAt: item.scheduledAt,
  sentAt: item.sentAt,
  errorMessage: item.errorMessage || "",
  createdAt: item.createdAt,
});

const createOutboxEntry = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");

  const doc = await enqueueNotification({
    teacherId,
    type: req.body.type,
    toEmail: req.body.toEmail,
    payload: req.body.payload,
    scheduledAt: req.body.scheduledAt,
    idempotencyKey: req.body.idempotencyKey,
    dedupeSeed: req.body.dedupeSeed,
  });

  res.status(201).json({ outbox: toResponse(doc) });
};

const listOutboxEntries = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = applyTeacherScope(req.auth, {});

  if (req.query.status) {
    if (!["pending", "sent", "failed", "processing"].includes(req.query.status)) {
      throw new ApiError(400, "status must be one of: pending, sent, failed, processing");
    }
    filter.status = req.query.status;
  }

  if (req.query.type) {
    filter.type = String(req.query.type).trim();
  }

  const [items, total] = await Promise.all([
    NotificationOutbox.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationOutbox.countDocuments(filter),
  ]);

  res.status(200).json({
    data: items.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const processOutboxNow = async (req, res) => {
  const limit = req.body.limit;
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const summary = await processOutboxBatch({ limit, teacherId });

  res.status(200).json({ summary });
};

module.exports = {
  createOutboxEntry,
  listOutboxEntries,
  processOutboxNow,
};
