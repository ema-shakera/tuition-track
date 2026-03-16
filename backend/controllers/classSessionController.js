const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const ClassSession = require("../models/ClassSession");
const Tuition = require("../models/Tuition");
const { logActivity } = require("../utils/activityLogger");
const { parsePagination } = require("../utils/query");

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const parseRequiredDate = (value, fieldName) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }
  return date;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return parseRequiredDate(value, fieldName);
};

const parseRequiredDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new ApiError(400, "durationMinutes must be a number >= 1");
  }
  return parsed;
};

const toResponse = (session) => ({
  id: String(session._id),
  teacherId: String(session.teacherId),
  tuitionId: String(session.tuitionId),
  studentId: String(session.studentId),
  date: session.date,
  durationMinutes: session.durationMinutes,
  notes: session.notes,
  createdBy: String(session.createdBy),
  createdAt: session.createdAt,
});

const findOwnedTuition = async (auth, tuitionId) => {
  const filter = applyTeacherScope(auth, { _id: tuitionId, deletedAt: null });
  const tuition = await Tuition.findOne(filter).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  return tuition;
};

const createClassSession = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const createdBy = toObjectId(req.auth.userId, "user id");

  const { tuitionId, date, durationMinutes, notes } = req.body;

  const normalizedTuitionId = toObjectId(tuitionId, "tuitionId");
  const tuition = await findOwnedTuition(req.auth, normalizedTuitionId);

  const session = await ClassSession.create({
    teacherId,
    tuitionId: normalizedTuitionId,
    studentId: tuition.studentId,
    date: parseRequiredDate(date, "date"),
    durationMinutes: parseRequiredDuration(durationMinutes),
    notes: typeof notes === "string" ? notes.trim() : "",
    createdBy,
  });

  await logActivity({
    teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "ClassSession",
    entityId: session._id,
    action: "ADD_CLASS",
    metadata: {
      tuitionId: String(session.tuitionId),
      studentId: String(session.studentId),
      date: session.date,
      durationMinutes: session.durationMinutes,
    },
  });

  res.status(201).json({ classSession: toResponse(session) });
};

const listClassSessions = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const filter = applyTeacherScope(req.auth, {});

  if (req.query.tuitionId) {
    const tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
    await findOwnedTuition(req.auth, tuitionId);
    filter.tuitionId = tuitionId;
  }

  const fromDate = parseOptionalDate(req.query.fromDate, "fromDate");
  const toDate = parseOptionalDate(req.query.toDate, "toDate");

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) {
      filter.date.$gte = fromDate;
    }
    if (toDate) {
      filter.date.$lte = toDate;
    }
  }

  const [sessions, total] = await Promise.all([
    ClassSession.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ClassSession.countDocuments(filter),
  ]);

  res.status(200).json({
    data: sessions.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const deleteClassSessionById = async (req, res) => {
  const sessionId = toObjectId(req.params.sessionId, "sessionId");

  const deleted = await ClassSession.findOneAndDelete(applyTeacherScope(req.auth, { _id: sessionId })).lean();

  if (!deleted) {
    throw new ApiError(404, "Class session not found");
  }

  await logActivity({
    teacherId: deleted.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "ClassSession",
    entityId: deleted._id,
    action: "DELETE_CLASS",
    metadata: {
      tuitionId: String(deleted.tuitionId),
      date: deleted.date,
    },
  });

  res.status(200).json({ classSession: toResponse(deleted) });
};

module.exports = {
  createClassSession,
  deleteClassSessionById,
  listClassSessions,
};
