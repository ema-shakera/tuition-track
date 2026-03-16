# Tuition Track

Multi-tenant academic tracking system using Node.js, Express, MongoDB, and Mongoose.

Current implementation scope is focused on `backend/` with tenant-safe teacher data isolation, role-based access, audit logging, notification outbox, monthly progress cache, and monthly report metadata storage.

## Project Structure

- `backend/`: implemented API server and data layer
- `frontend/`: present in workspace, not documented here in detail

## Backend Implementation Summary

Implemented inside `tuition-track/backend` only.

### Foundation (Chunk 0)

- Express app bootstrap and server lifecycle
- Environment validation
- MongoDB connection handling
- Standard error handling middleware
- Auth middleware and role guards
- Tenant helper utilities
- Pagination and sorting helpers

### Domain Chunks Completed

1. `users` authentication (`register`, `login`, `me`)
2. `teacherProfiles` (`create/get/update own profile`)
3. `studentProfiles` (teacher-managed profiles + student self endpoint)
4. `tuitions` (teacher-scoped CRUD, pause, soft delete)
5. `classSessions` (teacher-scoped create/list/delete)
6. `homework` (teacher-scoped create/list/get/update/soft delete)
7. `homeworkComments` (teacher and student comments with access rules)
8. `payments` (monthly upsert, unpaid list, paid/unpaid toggles)
9. `monthlyProgress` (cached monthly recompute and read endpoints)
10. `activityLogs` (audit trail model + logging on mutations)
11. `notificationOutbox` (outbox model, enqueue, processor, routes)
12. `monthlyReports` (external PDF metadata, teacher + student access)

### Transaction Flow Improvement

Implemented transactional tuition creation flow:

- Create tuition
- Create activity log
- Enqueue notification outbox entry
- Commit as one Mongo transaction

## Implemented Collections (Models)

- `User`
- `TeacherProfile`
- `StudentProfile`
- `Tuition`
- `ClassSession`
- `Homework`
- `HomeworkComment`
- `Payment`
- `MonthlyProgress`
- `ActivityLog`
- `NotificationOutbox`
- `MonthlyReport`

## API Base

- Health: `GET /health`
- Readiness: `GET /ready`
- API base prefix: `/api`

## Implemented Route Map

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Teacher Profiles

- `POST /api/teacher-profiles`
- `GET /api/teacher-profiles/me`
- `PATCH /api/teacher-profiles/me`

### Student Profiles

- `GET /api/student-profiles/me`
- `POST /api/student-profiles`
- `GET /api/student-profiles`
- `GET /api/student-profiles/:profileId`
- `PATCH /api/student-profiles/:profileId`

### Tuitions

- `POST /api/tuitions`
- `GET /api/tuitions`
- `GET /api/tuitions/:tuitionId`
- `PATCH /api/tuitions/:tuitionId`
- `PATCH /api/tuitions/:tuitionId/pause`
- `DELETE /api/tuitions/:tuitionId`

### Class Sessions

- `POST /api/class-sessions`
- `GET /api/class-sessions`
- `DELETE /api/class-sessions/:sessionId`

### Homework

- `POST /api/homework`
- `GET /api/homework`
- `GET /api/homework/:homeworkId`
- `PATCH /api/homework/:homeworkId`
- `DELETE /api/homework/:homeworkId`

### Homework Comments

- `POST /api/homework-comments`
- `GET /api/homework-comments/:homeworkId`

### Payments

- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/unpaid`
- `PATCH /api/payments/:paymentId/mark-paid`
- `PATCH /api/payments/:paymentId/mark-unpaid`

### Monthly Progress

- `POST /api/monthly-progress/recompute`
- `GET /api/monthly-progress`
- `GET /api/monthly-progress/:tuitionId/:month`

### Activity Logs

- `GET /api/activity-logs`

### Notification Outbox

- `POST /api/notification-outbox`
- `GET /api/notification-outbox`
- `POST /api/notification-outbox/process`

### Monthly Reports

- `POST /api/monthly-reports`
- `GET /api/monthly-reports`
- `GET /api/monthly-reports/student/me`
- `GET /api/monthly-reports/:reportId`
- `DELETE /api/monthly-reports/:reportId`

## Access Control (Implemented)

- Teacher and student roles are supported
- Most mutation endpoints are teacher-only
- Students are limited to:
  - viewing own profile endpoint
  - commenting on accessible homework
  - reading accessible monthly report endpoints

## Environment Variables

Required:

- `MONGODB_URI`
- `JWT_SECRET`

Optional:

- `PORT` (default: `8002`)
- `NODE_ENV` (default: `development`)
- `CORS_ORIGIN` (default: `*`)
- `JWT_EXPIRES_IN` (default: `7d`)
- `OUTBOX_PROCESSOR_ENABLED` (default: `false`)
- `OUTBOX_PROCESSOR_INTERVAL_MS` (default: `30000`)
- `OUTBOX_PROCESSOR_BATCH_SIZE` (default: `20`)

## Local Run

From `tuition-track/backend`:

```bash
npm install
npm run start
```

For development mode:

```bash
npm run dev
```

## Current Status

- Backend implementation for schema chunks is in place
- Core multi-tenant logic, auditability, and outbox architecture are implemented
- Next improvements are mainly hardening and test coverage (integration tests and transaction expansion on other multi-write flows)
