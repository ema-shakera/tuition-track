import { createSlice } from '@reduxjs/toolkit';
import { bootstrapAuthState, loginUser, logoutUser } from '../thunks/authThunks';

const initialState = {
  user: null,
  userToken: null,
  isLoading: false,
  error: null,
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
    },
    clearAuth: (state) => {
      state.user = null;
      state.userToken = null;
      state.error = null;
      state.isLoading = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuthState.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bootstrapAuthState.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isHydrated = true;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
      })
      .addCase(bootstrapAuthState.rejected, (state, action) => {
        state.isLoading = false;
        state.isHydrated = true;
        state.error = action.payload || action.error.message;
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.userToken = action.payload.userToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.userToken = null;
        state.error = null;
      });
  },
});

export const { setCredentials, clearAuth, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
