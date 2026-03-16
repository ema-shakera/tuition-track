const express = require("express");

const { listActivityLogs } = require("../controllers/activityLogController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.get("/", asyncHandler(listActivityLogs));

module.exports = router;
