const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const MonthlyReport = require("../models/MonthlyReport");
const StudentProfile = require("../models/StudentProfile");
const Tuition = require("../models/Tuition");
const { logActivity } = require("../utils/activityLogger");
const { parsePagination, parseSort } = require("../utils/query");

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const toMonth = (value) => {
  if (typeof value !== "string" || !MONTH_REGEX.test(value)) {
    throw new ApiError(400, "month must be in YYYY-MM format");
  }

  return value;
};

const toResponse = (item) => ({
  id: String(item._id),
  teacherId: String(item.teacherId),
  tuitionId: String(item.tuitionId),
  month: item.month,
  storageUrl: item.storageUrl,
  generatedAt: item.generatedAt,
  generatedBy: String(item.generatedBy),
  checksum: item.checksum || null,
});

// ─── Ownership helpers ────────────────────────────────────────────────────────

/**
 * Verify the tuition belongs to the requesting teacher and is not deleted.
 * Returns the tuition document on success.
 */
const requireTeacherOwnedTuition = async (teacherId, tuitionId) => {
  const tuition = await Tuition.findOne({
    _id: tuitionId,
    teacherId,
    deletedAt: null,
  }).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  return tuition;
};

/**
 * For student access: verify the student (by userId) is linked to the tuition.
 * Returns the student profile on success.
 */
const requireStudentLinkedToTuition = async (auth, tuitionId) => {
  const profile = await StudentProfile.findOne({ userId: auth.userId }).lean();
  if (!profile) {
    throw new ApiError(403, "Student profile not found");
  }

  const tuition = await Tuition.findOne({
    _id: tuitionId,
    studentId: profile._id,
    deletedAt: null,
  }).lean(); // We check deletedAt here to prevent access to reports of tuitions that have been deleted

  if (!tuition) {
    throw new ApiError(403, "Access denied to this tuition");
  }

  return { profile, tuition };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/monthly-reports
 * Teacher-only. Registers a generated PDF report stored externally (Cloudinary).
 * Body: { tuitionId, month, storageUrl, checksum? }
 */
const createMonthlyReport = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const tuitionId = toObjectId(req.body.tuitionId, "tuitionId");
  const month = toMonth(req.body.month);
  const storageUrl = req.body.storageUrl;
  const checksum = req.body.checksum;

  if (typeof storageUrl !== "string" || !storageUrl.trim()) {
    throw new ApiError(400, "storageUrl is required");
  }

  // Restrict to known storage domains (Cloudinary or your own CDN) to prevent
  // storing arbitrary URLs injected from the client (SSRF / open redirect risk).
  const ALLOWED_STORAGE_ORIGINS = (
    process.env.ALLOWED_REPORT_ORIGINS || "https://res.cloudinary.com"
  )
    .split(",")
    .map((o) => o.trim().toLowerCase());

  const urlLower = storageUrl.toLowerCase();
  const isAllowedOrigin = ALLOWED_STORAGE_ORIGINS.some((origin) =>
    urlLower.startsWith(origin)
  );
  if (!isAllowedOrigin) {
    throw new ApiError(400, "storageUrl must point to an allowed storage origin");
  }

  await requireTeacherOwnedTuition(teacherId, tuitionId);

  const report = await MonthlyReport.create({
    teacherId,
    tuitionId,
    month,
    storageUrl: storageUrl.trim(),
    generatedAt: new Date(),
    generatedBy: toObjectId(req.auth.userId, "generatedBy"),
    checksum: checksum ? String(checksum).trim() : undefined,
  });

  await logActivity({
    teacherId,
    actorId: toObjectId(req.auth.userId, "actorId"),
    actorRole: req.auth.role,
    entityType: "MonthlyReport",
    entityId: report._id,
    action: "CREATE_MONTHLY_REPORT",
    metadata: { tuitionId, month },
  });

  res.status(201).json({ data: toResponse(report) });
};

