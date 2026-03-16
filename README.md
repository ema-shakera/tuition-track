# Tuition Track

Tuition Track is a multi-tenant academic tracking system with:

- `backend/`: Node.js + Express + MongoDB API
- `frontend/`: React Native (Expo) mobile app

This README explains how to integrate frontend and backend, how users flow through the app, and how to run everything locally.

## Repository Structure

- `backend/`: API server, tenant-isolated data model, audit logs, outbox, reports metadata
- `frontend/`: Expo app with auth flow, role-based navigation, dashboard UI and services

For module-level details:

- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`

## Current Integration State

The frontend currently has a hybrid implementation:

- Firebase Auth + Firestore are used for core app data flows
- Axios + backend endpoints are available for backend-connected features (for example reports)

The backend is fully implemented for the MongoDB schema/API tracks.

## Recommended Integration Direction

Use backend APIs as the domain source of truth and progressively migrate frontend data operations from Firestore service calls to backend route calls.

Target backend API groups:

- `/api/auth`
- `/api/teacher-profiles`
- `/api/student-profiles`
- `/api/tuitions`
- `/api/class-sessions`
- `/api/homework`
- `/api/homework-comments`
- `/api/payments`
- `/api/monthly-progress`
- `/api/monthly-reports`
- `/api/activity-logs`

## Frontend <-> Backend Integration Steps

1. Set backend base URL in frontend env:
- `EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:8002`

2. Run backend and verify it is reachable:
- `GET /health` should return `{"status":"ok"}`

3. Keep Axios auth token wiring active:
- Frontend already sets `Authorization: Bearer <token>` using `setAxiosAuthToken`

4. Migrate service-by-service:
- Replace Firestore CRUD inside `frontend/services/dashboardApi.js` with backend Axios calls
- Map backend responses into existing Redux payload shapes (`stats`, `homeworkItems`, `tuitionItems`) or update slices accordingly

5. Align auth strategy:
- Pick one production path:
- Path A: backend auth (`/api/auth`) as primary identity/session
- Path B: Firebase auth primary, with backend trust/token exchange layer

6. Validate role and tenant rules end-to-end:
- Teacher can mutate domain entities
- Student can only access allowed student actions (comments/read-only report paths)

## User Flow

### Unauthenticated Flow

1. App opens -> session restore runs.
2. If no session, user sees:
- `Entry`
- `Login`
- `Register`

### Email Verification Flow

1. User registers.
2. User receives verification email.
3. Until verified, app routes to `VerifyEmail`.
4. After verification refresh, user enters main app.

### Authenticated Flow

1. Verified user enters `Home` screen.
2. User navigates to `TuitionDetail` for detailed entity data.
3. Role-based behavior applies:
- Teacher: manage tuition, homework, classes, payments, reports
- Student: limited access and comment/report views based on policy

## Run Locally

## Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or Atlas)
- Expo CLI/runtime support (through `npx expo`)

## 1) Backend Setup

From `tuition-track/backend`:

```bash
npm install
```

Create `.env` in `backend/` with at least:

```env
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
PORT=8002
```

Optional backend variables:

```env
NODE_ENV=development
CORS_ORIGIN=*
JWT_EXPIRES_IN=7d
OUTBOX_PROCESSOR_ENABLED=false
OUTBOX_PROCESSOR_INTERVAL_MS=30000
OUTBOX_PROCESSOR_BATCH_SIZE=20
```

Start backend:

```bash
npm run start
```

## 2) Frontend Setup

From `tuition-track/frontend`:

```bash
npm install
```

Set required Expo public env vars (Firebase + API base URL). Example:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=<...>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<...>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<...>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<...>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<...>
EXPO_PUBLIC_FIREBASE_APP_ID=<...>
EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:8002
EXPO_PUBLIC_REPORT_DOWNLOAD_ENDPOINT=/api/reports/tuition
```

Start frontend:

```bash
npm run start
```

Then run on your target:

```bash
npm run android
npm run ios
npm run web
```

## 3) Run Both Together

Use two terminals:

1. Terminal A:
- `cd tuition-track/backend && npm run start`

2. Terminal B:
- `cd tuition-track/frontend && npm run start`

## Basic Verification Checklist

1. Backend:
- `GET /health` returns 200
- `GET /ready` returns 200 after DB connect

2. Frontend:
- App launches and shows auth screens when signed out
- Register/login flow works
- Verified users can reach `Home`

3. Integration:
- Frontend can reach backend using `EXPO_PUBLIC_API_BASE_URL`
- Authenticated requests include bearer token

## Notes

- Backend and frontend READMEs contain implementation-specific details and remaining work.
- For chunk-by-chunk continuation, keep implementation isolated to each folder (`backend/` or `frontend/`) per change scope.
