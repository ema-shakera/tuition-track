const NotificationOutbox = require("../models/NotificationOutbox");

const MAX_RETRIES = 5;

const computeRetryDelayMs = (retryCount) => {
  const capped = Math.min(retryCount, 6);
  return 60 * 1000 * 2 ** capped;
};

const defaultTransport = async (job) => {
  console.log("[outbox] sending email", {
    id: String(job._id),
    type: job.type,
    toEmail: job.toEmail,
    retryCount: job.retryCount,
  });
};

const processSingleOutboxJob = async ({ transport = defaultTransport, teacherId, now = new Date() } = {}) => {
  const filter = {
    status: "pending",
    scheduledAt: { $lte: now },
  };

  if (teacherId) {
    filter.teacherId = teacherId;
  }

  const job = await NotificationOutbox.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "processing",
      },
    },
    {
      new: true,
      sort: { scheduledAt: 1, createdAt: 1 },
    }
  ).lean();

  if (!job) {
    return { processed: false };
  }

  try {
    await transport(job);

    const updated = await NotificationOutbox.findByIdAndUpdate(
      job._id,
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          errorMessage: "",
        },
      },
      { new: true }
    ).lean();

    return { processed: true, status: "sent", job: updated };
  } catch (error) {
    const nextRetryCount = Number(job.retryCount || 0) + 1;
    const exhausted = nextRetryCount >= MAX_RETRIES;
    const nextScheduledAt = exhausted
      ? job.scheduledAt
      : new Date(Date.now() + computeRetryDelayMs(nextRetryCount));

    const updated = await NotificationOutbox.findByIdAndUpdate(
      job._id,
      {
        $set: {
          status: exhausted ? "failed" : "pending",
          retryCount: nextRetryCount,
          scheduledAt: nextScheduledAt,
          errorMessage: error instanceof Error ? error.message : "Unknown delivery error",
        },
      },
      { new: true }
    ).lean();

    return {
      processed: true,
      status: exhausted ? "failed" : "retrying",
      job: updated,
    };
  }
};

const processOutboxBatch = async ({ limit = 20, transport, teacherId } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const results = [];
  for (let i = 0; i < safeLimit; i += 1) {
    const result = await processSingleOutboxJob({ transport, teacherId });
    if (!result.processed) {
      break;
    }
    results.push(result);
  }

  return {
    processedCount: results.length,
    sentCount: results.filter((item) => item.status === "sent").length,
    retryingCount: results.filter((item) => item.status === "retrying").length,
    failedCount: results.filter((item) => item.status === "failed").length,
  };
};

module.exports = {
  processOutboxBatch,
};
