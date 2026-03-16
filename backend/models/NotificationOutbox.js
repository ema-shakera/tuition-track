const mongoose = require("mongoose");

const { Schema } = mongoose;

const notificationOutboxSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    toEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

notificationOutboxSchema.index({ status: 1, scheduledAt: 1 });
notificationOutboxSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { status: "failed" },
  }
);

module.exports = mongoose.model("NotificationOutbox", notificationOutboxSchema);
