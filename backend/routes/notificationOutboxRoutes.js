const express = require("express");

const {
  createOutboxEntry,
  listOutboxEntries,
  processOutboxNow,
} = require("../controllers/notificationOutboxController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(createOutboxEntry));
router.get("/", asyncHandler(listOutboxEntries));
router.post("/process", asyncHandler(processOutboxNow));

module.exports = router;