/**
 * GET /api/monthly-reports
 * Teacher-only. Lists all reports owned by the requesting teacher.
 * Query: tuitionId?, month?, page?, limit?, sort?
 */
const listMonthlyReports = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, { generatedAt: -1 });

  const filter = applyTeacherScope(req.auth, {});
  filter.teacherId = teacherId;

  if (req.query.tuitionId) {
    filter.tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
  }

  if (req.query.month) {
    filter.month = toMonth(req.query.month);
  }

  const [reports, total] = await Promise.all([
    MonthlyReport.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    MonthlyReport.countDocuments(filter),
  ]);

  res.json({
    data: reports.map(toResponse),
    pagination: { page, limit, total },
  });
};

/**
 * GET /api/monthly-reports/:reportId
 * Teacher: fetch any report under their tenant.
 * Student: fetch a report only if linked to the relevant tuition.
 */
const getMonthlyReportById = async (req, res) => {
  const reportId = toObjectId(req.params.reportId, "reportId");

  if (req.auth.role === "teacher") {
    const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
    const report = await MonthlyReport.findOne({
      _id: reportId,
      teacherId,
    }).lean();

    if (!report) {
      throw new ApiError(404, "Report not found");
    }

    return res.json({ data: toResponse(report) });
  }

  if (req.auth.role === "student") {
    // Fetch report without teacher scope first so we can get the tuitionId
    const report = await MonthlyReport.findById(reportId).lean();
    if (!report) {
      throw new ApiError(404, "Report not found");
    }

    // Confirm student is linked to this report's tuition
    await requireStudentLinkedToTuition(req.auth, report.tuitionId);

    return res.json({ data: toResponse(report) });
  }

  throw new ApiError(403, "Forbidden");
};

/**
 * DELETE /api/monthly-reports/:reportId
 * Teacher-only. Hard delete — only the metadata row is removed; the file
 * on Cloudinary must be deleted separately via Cloudinary's API.
 */
const deleteMonthlyReportById = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const reportId = toObjectId(req.params.reportId, "reportId");

  const report = await MonthlyReport.findOne({
    _id: reportId,
    teacherId,
  }).lean();

  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  await MonthlyReport.deleteOne({ _id: reportId });

  await logActivity({
    teacherId,
    actorId: toObjectId(req.auth.userId, "actorId"),
    actorRole: req.auth.role,
    entityType: "MonthlyReport",
    entityId: reportId,
    action: "DELETE_MONTHLY_REPORT",
    metadata: { tuitionId: report.tuitionId, month: report.month },
  });

  res.json({ message: "Report deleted" });
};

/**
 * GET /api/monthly-reports/student/me
 * Student-only. Lists all reports for tuitions the student is enrolled in.
 * Query: month?, page?, limit?
 */
const listMyStudentReports = async (req, res) => {
  const profile = await StudentProfile.findOne({ userId: req.auth.userId }).lean();
  if (!profile) {
    throw new ApiError(403, "Student profile not found");
  }

  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, { generatedAt: -1 });

  // Collect all non-deleted tuition IDs for this student
  const tuitionFilter = { studentId: profile._id, deletedAt: null };
  const tuitions = await Tuition.find(tuitionFilter).select("_id").lean();
  const tuitionIds = tuitions.map((t) => t._id);

  if (!tuitionIds.length) {
    return res.json({ data: [], pagination: { page, limit, total: 0 } });
  }

  const filter = { tuitionId: { $in: tuitionIds } };
  if (req.query.month) {
    filter.month = toMonth(req.query.month);
  }

  const [reports, total] = await Promise.all([
    MonthlyReport.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    MonthlyReport.countDocuments(filter),
  ]);

  res.json({
    data: reports.map(toResponse),
    pagination: { page, limit, total },
  });
};

module.exports = {
  createMonthlyReport,
  listMonthlyReports,
  getMonthlyReportById,
  deleteMonthlyReportById,
  listMyStudentReports,
};
