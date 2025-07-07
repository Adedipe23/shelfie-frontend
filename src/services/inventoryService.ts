import { secureInvoke } from '../utils/apiInterceptor';
import { onlineFirstService } from './onlineFirstService';
import { Product, Supplier, InventoryMovement, CreateProductRequest, UpdateStockRequest } from '../types';

export const inventoryService = {
  // Product management - Online-first operations
  getProducts: async (): Promise<Product[]> => {
    return await onlineFirstService.products.getAll() as Product[];
  },

  createProduct: async (productData: CreateProductRequest): Promise<any> => {
    return await onlineFirstService.products.create(productData);
  },

  updateProduct: async (productId: number, productData: CreateProductRequest): Promise<any> => {
    return await onlineFirstService.products.update(productId, productData);
  },

  deleteProduct: async (productId: number): Promise<any> => {
    return await onlineFirstService.products.delete(productId);
  },

  updateStock: async (productId: number, stockData: UpdateStockRequest): Promise<any> => {
    return await onlineFirstService.products.updateStock(productId, stockData);
  },

  getLowStockProducts: async (): Promise<Product[]> => {
    return await onlineFirstService.products.getLowStock() as Product[];
  },

  // Supplier management - Online-first operations
  getSuppliers: async (): Promise<Supplier[]> => {
    return await onlineFirstService.suppliers.getAll() as Supplier[];
  },

  createSupplier: async (supplierData: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<any> => {
    return await onlineFirstService.suppliers.create(supplierData);
  },

  updateSupplier: async (
    supplierId: number,
    supplierData: {
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ): Promise<any> => {
    return await onlineFirstService.suppliers.update(supplierId, supplierData);
  },

  deleteSupplier: async (supplierId: number): Promise<any> => {
    return await onlineFirstService.suppliers.delete(supplierId);
  },

  // Inventory movements (local only - no API endpoint available)
  getInventoryMovements: async (productId?: number): Promise<InventoryMovement[]> => {
    try {
      return await secureInvoke('get_inventory_movements', { productId });
    } catch (error) {
      console.log('Local inventory movements not available, returning empty array');
      return [];
    }
  },
};
