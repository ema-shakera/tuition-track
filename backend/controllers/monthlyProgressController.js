const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const ClassSession = require("../models/ClassSession");
const Homework = require("../models/Homework");
const MonthlyProgress = require("../models/MonthlyProgress");
const Payment = require("../models/Payment");
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

const getMonthRange = (month) => {
  const [year, monthPart] = month.split("-").map((item) => Number(item));
  const start = new Date(Date.UTC(year, monthPart - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthPart, 1, 0, 0, 0, 0));

  return { start, end };
};

const toResponse = (item) => ({
  id: String(item._id),
  teacherId: String(item.teacherId),
  tuitionId: String(item.tuitionId),
  month: item.month,
  totalClasses: item.totalClasses,
  completedClasses: item.completedClasses,
  homeworkAssigned: item.homeworkAssigned,
  homeworkCompleted: item.homeworkCompleted,
  paymentStatus: item.paymentStatus,
  updatedAt: item.updatedAt,
  createdAt: item.createdAt,
});

const findOwnedTuition = async (auth, tuitionId) => {
  const tuition = await Tuition.findOne(applyTeacherScope(auth, { _id: tuitionId, deletedAt: null })).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  return tuition;
};

const recomputeMonthlyProgress = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const tuitionId = toObjectId(req.body.tuitionId, "tuitionId");
  const month = toMonth(req.body.month);

  const tuition = await findOwnedTuition(req.auth, tuitionId);
  const { start, end } = getMonthRange(month);

  const [completedClasses, homeworkAssigned, homeworkCompleted, payment] = await Promise.all([
    ClassSession.countDocuments(
      applyTeacherScope(req.auth, {
        tuitionId,
        date: { $gte: start, $lt: end },
      })
    ),
    Homework.countDocuments(
      applyTeacherScope(req.auth, {
        tuitionId,
        deletedAt: null,
        dueDate: { $gte: start, $lt: end },
      })
    ),
    Homework.countDocuments(
      applyTeacherScope(req.auth, {
        tuitionId,
        deletedAt: null,
        status: "done",
        dueDate: { $gte: start, $lt: end },
      })
    ),
    Payment.findOne(applyTeacherScope(req.auth, { tuitionId, month })).lean(),
  ]);

  const totalClasses = Number(tuition.daysPerMonth || 0);
  const paymentStatus = payment?.status === "paid" ? "paid" : "unpaid";

  const progress = await MonthlyProgress.findOneAndUpdate(
    applyTeacherScope(req.auth, { tuitionId, month }),
    {
      $set: {
        totalClasses,
        completedClasses,
        homeworkAssigned,
        homeworkCompleted,
        paymentStatus,
      },
      $setOnInsert: {
        teacherId,
        tuitionId,
        month,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  ).lean();

  await logActivity({
    teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "MonthlyProgress",
    entityId: progress._id,
    action: "RECOMPUTE_MONTHLY_PROGRESS",
    metadata: {
      tuitionId: String(progress.tuitionId),
      month: progress.month,
      totalClasses: progress.totalClasses,
      completedClasses: progress.completedClasses,
      homeworkAssigned: progress.homeworkAssigned,
      homeworkCompleted: progress.homeworkCompleted,
      paymentStatus: progress.paymentStatus,
    },
  });

  res.status(200).json({ monthlyProgress: toResponse(progress) });
};

const listMonthlyProgress = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const sort = parseSort(req.query, "-month");

  const filter = applyTeacherScope(req.auth, {});

  if (req.query.tuitionId) {
    const tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
    await findOwnedTuition(req.auth, tuitionId);
    filter.tuitionId = tuitionId;
  }

  if (req.query.month) {
    filter.month = toMonth(req.query.month);
  }

  const [items, total] = await Promise.all([
    MonthlyProgress.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    MonthlyProgress.countDocuments(filter),
  ]);

  res.status(200).json({
    data: items.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const getMonthlyProgressByTuitionAndMonth = async (req, res) => {
  const tuitionId = toObjectId(req.params.tuitionId, "tuitionId");
  const month = toMonth(req.params.month);

  await findOwnedTuition(req.auth, tuitionId);

  const progress = await MonthlyProgress.findOne(applyTeacherScope(req.auth, { tuitionId, month })).lean();
  if (!progress) {
    throw new ApiError(404, "Monthly progress not found");
  }

  res.status(200).json({ monthlyProgress: toResponse(progress) });
};

module.exports = {
  getMonthlyProgressByTuitionAndMonth,
  listMonthlyProgress,
  recomputeMonthlyProgress,
};
