const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const Homework = require("../models/Homework");
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

const parseRequiredDate = (value, fieldName) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }
  return parsed;
};

const toResponse = (homework) => ({
  id: String(homework._id),
  teacherId: String(homework.teacherId),
  tuitionId: String(homework.tuitionId),
  studentId: String(homework.studentId),
  title: homework.title,
  description: homework.description,
  dueDate: homework.dueDate,
  status: homework.status,
  deletedAt: homework.deletedAt,
  createdAt: homework.createdAt,
  updatedAt: homework.updatedAt,
});

const findOwnedTuition = async (auth, tuitionId) => {
  const tuition = await Tuition.findOne(applyTeacherScope(auth, { _id: tuitionId, deletedAt: null })).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  return tuition;
};

const createHomework = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const { tuitionId, title, description, dueDate, status } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    throw new ApiError(400, "title is required");
  }

  const normalizedTuitionId = toObjectId(tuitionId, "tuitionId");
  const tuition = await findOwnedTuition(req.auth, normalizedTuitionId);

  const normalizedStatus = status === "done" ? "done" : "assigned";

  const homework = await Homework.create({
    teacherId,
    tuitionId: normalizedTuitionId,
    studentId: tuition.studentId,
    title: title.trim(),
    description: typeof description === "string" ? description.trim() : "",
    dueDate: parseRequiredDate(dueDate, "dueDate"),
    status: normalizedStatus,
  });

  await logActivity({
    teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Homework",
    entityId: homework._id,
    action: "ADD_HOMEWORK",
    metadata: {
      tuitionId: String(homework.tuitionId),
      studentId: String(homework.studentId),
      dueDate: homework.dueDate,
      status: homework.status,
    },
  });

  const studentProfile = await StudentProfile.findById(tuition.studentId).lean();
  if (studentProfile?.email) {
    try {
      await enqueueNotification({
        teacherId,
        type: "HOMEWORK_ASSIGNED",
        toEmail: studentProfile.email,
        payload: {
          homeworkId: String(homework._id),
          tuitionId: String(homework.tuitionId),
          title: homework.title,
          dueDate: homework.dueDate,
        },
        dedupeSeed: `homework-create:${homework._id}`,
      });
    } catch (error) {
      console.error("Failed to enqueue homework notification:", error.message);
    }
  }

  res.status(201).json({ homework: toResponse(homework) });
};

const listHomework = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const sort = parseSort(req.query, "-createdAt");

  const includeDeleted = req.query.includeDeleted === "true";
  const baseFilter = includeDeleted ? {} : { deletedAt: null };
  const filter = applyTeacherScope(req.auth, baseFilter);

  if (req.query.tuitionId) {
    const tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
    await findOwnedTuition(req.auth, tuitionId);
    filter.tuitionId = tuitionId;
  }

  if (req.query.status) {
    if (!["assigned", "done"].includes(req.query.status)) {
      throw new ApiError(400, "status must be one of: assigned, done");
    }
    filter.status = req.query.status;
  }

  const [items, total] = await Promise.all([
    Homework.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Homework.countDocuments(filter),
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

const getHomeworkById = async (req, res) => {
  const homeworkId = toObjectId(req.params.homeworkId, "homeworkId");

  const homework = await Homework.findOne(applyTeacherScope(req.auth, { _id: homeworkId, deletedAt: null })).lean();
  if (!homework) {
    throw new ApiError(404, "Homework not found");
  }

  res.status(200).json({ homework: toResponse(homework) });
};

const updateHomeworkById = async (req, res) => {
  const homeworkId = toObjectId(req.params.homeworkId, "homeworkId");
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    if (typeof req.body.title !== "string" || !req.body.title.trim()) {
      throw new ApiError(400, "title must be a non-empty string");
    }
    updates.title = req.body.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    if (typeof req.body.description !== "string") {
      throw new ApiError(400, "description must be a string");
    }
    updates.description = req.body.description.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "dueDate")) {
    updates.dueDate = parseRequiredDate(req.body.dueDate, "dueDate");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    if (!["assigned", "done"].includes(req.body.status)) {
      throw new ApiError(400, "status must be one of: assigned, done");
    }
    updates.status = req.body.status;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "tuitionId")) {
    const normalizedTuitionId = toObjectId(req.body.tuitionId, "tuitionId");
    const tuition = await findOwnedTuition(req.auth, normalizedTuitionId);
    updates.tuitionId = normalizedTuitionId;
    updates.studentId = tuition.studentId;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const homework = await Homework.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: homeworkId, deletedAt: null }),
    { $set: updates },
    { new: true }
  ).lean();

  if (!homework) {
    throw new ApiError(404, "Homework not found");
  }

  await logActivity({
    teacherId: homework.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Homework",
    entityId: homework._id,
    action: "UPDATE_HOMEWORK",
    metadata: {
      updatedFields: Object.keys(updates),
      status: homework.status,
    },
  });

  res.status(200).json({ homework: toResponse(homework) });
};

const softDeleteHomeworkById = async (req, res) => {
  const homeworkId = toObjectId(req.params.homeworkId, "homeworkId");

  const homework = await Homework.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: homeworkId, deletedAt: null }),
    { $set: { deletedAt: new Date() } },
    { new: true }
  ).lean();

  if (!homework) {
    throw new ApiError(404, "Homework not found");
  }

  await logActivity({
    teacherId: homework.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Homework",
    entityId: homework._id,
    action: "SOFT_DELETE_HOMEWORK",
    metadata: {
      tuitionId: String(homework.tuitionId),
      deletedAt: homework.deletedAt,
    },
  });

  res.status(200).json({ homework: toResponse(homework) });
};

module.exports = {
  createHomework,
  getHomeworkById,
  listHomework,
  softDeleteHomeworkById,
  updateHomeworkById,
};
