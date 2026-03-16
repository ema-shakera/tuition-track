const mongoose = require("mongoose");

const ActivityLog = require("../models/ActivityLog");

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(value);
};

const logActivity = async ({
  teacherId,
  actorId,
  actorRole,
  entityType,
  entityId,
  action,
  metadata = {},
  session,
}) => {
  const payload = {
    teacherId: toObjectId(teacherId),
    actorId: toObjectId(actorId),
    actorRole,
    entityType,
    entityId: toObjectId(entityId),
    action,
    metadata,
  };

  if (session) {
    const [created] = await ActivityLog.create([payload], { session });
    return created;
  }

  return ActivityLog.create(payload);
};

module.exports = {
  logActivity,
};
