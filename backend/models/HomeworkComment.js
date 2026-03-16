const mongoose = require("mongoose");

const { Schema } = mongoose;

const homeworkCommentSchema = new Schema(
  {
    homeworkId: {
      type: Schema.Types.ObjectId,
      ref: "Homework",
      required: true,
      index: true,
    },
    tuitionId: {
      type: Schema.Types.ObjectId,
      ref: "Tuition",
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorRole: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
      index: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
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

homeworkCommentSchema.index({ teacherId: 1, homeworkId: 1, createdAt: -1 });
homeworkCommentSchema.index({ homeworkId: 1, createdAt: -1 });

module.exports = mongoose.model("HomeworkComment", homeworkCommentSchema);
