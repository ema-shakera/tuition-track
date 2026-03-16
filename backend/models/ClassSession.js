const mongoose = require("mongoose");

const { Schema } = mongoose;

const classSessionSchema = new Schema(
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
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  }
);

classSessionSchema.index({ teacherId: 1, tuitionId: 1, date: 1 });
classSessionSchema.index({ tuitionId: 1, date: 1 });

module.exports = mongoose.model("ClassSession", classSessionSchema);
