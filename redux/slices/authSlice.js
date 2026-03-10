import { createSlice } from '@reduxjs/toolkit';
import {
  bootstrapAuthState,
  loginUser,
  logoutUser,
  refreshVerificationStatus,
  registerUser,
  resendVerificationEmail,
} from '../thunks/authThunks';

const initialState = {
  user: null,
  userToken: null,
  status: 'idle',
  isLoading: false,
  error: null,
  successMessage: null,
  isHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.userToken = action.payload.userToken;
      state.error = null;
      state.successMessage = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.userToken = null;
      state.status = 'idle';
      state.error = null;
      state.successMessage = null;
      state.isLoading = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearAuthSuccess: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuthState.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(bootstrapAuthState.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoading = false;
        state.isHydrated = true;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
        state.successMessage = action.payload.userToken ? 'Session restored.' : null;
      })
      .addCase(bootstrapAuthState.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.isHydrated = true;
        state.user = null;
        state.userToken = null;
        state.error = action.payload || action.error.message;
        state.successMessage = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoading = false;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
        state.error = null;
        state.successMessage = 'Signed in successfully.';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload || action.error.message;
        state.successMessage = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoading = false;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
        state.error = null;
        state.successMessage = 'Account created. Please verify your email before continuing.';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload || action.error.message;
        state.successMessage = null;
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'idle';
        state.user = null;
        state.userToken = null;
        state.error = null;
        state.isLoading = false;
        state.successMessage = 'Signed out.';
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'idle';
        state.user = null;
        state.userToken = null;
        state.isLoading = false;
        state.error = action.payload || action.error.message;
        state.successMessage = 'Signed out locally.';
      })
      .addCase(resendVerificationEmail.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoading = false;
        state.error = null;
        state.successMessage = action.payload?.message || 'Verification email sent.';
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload || action.error.message;
        state.successMessage = null;
      })
      .addCase(refreshVerificationStatus.pending, (state) => {
        state.status = 'loading';
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(refreshVerificationStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoading = false;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
        state.error = null;
        state.successMessage = 'Email verified. Access granted.';
      })
      .addCase(refreshVerificationStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.isLoading = false;
        state.error = action.payload || action.error.message;
        state.successMessage = null;
      });
  },
});

export const { setCredentials, clearAuth, clearAuthError, clearAuthSuccess } = authSlice.actions;

export const selectAuthState = (state) => state.auth;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthRole = (state) => state.auth.user?.role || null;
export const selectAuthToken = (state) => state.auth.userToken;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthSuccess = (state) => state.auth.successMessage;
export const selectAuthHydrated = (state) => state.auth.isHydrated;
export const selectAuthIsVerified = (state) => Boolean(state.auth.user?.isEmailVerified);
export const selectCanAccessRole = (state, requestedRole) => {
  const userRole = state.auth.user?.role;
  return Boolean(userRole && requestedRole && userRole === requestedRole);
};
export default authSlice.reducer;
