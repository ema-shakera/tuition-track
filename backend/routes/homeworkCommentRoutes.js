const express = require("express");

const { createHomeworkComment, listHomeworkComments } = require("../controllers/homeworkCommentController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher", "student"]));

router.post("/", asyncHandler(createHomeworkComment));
router.get("/:homeworkId", asyncHandler(listHomeworkComments));

module.exports = router;
