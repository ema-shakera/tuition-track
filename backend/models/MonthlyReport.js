const mongoose = require("mongoose");

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const MonthlyReportSchema = new Schema(
  {
    teacherId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    tuitionId: {
      type: ObjectId,
      ref: "Tuition",
      required: true,
    },
    month: {
      // YYYY-MM
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format"],
    },
    storageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    generatedBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    checksum: {
      type: String,
      trim: true,
    },
  },
  {
    // No automatic updatedAt — reports are append-only references
    timestamps: false,
  }
);

// Efficient lookup: all reports for a teacher, scoped by tuition and/or month
MonthlyReportSchema.index({ teacherId: 1, tuitionId: 1, month: 1 });
// List all reports for a specific month across tuitions (dashboard view)
MonthlyReportSchema.index({ teacherId: 1, month: 1 });

module.exports = mongoose.model("MonthlyReport", MonthlyReportSchema);
