import { onlineApiService, isNetworkError } from './onlineApiService';
import { invoke } from '@tauri-apps/api/core';
import { useOfflineStore } from '../store/offlineStore';
import toast from 'react-hot-toast';

console.log('📦 OnlineFirstService module loading...');
console.log('📦 onlineApiService imported:', !!onlineApiService);

/**
 * Online-First Service
 * Implements the online-first strategy for all CRUD operations
 * Falls back to offline operations and queues for sync when online API is unavailable
 */
class OnlineFirstService {
  /**
   * Check if we're currently online
   */
  private async isOnline(): Promise<boolean> {
    return navigator.onLine && await onlineApiService.checkConnectivity();
  }

  /**
   * Generic online-first GET operation
   */
  async get<T>(
    endpoint: string,
    fallbackCommand: string,
    fallbackArgs?: any
  ): Promise<T> {
    console.log('🚨 OnlineFirstService.get() called with endpoint:', endpoint);
    console.log('🚨 OnlineFirstService checking if online...');

    if (await this.isOnline()) {
      console.log('🚨 OnlineFirstService is online, calling onlineApiService.get()');
      try {
        console.log('🚨 OnlineFirstService calling onlineApiService.get with endpoint:', endpoint);
        const result = await onlineApiService.get<T>(endpoint);
        console.log('🚨 OnlineFirstService received result from onlineApiService:', !!result);
        // Update local database with fresh data
        await this.updateLocalData(fallbackCommand, result);
        return result;
      } catch (error) {
        if (isNetworkError(error)) {
          console.warn('Network error, falling back to offline data');
          return await invoke<T>(fallbackCommand, fallbackArgs);
        }
        throw error;
      }
    } else {
      // Offline - get from local database
      return await invoke<T>(fallbackCommand, fallbackArgs);
    }
  }

  /**
   * Generic online-first CREATE operation
   */
  async create<T>(
    endpoint: string,
    data: any,
    fallbackCommand: string,
    operationType: string
  ): Promise<T> {
    if (await this.isOnline()) {
      try {
        const result = await onlineApiService.post<T>(endpoint, data);
        // Update local database with server response (including server-generated ID)
        await this.updateLocalData(fallbackCommand, result);
        return result;
      } catch (error) {
        if (isNetworkError(error)) {
          console.warn('Network error, creating offline and queuing for sync');
          return await this.createOfflineAndQueue(data, endpoint, fallbackCommand, operationType);
        }
        throw error;
      }
    } else {
      // Offline - create locally and queue for sync
      return await this.createOfflineAndQueue(data, endpoint, fallbackCommand, operationType);
    }
  }

  /**
   * Generic online-first UPDATE operation
   */
  async update<T>(
    endpoint: string,
    data: any,
    fallbackCommand: string,
    fallbackArgs: any,
    operationType: string
  ): Promise<T> {
    if (await this.isOnline()) {
      try {
        const result = await onlineApiService.put<T>(endpoint, data);
        // Update local database with server response
        await this.updateLocalData(fallbackCommand, result);
        return result;
      } catch (error) {
        if (isNetworkError(error)) {
          console.warn('Network error, updating offline and queuing for sync');
          return await this.updateOfflineAndQueue(data, endpoint, fallbackCommand, fallbackArgs, operationType);
        }
        throw error;
      }
    } else {
      // Offline - update locally and queue for sync
      return await this.updateOfflineAndQueue(data, endpoint, fallbackCommand, fallbackArgs, operationType);
    }
  }

  /**
   * Generic online-first DELETE operation
   */
  async delete<T>(
    endpoint: string,
    fallbackCommand: string,
    fallbackArgs: any,
    operationType: string
  ): Promise<T> {
    if (await this.isOnline()) {
      try {
        const result = await onlineApiService.delete<T>(endpoint);
        // Remove from local database
        await invoke(fallbackCommand, fallbackArgs);
        return result;
      } catch (error) {
        if (isNetworkError(error)) {
          console.warn('Network error, deleting offline and queuing for sync');
          return await this.deleteOfflineAndQueue(endpoint, fallbackCommand, fallbackArgs, operationType);
        }
        throw error;
      }
    } else {
      // Offline - delete locally and queue for sync
      return await this.deleteOfflineAndQueue(endpoint, fallbackCommand, fallbackArgs, operationType);
    }
  }

  /**
   * Create record offline and add to sync queue
   */
  private async createOfflineAndQueue<T>(
    data: any,
    endpoint: string,
    fallbackCommand: string,
    operationType: string
  ): Promise<T> {
    // Create locally first
    const result = await invoke<T>(fallbackCommand, data);
    
    // Add to sync queue
    await this.addToSyncQueue(operationType, endpoint, 'POST', data);
    
    // Notify user
    toast.success('Created offline. Will sync when online.');
    
    return result;
  }

  /**
   * Update record offline and add to sync queue
   */
  private async updateOfflineAndQueue<T>(
    data: any,
    endpoint: string,
    fallbackCommand: string,
    fallbackArgs: any,
    operationType: string
  ): Promise<T> {
    // Update locally first
    const result = await invoke<T>(fallbackCommand, fallbackArgs);
    
    // Add to sync queue
    await this.addToSyncQueue(operationType, endpoint, 'PUT', data);
    
    // Notify user
    toast.success('Updated offline. Will sync when online.');
    
    return result;
  }

  /**
   * Delete record offline and add to sync queue
   */
  private async deleteOfflineAndQueue<T>(
    endpoint: string,
    fallbackCommand: string,
    fallbackArgs: any,
    operationType: string
  ): Promise<T> {
    // Delete locally first
    const result = await invoke<T>(fallbackCommand, fallbackArgs);
    
    // Add to sync queue
    await this.addToSyncQueue(operationType, endpoint, 'DELETE', {});
    
    // Notify user
    toast.success('Deleted offline. Will sync when online.');
    
    return result;
  }

