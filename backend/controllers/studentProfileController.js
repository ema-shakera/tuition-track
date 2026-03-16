const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");
const { parsePagination, parseSort } = require("../utils/query");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const ensureEmail = (value, fieldName) => {
  const email = normalizeEmail(value);
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, `${fieldName} must be a valid email`);
  }
  return email;
};

const toResponse = (profile) => ({
  id: String(profile._id),
  userId: profile.userId ? String(profile.userId) : null,
  name: profile.name,
  email: profile.email,
  guardianEmail: profile.guardianEmail,
  createdAt: profile.createdAt,
});

const createStudentProfile = async (req, res) => {
  const { name, email, guardianEmail, userId } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Name is required");
  }

  const normalizedEmail = ensureEmail(email, "Email");
  const normalizedGuardianEmail = guardianEmail
    ? ensureEmail(guardianEmail, "Guardian email")
    : "";

  let normalizedUserId = null;

  if (userId !== undefined && userId !== null && userId !== "") {
    normalizedUserId = toObjectId(userId, "userId");

    const user = await User.findById(normalizedUserId).lean();
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.role !== "student") {
      throw new ApiError(400, "userId must belong to a student user");
    }

    const existingByUserId = await StudentProfile.findOne({ userId: normalizedUserId }).lean();
    if (existingByUserId) {
      throw new ApiError(409, "Student profile already exists for this user");
    }
  }

  const existingByEmail = await StudentProfile.findOne({ email: normalizedEmail }).lean();
  if (existingByEmail) {
    throw new ApiError(409, "Student profile already exists for this email");
  }

  const profile = await StudentProfile.create({
    userId: normalizedUserId,
    name: name.trim(),
    email: normalizedEmail,
    guardianEmail: normalizedGuardianEmail,
  });

  await logActivity({
    teacherId: req.auth.userId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "StudentProfile",
    entityId: profile._id,
    action: "CREATE_STUDENT_PROFILE",
    metadata: {
      linkedUserId: profile.userId ? String(profile.userId) : null,
      email: profile.email,
    },
  });

  res.status(201).json({ profile: toResponse(profile) });
};

const listStudentProfiles = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const sort = parseSort(req.query, "name");

  const [profiles, total] = await Promise.all([
    StudentProfile.find({}).sort(sort).skip(skip).limit(limit).lean(),
    StudentProfile.countDocuments({}),
  ]);

  res.status(200).json({
    data: profiles.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const getStudentProfileById = async (req, res) => {
  const profileId = toObjectId(req.params.profileId, "profileId");

  const profile = await StudentProfile.findById(profileId).lean();
  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  await logActivity({
    teacherId: req.auth.userId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "StudentProfile",
    entityId: profile._id,
    action: "UPDATE_STUDENT_PROFILE",
    metadata: {
      updatedFields: Object.keys(updates),
    },
  });

  res.status(200).json({ profile: toResponse(profile) });
};

const updateStudentProfileById = async (req, res) => {
  const profileId = toObjectId(req.params.profileId, "profileId");
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      throw new ApiError(400, "Name must be a non-empty string");
    }
    updates.name = req.body.name.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
    updates.email = ensureEmail(req.body.email, "Email");
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "guardianEmail")) {
    updates.guardianEmail = req.body.guardianEmail
      ? ensureEmail(req.body.guardianEmail, "Guardian email")
      : "";
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "userId")) {
    if (req.body.userId === null || req.body.userId === "") {
      updates.userId = null;
    } else {
      const normalizedUserId = toObjectId(req.body.userId, "userId");
      const user = await User.findById(normalizedUserId).lean();

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (user.role !== "student") {
        throw new ApiError(400, "userId must belong to a student user");
      }

      const existingByUserId = await StudentProfile.findOne({
        userId: normalizedUserId,
        _id: { $ne: profileId },
      }).lean();

      if (existingByUserId) {
        throw new ApiError(409, "Another student profile already uses this userId");
      }

      updates.userId = normalizedUserId;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  if (updates.email) {
    const existingByEmail = await StudentProfile.findOne({
      email: updates.email,
      _id: { $ne: profileId },
    }).lean();

    if (existingByEmail) {
      throw new ApiError(409, "Another student profile already uses this email");
    }
  }

  const profile = await StudentProfile.findByIdAndUpdate(
    profileId,
    { $set: updates },
    { new: true }
  ).lean();

  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  res.status(200).json({ profile: toResponse(profile) });
};

const getMyStudentProfile = async (req, res) => {
  const userId = toObjectId(req.auth.userId, "user id");

  const profile = await StudentProfile.findOne({ userId }).lean();
  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  res.status(200).json({ profile: toResponse(profile) });
};

module.exports = {
  createStudentProfile,
  getMyStudentProfile,
  getStudentProfileById,
  listStudentProfiles,
  updateStudentProfileById,
};
