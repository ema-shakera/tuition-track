const FRIENDLY_MESSAGES = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/email-not-verified': 'Please verify your email before signing in.',
  'auth/no-current-user': 'Please sign in again to continue.',
  'config/not-configured': 'App configuration is incomplete. Please contact support.',
  'validation/unsupported-role': 'Unsupported role selected. Please choose teacher or student.',
  'validation/forbidden-role-access': 'You are not authorized to access this role data.',
  'validation/missing-user-id': 'Please sign in again to continue.',
  'validation/invalid-dashboard-payload': 'Dashboard data format is invalid.',
  'validation/student-assignment-required': 'Please add a student to this tuition before assigning homework.',
  'validation/invalid-student-email': 'Please provide a valid student email address.',
  'report/backend-missing': 'Report download requires a backend endpoint that is not available yet.',
  'report/backend-unavailable': 'Report service is currently unavailable. Please try again later.',
  'report/invalid-response': 'Report service returned an invalid response.',
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'Requested data was not found.',
  'already-exists': 'This record already exists.',
  'unavailable': 'Service is temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'operation/timeout': 'Request timed out. Please try again.',
  'network/offline': 'You appear to be offline. Check your internet connection and try again.',
};

const TRANSIENT_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'aborted',
  'internal',
  'auth/network-request-failed',
]);

export const getFriendlyFirebaseMessage = (code, fallbackMessage) => {
  if (!code) {
    return fallbackMessage;
  }

  return FRIENDLY_MESSAGES[code] || fallbackMessage;
};

export const createServiceError = ({ code, fallbackMessage, details }) => {
  const message = getFriendlyFirebaseMessage(code, fallbackMessage);
  const error = new Error(message);
  error.code = code || 'unknown';
  error.userMessage = message;
  error.details = details || null;
  error.isTransient = Boolean(code && TRANSIENT_CODES.has(code));
  return error;
};

export const normalizeFirebaseError = (error, fallbackMessage) => {
  if (error?.userMessage) {
    return error;
  }

  const code = error?.code || '';
  return createServiceError({
    code,
    fallbackMessage,
    details: error,
  });
};

export const getErrorMessage = (error, fallbackMessage) => {
  return error?.userMessage || error?.message || fallbackMessage;
};

export const isLikelyOfflineError = (errorOrMessage) => {
  if (!errorOrMessage) {
    return false;
  }

  const code = typeof errorOrMessage === 'object' ? String(errorOrMessage?.code || '') : '';
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage?.userMessage || errorOrMessage?.message || '';

  const normalized = String(message).toLowerCase();

  return (
    code === 'auth/network-request-failed' ||
    code === 'network/offline' ||
    normalized.includes('network error') ||
    normalized.includes('offline') ||
    normalized.includes('check your connection')
  );
};

export const isLikelyTransientError = (errorOrMessage) => {
  if (!errorOrMessage) {
    return false;
  }

  const code = typeof errorOrMessage === 'object' ? String(errorOrMessage?.code || '') : '';
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage?.userMessage || errorOrMessage?.message || '';
  const normalized = String(message).toLowerCase();

  return (
    TRANSIENT_CODES.has(code) ||
    code === 'operation/timeout' ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('timed out')
  );
};
