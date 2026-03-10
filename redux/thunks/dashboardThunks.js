import { createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/dashboardApi';
import { getErrorMessage } from '../../services/errorUtils';

const isSupportedRole = (role) => role === 'teacher' || role === 'student';

const getAuthContext = (state) => {
  const uid = state?.auth?.user?.uid;
  const userRole = state?.auth?.user?.role;
  const userEmail = state?.auth?.user?.email;
  const isEmailVerified = Boolean(state?.auth?.user?.isEmailVerified);
  return { uid, userRole, userEmail, isEmailVerified };
};

const getRoleError = (role) => {
  if (!isSupportedRole(role)) {
    return 'Please select a valid role to load dashboard data.';
  }

  return null;
};

const getBlockedActionError = () => 'You are not authorized to access this role data.';

const canProceedWithRole = ({ uid, userRole, requestedRole, isEmailVerified }) => {
  if (!uid) {
    return 'Session expired. Please sign in again.';
  }

  if (!isEmailVerified) {
    return 'Please verify your email before accessing dashboard data.';
  }

  const invalidRoleMessage = getRoleError(requestedRole);
  if (invalidRoleMessage) {
    return invalidRoleMessage;
  }

  if (!isSupportedRole(userRole) || userRole !== requestedRole) {
    return getBlockedActionError();
  }

  return null;
};

export const loadDashboardData = createAsyncThunk(
  'dashboard/loadDashboardData',
  async ({ role }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, userEmail, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.fetchDashboardData({ uid, role, userRole, userEmail });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load dashboard data'));
    }
  },
  {
    condition: (_, { getState }) => !getState()?.dashboard?.isLoading,
  }
);

export const saveDashboardData = createAsyncThunk(
  'dashboard/saveDashboardData',
  async ({ role, dashboardData }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.saveDashboardData({ uid, role, userRole, dashboardData });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to save dashboard data'));
    }
  }
);

export const createHomeworkItem = createAsyncThunk(
  'dashboard/createHomeworkItem',
  async ({ role, item }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.createHomeworkItem({ uid, role, userRole, item });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create homework item'));
    }
  }
);

export const updateHomeworkItem = createAsyncThunk(
  'dashboard/updateHomeworkItem',
  async ({ role, itemId, updates }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.updateHomeworkItem({ uid, role, userRole, itemId, updates });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update homework item'));
    }
  }
);

export const deleteHomeworkItem = createAsyncThunk(
  'dashboard/deleteHomeworkItem',
  async ({ role, itemId }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.deleteHomeworkItem({ uid, role, userRole, itemId });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete homework item'));
    }
  }
);

export const createTuitionItem = createAsyncThunk(
  'dashboard/createTuitionItem',
  async ({ role, item }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.createTuitionItem({ uid, role, userRole, item });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create tuition item'));
    }
  }
);

export const updateTuitionItem = createAsyncThunk(
  'dashboard/updateTuitionItem',
  async ({ role, itemId, updates }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.updateTuitionItem({ uid, role, userRole, itemId, updates });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update tuition item'));
    }
  }
);

export const deleteTuitionItem = createAsyncThunk(
  'dashboard/deleteTuitionItem',
  async ({ role, itemId }, { getState, rejectWithValue }) => {
    try {
      const { uid, userRole, isEmailVerified } = getAuthContext(getState());
      const blockReason = canProceedWithRole({ uid, userRole, requestedRole: role, isEmailVerified });

      if (blockReason) {
        return rejectWithValue(blockReason);
      }

      return await dashboardApi.deleteTuitionItem({ uid, role, userRole, itemId });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete tuition item'));
    }
  }
);
