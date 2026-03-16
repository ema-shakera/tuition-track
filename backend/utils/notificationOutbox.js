const crypto = require("crypto");
const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const NotificationOutbox = require("../models/NotificationOutbox");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toObjectId = (value, fieldName) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeEmail = (value) => {
  if (typeof value !== "string") {
    throw new ApiError(400, "toEmail is required");
  }

  const normalized = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    throw new ApiError(400, "toEmail must be a valid email");
  }

  return normalized;
};

const generateIdempotencyKey = ({ teacherId, type, toEmail, payload, seed }) => {
  const base = `${teacherId}:${type}:${toEmail}:${JSON.stringify(payload || {})}:${seed || ""}`;
  return crypto.createHash("sha256").update(base).digest("hex");
};

const enqueueNotification = async ({
  teacherId,
  type,
  toEmail,
  payload = {},
  scheduledAt,
  idempotencyKey,
  dedupeSeed,
  session,
}) => {
  if (typeof type !== "string" || !type.trim()) {
    throw new ApiError(400, "type is required");
  }

  const normalizedTeacherId = toObjectId(teacherId, "teacherId");
  const normalizedEmail = normalizeEmail(toEmail);
  const normalizedType = type.trim();
  const normalizedPayload = payload && typeof payload === "object" ? payload : {};

  const computedIdempotencyKey =
    typeof idempotencyKey === "string" && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : generateIdempotencyKey({
          teacherId: String(normalizedTeacherId),
          type: normalizedType,
          toEmail: normalizedEmail,
          payload: normalizedPayload,
          seed: dedupeSeed,
        });

  const normalizedScheduledAt = scheduledAt ? new Date(scheduledAt) : new Date();
  if (Number.isNaN(normalizedScheduledAt.getTime())) {
    throw new ApiError(400, "scheduledAt must be a valid date");
  }

  const doc = await NotificationOutbox.findOneAndUpdate(
    { idempotencyKey: computedIdempotencyKey },
    {
      $setOnInsert: {
        teacherId: normalizedTeacherId,
        type: normalizedType,
        toEmail: normalizedEmail,
        payload: normalizedPayload,
        status: "pending",
        retryCount: 0,
        idempotencyKey: computedIdempotencyKey,
        scheduledAt: normalizedScheduledAt,
      },
    },
    { new: true, upsert: true, session }
  ).lean();

  return doc;
};

module.exports = {
  enqueueNotification,
};
