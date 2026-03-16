const express = require("express");

const {
  createClassSession,
  deleteClassSessionById,
  listClassSessions,
} = require("../controllers/classSessionController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(createClassSession));
router.get("/", asyncHandler(listClassSessions));
router.delete("/:sessionId", asyncHandler(deleteClassSessionById));

module.exports = router;
