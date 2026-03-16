const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const StudentProfile = require("../models/StudentProfile");
const Tuition = require("../models/Tuition");
const { logActivity } = require("../utils/activityLogger");
const { enqueueNotification } = require("../utils/notificationOutbox");
const { parsePagination, parseSort } = require("../utils/query");

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const toPositiveNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ApiError(400, `${fieldName} must be a number >= 0`);
  }
  return parsed;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }

  return date;
};

const toResponse = (tuition) => ({
  id: String(tuition._id),
  teacherId: String(tuition.teacherId),
  studentId: String(tuition.studentId),
  subject: tuition.subject,
  schedule: tuition.schedule,
  daysPerMonth: tuition.daysPerMonth,
  monthlyFee: tuition.monthlyFee,
  startDate: tuition.startDate,
  status: tuition.status,
  deletedAt: tuition.deletedAt,
  createdAt: tuition.createdAt,
  updatedAt: tuition.updatedAt,
});

const createTuition = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const { studentId, subject, schedule, daysPerMonth, monthlyFee, startDate, status } = req.body;

  if (typeof subject !== "string" || !subject.trim()) {
    throw new ApiError(400, "Subject is required");
  }

  const normalizedStudentId = toObjectId(studentId, "studentId");

  const payload = {
    teacherId,
    studentId: normalizedStudentId,
    subject: subject.trim(),
    schedule: typeof schedule === "string" ? schedule.trim() : "",
    daysPerMonth: daysPerMonth !== undefined ? toPositiveNumber(daysPerMonth, "daysPerMonth") : 0,
    monthlyFee: monthlyFee !== undefined ? toPositiveNumber(monthlyFee, "monthlyFee") : 0,
    status: status === "paused" ? "paused" : "active",
  };

  const parsedStartDate = parseOptionalDate(startDate, "startDate");
  if (parsedStartDate) {
    payload.startDate = parsedStartDate;
  }

  let tuition;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const studentProfile = await StudentProfile.findById(normalizedStudentId)
        .session(session)
        .lean();
      if (!studentProfile) {
        throw new ApiError(404, "Student profile not found");
      }

      const [createdTuition] = await Tuition.create([payload], { session });
      tuition = createdTuition;

      await logActivity({
        teacherId,
        actorId: req.auth.userId,
        actorRole: req.auth.role,
        entityType: "Tuition",
        entityId: tuition._id,
        action: "CREATE_TUITION",
        metadata: {
          studentId: String(tuition.studentId),
          subject: tuition.subject,
          status: tuition.status,
        },
        session,
      });

      await enqueueNotification({
        teacherId,
        type: "TUITION_CREATED",
        toEmail: studentProfile.email,
        payload: {
          tuitionId: String(tuition._id),
          subject: tuition.subject,
          schedule: tuition.schedule,
          monthlyFee: tuition.monthlyFee,
        },
        dedupeSeed: `tuition-create:${tuition._id}`,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ tuition: toResponse(tuition) });
};

const listTuitions = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const sort = parseSort(req.query, "-createdAt");

  const includeDeleted = req.query.includeDeleted === "true";
  const baseFilter = includeDeleted ? {} : { deletedAt: null };
  const filter = applyTeacherScope(req.auth, baseFilter);

  const [items, total] = await Promise.all([
    Tuition.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Tuition.countDocuments(filter),
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

const getTuitionById = async (req, res) => {
  const tuitionId = toObjectId(req.params.tuitionId, "tuitionId");

  const tuition = await Tuition.findOne(applyTeacherScope(req.auth, { _id: tuitionId })).lean();
  if (!tuition || tuition.deletedAt) {
    throw new ApiError(404, "Tuition not found");
  }

  res.status(200).json({ tuition: toResponse(tuition) });
};

const updateTuitionById = async (req, res) => {
  const tuitionId = toObjectId(req.params.tuitionId, "tuitionId");
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "studentId")) {
    const normalizedStudentId = toObjectId(req.body.studentId, "studentId");
    const studentProfile = await StudentProfile.findById(normalizedStudentId).lean();
    if (!studentProfile) {
      throw new ApiError(404, "Student profile not found");
    }
    updates.studentId = normalizedStudentId;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "subject")) {
    if (typeof req.body.subject !== "string" || !req.body.subject.trim()) {
      throw new ApiError(400, "Subject must be a non-empty string");
    }
    updates.subject = req.body.subject.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "schedule")) {
    if (typeof req.body.schedule !== "string") {
      throw new ApiError(400, "Schedule must be a string");
    }
    updates.schedule = req.body.schedule.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "daysPerMonth")) {
    updates.daysPerMonth = toPositiveNumber(req.body.daysPerMonth, "daysPerMonth");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "monthlyFee")) {
    updates.monthlyFee = toPositiveNumber(req.body.monthlyFee, "monthlyFee");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "startDate")) {
    const parsedStartDate = parseOptionalDate(req.body.startDate, "startDate");
    if (!parsedStartDate) {
      throw new ApiError(400, "startDate must be a valid date");
    }
    updates.startDate = parsedStartDate;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    if (!["active", "paused"].includes(req.body.status)) {
      throw new ApiError(400, "Status must be one of: active, paused");
    }
    updates.status = req.body.status;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const tuition = await Tuition.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: tuitionId, deletedAt: null }),
    { $set: updates },
    { new: true }
  ).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  await logActivity({
    teacherId: tuition.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Tuition",
    entityId: tuition._id,
    action: "UPDATE_TUITION",
    metadata: {
      updatedFields: Object.keys(updates),
    },
  });

  res.status(200).json({ tuition: toResponse(tuition) });
};

const pauseTuitionById = async (req, res) => {
  const tuitionId = toObjectId(req.params.tuitionId, "tuitionId");

  const tuition = await Tuition.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: tuitionId, deletedAt: null }),
    { $set: { status: "paused" } },
    { new: true }
  ).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  await logActivity({
    teacherId: tuition.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Tuition",
    entityId: tuition._id,
    action: "PAUSE_TUITION",
    metadata: {
      status: tuition.status,
    },
  });

  res.status(200).json({ tuition: toResponse(tuition) });
};

const softDeleteTuitionById = async (req, res) => {
  const tuitionId = toObjectId(req.params.tuitionId, "tuitionId");

  const tuition = await Tuition.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: tuitionId, deletedAt: null }),
    { $set: { deletedAt: new Date() } },
    { new: true }
  ).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  await logActivity({
    teacherId: tuition.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Tuition",
    entityId: tuition._id,
    action: "SOFT_DELETE_TUITION",
    metadata: {
      deletedAt: tuition.deletedAt,
    },
  });

  res.status(200).json({ tuition: toResponse(tuition) });
};

module.exports = {
  createTuition,
  getTuitionById,
  listTuitions,
  pauseTuitionById,
  softDeleteTuitionById,
  updateTuitionById,
};
