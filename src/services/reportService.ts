import { secureInvoke } from '../utils/apiInterceptor';
import { onlineFirstService } from './onlineFirstService';
import { apiClient } from './api';

export interface SalesReport {
  date: string;
  total_sales: number;
  total_orders: number;
  average_order_value: number;
}

export interface ProductSalesReport {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface InventoryReport {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  expiring_soon_count: number;
  categories: {
    category: string;
    product_count: number;
    total_value: number;
  }[];
}

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  total_products: number;
  low_stock_count: number;
  total_inventory_value: number;
  recent_orders: any[];
}

export interface DailySalesReport {
  date: string;
  total_sales: number;
  order_count: number;
}

export interface GenerateSalesReportRequest {
  start_date: string;
  end_date: string;
}

export interface GenerateSalesReportResponse {
  total_sales: number;
  order_count: number;
  average_order_value: number;
  start_date: string;
  end_date: string;
}

export const reportService = {
  // Generate sales report using new API endpoint
  generateSalesReport: async (startDate: string, endDate: string): Promise<GenerateSalesReportResponse> => {
    try {
      return await apiClient.post<GenerateSalesReportResponse>('/sales/reports/sales', {
        start_date: startDate,
        end_date: endDate
      });
    } catch (error) {
      console.warn('Online sales report failed, using local fallback:', error);
      // Fallback to local with correct parameter names
      const localData = await secureInvoke('get_sales_report', {
        startDate: startDate,
        endDate: endDate
      }) as any[];
      // Convert local data to expected format
      return {
        total_sales: localData[0]?.total_sales || 0,
        order_count: localData[0]?.total_orders || 0,
        average_order_value: localData[0]?.average_order_value || 0,
        start_date: startDate,
        end_date: endDate
      };
    }
  },

  // Get daily sales report using new API endpoint
  getDailySalesReport: async (days: number = 7): Promise<DailySalesReport[]> => {
    try {
      return await apiClient.get<DailySalesReport[]>(`/sales/reports/daily-sales?days=${days}`);
    } catch (error) {
      console.warn('Online daily sales report failed, using local fallback:', error);
      // Fallback to local
      return await secureInvoke('get_daily_sales_report', { days });
    }
  },

  // Get sales report for date range - use online-first (legacy method for compatibility)
  getSalesReport: async (startDate: string, endDate: string): Promise<SalesReport[]> => {
    try {
      const report = await onlineFirstService.salesReports.generateSalesReport({
        start_date: startDate,
        end_date: endDate
      });
      // Convert single report to array format expected by UI
      return [report] as SalesReport[];
    } catch (error) {
      console.warn('Online sales report failed, using local fallback:', error);
      // Fallback to local with correct parameter names
      return await secureInvoke('get_sales_report', {
        startDate: startDate,
        endDate: endDate
      });
    }
  },

  // Get product sales report
  getProductSalesReport: async (startDate: string, endDate: string): Promise<ProductSalesReport[]> => {
    try {
      // For now, use local fallback since there's no specific API endpoint
      return await secureInvoke('get_product_sales_report', {
        startDate: startDate,
        endDate: endDate
      });
    } catch (error) {
      console.warn('Product sales report failed:', error);
      return [];
    }
  },

  // Get inventory report - use products API to generate report
  getInventoryReport: async (): Promise<InventoryReport> => {
    try {
      const products = await onlineFirstService.products.getAll() as any[];

      const totalProducts = products.length;
      const lowStockCount = products.filter(p => p.quantity <= p.reorder_level).length;
      const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      // Group by category
      const categoryMap: Record<string, { count: number; value: number }> = {};
      products.forEach(p => {
        if (!categoryMap[p.category]) {
          categoryMap[p.category] = { count: 0, value: 0 };
        }
        categoryMap[p.category].count += 1;
        categoryMap[p.category].value += p.price * p.quantity;
      });

      const categories = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        product_count: data.count,
        total_value: data.value
      }));

      return {
        total_products: totalProducts,
        total_value: totalValue,
        low_stock_count: lowStockCount,
        expiring_soon_count: 0, // No expiry dates in new schema
        categories: categories
      };
    } catch (error) {
      // Fallback to local
      return await secureInvoke('get_inventory_report');
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    return await secureInvoke('get_dashboard_stats');
  },

  // Export sales report to CSV
  exportSalesReport: async (startDate: string, endDate: string): Promise<string> => {
    return await secureInvoke('export_sales_report', { 
      start_date: startDate, 
      end_date: endDate 
    });
  },

  // Export inventory report to CSV
  exportInventoryReport: async (): Promise<string> => {
    return await secureInvoke('export_inventory_report');
  },
};
