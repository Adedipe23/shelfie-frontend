import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {authService} from '../services/authService';
import { useToast } from './useToast';

export const useAuthMiddleware = () => {
  const navigate = useNavigate();
  const { authToken, user, logout } = useAuthStore();
  const { showError } = useToast();

  const validateToken = async () => {
    if (!authToken) {
      console.log('No auth token found, redirecting to login');
      navigate('/login');
      return false;
    }

    try {
      // Validate the token with the backend
      const isValid = await authService.validateSession();

      if (!isValid) {
        console.log('Token validation failed, redirecting to login');
        showError('Your session has expired. Please log in again.');
        logout();
        navigate('/login');
        return false;
      }

      // If we don't have user data but have a valid token, fetch current user
      if (!user) {
        try {
          const currentUser = await authService.getCurrentUser();
          // Update user in store - cast to UserInfo type
          useAuthStore.setState({ user: { ...currentUser, permissions: [] } });
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          showError('Failed to load user information. Please log in again.');
          logout();
          navigate('/login');
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error('Token validation error:', error);

      // Check if it's an authentication error
      if (error.message?.includes('Invalid token') ||
          error.message?.includes('Token expired') ||
          error.message?.includes('Authentication failed')) {
        showError('Your session has expired. Please log in again.');
        logout();
        navigate('/login');
        return false;
      }

      // For other errors, just log them but don't redirect
      console.error('Non-auth error during validation:', error);
      return true; // Allow the user to continue
    }
  };

  // Validate token on mount and when token changes
  useEffect(() => {
    if (authToken) {
      // Add a small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        validateToken();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [authToken]);

  return { validateToken };
};

// Higher-order component for protecting routes
export const withAuthMiddleware = <T extends object>(
  WrappedComponent: React.ComponentType<T>
): React.ComponentType<T> => {
  return (props: T) => {
    useAuthMiddleware(); // This will handle validation automatically
    const { authToken, user } = useAuthStore();

    // Show loading while validating
    if (authToken && !user) {
      return React.createElement('div', {
        className: 'flex items-center justify-center min-h-screen'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('div', {
          key: 'spinner',
          className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'
        }),
        React.createElement('p', {
          key: 'text',
          className: 'mt-4 text-gray-600 dark:text-gray-400'
        }, 'Validating session...')
      ]));
    }

    return React.createElement(WrappedComponent, props);
  };
};
