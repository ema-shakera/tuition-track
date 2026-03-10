import { axiosClient } from './axiosClient';
import { createServiceError } from './errorUtils';

const DEFAULT_REPORT_ENDPOINT = '/api/reports/tuition';

const toReportError = (error) => {
  if (error?.code) {
    return error;
  }

  if (error?.status === 404) {
    return createServiceError({
      code: 'report/backend-missing',
      fallbackMessage: 'Report download requires a backend endpoint that is not available yet.',
      details: error,
    });
  }

  if (error?.status && error.status >= 500) {
    return createServiceError({
      code: 'report/backend-unavailable',
      fallbackMessage: 'Report service is currently unavailable. Please try again later.',
      details: error,
    });
  }

  return createServiceError({
    code: 'report/backend-unavailable',
    fallbackMessage: 'Report service is currently unavailable. Please try again later.',
    details: error,
  });
};

const resolveEndpoint = () => {
  const configured = String(process.env.EXPO_PUBLIC_REPORT_DOWNLOAD_ENDPOINT || '').trim();
  return configured || DEFAULT_REPORT_ENDPOINT;
};

export const reportApi = {
  async fetchTuitionReport({ tuitionId, month }) {
    if (!tuitionId) {
      throw createServiceError({
        code: 'not-found',
        fallbackMessage: 'Tuition record was not found.',
      });
    }

    try {
      const response = await axiosClient.get(resolveEndpoint(), {
        params: {
          tuitionId,
          month: month || undefined,
        },
      });

      if (!response?.data || typeof response.data !== 'object') {
        throw createServiceError({
          code: 'report/invalid-response',
          fallbackMessage: 'Report service returned an invalid response.',
          details: response,
        });
      }

      return response.data;
    } catch (error) {
      throw toReportError(error);
    }
  },
};
