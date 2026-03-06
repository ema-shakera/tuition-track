import { createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';

export const bootstrapAuthState = createAsyncThunk(
  'auth/bootstrapAuthState',
  async (_, { rejectWithValue }) => {
    try {
      const session = await authApi.restoreSession();
      return {
        user: session.user,
        userToken: session.userToken,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to restore auth session');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const result = await authApi.login(email, password);
      return {
        user: result.user,
        userToken: result.userToken,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
      return true;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// TODO(Chunk 5): Add registerUser, verifyOtp, resendOtp, refreshToken flows.
