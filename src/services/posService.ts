import { secureInvoke } from '../utils/apiInterceptor';
import { onlineFirstService } from './onlineFirstService';
import { Product, Order, OrderItem, CreateOrderRequest } from '../types';

export const posService = {
  // Product search - use online-first
  searchProductsBySku: async (sku: string): Promise<Product | null> => {
    try {
      return await onlineFirstService.products.getBySku(sku) as Product;
    } catch (error) {
      // Fallback to local search
      return await secureInvoke('search_products_by_sku', { sku });
    }
  },

  searchProductsByName: async (query: string): Promise<Product[]> => {
    try {
      // For now, get all products and filter locally
      // TODO: Add search endpoint to API
      const products = await onlineFirstService.products.getAll() as Product[];
      return products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      // Fallback to local search
      return await secureInvoke('search_products_by_name', { query });
    }
  },

  // Order management - use online-first
  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    const response = await onlineFirstService.orders.create(orderData);
    // If response is just an ID, fetch the full order
    if (typeof response === 'number') {
      return await onlineFirstService.orders.getById(response) as Order;
    }
    return response as Order;
  },

  completeOrder: async (orderId: number): Promise<Order> => {
    return await onlineFirstService.orders.complete(orderId) as Order;
  },

  cancelOrder: async (orderId: number): Promise<void> => {
    await onlineFirstService.orders.cancel(orderId);
  },

  refundOrder: async (orderId: number): Promise<void> => {
    await onlineFirstService.orders.refund(orderId);
  },

  getRecentOrders: async (limit?: number): Promise<Order[]> => {
    return await onlineFirstService.orders.getRecent(limit || 10) as Order[];
  },

  getOrderItems: async (orderId: number): Promise<OrderItem[]> => {
    return await secureInvoke('get_order_items', { orderId });
  },

  // Hardware integration
  processBarcodeSccan: async (barcode: string): Promise<Product | null> => {
    return await secureInvoke('process_barcode_scan', { barcode });
  },

  printReceipt: async (orderId: number): Promise<string> => {
    return await secureInvoke('print_receipt', { orderId });
  },

  openCashDrawer: async (): Promise<string> => {
    return await secureInvoke('open_cash_drawer');
  },
};
