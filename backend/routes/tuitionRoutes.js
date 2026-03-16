const express = require("express");

const {
  createTuition,
  getTuitionById,
  listTuitions,
  pauseTuitionById,
  softDeleteTuitionById,
  updateTuitionById,
} = require("../controllers/tuitionController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(createTuition));
router.get("/", asyncHandler(listTuitions));
router.get("/:tuitionId", asyncHandler(getTuitionById));
router.patch("/:tuitionId", asyncHandler(updateTuitionById));
router.patch("/:tuitionId/pause", asyncHandler(pauseTuitionById));
router.delete("/:tuitionId", asyncHandler(softDeleteTuitionById));

module.exports = router;
