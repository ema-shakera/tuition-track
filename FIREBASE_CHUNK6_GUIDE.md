# Chunk 6 Firebase Integration Guide

## 1. Environment setup

1. Copy `.env.example` to `.env`.
2. Fill all `EXPO_PUBLIC_FIREBASE_*` values from your Firebase project settings.
3. Restart Expo after env updates.

## 2. Firestore data model used by this app

### `users/{uid}`
- `uid: string`
- `email: string`
- `name: string`
- `role: "teacher" | "student"`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `teacher_dashboards/{uid}` and `student_dashboards/{uid}`
- `uid: string`
- `role: "teacher" | "student"`
- `stats: array`
- `homeworkItems: array`
- `tuitionItems: array`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### Canonical collections (recommended)

### `tuitions/{tuitionId}`
- `id: string`
- `teacherId: string`
- `studentEmail: string | ""`
- `studentName: string | ""`
- `subject: string`
- `status: "pending" | "paid" | "overdue"`
- `plannedClassesPerMonth: number`
- `takenClasses: number`
- `classHistory: array`
- `updatedAt: timestamp`

### `homework/{homeworkId}`
- `id: string`
- `tuitionId: string`
- `teacherId: string`
- `studentEmail: string | ""`
- `studentName: string | ""`
- `title: string`
- `subject: string`
- `description: string`
- `status: "pending" | "completed"`
- `updatedAt: timestamp`

## 3. Service-layer data fetching and posting flow

All Firebase reads/writes must stay in `services/`.

- Auth:
  - `services/authApi.js`
  - Register: Firebase Auth account + `users/{uid}` profile write with role.
  - Login/session restore: load role profile from `users/{uid}` and map into Redux user.

- Dashboard:
  - `services/dashboardApi.js`
  - Fetch: `fetchDashboardData({ uid, role, userRole })`
  - Save full dashboard: `saveDashboardData({ uid, role, userRole, dashboardData })`
  - CRUD:
    - `createHomeworkItem`
    - `updateHomeworkItem`
    - `deleteHomeworkItem`
    - `createTuitionItem`
    - `updateTuitionItem`
    - `deleteTuitionItem`

- Retry and error handling:
  - Retries: `services/retry.js`
  - Error normalization: `services/errorUtils.js`

## 4. Redux usage contract

Screens must only dispatch thunks from `redux/thunks/` and read selectors from `redux/slices/`.

- Good:
  - `dispatch(loadDashboardData({ role }))`
  - `dispatch(createHomeworkItem({ role, item }))`
- Not allowed:
  - Calling Firebase SDK directly in `screens/`.

## 5. Role-based authorization behavior

- Authenticated user role is persisted in `auth.user.role`.
- Dashboard access is role-guarded in both:
  - Thunks (`redux/thunks/dashboardThunks.js`)
  - Services (`services/dashboardApi.js`)
- If `userRole !== requestedRole`, operation is rejected with a friendly error.

## 6. Firestore security rules assumptions

Client checks improve UX, but security must be enforced in Firestore rules.

Expected rule intent:
- User can read/write only their own `users/{uid}` profile.
- User can read/write only their own dashboard doc in role collection matching profile role.
- Deny cross-role access (teacher account cannot access student collection unless your product explicitly allows it).
- Teachers can read/write canonical `tuitions` and `homework` they own (`teacherId == auth.uid`).
- Students can read canonical `tuitions` and `homework` assigned to their email.

Example rule sketch (adapt to your production policy):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read, write: if isOwner(uid);
    }

    match /teacher_dashboards/{uid} {
      allow read, write: if isOwner(uid)
        && get(/databases/$(database)/documents/users/$(uid)).data.role == 'teacher';
    }

    match /student_dashboards/{uid} {
      allow read, write: if isOwner(uid)
        && get(/databases/$(database)/documents/users/$(uid)).data.role == 'student';
    }

    match /tuitions/{tuitionId} {
      allow read: if signedIn() && (
        resource.data.teacherId == request.auth.uid ||
        (
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' &&
          resource.data.studentEmail == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email
        )
      );
      allow write: if signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' &&
        request.resource.data.teacherId == request.auth.uid;
    }

    match /homework/{homeworkId} {
      allow read: if signedIn() && (
        resource.data.teacherId == request.auth.uid ||
        (
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' &&
          resource.data.studentEmail == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email
        )
      );
      allow write: if signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' &&
        request.resource.data.teacherId == request.auth.uid;
    }
  }
}
```

## 7. Operational notes

- Keep Firestore indexes updated if you add new query patterns.
- For writes from unstable networks, keep retries only on safe operations.
- Do not trust role from UI payload; always validate with stored profile and Firestore rules.