  /**
   * Add operation to sync queue
   */
  private async addToSyncQueue(
    operationType: string,
    endpoint: string,
    method: string,
    payload: any
  ): Promise<void> {
    const { addToQueue } = useOfflineStore.getState();

    const entityMap: Record<string, any> = {
      'product': 'product',
      'user': 'user',
      'order': 'order',
      'supplier': 'supplier',
      'movement': 'movement'
    };

    const typeMap: Record<string, any> = {
      'create': 'CREATE',
      'update': 'UPDATE',
      'delete': 'DELETE'
    };

    const entity = operationType.split('_')[0];
    const type = operationType.split('_')[1];

    addToQueue({
      entity: entityMap[entity] || entity,
      type: typeMap[type] || type.toUpperCase(),
      data: { endpoint, method, payload },
      maxRetries: 5,
    });
  }

  /**
   * Update local database with fresh data from server
   */
  private async updateLocalData(command: string, data: any): Promise<void> {
    try {
      // This would typically involve calling a Tauri command to update local SQLite
      // For now, we'll just log it
      console.log(`Updating local data via ${command}:`, data);
    } catch (error) {
      console.error('Failed to update local data:', error);
    }
  }

  /**
   * Product-specific online-first operations
   */
  products = {
    getAll: () => this.get('/inventory/products', 'get_products'),
    getById: (id: number) => this.get(`/inventory/products/${id}`, 'get_product', { id }),
    getBySku: (sku: string) => this.get(`/inventory/products/sku/${sku}`, 'get_product_by_sku', { sku }),
    getLowStock: async () => {
      try {
        // Try to get all products and filter for low stock locally
        const products = await this.get('/inventory/products', 'get_products') as any[];
        return products.filter(p => p.quantity <= p.reorder_level);
      } catch (error) {
        console.warn('Failed to get products for low stock filtering:', error);
        // Fallback to local command
        return await invoke('get_low_stock_products');
      }
    },

    create: (productData: any) =>
      this.create('/inventory/products', productData, 'create_product', 'product_create'),

    update: (id: number, productData: any) =>
      this.update(`/inventory/products/${id}`, productData, 'update_product', { id, ...productData }, 'product_update'),

    delete: (id: number) =>
      this.delete(`/inventory/products/${id}`, 'delete_product', { id }, 'product_delete'),

    updateStock: (id: number, stockData: any) =>
      this.update(`/inventory/products/${id}/stock`, stockData, 'update_stock', { productId: id, stockData }, 'product_stock_update'),
  };

  /**
   * User-specific online-first operations
   */
  users = {
    getAll: () => {
      console.log('🚨 OnlineFirstService.users.getAll() called');
      console.log('🚨 About to call this.get("/users", "get_users")');
      return this.get('/users', 'get_users');
    },
    getById: (id: number) => this.get(`/users/${id}`, 'get_user', { id }),

    create: (userData: any) =>
      this.create('/users', userData, 'create_user', 'user_create'),

    update: (id: number, userData: any) =>
      this.update(`/users/${id}`, userData, 'update_user', { id, ...userData }, 'user_update'),

    delete: (id: number) =>
      this.delete(`/users/${id}`, 'delete_user', { id }, 'user_delete'),
  };

  /**
   * Order-specific online-first operations
   */
  orders = {
    getAll: () => this.get('/sales/orders', 'get_recent_orders'),

    getRecent: (limit: number = 10) => this.get(`/sales/orders?limit=${limit}`, 'get_recent_orders', { limit }),

    getById: (id: number) => this.get(`/sales/orders/${id}`, 'get_order', { id }),

    create: (orderData: any) =>
      this.create('/sales/orders', orderData, 'create_order', 'order_create'),

    update: (id: number, orderData: any) =>
      this.update(`/sales/orders/${id}`, orderData, 'update_order', { id, ...orderData }, 'order_update'),

    complete: (id: number) =>
      this.create(`/sales/orders/${id}/complete`, {}, 'complete_order', 'order_complete'),

    cancel: (id: number) =>
      this.create(`/sales/orders/${id}/cancel`, {}, 'cancel_order', 'order_cancel'),

    refund: (id: number) =>
      this.create(`/sales/orders/${id}/refund`, {}, 'refund_order', 'order_refund'),
  };

  /**
   * Sales Reports online-first operations
   */
  salesReports = {
    generateSalesReport: (data: { start_date: string; end_date: string }) =>
      this.create('/sales/reports/sales', data, 'get_sales_report', 'sales_report'),

    getDailySales: () => this.get('/sales/reports/daily-sales', 'get_daily_sales'),
  };

  /**
   * Supplier-specific online-first operations
   */
  suppliers = {
    getAll: () => this.get('/inventory/suppliers', 'get_suppliers'),
    getById: (id: number) => this.get(`/inventory/suppliers/${id}`, 'get_supplier', { id }),

    create: (supplierData: any) =>
      this.create('/inventory/suppliers', supplierData, 'create_supplier', 'supplier_create'),

    update: (id: number, supplierData: any) =>
      this.update(`/inventory/suppliers/${id}`, supplierData, 'update_supplier', { id, ...supplierData }, 'supplier_update'),

    delete: (id: number) =>
      this.delete(`/inventory/suppliers/${id}`, 'delete_supplier', { id }, 'supplier_delete'),
  };
}

// Export singleton instance
export const onlineFirstService = new OnlineFirstService();
export default onlineFirstService;
