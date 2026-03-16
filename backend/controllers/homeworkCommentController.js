const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope } = require("../middleware/tenant");
const Homework = require("../models/Homework");
const HomeworkComment = require("../models/HomeworkComment");
const StudentProfile = require("../models/StudentProfile");
const { logActivity } = require("../utils/activityLogger");
const { parsePagination } = require("../utils/query");

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const toResponse = (item) => ({
  id: String(item._id),
  homeworkId: String(item.homeworkId),
  tuitionId: String(item.tuitionId),
  teacherId: String(item.teacherId),
  authorId: String(item.authorId),
  authorRole: item.authorRole,
  comment: item.comment,
  createdAt: item.createdAt,
});

const getStudentProfileForAuthUser = async (auth) => {
  const profile = await StudentProfile.findOne({ userId: auth.userId }).lean();
  if (!profile) {
    throw new ApiError(403, "Student profile not found for current user");
  }
  return profile;
};

const findAccessibleHomework = async (auth, homeworkId) => {
  if (auth.role === "teacher") {
    const homework = await Homework.findOne(applyTeacherScope(auth, { _id: homeworkId, deletedAt: null })).lean();
    if (!homework) {
      throw new ApiError(404, "Homework not found");
    }
    return homework;
  }

  if (auth.role === "student") {
    const profile = await getStudentProfileForAuthUser(auth);
    const homework = await Homework.findOne({
      _id: homeworkId,
      studentId: profile._id,
      deletedAt: null,
    }).lean();

    if (!homework) {
      throw new ApiError(404, "Homework not found");
    }

    return homework;
  }

  throw new ApiError(403, "Forbidden");
};

const createHomeworkComment = async (req, res) => {
  const { homeworkId, comment } = req.body;

  if (typeof comment !== "string" || !comment.trim()) {
    throw new ApiError(400, "comment is required");
  }

  const normalizedHomeworkId = toObjectId(homeworkId, "homeworkId");
  const homework = await findAccessibleHomework(req.auth, normalizedHomeworkId);

  const created = await HomeworkComment.create({
    homeworkId: homework._id,
    tuitionId: homework.tuitionId,
    teacherId: homework.teacherId,
    authorId: toObjectId(req.auth.userId, "user id"),
    authorRole: req.auth.role,
    comment: comment.trim(),
  });

  await logActivity({
    teacherId: homework.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "HomeworkComment",
    entityId: created._id,
    action: "ADD_HOMEWORK_COMMENT",
    metadata: {
      homeworkId: String(created.homeworkId),
      tuitionId: String(created.tuitionId),
    },
  });

  res.status(201).json({ homeworkComment: toResponse(created) });
};

const listHomeworkComments = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const homeworkId = toObjectId(req.params.homeworkId, "homeworkId");
  const homework = await findAccessibleHomework(req.auth, homeworkId);

  const filter = { homeworkId: homework._id };

  if (req.auth.role === "teacher") {
    filter.teacherId = homework.teacherId;
  }

  const [items, total] = await Promise.all([
    HomeworkComment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    HomeworkComment.countDocuments(filter),
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

module.exports = {
  createHomeworkComment,
  listHomeworkComments,
};
