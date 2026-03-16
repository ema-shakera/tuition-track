const mongoose = require("mongoose");

const { Schema } = mongoose;

const monthlyProgressSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tuitionId: {
      type: Schema.Types.ObjectId,
      ref: "Tuition",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true,
    },
    totalClasses: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    completedClasses: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    homeworkAssigned: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    homeworkCompleted: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

monthlyProgressSchema.index({ teacherId: 1, tuitionId: 1, month: 1 }, { unique: true });
monthlyProgressSchema.index({ teacherId: 1, month: 1 });

module.exports = mongoose.model("MonthlyProgress", monthlyProgressSchema);
