import { useOfflineStore, QueuedOperation } from '../store/offlineStore';
import { inventoryService } from './inventoryService';
import { userService } from './userService';
import { posService } from './posService';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen for custom sync trigger events
    window.addEventListener('triggerSync', this.performSync);

    // Set initial online status
    useOfflineStore.getState().setOnlineStatus(navigator.onLine);

    // Start periodic sync when online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    this.isInitialized = true;
  }

  private handleOnline = () => {
    console.log('App came online, updating status and triggering sync');
    useOfflineStore.getState().setOnlineStatus(true);
    this.startPeriodicSync();
    this.performSync();
  };

  private handleOffline = () => {
    console.log('App went offline, updating status');
    useOfflineStore.getState().setOnlineStatus(false);
    this.stopPeriodicSync();
  };

  private startPeriodicSync() {
    if (this.syncInterval) return;
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000);
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private performSync = async () => {
    const { isOnline, syncQueue, isSyncing, setSyncing, removeFromQueue, incrementRetryCount, addSyncError, clearSyncErrors } = useOfflineStore.getState();

    if (!isOnline || isSyncing || syncQueue.length === 0) {
      return;
    }

    console.log(`Starting sync of ${syncQueue.length} operations`);
    setSyncing(true);
    clearSyncErrors();

    const operationsToProcess = [...syncQueue];

    for (const operation of operationsToProcess) {
      try {
        await this.processOperation(operation);
        removeFromQueue(operation.id);
        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        incrementRetryCount(operation.id);
        
        if (operation.retryCount >= operation.maxRetries) {
          console.error(`Operation ${operation.id} exceeded max retries, removing from queue`);
          removeFromQueue(operation.id);
          addSyncError(`Failed to sync ${operation.entity} ${operation.type} after ${operation.maxRetries} attempts`);
        }
      }
    }

    setSyncing(false);
    console.log('Sync completed');
  };

  private async processOperation(operation: QueuedOperation): Promise<void> {
    const { entity, type, data } = operation;

    switch (entity) {
      case 'product':
        await this.syncProduct(type, data);
        break;
      case 'user':
        await this.syncUser(type, data);
        break;
      case 'order':
        await this.syncOrder(type, data);
        break;
      case 'supplier':
        await this.syncSupplier(type, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  private async syncProduct(type: QueuedOperation['type'], data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await inventoryService.createProduct(data);
        break;
      case 'UPDATE':
        await inventoryService.updateProduct(data.id, data);
        break;
      case 'DELETE':
        await inventoryService.deleteProduct(data.id);
        break;
    }
  }

  private async syncUser(type: QueuedOperation['type'], data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await userService.createUser(data);
        break;
      case 'UPDATE':
        await userService.updateUser(data.id, data);
        break;
      case 'DELETE':
        await userService.deleteUser(data.id);
        break;
    }
  }

  private async syncOrder(type: QueuedOperation['type'], data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        const order = await posService.createOrder(data);
        await posService.completeOrder(order.id);
        break;
      case 'UPDATE':
        // Orders typically aren't updated after creation
        break;
      case 'DELETE':
        await posService.cancelOrder(data.id);
        break;
    }
  }

  private async syncSupplier(type: QueuedOperation['type'], data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await inventoryService.createSupplier(data);
        break;
      case 'UPDATE':
        await inventoryService.updateSupplier(data.id, data);
        break;
      case 'DELETE':
        await inventoryService.deleteSupplier(data.id);
        break;
    }
  }

  // Public method to manually trigger sync
  triggerSync() {
    this.performSync();
  }

  // Public method to add operation to queue
  queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>) {
    useOfflineStore.getState().addToQueue(operation);
    
    // Try to sync immediately if online
    if (useOfflineStore.getState().isOnline) {
      setTimeout(() => this.performSync(), 100);
    }
  }

  // Public method to get sync status
  getSyncStatus() {
    const { isOnline, isSyncing, syncQueue, syncErrors, lastSyncAttempt } = useOfflineStore.getState();
    return {
      isOnline,
      isSyncing,
      queueLength: syncQueue.length,
      hasErrors: syncErrors.length > 0,
      errors: syncErrors,
      lastSyncAttempt,
    };
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('triggerSync', this.performSync);
    this.stopPeriodicSync();
    this.isInitialized = false;
  }
}

export const syncService = new SyncService();
