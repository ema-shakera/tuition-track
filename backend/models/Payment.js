const mongoose = require("mongoose");

const { Schema } = mongoose;

const paymentSchema = new Schema(
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
    month: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
      required: true,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ teacherId: 1, tuitionId: 1, month: 1 }, { unique: true });
paymentSchema.index({ teacherId: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
