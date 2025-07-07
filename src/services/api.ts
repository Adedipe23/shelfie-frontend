import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

// Create axios instance with HTTPS-strict configuration
const api: AxiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'https://api.isms.helevon.org'}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure HTTPS is strictly enforced
  maxRedirects: 0, // Prevent automatic redirects that might downgrade to HTTP
  validateStatus: (status) => status >= 200 && status < 300, // Only accept success status codes
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { authToken } = useAuthStore.getState();
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Set online status to true on successful response
    useAppStore.getState().setOnline(true);
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      useAppStore.getState().setOnline(false);
      useAppStore.getState().setError('Network error. Please check your connection.');
    } else {
      // Handle HTTP errors
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          useAuthStore.getState().logout();
          useAppStore.getState().setError('Session expired. Please log in again.');
          break;
        case 403:
          useAppStore.getState().setError('Access denied. Insufficient permissions.');
          break;
        case 404:
          useAppStore.getState().setError('Resource not found.');
          break;
        case 422:
          // Validation errors
          const validationErrors = error.response.data?.errors;
          if (validationErrors) {
            const errorMessages = Object.values(validationErrors).flat().join(', ');
            useAppStore.getState().setError(errorMessages);
          } else {
            useAppStore.getState().setError(message);
          }
          break;
        case 500:
          useAppStore.getState().setError('Server error. Please try again later.');
          break;
        default:
          useAppStore.getState().setError(message || 'An unexpected error occurred.');
      }
    }

    return Promise.reject(error);
  }
);

// Generic API methods
export const apiClient = {
  get: <T>(url: string, params?: any): Promise<T> => {
    return api.get(url, { params }).then((response) => response.data);
  },

  post: <T>(url: string, data?: any): Promise<T> => {
    return api.post(url, data).then((response) => response.data);
  },

  put: <T>(url: string, data?: any): Promise<T> => {
    return api.put(url, data).then((response) => response.data);
  },

  patch: <T>(url: string, data?: any): Promise<T> => {
    return api.patch(url, data).then((response) => response.data);
  },

  delete: <T>(url: string): Promise<T> => {
    return api.delete(url).then((response) => response.data);
  },
};

export default api;
