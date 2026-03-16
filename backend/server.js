const app = require("./app");
const { connectToDatabase, disconnectFromDatabase } = require("./config/database");
const { env } = require("./config/env");
const { processOutboxBatch } = require("./services/notificationOutboxProcessor");

let server;
let outboxProcessorTimer;

const startServer = async () => {
  await connectToDatabase(env.MONGODB_URI);

  server = app.listen(env.PORT, () => {
    console.log(`Backend running on port ${env.PORT}`);
  });

  if (env.OUTBOX_PROCESSOR_ENABLED) {
    outboxProcessorTimer = setInterval(async () => {
      try {
        await processOutboxBatch({ limit: env.OUTBOX_PROCESSOR_BATCH_SIZE });
      } catch (error) {
        console.error("Outbox processor tick failed:", error);
      }
    }, env.OUTBOX_PROCESSOR_INTERVAL_MS);

    outboxProcessorTimer.unref();
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`);

  if (outboxProcessorTimer) {
    clearInterval(outboxProcessorTimer);
    outboxProcessorTimer = null;
  }

  if (server) {
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
    return;
  }

  await disconnectFromDatabase();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
