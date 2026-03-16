const mongoose = require("mongoose");

const { ApiError } = require("../middleware/errorHandler");
const { applyTeacherScope, getTeacherScopeFromAuth } = require("../middleware/tenant");
const Payment = require("../models/Payment");
const StudentProfile = require("../models/StudentProfile");
const Tuition = require("../models/Tuition");
const { logActivity } = require("../utils/activityLogger");
const { enqueueNotification } = require("../utils/notificationOutbox");
const { parsePagination, parseSort } = require("../utils/query");

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
};

const toMonth = (value) => {
  if (typeof value !== "string" || !MONTH_REGEX.test(value)) {
    throw new ApiError(400, "month must be in YYYY-MM format");
  }

  return value;
};

const toNonNegativeNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ApiError(400, `${fieldName} must be a number >= 0`);
  }

  return parsed;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }

  return parsed;
};

const toResponse = (payment) => ({
  id: String(payment._id),
  teacherId: String(payment.teacherId),
  tuitionId: String(payment.tuitionId),
  studentId: String(payment.studentId),
  month: payment.month,
  amount: payment.amount,
  status: payment.status,
  paidAt: payment.paidAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const enqueuePaymentNotification = async ({ teacherId, payment }) => {
  if (payment.status !== "paid") {
    return;
  }

  const studentProfile = await StudentProfile.findById(payment.studentId).lean();
  if (!studentProfile?.email) {
    return;
  }

  try {
    await enqueueNotification({
      teacherId,
      type: "PAYMENT_MARKED_PAID",
      toEmail: studentProfile.email,
      payload: {
        paymentId: String(payment._id),
        tuitionId: String(payment.tuitionId),
        month: payment.month,
        amount: payment.amount,
        paidAt: payment.paidAt,
      },
      dedupeSeed: `payment-paid:${payment._id}:${payment.month}:${payment.paidAt}`,
    });
  } catch (error) {
    console.error("Failed to enqueue payment notification:", error.message);
  }
};

const findOwnedTuition = async (auth, tuitionId) => {
  const tuition = await Tuition.findOne(applyTeacherScope(auth, { _id: tuitionId, deletedAt: null })).lean();

  if (!tuition) {
    throw new ApiError(404, "Tuition not found");
  }

  return tuition;
};

const upsertMonthlyPayment = async (req, res) => {
  const teacherId = toObjectId(getTeacherScopeFromAuth(req.auth), "teacher id");
  const { tuitionId, month, amount, status, paidAt } = req.body;

  const normalizedTuitionId = toObjectId(tuitionId, "tuitionId");
  const normalizedMonth = toMonth(month);
  const tuition = await findOwnedTuition(req.auth, normalizedTuitionId);

  const normalizedStatus = status === "paid" ? "paid" : "unpaid";
  const normalizedAmount =
    amount !== undefined ? toNonNegativeNumber(amount, "amount") : Number(tuition.monthlyFee || 0);

  const normalizedPaidAt =
    normalizedStatus === "paid"
      ? parseOptionalDate(paidAt, "paidAt") || new Date()
      : null;

  const payment = await Payment.findOneAndUpdate(
    applyTeacherScope(req.auth, { tuitionId: normalizedTuitionId, month: normalizedMonth }),
    {
      $set: {
        studentId: tuition.studentId,
        amount: normalizedAmount,
        status: normalizedStatus,
        paidAt: normalizedPaidAt,
      },
      $setOnInsert: {
        teacherId,
        tuitionId: normalizedTuitionId,
        month: normalizedMonth,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).lean();

  await logActivity({
    teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Payment",
    entityId: payment._id,
    action: "UPSERT_PAYMENT",
    metadata: {
      tuitionId: String(payment.tuitionId),
      month: payment.month,
      status: payment.status,
      amount: payment.amount,
    },
  });

  await enqueuePaymentNotification({ teacherId, payment });

  res.status(200).json({ payment: toResponse(payment) });
};

const listPayments = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const sort = parseSort(req.query, "-createdAt");

  const filter = applyTeacherScope(req.auth, {});

  if (req.query.tuitionId) {
    const tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
    await findOwnedTuition(req.auth, tuitionId);
    filter.tuitionId = tuitionId;
  }

  if (req.query.month) {
    filter.month = toMonth(req.query.month);
  }

  if (req.query.status) {
    if (!["paid", "unpaid"].includes(req.query.status)) {
      throw new ApiError(400, "status must be one of: paid, unpaid");
    }
    filter.status = req.query.status;
  }

  const [items, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    data: items.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const listUnpaidPayments = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const filter = applyTeacherScope(req.auth, { status: "unpaid" });

  if (req.query.month) {
    filter.month = toMonth(req.query.month);
  }

  if (req.query.tuitionId) {
    const tuitionId = toObjectId(req.query.tuitionId, "tuitionId");
    await findOwnedTuition(req.auth, tuitionId);
    filter.tuitionId = tuitionId;
  }

  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ month: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    data: items.map(toResponse),
    pagination: {
      page,
      limit,
      total,
    },
  });
};

const markPaymentPaidById = async (req, res) => {
  const paymentId = toObjectId(req.params.paymentId, "paymentId");
  const paidAt = parseOptionalDate(req.body.paidAt, "paidAt") || new Date();

  const payment = await Payment.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: paymentId }),
    { $set: { status: "paid", paidAt } },
    { new: true }
  ).lean();

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  await logActivity({
    teacherId: payment.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Payment",
    entityId: payment._id,
    action: "PAYMENT_MARKED_PAID",
    metadata: {
      tuitionId: String(payment.tuitionId),
      month: payment.month,
      paidAt: payment.paidAt,
    },
  });

  await enqueuePaymentNotification({
    teacherId: payment.teacherId,
    payment,
  });

  res.status(200).json({ payment: toResponse(payment) });
};

const markPaymentUnpaidById = async (req, res) => {
  const paymentId = toObjectId(req.params.paymentId, "paymentId");

  const payment = await Payment.findOneAndUpdate(
    applyTeacherScope(req.auth, { _id: paymentId }),
    { $set: { status: "unpaid", paidAt: null } },
    { new: true }
  ).lean();

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  await logActivity({
    teacherId: payment.teacherId,
    actorId: req.auth.userId,
    actorRole: req.auth.role,
    entityType: "Payment",
    entityId: payment._id,
    action: "PAYMENT_MARKED_UNPAID",
    metadata: {
      tuitionId: String(payment.tuitionId),
      month: payment.month,
    },
  });

  res.status(200).json({ payment: toResponse(payment) });
};

module.exports = {
  listPayments,
  listUnpaidPayments,
  markPaymentPaidById,
  markPaymentUnpaidById,
  upsertMonthlyPayment,
};
