const { ApiError } = require("./errorHandler");

const getTeacherScopeFromAuth = (auth) => {
  if (!auth) {
    throw new ApiError(401, "Unauthorized");
  }

  if (auth.role === "teacher") {
    return auth.userId;
  }

  if (auth.teacherId) {
    return auth.teacherId;
  }

  throw new ApiError(403, "Teacher scope is required");
};

const applyTeacherScope = (auth, baseFilter = {}) => {
  const teacherId = getTeacherScopeFromAuth(auth);
  return { ...baseFilter, teacherId };
};

const requireTeacherScopeMatch = (auth, teacherIdToCheck) => {
  const teacherId = getTeacherScopeFromAuth(auth);
  if (String(teacherIdToCheck) !== String(teacherId)) {
    throw new ApiError(403, "Cross-tenant access denied");
  }
};

module.exports = {
  applyTeacherScope,
  getTeacherScopeFromAuth,
  requireTeacherScopeMatch,
};
