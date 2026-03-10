import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { setAxiosAuthToken, clearAxiosAuthToken } from './axiosClient';
import { createServiceError, normalizeFirebaseError } from './errorUtils';
import { withRetry } from './retry';

const SUPPORTED_ROLES = new Set(['teacher', 'student']);
const USERS_COLLECTION = 'users';
const PROFILE_OPERATION_TIMEOUT_MS = 8000;

const normalizeRole = (role) => (SUPPORTED_ROLES.has(role) ? role : 'student');

const withOperationTimeout = (promise, timeoutMs, timeoutCode = 'operation/timeout') => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error('Operation timed out.');
      error.code = timeoutCode;
      error.isTransient = true;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

const ensureFirebase = () => {
  if (!isFirebaseConfigured || !auth || !db) {
    const error = new Error('Firebase is not configured. Check EXPO_PUBLIC_FIREBASE_* values.');
    error.code = 'config/not-configured';
    error.userMessage = 'App configuration is incomplete. Please contact support.';
    error.isTransient = false;
    throw error;
  }
};

const mapAuthUser = async (firebaseUser, role) => {
  const userToken = await firebaseUser.getIdToken();
  return {
    user: {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || '',
      role: normalizeRole(role),
      isEmailVerified: Boolean(firebaseUser.emailVerified),
    },
    userToken,
  };
};

const getUserProfileRef = (uid) => doc(db, USERS_COLLECTION, uid);

const ensureSupportedRole = (role) => {
  if (role && !SUPPORTED_ROLES.has(role)) {
    throw createServiceError({
      code: 'validation/unsupported-role',
      fallbackMessage: 'Unsupported role selected. Please choose teacher or student.',
    });
  }
};

const isTransientProfileError = (error) => {
  const code = error?.code || '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'auth/network-request-failed' ||
    Boolean(error?.isTransient)
  );
};

const getUserProfile = async ({ uid }) => {
  const profileRef = getUserProfileRef(uid);
  const profileSnapshot = await withRetry(() => getDoc(profileRef), {
    shouldRetry: (error) => isTransientProfileError(error),
  });

  if (!profileSnapshot.exists()) {
    return null;
  }

  return profileSnapshot.data();
};

const upsertUserProfile = async ({ uid, email, name, role, isCreate = false }) => {
  const profileRef = getUserProfileRef(uid);
  const normalizedRole = normalizeRole(role);

  await setDoc(
    profileRef,
    {
      uid,
      email,
      name: name || '',
      role: normalizedRole,
      updatedAt: serverTimestamp(),
      ...(isCreate ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );

  return {
    uid,
    email,
    name: name || '',
    role: normalizedRole,
  };
};

const resolveUserRole = async ({ firebaseUser }) => {
  try {
    const existingProfile = await withOperationTimeout(
      getUserProfile({ uid: firebaseUser.uid }),
      PROFILE_OPERATION_TIMEOUT_MS
    );
    return normalizeRole(existingProfile?.role);
  } catch (error) {
    if (isTransientProfileError(error) || error?.code === 'operation/timeout') {
      return 'student';
    }

    throw error;
  }
};

const syncUserProfileSafely = async ({ uid, email, name, role, isCreate = false }) => {
  try {
    await withOperationTimeout(
      withRetry(
        () =>
          upsertUserProfile({
            uid,
            email,
            name,
            role,
            isCreate,
          }),
        {
          shouldRetry: (error) => isTransientProfileError(error),
        }
      ),
      PROFILE_OPERATION_TIMEOUT_MS
    );
  } catch (error) {
    if (isTransientProfileError(error) || error?.code === 'operation/timeout') {
      return;
    }

    throw error;
  }
};

const waitForAuthBootstrap = async () => {
  if (!auth) {
    return null;
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
};

export const authApi = {
  async login(email, password) {
    try {
      ensureFirebase();
      const credential = await withRetry(() => signInWithEmailAndPassword(auth, email, password), {
        shouldRetry: (error) => error?.code === 'auth/network-request-failed',
      });

      if (!credential.user.emailVerified) {
        throw createServiceError({
          code: 'auth/email-not-verified',
          fallbackMessage: 'Please verify your email before signing in.',
        });
      }

      const role = await resolveUserRole({ firebaseUser: credential.user });

      void syncUserProfileSafely({
        uid: credential.user.uid,
        email: credential.user.email,
        name: credential.user.displayName || '',
        role,
        isCreate: true,
      });

      const mapped = await mapAuthUser(credential.user, role);
      setAxiosAuthToken(mapped.userToken);
      return mapped;
    } catch (error) {
      throw normalizeFirebaseError(error, 'Login failed. Please try again.');
    }
  },

  async register({ email, password, name, role }) {
    try {
      ensureFirebase();
      ensureSupportedRole(role);

      const credential = await withRetry(() => createUserWithEmailAndPassword(auth, email, password), {
        shouldRetry: (error) => error?.code === 'auth/network-request-failed',
      });

      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      await sendEmailVerification(credential.user);

      void syncUserProfileSafely({
        uid: credential.user.uid,
        email: credential.user.email,
        name,
        role: normalizeRole(role),
        isCreate: true,
      });

      const mapped = await mapAuthUser(credential.user, role);
      setAxiosAuthToken(mapped.userToken);
      return mapped;
    } catch (error) {
      throw normalizeFirebaseError(error, 'Registration failed. Please try again.');
    }
  },

  async logout() {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      throw normalizeFirebaseError(error, 'Logout failed. Please try again.');
    } finally {
      clearAxiosAuthToken();
    }
  },

  async restoreSession() {
    try {
      const restoredUser = await waitForAuthBootstrap();

      if (!restoredUser) {
        clearAxiosAuthToken();
        return { user: null, userToken: null };
      }

      const role = await resolveUserRole({ firebaseUser: restoredUser });

      void syncUserProfileSafely({
        uid: restoredUser.uid,
        email: restoredUser.email,
        name: restoredUser.displayName || '',
        role,
        isCreate: true,
      });

      const mapped = await mapAuthUser(restoredUser, role);
      setAxiosAuthToken(mapped.userToken);
      return mapped;
    } catch {
      clearAxiosAuthToken();
      return { user: null, userToken: null };
    }
  },

  async resendVerificationEmail() {
    try {
      ensureFirebase();

      if (!auth.currentUser) {
        throw createServiceError({
          code: 'auth/no-current-user',
          fallbackMessage: 'Please sign in to resend verification email.',
        });
      }

      await sendEmailVerification(auth.currentUser);
      return { success: true, message: 'Verification email sent.' };
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to resend verification email.');
    }
  },

  async refreshVerificationStatus() {
    try {
      ensureFirebase();

      if (!auth.currentUser) {
        throw createServiceError({
          code: 'auth/no-current-user',
          fallbackMessage: 'Please sign in again to continue.',
        });
      }

      await reload(auth.currentUser);
      const refreshedUser = auth.currentUser;

      if (!refreshedUser?.emailVerified) {
        throw createServiceError({
          code: 'auth/email-not-verified',
          fallbackMessage: 'Your email is not verified yet. Check your inbox and retry.',
        });
      }

      const role = await resolveUserRole({ firebaseUser: refreshedUser });
      const mapped = await mapAuthUser(refreshedUser, role);
      setAxiosAuthToken(mapped.userToken);
      return mapped;
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to refresh verification state.');
    }
  },
};
