import { publicInvoke, secureInvoke } from '../utils/apiInterceptor';
import { onlineApiService } from './onlineApiService';
import axios from 'axios';
import { roleService } from './roleService';
import { LoginResponse, User, UserInfo, ApiUserResponse, ApiTokenResponse } from '../types';
import { useAuthStore } from '../store/authStore';

// Helper function to convert User to UserInfo with permissions
const userToUserInfo = async (user: User): Promise<UserInfo> => {
  try {
    // Fetch permissions for the user's role
    const permissions = await roleService.getRolePermissions(user.role);
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      permissions: permissions,
    };
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    // Return user info with empty permissions if role fetch fails
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      permissions: [],
    };
  }
};

export const authService = {
  // Initialize authentication state on app startup
  initializeAuth: async (): Promise<void> => {
    const { authToken, setLoading, logout, login } = useAuthStore.getState();

    if (!authToken) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Validate the stored token
      const isValid = await authService.validateSession();

      if (isValid) {
        // Get current user info to refresh the auth state
        const user = await authService.getCurrentUser();
        // The token is already in the store, just update user info with permissions
        const userInfo = await userToUserInfo(user);
        login(authToken, userInfo);
      } else {
        // Token is invalid, clear auth state
        logout();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  },
  // Login using online API (OAuth2 compatible)
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      // First try online API login with OAuth2 format using the onlineApiService
      const formData = new URLSearchParams();
      formData.append('username', email); // API expects 'username' field
      formData.append('password', password);

      // Use axios directly with the same base configuration as onlineApiService
      // This ensures consistent HTTPS handling without protocol downgrades
      const apiClient = axios.create({
        baseURL: `${import.meta.env.VITE_API_BASE_URL || 'https://api.isms.helevon.org'}/api/v1`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ISMS-Desktop-App/1.0',
          'Cache-Control': 'no-cache',
        },
        // Ensure HTTPS is strictly enforced
        maxRedirects: 0, // Prevent automatic redirects that might downgrade to HTTP
        validateStatus: (status) => status >= 200 && status < 300, // Only accept success status codes
      });

      console.log('Making login request to:', apiClient.defaults.baseURL + '/auth/login');

      // Use /auth/login without trailing slash to avoid potential HTTPS->HTTP redirect
      const response = await apiClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);

      const tokenData: ApiTokenResponse = response.data;
      console.log('Token received:', !!tokenData.access_token);

      // Get user info using the access token
      // Create a fresh axios instance for the /auth/me request to avoid any interference
      const userApiClient = axios.create({
        baseURL: `${import.meta.env.VITE_API_BASE_URL || 'https://api.isms.helevon.org'}/api/v1`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ISMS-Desktop-App/1.0',
          'Cache-Control': 'no-cache',
        },
        // Ensure HTTPS is strictly enforced
        maxRedirects: 0, // Prevent automatic redirects that might downgrade to HTTP
        validateStatus: (status) => status >= 200 && status < 300, // Only accept success status codes
      });

      // Add request interceptor to log the actual URL being requested
      userApiClient.interceptors.request.use(
        (config) => {
          console.log('User info request config:', {
            url: config.url,
            baseURL: config.baseURL,
            fullURL: `${config.baseURL}${config.url}`,
            headers: config.headers,
          });
          return config;
        },
        (error) => {
          console.error('User info request interceptor error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor to catch any redirect attempts
      userApiClient.interceptors.response.use(
        (response) => {
          console.log('User info response interceptor:', {
            status: response.status,
            url: response.config.url,
            headers: response.headers,
          });
          return response;
        },
        (error) => {
          console.error('User info response interceptor error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            headers: error.response?.headers,
          });
          return Promise.reject(error);
        }
      );

      console.log('Making user info request to:', userApiClient.defaults.baseURL + '/auth/me');
      console.log('Using authorization header:', `Bearer ${tokenData.access_token.substring(0, 10)}...`);

      // Use /auth/me without trailing slash to avoid HTTPS->HTTP redirect
      const userResponse = await userApiClient.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      console.log('User info response status:', userResponse.status);
      console.log('User info response headers:', userResponse.headers);
      const userData: ApiUserResponse = userResponse.data;

      // Create User object from API response
      const user: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        password_hash: '', // Not provided by API
        is_active: userData.is_active,
        is_superuser: userData.is_superuser,
        created_at: new Date(), // Not provided by API, use current time
        updated_at: new Date(), // Not provided by API, use current time
      };

      // Format response to match our LoginResponse interface
      const loginResponse: LoginResponse = {
        token: tokenData.access_token,
        user: user
      };

      // Save user data to local database for offline access
      if (loginResponse.token && loginResponse.user) {
        await authService.saveUserToLocal(loginResponse.user);
      }

      return loginResponse;
    } catch (error: any) {
      // Enhanced error logging for debugging HTTPS issues
      console.error('Online login failed with error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request made but no response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }

      // If online login fails, fall back to local authentication
      console.warn('Falling back to local authentication');
      return await publicInvoke('login', { email, password });
    }
  },

  // Save user data to local database after successful online login
  saveUserToLocal: async (user: User): Promise<void> => {
    try {
      // Ensure user has all required fields for the Tauri command
      const userWithPassword = {
        ...user,
        hashed_password: user.password_hash || '', // Ensure this field exists
      };
      await publicInvoke('save_user_to_local', { user: userWithPassword });
    } catch (error) {
      console.error('Failed to save user to local database:', error);
      // Don't throw error - this is not critical for login success
    }
  },

  // Logout (requires token)
  logout: async (): Promise<string> => {
    return await secureInvoke('logout');
  },

  // Get current user - try online first, fallback to local
  getCurrentUser: async (): Promise<User> => {
    try {
      // Try online API first
      const userData: ApiUserResponse = await onlineApiService.get('/auth/me/');

      // Convert API response to our User interface
      return {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        password_hash: '', // Not provided by API
        is_active: userData.is_active,
        is_superuser: userData.is_superuser,
        created_at: new Date(), // Not provided by API
        updated_at: new Date(), // Not provided by API
      };
    } catch (error) {
      console.warn('Online user fetch failed, trying local:', error);
      // Fallback to local database
      return await secureInvoke('get_current_user');
    }
  },

  // Validate session - try online first, fallback to local
  validateSession: async (): Promise<boolean> => {
    try {
      // Try online API first
      // Use /auth/me without trailing slash to avoid HTTPS->HTTP redirect
      await onlineApiService.get('/auth/me');
      return true;
    } catch (error) {
      console.warn('Online session validation failed, trying local:', error);
      // Fallback to local validation
      try {
        await secureInvoke('validate_user_session');
        return true;
      } catch (localError) {
        console.error('Local session validation also failed:', localError);
        return false;
      }
    }
  },

  // Check user permission (requires token)
  checkPermission: async (permission: string): Promise<boolean> => {
    try {
      const hasPermission = await secureInvoke<boolean>('check_user_permission', { permission });
      return hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  },
};
