import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'product' | 'user' | 'order' | 'supplier' | 'movement';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  products: any[];
  users: any[];
  suppliers: any[];
  orders: any[];
  movements: any[];
  lastSync: number;
}

interface OfflineState {
  isOnline: boolean;
  syncQueue: QueuedOperation[];
  offlineData: OfflineData;
  isSyncing: boolean;
  lastSyncAttempt: number | null;
  syncErrors: string[];
}

interface OfflineActions {
  setOnlineStatus: (isOnline: boolean) => void;
  addToQueue: (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeFromQueue: (operationId: string) => void;
  updateOfflineData: (entity: keyof OfflineData, data: any[]) => void;
  setSyncing: (isSyncing: boolean) => void;
  incrementRetryCount: (operationId: string) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  updateLastSync: () => void;
  clearQueue: () => void;
}

type OfflineStore = OfflineState & OfflineActions;

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: navigator.onLine,
      syncQueue: [],
      offlineData: {
        products: [],
        users: [],
        suppliers: [],
        orders: [],
        movements: [],
        lastSync: 0,
      },
      isSyncing: false,
      lastSyncAttempt: null,
      syncErrors: [],

      // Actions
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        
        // Trigger sync when coming back online
        if (isOnline && get().syncQueue.length > 0) {
          // Trigger sync after a short delay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('triggerSync'));
          }, 1000);
        }
      },

      addToQueue: (operation) => {
        const newOperation: QueuedOperation = {
          ...operation,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: operation.maxRetries || 3,
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newOperation],
        }));
      },

      removeFromQueue: (operationId: string) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter(op => op.id !== operationId),
        }));
      },

      updateOfflineData: (entity, data) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            [entity]: data,
          },
        }));
      },

      setSyncing: (isSyncing: boolean) => {
        set({ 
          isSyncing,
          lastSyncAttempt: isSyncing ? Date.now() : get().lastSyncAttempt,
        });
      },

      incrementRetryCount: (operationId: string) => {
        set((state) => ({
          syncQueue: state.syncQueue.map(op =>
            op.id === operationId
              ? { ...op, retryCount: op.retryCount + 1 }
              : op
          ),
        }));
      },

      addSyncError: (error: string) => {
        set((state) => ({
          syncErrors: [...state.syncErrors, error],
        }));
      },

      clearSyncErrors: () => {
        set({ syncErrors: [] });
      },

      updateLastSync: () => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            lastSync: Date.now(),
          },
        }));
      },

      clearQueue: () => {
        set({ syncQueue: [] });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        offlineData: state.offlineData,
        syncErrors: state.syncErrors,
      }),
    }
  )
);
