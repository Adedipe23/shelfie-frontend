import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Online API Service for direct frontend calls to the online backend
 * Handles authentication, request construction, and error handling
 */
class OnlineApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = `${import.meta.env.VITE_API_BASE_URL || 'https://api.isms.helevon.org'}/api/v1`;

    this.client = axios.create({
      baseURL: this.baseURL,
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

    console.log('🔧 OnlineApiService axios client created with config:', {
      baseURL: this.client.defaults.baseURL,
      maxRedirects: this.client.defaults.maxRedirects,
      validateStatus: this.client.defaults.validateStatus?.toString(),
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const { authToken } = useAuthStore.getState();
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors and debug redirects
    this.client.interceptors.response.use(
      (response) => {
        console.log(`🚨 INTERCEPTOR: OnlineApiService Response: ${response.status} ${response.statusText} for ${response.config.url}`);
        console.log('🚨 INTERCEPTOR: This should NOT be called if we are using direct axios.get!');
        return response;
      },
      (error: AxiosError) => {

        if (error.response?.status === 401 || error.response?.status === 403) {
          // Invalid or expired token - trigger logout
          useAuthStore.getState().logout();
          // Redirect to login will be handled by the auth store or route guards
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if the online API is reachable
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Try to access the auth/me endpoint as a connectivity test
      // This is more reliable than a health endpoint that might not exist
      // Use /auth/me without trailing slash to avoid HTTPS->HTTP redirect
      const response = await this.client.get('/auth/me', {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 401/403 as "connected"
      });
      return response.status < 500;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, params?: any): Promise<T> {
    console.log('🚨 === AGGRESSIVE DEBUG START ===');
    console.log('🔍 OnlineApiService.get() called with endpoint:', endpoint);
    console.log('🔍 this.baseURL:', this.baseURL);
    console.log('🔍 this.client.defaults.baseURL:', this.client.defaults.baseURL);

    // Explicitly construct the full URL to prevent any automatic modifications
    const fullUrl = `${this.baseURL}${endpoint}`;
    console.log('🔍 Constructed fullUrl:', fullUrl);
    console.log('🔍 fullUrl type:', typeof fullUrl);
    console.log('🔍 fullUrl length:', fullUrl.length);

    // Get auth token for the request
    const { authToken } = useAuthStore.getState();
    console.log('🔍 authToken exists:', !!authToken);

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ISMS-Desktop-App/1.0',
      'Cache-Control': 'no-cache',
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
      console.log('🔍 Authorization header added');
    }

    console.log('🔍 Final headers:', headers);

    const requestConfig = {
      params,
      timeout: 10000,
      headers,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 300,
    };

    console.log('🔍 Request config:', requestConfig);
    console.log('🔍 About to call axios.get with URL:', fullUrl);

    try {
      console.log('🚀 Making axios.get request...');
      const response: AxiosResponse<T> = await axios.get(fullUrl, requestConfig);
      console.log('✅ Request successful, response status:', response.status);
      console.log('✅ Response URL:', response.config.url);
      console.log('🚨 === AGGRESSIVE DEBUG END (SUCCESS) ===');
      return response.data;
    } catch (error) {
      console.log('❌ Request failed in axios.get');
      console.log('❌ Error type:', (error as any)?.constructor?.name);
      console.log('❌ Error message:', (error as any)?.message);
      if ((error as any).config) {
        console.log('❌ Error config URL:', (error as any).config.url);
        console.log('❌ Error config baseURL:', (error as any).config.baseURL);
      }
      if ((error as any).response) {
        console.log('❌ Error response status:', (error as any).response.status);
        console.log('❌ Error response headers:', (error as any).response.headers);
      }
      console.log('🚨 === AGGRESSIVE DEBUG END (ERROR) ===');
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Handle API errors and determine if they're network-related
   */
  private handleError(error: AxiosError): void {
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        !error.response) {
      // Network error - should trigger offline fallback
      throw new NetworkError(error.message);
    } else {
      // API error - should not trigger offline fallback
      throw new ApiError(
        error.response?.status || 500,
        (error.response?.data as any)?.message || error.message
      );
    }
  }

  /**
   * User-related API calls
   */
  users = {
    getAll: () => this.get<any[]>('/users'),
    getById: (id: number) => this.get<any>(`/users/${id}`),
    create: (userData: any) => this.post<any>('/users', userData),
    update: (id: number, userData: any) => this.put<any>(`/users/${id}`, userData),
    delete: (id: number) => this.delete<void>(`/users/${id}`),
  };

  /**
   * Product-related API calls
   */
  products = {
    getAll: () => this.get<any[]>('/inventory/products'),
    getById: (id: number) => this.get<any>(`/inventory/products/${id}`),
    getBySku: (sku: string) => this.get<any>(`/inventory/products/sku/${sku}`),
    create: (productData: any) => this.post<any>('/inventory/products', productData),
    update: (id: number, productData: any) => this.put<any>(`/inventory/products/${id}`, productData),
    delete: (id: number) => this.delete<void>(`/inventory/products/${id}`),
    getLowStock: () => this.get<any[]>('/inventory/products/low-stock'),
    updateStock: (id: number, stockData: any) => this.put<any>(`/inventory/products/${id}/stock`, stockData),
  };

  /**
   * Supplier-related API calls
   */
  suppliers = {
    getAll: () => this.get<any[]>('/inventory/suppliers'),
    getById: (id: number) => this.get<any>(`/inventory/suppliers/${id}`),
    create: (supplierData: any) => this.post<any>('/inventory/suppliers', supplierData),
    update: (id: number, supplierData: any) => this.put<any>(`/inventory/suppliers/${id}`, supplierData),
    delete: (id: number) => this.delete<void>(`/inventory/suppliers/${id}`),
  };

  /**
   * Sales/Order-related API calls
   */
  orders = {
    getAll: () => this.get<any[]>('/sales/orders'),
    getRecent: (limit: number = 10) => this.get<any[]>(`/sales/orders?limit=${limit}`),
    getById: (id: number) => this.get<any>(`/sales/orders/${id}`),
    create: (orderData: any) => this.post<any>('/sales/orders', orderData),
    update: (id: number, orderData: any) => this.put<any>(`/sales/orders/${id}`, orderData),
    complete: (id: number) => this.post<any>(`/sales/orders/${id}/complete`, {}),
    cancel: (id: number) => this.post<any>(`/sales/orders/${id}/cancel`, {}),
    refund: (id: number) => this.post<any>(`/sales/orders/${id}/refund`, {}),
  };

  /**
   * Sales Reports API calls
   */
  salesReports = {
    generateSalesReport: (data: { start_date: string; end_date: string }) =>
      this.post<any>('/sales/reports/sales', data),
    getDailySales: () => this.get<any>('/sales/reports/daily-sales'),
  };

  /**
   * Stock movement-related API calls
   */
  stockMovements = {
    getAll: () => this.get<any[]>('/stock-movements'),
    getById: (id: number) => this.get<any>(`/stock-movements/${id}`),
    create: (movementData: any) => this.post<any>('/stock-movements', movementData),
  };
}

/**
 * Custom error classes for better error handling
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Utility function to check if an error is network-related
 */
export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Utility function to check if an error is API-related
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

// Export singleton instance
console.log('📦 Creating OnlineApiService singleton instance...');
export const onlineApiService = new OnlineApiService();
console.log('📦 OnlineApiService singleton created successfully');
export default onlineApiService;
