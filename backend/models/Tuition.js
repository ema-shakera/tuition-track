const mongoose = require("mongoose");

const { Schema } = mongoose;

const tuitionSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    schedule: {
      type: String,
      trim: true,
      default: "",
    },
    daysPerMonth: {
      type: Number,
      min: 0,
      default: 0,
    },
    monthlyFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tuitionSchema.index({ teacherId: 1, studentId: 1 });
tuitionSchema.index({ teacherId: 1, subject: 1 });

module.exports = mongoose.model("Tuition", tuitionSchema);
