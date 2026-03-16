# Tuition Track Frontend

React Native (Expo) client for Tuition Track with Firebase authentication, Firestore-backed dashboard data, Redux state management, and role-based navigation.

This README documents the current implementation in `tuition-track/frontend`.

## Tech Stack

- React Native + Expo
- React Navigation (native stack)
- Redux Toolkit + Redux Persist
- Firebase Auth + Firestore
- Axios for backend/report HTTP requests

## Folder Structure

- `App.js`: app bootstrap, providers, and root navigation
- `navigation/`: auth and app stacks, route constants
- `screens/`: user-facing screens
- `components/`: reusable UI components
- `redux/`: store, slices, thunks
- `services/`: API and Firebase integration layer
- `hooks/`: custom app hooks (`useAuth`)

## Implemented App Flow

1. App starts with Redux Provider + PersistGate + NavigationContainer.
2. `bootstrapAuthState` restores Firebase session.
3. Navigation is selected by auth state:
- no token -> `AuthStack`
- token but not verified -> `VerifyEmail` path
- verified token -> `AppStack`

## Navigation Implementation

Defined routes in `navigation/routes.js`:

- `Entry`
- `Login`
- `Register`
- `VerifyEmail`
- `Home`
- `TuitionDetail`

Stacks:

- `AuthStack`: Entry, Login, Register, VerifyEmail
- `AppStack`: Home, TuitionDetail

## Screens Implemented

- `EntryScreen`
- `LoginScreen`
- `RegisterScreen`
- `VerifyEmailScreen`
- `HomeScreen`
- `TuitionDetailScreen`

## Reusable Components Implemented

- `AppLoader`
- `ScreenHeader`
- `PrimaryButton`
- `SecondaryButton`
- `TextInputField`
- `PasswordInputField`
- `RoleToggle`
- `StatusBanner`
- `EmptyState`
- `ProgressBar`
- `StatCard`
- `HomeworkCard`
- `TuitionCard`
- `ModalShell`

## Redux Implementation

### Store

- Configured in `redux/store.js`
- Uses `redux-persist` with AsyncStorage
- Auth substate is persisted (`user`, `userToken`)

### Slices

- `authSlice`
- `dashboardSlice`

### Thunks

Auth thunks (`redux/thunks/authThunks.js`):

- `bootstrapAuthState`
- `loginUser`
- `registerUser`
- `logoutUser`
- `resendVerificationEmail`
- `refreshVerificationStatus`

Dashboard thunks (`redux/thunks/dashboardThunks.js`):

- `loadDashboardData`
- `saveDashboardData`
- `createHomeworkItem`
- `updateHomeworkItem`
- `deleteHomeworkItem`
- `createTuitionItem`
- `updateTuitionItem`
- `deleteTuitionItem`

## Services Implemented

### Firebase (`services/firebase.js`)

- Initializes Firebase app from `EXPO_PUBLIC_FIREBASE_*` env vars
- Sets up React Native auth persistence using AsyncStorage
- Exposes:
- `auth`
- `db`
- `isFirebaseConfigured`

### Auth API (`services/authApi.js`)

- Email/password login and registration
- Email verification flow
- Session restore and token refresh
- Firestore user profile sync (`users` collection)
- Role normalization (`teacher` or `student`)
- Retry + timeout handling for transient failures

### Dashboard API (`services/dashboardApi.js`)

- Role-aware dashboard loading and saving
- Firestore-backed tuition and homework operations
- Teacher/student scoped data handling
- Canonical collections used:
- `tuitions`
- `homework`
- plus role collections (`teacher`, `student`)

### Axios Client (`services/axiosClient.js`)

- Configurable `baseURL` via `EXPO_PUBLIC_API_BASE_URL`
- Bearer token request interceptor
- Normalized HTTP error mapping

### Report API (`services/reportApi.js`)

- Fetches tuition report via HTTP endpoint
- Endpoint configurable via `EXPO_PUBLIC_REPORT_DOWNLOAD_ENDPOINT`
- Falls back to `/api/reports/tuition`

## Role and Access Behavior (Frontend)

- Supported roles: `teacher`, `student`
- Dashboard thunks validate role before loading/mutating data
- Role mismatch is blocked with user-friendly errors
- Email verification is required before dashboard access

## Environment Variables

Required for Firebase features:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_REPORT_DOWNLOAD_ENDPOINT`

## Run Frontend Locally

From `tuition-track/frontend`:

```bash
npm install
npm run start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

## Current Implementation Notes

- Frontend currently uses Firebase Auth and Firestore data operations for core client behavior.
- Axios/report integration is available for backend-connected report fetches.
- Backend integration for all dashboard mutations can be expanded in future chunks if required.

## What Is Left To Implement (Frontend)

1. Complete backend API integration for feature modules:
- Move dashboard CRUD paths from Firestore service flows to backend endpoints (`/api/tuitions`, `/api/homework`, `/api/payments`, `/api/monthly-progress`, etc.)
- Keep one source of truth for domain data (recommended: backend Mongo APIs)

2. Align authentication strategy end-to-end:
- Choose and finalize one approach for production auth/session ownership:
	- Firebase auth + backend token exchange, or
	- Backend auth (`/api/auth`) as primary
- Update app bootstrap and token refresh behavior accordingly

3. Add API-layer robustness:
- Centralized API response adapters for backend payload shapes
- Retry and offline handling for network failures
- Better empty, loading, and error UI states per screen

4. Add frontend test coverage:
- Component tests for shared UI elements
- Redux slice/thunk tests
- Navigation and auth flow tests

5. Strengthen UX and app lifecycle handling:
- Pull-to-refresh and background refresh patterns
- Pagination/infinite-list behavior for long lists
- Better role-specific dashboards and detail screens

6. Reporting UX completion:
- Display and download monthly reports using backend monthly report APIs
- Wire report filters and report details in `TuitionDetailScreen`
