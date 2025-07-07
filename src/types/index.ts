// User and Authentication Types
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  password_hash: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: Date;
  updated_at: Date;
}

// API response types
export interface ApiUserResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface ApiTokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Product and Inventory Types
export enum ProductCategory {
  GROCERY = 'grocery',
  DAIRY = 'dairy',
  MEAT = 'meat',
  PRODUCE = 'produce',
  BAKERY = 'bakery',
  FROZEN = 'frozen',
  BEVERAGES = 'beverages',
  HOUSEHOLD = 'household',
  PERSONAL_CARE = 'personal_care',
  OTHER = 'other'
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  category: ProductCategory;
  price: number;
  cost: number;
  quantity: number;
  reorder_level: number;
  expiry_date?: string;
  supplier_id?: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  reorder_level: number;
  expiry_date?: string;
  supplier_id?: number;
}

export interface UpdateStockRequest {
  quantity_change: number;
  movement_type: string;
  notes?: string;
}

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

// Order and Sales Types
export interface Order {
  id: number;
  customer_name?: string;
  payment_method: string;
  cashier_id: number;
  total_amount: number;
  status: string;
  order_date: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_sale: number;
  created_at: string;
}

export interface OrderItemRequest {
  product_id: number;
  quantity: number;
  price_at_sale: number;
}

export interface CreateOrderRequest {
  customer_name?: string;
  payment_method: string;
  items: OrderItemRequest[];
}

// Inventory Movement Types
export interface InventoryMovement {
  id: number;
  product_id: number;
  quantity_change: number;
  movement_type: string;
  notes?: string;
  timestamp: string;
  last_synced_at?: string;
  created_at: string;
}

// Role and Permission Types
export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

// Application State Types
export interface AppState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  authToken: string | null;
  theme: 'light' | 'dark' | 'system';
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavItem[];
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// POS Types
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Notification {
  id: number;
  user_id?: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  product_id?: number;
  created_at: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// Report Types
export interface SalesReport {
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
  period: string;
}

export interface InventoryReport {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value: number;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

// Route Types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  protected?: boolean;
  permission?: string;
  layout?: React.ComponentType<{ children: React.ReactNode }>;
}
