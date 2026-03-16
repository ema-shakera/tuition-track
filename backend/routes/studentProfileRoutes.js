const express = require("express");

const {
  createStudentProfile,
  getMyStudentProfile,
  getStudentProfileById,
  listStudentProfiles,
  updateStudentProfileById,
} = require("../controllers/studentProfileController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);

router.get("/me", requireRole(["student"]), asyncHandler(getMyStudentProfile));

router.post("/", requireRole(["teacher"]), asyncHandler(createStudentProfile));
router.get("/", requireRole(["teacher"]), asyncHandler(listStudentProfiles));
router.get("/:profileId", requireRole(["teacher"]), asyncHandler(getStudentProfileById));
router.patch("/:profileId", requireRole(["teacher"]), asyncHandler(updateStudentProfileById));

module.exports = router;
