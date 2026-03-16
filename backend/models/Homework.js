const mongoose = require("mongoose");

const { Schema } = mongoose;

const homeworkSchema = new Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["assigned", "done"],
      default: "assigned",
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

homeworkSchema.index({ teacherId: 1, tuitionId: 1 });
homeworkSchema.index({ tuitionId: 1, dueDate: 1 });

module.exports = mongoose.model("Homework", homeworkSchema);
