const dotenv = require("dotenv");

const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET"];

dotenv.config();

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parsePort = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 8002;
  }
  return parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parsePort(process.env.PORT),
  MONGODB_URI: process.env.MONGODB_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  OUTBOX_PROCESSOR_ENABLED: parseBoolean(process.env.OUTBOX_PROCESSOR_ENABLED, false),
  OUTBOX_PROCESSOR_INTERVAL_MS: parsePositiveInt(process.env.OUTBOX_PROCESSOR_INTERVAL_MS, 30000),
  OUTBOX_PROCESSOR_BATCH_SIZE: parsePositiveInt(process.env.OUTBOX_PROCESSOR_BATCH_SIZE, 20),
});

module.exports = { env };
