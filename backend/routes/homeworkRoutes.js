const express = require("express");

const {
  createHomework,
  getHomeworkById,
  listHomework,
  softDeleteHomeworkById,
  updateHomeworkById,
} = require("../controllers/homeworkController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(createHomework));
router.get("/", asyncHandler(listHomework));
router.get("/:homeworkId", asyncHandler(getHomeworkById));
router.patch("/:homeworkId", asyncHandler(updateHomeworkById));
router.delete("/:homeworkId", asyncHandler(softDeleteHomeworkById));

module.exports = router;
