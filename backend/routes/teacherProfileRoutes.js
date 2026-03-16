const express = require("express");

const {
  createTeacherProfile,
  getMyTeacherProfile,
  updateMyTeacherProfile,
} = require("../controllers/teacherProfileController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(createTeacherProfile));
router.get("/me", asyncHandler(getMyTeacherProfile));
router.patch("/me", asyncHandler(updateMyTeacherProfile));

module.exports = router;
