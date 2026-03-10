import { createSlice } from '@reduxjs/toolkit';
import { bootstrapAuthState, loginUser, logoutUser, registerUser } from '../thunks/authThunks';
import {
  createHomeworkItem,
  createTuitionItem,
  deleteHomeworkItem,
  deleteTuitionItem,
  loadDashboardData,
  saveDashboardData,
  updateHomeworkItem,
  updateTuitionItem,
} from '../thunks/dashboardThunks';

const initialState = {
  role: null,
  stats: [],
  homeworkItems: [],
  tuitionItems: [],
  status: 'idle',
  isLoading: false,
  isFallbackData: false,
  error: null,
  successMessage: null,
};

const applyDashboardData = (state, payload, successMessage) => {
  state.status = 'succeeded';
  state.isLoading = false;
  state.isFallbackData = Boolean(payload?.isFallback);
  state.error = null;
  state.stats = payload.stats;
  state.homeworkItems = payload.homeworkItems;
  state.tuitionItems = payload.tuitionItems;
  state.successMessage = payload?.isFallback ? 'Showing fallback dashboard data.' : successMessage;
};

const markPending = (state) => {
  state.status = 'loading';
  state.isLoading = true;
  state.isFallbackData = false;
  state.error = null;
  state.successMessage = null;
};

const markFailure = (state, action) => {
  state.status = 'failed';
  state.isLoading = false;
  state.isFallbackData = false;
  state.error = action.payload || action.error.message;
  state.successMessage = null;
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardRole: (state, action) => {
      state.role = action.payload;
      state.error = null;
      state.successMessage = null;
    },
    clearDashboardError: (state) => {
      state.error = null;
    },
    clearDashboardSuccess: (state) => {
      state.successMessage = null;
      state.isFallbackData = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuthState.fulfilled, (state, action) => {
        state.role = action.payload?.user?.role || null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.role = action.payload?.user?.role || null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.role = action.payload?.user?.role || null;
      })
      .addCase(logoutUser.fulfilled, () => ({ ...initialState }))
      .addCase(loadDashboardData.pending, markPending)
      .addCase(loadDashboardData.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Dashboard synced.');
      })
      .addCase(loadDashboardData.rejected, markFailure)
      .addCase(saveDashboardData.pending, markPending)
      .addCase(saveDashboardData.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Dashboard changes saved.');
      })
      .addCase(saveDashboardData.rejected, markFailure)
      .addCase(createHomeworkItem.pending, markPending)
      .addCase(createHomeworkItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Homework item added.');
      })
      .addCase(createHomeworkItem.rejected, markFailure)
      .addCase(updateHomeworkItem.pending, markPending)
      .addCase(updateHomeworkItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Homework item updated.');
      })
      .addCase(updateHomeworkItem.rejected, markFailure)
      .addCase(deleteHomeworkItem.pending, markPending)
      .addCase(deleteHomeworkItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Homework item removed.');
      })
      .addCase(deleteHomeworkItem.rejected, markFailure)
      .addCase(createTuitionItem.pending, markPending)
      .addCase(createTuitionItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Tuition item added.');
      })
      .addCase(createTuitionItem.rejected, markFailure)
      .addCase(updateTuitionItem.pending, markPending)
      .addCase(updateTuitionItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Tuition item updated.');
      })
      .addCase(updateTuitionItem.rejected, markFailure)
      .addCase(deleteTuitionItem.pending, markPending)
      .addCase(deleteTuitionItem.fulfilled, (state, action) => {
        applyDashboardData(state, action.payload, 'Tuition item removed.');
      })
      .addCase(deleteTuitionItem.rejected, markFailure);
  },
});

export const { setDashboardRole, clearDashboardError, clearDashboardSuccess } = dashboardSlice.actions;

export const selectDashboardState = (state) => state.dashboard;
export const selectDashboardRole = (state) => state.dashboard.role;
export const selectDashboardStats = (state) => state.dashboard.stats;
export const selectDashboardHomework = (state) => state.dashboard.homeworkItems;
export const selectDashboardTuition = (state) => state.dashboard.tuitionItems;
export const selectDashboardStatus = (state) => state.dashboard.status;
export const selectDashboardLoading = (state) => state.dashboard.isLoading;
export const selectDashboardIsFallbackData = (state) => state.dashboard.isFallbackData;
export const selectDashboardError = (state) => state.dashboard.error;
export const selectDashboardSuccess = (state) => state.dashboard.successMessage;
export default dashboardSlice.reducer;
