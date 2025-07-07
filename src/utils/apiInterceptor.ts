import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Enhanced invoke wrapper with automatic token validation
export const secureInvoke = async <T>(
  command: string,
  args?: Record<string, any>
): Promise<T> => {
  const { authToken, logout } = useAuthStore.getState();

  if (!authToken) {
    throw new Error('No authentication token available');
  }

  try {
    // Add token to all API calls
    const argsWithToken = {
      ...args,
      token: authToken,
    };

    const result = await invoke<T>(command, argsWithToken);
    return result;
  } catch (error: any) {
    // Check for authentication-related errors
    if (
      error.message?.includes('Invalid token') ||
      error.message?.includes('Token expired') ||
      error.message?.includes('Authentication failed') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Permission denied')
    ) {
      toast.error('Your session has expired. Please log in again.');
      logout();

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new Error('Authentication failed');
    }

    // Re-throw other errors
    throw error;
  }
};

// Wrapper for commands that don't require authentication
export const publicInvoke = async <T>(
  command: string,
  args?: Record<string, any>
): Promise<T> => {
  try {
    const result = await invoke<T>(command, args);
    return result;
  } catch (error: any) {
    throw error;
  }
};

// Check if an error is authentication-related
export const isAuthError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('invalid token') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('authentication failed') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('permission denied') ||
    errorMessage.includes('session expired')
  );
};

// Retry mechanism for API calls
export const retrySecureInvoke = async <T>(
  command: string,
  args?: Record<string, any>,
  maxRetries: number = 1
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await secureInvoke<T>(command, args);
    } catch (error: any) {
      lastError = error;

      // Don't retry authentication errors
      if (isAuthError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
};
