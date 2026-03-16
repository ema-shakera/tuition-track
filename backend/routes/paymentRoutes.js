const express = require("express");

const {
  listPayments,
  listUnpaidPayments,
  markPaymentPaidById,
  markPaymentUnpaidById,
  upsertMonthlyPayment,
} = require("../controllers/paymentController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth, requireRole(["teacher"]));

router.post("/", asyncHandler(upsertMonthlyPayment));
router.get("/", asyncHandler(listPayments));
router.get("/unpaid", asyncHandler(listUnpaidPayments));
router.patch("/:paymentId/mark-paid", asyncHandler(markPaymentPaidById));
router.patch("/:paymentId/mark-unpaid", asyncHandler(markPaymentUnpaidById));

module.exports = router;
