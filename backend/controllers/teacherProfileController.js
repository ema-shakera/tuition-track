const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const TeacherProfile = require("../models/TeacherProfile");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, "Invalid user id");
  }

  return new mongoose.Types.ObjectId(value);
};

const toResponse = (profile) => ({
  id: String(profile._id),
  userId: String(profile.userId),
  name: profile.name,
  phone: profile.phone,
  timezone: profile.timezone,
  createdAt: profile.createdAt,
});

const createTeacherProfile = async (req, res) => {
  const userId = toObjectId(req.auth.userId);
  const { name, phone, timezone } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Name is required");
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== "teacher") {
    throw new ApiError(403, "Only teacher users can create teacher profiles");
  }

  const existing = await TeacherProfile.findOne({ userId }).lean();
  if (existing) {
    throw new ApiError(409, "Teacher profile already exists");
  }

  const profile = await TeacherProfile.create({
    userId,
    name: name.trim(),
    phone: typeof phone === "string" ? phone.trim() : "",
    timezone: typeof timezone === "string" && timezone.trim() ? timezone.trim() : "UTC",
  });

  await logActivity({
    teacherId: userId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "TeacherProfile",
    entityId: profile._id,
    action: "CREATE_TEACHER_PROFILE",
    metadata: {
      timezone: profile.timezone,
    },
  });

  res.status(201).json({ profile: toResponse(profile) });
};

const getMyTeacherProfile = async (req, res) => {
  const userId = toObjectId(req.auth.userId);

  const profile = await TeacherProfile.findOne({ userId }).lean();
  if (!profile) {
    throw new ApiError(404, "Teacher profile not found");
  }

  await logActivity({
    teacherId: userId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "TeacherProfile",
    entityId: profile._id,
    action: "UPDATE_TEACHER_PROFILE",
    metadata: {
      updatedFields: Object.keys(updates),
    },
  });

  res.status(200).json({ profile: toResponse(profile) });
};

const updateMyTeacherProfile = async (req, res) => {
  const userId = toObjectId(req.auth.userId);
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      throw new ApiError(400, "Name must be a non-empty string");
    }
    updates.name = req.body.name.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
    if (typeof req.body.phone !== "string") {
      throw new ApiError(400, "Phone must be a string");
    }
    updates.phone = req.body.phone.trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "timezone")) {
    if (typeof req.body.timezone !== "string" || !req.body.timezone.trim()) {
      throw new ApiError(400, "Timezone must be a non-empty string");
    }
    updates.timezone = req.body.timezone.trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const profile = await TeacherProfile.findOneAndUpdate({ userId }, { $set: updates }, { new: true });

  if (!profile) {
    throw new ApiError(404, "Teacher profile not found");
  }

  res.status(200).json({ profile: toResponse(profile) });
};

module.exports = {
  createTeacherProfile,
  getMyTeacherProfile,
  updateMyTeacherProfile,
};
