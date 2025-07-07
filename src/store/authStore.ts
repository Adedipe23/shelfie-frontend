import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserInfo } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  authToken: string | null;
  tokenExpiry: number | null; // Unix timestamp
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isTokenValid: () => boolean;
  checkTokenExpiry: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      authToken: null,
      tokenExpiry: null,
      isLoading: false,
      error: null,

      // Actions
      login: (token: string, user: UserInfo) => {
        // Calculate token expiry: 11520 minutes from now (8 days)
        const expiryTime = Date.now() + (11520 * 60 * 1000);

        set({
          isAuthenticated: true,
          user,
          authToken: token,
          tokenExpiry: expiryTime,
          error: null,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          authToken: null,
          tokenExpiry: null,
          error: null,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions?.includes(permission) ?? false;
      },

      hasRole: (role: string) => {
        const { user } = get();
        return user?.role === role;
      },

      isTokenValid: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return false;
        return Date.now() < tokenExpiry;
      },

      checkTokenExpiry: () => {
        const { isTokenValid, logout } = get();
        if (!isTokenValid()) {
          console.log('Token expired, logging out...');
          logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        authToken: state.authToken,
      }),
    }
  )
);
