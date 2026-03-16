const mongoose = require("mongoose");

const { Schema } = mongoose;

const studentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    guardianEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
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

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
