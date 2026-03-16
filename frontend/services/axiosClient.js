import axios from 'axios';

let authToken = null;

export const setAxiosAuthToken = (token) => {
  authToken = token || null;
};

export const clearAxiosAuthToken = () => {
  authToken = null;
};

export const mapAxiosError = (error) => {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || 'Request failed',
      details: error.response.data,
    };
  }

  if (error.request) {
    return {
      status: 0,
      message: 'Network error. Please check your connection.',
      details: null,
    };
  }

  return {
    status: 0,
    message: error.message || 'Unexpected error',
    details: null,
  };
};

export const axiosClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(mapAxiosError(error))
);
