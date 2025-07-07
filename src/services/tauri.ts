import { invoke } from '@tauri-apps/api/core';
import { LoginResponse, UserInfo } from '../types';

// Tauri command wrappers
export const tauriApi = {
  // Database initialization
  initDatabase: async (): Promise<string> => {
    return await invoke('init_database');
  },

  // Authentication commands
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return await invoke('login', { email, password });
  },

  logout: async (token: string): Promise<string> => {
    return await invoke('logout', { token });
  },

  getCurrentUser: async (token: string): Promise<UserInfo> => {
    return await invoke('get_current_user', { token });
  },

  // Utility function to handle Tauri errors
  handleTauriError: (error: any): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
};

export default tauriApi;
