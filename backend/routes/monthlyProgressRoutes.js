const express = require("express");

const {
  getMonthlyProgressByTuitionAndMonth,
  listMonthlyProgress,
  recomputeMonthlyProgress,
} = require("../controllers/monthlyProgressController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/recompute", asyncHandler(recomputeMonthlyProgress));
router.get("/", asyncHandler(listMonthlyProgress));
router.get("/:tuitionId/:month", asyncHandler(getMonthlyProgressByTuitionAndMonth));

module.exports = router;
