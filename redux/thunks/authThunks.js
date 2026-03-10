import { createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';
import { getErrorMessage } from '../../services/errorUtils';

const getThunkError = (error, fallbackMessage) => getErrorMessage(error, fallbackMessage);

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

const BOOTSTRAP_TIMEOUT_MS = 15000;
const LOGIN_TIMEOUT_MS = 15000;
const REGISTER_TIMEOUT_MS = 45000;
const VERIFY_TIMEOUT_MS = 15000;

export const bootstrapAuthState = createAsyncThunk(
  'auth/bootstrapAuthState',
  async (_, { rejectWithValue }) => {
    try {
      const session = await withTimeout(
        authApi.restoreSession(),
        BOOTSTRAP_TIMEOUT_MS,
        'Restoring session timed out. Please reopen the app and try again.'
      );
      return {
        user: session.user,
        userToken: session.userToken,
      };
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Failed to restore auth session'));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const result = await withTimeout(
        authApi.login(email, password),
        LOGIN_TIMEOUT_MS,
        'Sign in timed out. Please check your connection and try again.'
      );
      return {
        user: result.user,
        userToken: result.userToken,
      };
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Login failed. Please try again.'));
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, name, role }, { rejectWithValue }) => {
    try {
      const result = await withTimeout(
        authApi.register({ email, password, name, role }),
        REGISTER_TIMEOUT_MS,
        'Account creation timed out. Please check your connection and try again.'
      );
      return {
        user: result.user,
        userToken: result.userToken,
      };
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Registration failed. Please try again.'));
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
      return {
        user: null,
        userToken: null,
      };
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Logout failed. Please try again.'));
    }
  }
);

export const resendVerificationEmail = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (_, { rejectWithValue }) => {
    try {
      return await withTimeout(
        authApi.resendVerificationEmail(),
        VERIFY_TIMEOUT_MS,
        'Resending verification email timed out. Please try again.'
      );
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Failed to resend verification email.'));
    }
  }
);

export const refreshVerificationStatus = createAsyncThunk(
  'auth/refreshVerificationStatus',
  async (_, { rejectWithValue }) => {
    try {
      const result = await withTimeout(
        authApi.refreshVerificationStatus(),
        VERIFY_TIMEOUT_MS,
        'Refreshing verification status timed out. Please try again.'
      );

      return {
        user: result.user,
        userToken: result.userToken,
      };
    } catch (error) {
      return rejectWithValue(getThunkError(error, 'Failed to verify email status.'));
    }
  }
);
