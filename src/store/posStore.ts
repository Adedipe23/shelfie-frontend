import { create } from 'zustand';
import { Product, CartItem } from '../types';

interface PosState {
  cart: CartItem[];
  customerName: string;
  paymentMethod: string;
  isProcessing: boolean;
  lastOrderId: number | null;
}

interface PosActions {
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateCartItemQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setCustomerName: (name: string) => void;
  setPaymentMethod: (method: string) => void;
  setProcessing: (processing: boolean) => void;
  setLastOrderId: (orderId: number | null) => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getCartItem: (productId: number) => CartItem | undefined;
}

type PosStore = PosState & PosActions;

export const usePosStore = create<PosStore>((set, get) => ({
  // Initial state
  cart: [],
  customerName: '',
  paymentMethod: 'cash',
  isProcessing: false,
  lastOrderId: null,

  // Actions
  addToCart: (product: Product, quantity = 1) => {
    set((state) => {
      const existingItem = state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        return {
          cart: state.cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * product.price }
              : item
          )
        };
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          product,
          quantity,
          subtotal: quantity * product.price,
        };
        return {
          cart: [...state.cart, newItem]
        };
      }
    });
  },

  removeFromCart: (productId: number) => {
    set((state) => ({
      cart: state.cart.filter(item => item.product.id !== productId)
    }));
  },

  updateCartItemQuantity: (productId: number, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }

    set((state) => ({
      cart: state.cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: quantity * item.product.price }
          : item
      )
    }));
  },

  clearCart: () => {
    set({
      cart: [],
      customerName: '',
      paymentMethod: 'cash',
      lastOrderId: null,
    });
  },

  setCustomerName: (name: string) => {
    set({ customerName: name });
  },

  setPaymentMethod: (method: string) => {
    set({ paymentMethod: method });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  setLastOrderId: (orderId: number | null) => {
    set({ lastOrderId: orderId });
  },

  getCartTotal: () => {
    const { cart } = get();
    return cart.reduce((total, item) => total + item.subtotal, 0);
  },

  getCartItemCount: () => {
    const { cart } = get();
    return cart.reduce((count, item) => count + item.quantity, 0);
  },

  getCartItem: (productId: number) => {
    const { cart } = get();
    return cart.find(item => item.product.id === productId);
  },
}));
