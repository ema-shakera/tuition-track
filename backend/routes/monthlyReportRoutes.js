const express = require("express");

const {
  createMonthlyReport,
  deleteMonthlyReportById,
  getMonthlyReportById,
  listMonthlyReports,
  listMyStudentReports,
} = require("../controllers/monthlyReportController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

// ── Student: own report listing ───────────────────────────────────────────────
// Must be declared before /:reportId to avoid param collision
router.get(
  "/student/me",
  requireAuth,
  requireRole(["student"]),
  asyncHandler(listMyStudentReports)
);

// ── Teacher-only mutations ────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole(["teacher"]),
  asyncHandler(createMonthlyReport)
);

router.get(
  "/",
  requireAuth,
  requireRole(["teacher"]),
  asyncHandler(listMonthlyReports)
);

router.delete(
  "/:reportId",
  requireAuth,
  requireRole(["teacher"]),
  asyncHandler(deleteMonthlyReportById)
);

// ── Shared read: teacher or student ──────────────────────────────────────────
router.get(
  "/:reportId",
  requireAuth,
  requireRole(["teacher", "student"]),
  asyncHandler(getMonthlyReportById)
);

module.exports = router;
