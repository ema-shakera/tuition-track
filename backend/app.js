const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");

const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const activityLogRoutes = require("./routes/activityLogRoutes");
const authRoutes = require("./routes/authRoutes");
const classSessionRoutes = require("./routes/classSessionRoutes");
const homeworkCommentRoutes = require("./routes/homeworkCommentRoutes");
const homeworkRoutes = require("./routes/homeworkRoutes");
const monthlyProgressRoutes = require("./routes/monthlyProgressRoutes");
const monthlyReportRoutes = require("./routes/monthlyReportRoutes");
const notificationOutboxRoutes = require("./routes/notificationOutboxRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const studentProfileRoutes = require("./routes/studentProfileRoutes");
const teacherProfileRoutes = require("./routes/teacherProfileRoutes");
const tuitionRoutes = require("./routes/tuitionRoutes");

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/ready", (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not-ready",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/class-sessions", classSessionRoutes);
app.use("/api/homework-comments", homeworkCommentRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/monthly-progress", monthlyProgressRoutes);
app.use("/api/monthly-reports", monthlyReportRoutes);
app.use("/api/notification-outbox", notificationOutboxRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/student-profiles", studentProfileRoutes);
app.use("/api/teacher-profiles", teacherProfileRoutes);
app.use("/api/tuitions", tuitionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
