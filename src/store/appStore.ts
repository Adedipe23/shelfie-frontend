import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme } from '../types';

interface AppState {
  theme: Theme;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
}

interface AppActions {
  setTheme: (theme: Theme) => void;
  setOnline: (online: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      theme: 'system',
      isOnline: navigator.onLine,
      isLoading: false,
      error: null,
      sidebarOpen: true,

      // Actions
      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      setOnline: (online: boolean) => {
        set({ isOnline: online });
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

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Initialize theme on app start
const initializeTheme = () => {
  const { theme, setTheme } = useAppStore.getState();
  setTheme(theme);
};

// Listen for system theme changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', () => {
  const { theme, setTheme } = useAppStore.getState();
  if (theme === 'system') {
    setTheme('system'); // This will trigger the theme application logic
  }
});

// Listen for online/offline events
window.addEventListener('online', () => {
  useAppStore.getState().setOnline(true);
});

window.addEventListener('offline', () => {
  useAppStore.getState().setOnline(false);
});

// Initialize theme when the store is created
initializeTheme();
