import React, { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../../store/posStore';
import { useAuthStore } from '../../store/authStore';
import { posService } from '../../services/posService';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Product } from '../../types';
import toast from 'react-hot-toast';

const POSInterface: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuthStore();
  const {
    cart,
    customerName,
    paymentMethod,
    isProcessing,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    setCustomerName,
    setPaymentMethod,
    setProcessing,
    setLastOrderId,
    getCartTotal,
    getCartItemCount,
  } = usePosStore();

  // State for last receipt data and order workflow
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orderStep, setOrderStep] = useState<'cart' | 'payment' | 'completed'>('cart');
  const [printerType, setPrinterType] = useState<'thermal' | 'standard'>('thermal');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus on search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Generate receipt HTML content
  const generateReceiptHTML = (orderData: any, orderId: number) => {
    const currentDate = new Date();
    // Handle different order data structures
    const items = orderData.items || [];
    const total = orderData.total_amount || items.reduce((sum: number, item: any) => {
      const price = item.price_at_sale || item.unit_price || item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);

    return `
      <div style="font-family: 'Courier New', monospace; width: 320px; margin: 0 auto; padding: 20px; background: white;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold;">ISMS SUPERMARKET</h1>
          <p style="margin: 5px 0; font-size: 11px;">Inventory Management System</p>
          <p style="margin: 2px 0; font-size: 10px;">📍 Your Store Address Here</p>
          <p style="margin: 2px 0; font-size: 10px;">📞 Phone: (555) 123-4567</p>
          <p style="margin: 2px 0; font-size: 10px;">🌐 www.isms-store.com</p>
        </div>

        <div style="margin-bottom: 15px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Receipt #:</span>
            <span style="font-weight: bold;">${orderId}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date:</span>
            <span>${currentDate.toLocaleDateString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Time:</span>
            <span>${currentDate.toLocaleTimeString()}</span>
          </div>
          ${orderData.customer_name ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Customer:</span>
            <span>${orderData.customer_name}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span>Payment:</span>
            <span style="text-transform: uppercase;">${orderData.payment_method}</span>
          </div>
          ${orderData.cashier_id ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Cashier:</span>
            <span>#${orderData.cashier_id}</span>
          </div>` : ''}
        </div>

        <div style="border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 10px 0; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 8px;">
            <span>ITEM</span>
            <span>QTY</span>
            <span>PRICE</span>
            <span>TOTAL</span>
          </div>
          ${items.map((item: any) => {
            const price = item.price_at_sale || item.unit_price || item.price || 0;
            const quantity = item.quantity || 0;
            const itemTotal = price * quantity;

            // Try to get product name from different possible sources
            const productName = item.product_name || item.name || `Product ${item.product_id}`;
            // Truncate long product names
            const displayName = productName.length > 20 ? productName.substring(0, 17) + '...' : productName;

            return `
              <div style="margin: 4px 0; font-size: 10px;">
                <div style="font-weight: bold;">${displayName}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                  <span></span>
                  <span>${quantity}</span>
                  <span>$${price.toFixed(2)}</span>
                  <span style="font-weight: bold;">$${itemTotal.toFixed(2)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="border-top: 2px solid #000; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>Subtotal:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>Tax:</span>
            <span>$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 8px 0; border-top: 1px solid #000; padding-top: 5px;">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 15px;">
          <p style="margin: 3px 0; font-weight: bold;">THANK YOU FOR YOUR BUSINESS!</p>
          <p style="margin: 3px 0;">Please keep this receipt for your records</p>
          <p style="margin: 3px 0;">Returns accepted within 30 days with receipt</p>
          <p style="margin: 8px 0; font-size: 9px;">Receipt generated on ${currentDate.toLocaleString()}</p>
          <p style="margin: 3px 0; font-size: 9px;">Powered by ISMS - Inventory Management System</p>
        </div>
      </div>
    `;
  };

  // Simplified print receipt using window.print()
  const printReceipt = (orderData: any, orderId: number, printerType: 'thermal' | 'standard' = 'thermal') => {
    const receiptHTML = generateReceiptHTML(orderData, orderId);

    // Create a temporary container for the receipt
    const printContainer = document.createElement('div');
    printContainer.innerHTML = receiptHTML;
    printContainer.id = 'receipt-print-container';

    // Position off-screen but visible for printing
    printContainer.style.position = 'fixed';
    printContainer.style.top = '-9999px';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '320px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.zIndex = '9999';

    // Add print-specific styles
    const printStyles = document.createElement('style');
    printStyles.id = 'receipt-print-styles';
    printStyles.textContent = `
      @media print {
        * {
          visibility: hidden;
        }

        #receipt-print-container,
        #receipt-print-container * {
          visibility: visible;
        }

        #receipt-print-container {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        @page {
          ${printerType === 'thermal' ? `
            size: 80mm auto;
            margin: 0;
          ` : `
            size: A4;
            margin: 5mm;
          `}
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Courier New', monospace !important;
          font-size: ${printerType === 'thermal' ? '11px' : '13px'} !important;
          line-height: ${printerType === 'thermal' ? '1.1' : '1.3'} !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        #receipt-print-container {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }

        /* Reset margins/paddings for common elements within the receipt */
        #receipt-print-container h1,
        #receipt-print-container h2,
        #receipt-print-container h3,
        #receipt-print-container p,
        #receipt-print-container div,
        #receipt-print-container span {
          margin: 0 !important;
          padding: 0 !important;
          line-height: inherit !important;
        }

        /* Specific adjustments for visual separation */
        #receipt-print-container div[style*="border-bottom"],
        #receipt-print-container div[style*="border-top"] {
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }

        #receipt-print-container div[style*="margin-bottom"] {
          margin-bottom: 2px !important;
        }

        #receipt-print-container div[style*="margin-top"] {
          margin-top: 2px !important;
        }

        ${printerType === 'thermal' ? `
          #receipt-print-container {
            font-weight: bold !important;
          }

          #receipt-print-container h1,
          #receipt-print-container h2,
          #receipt-print-container h3 {
            font-weight: 900 !important;
          }
        ` : ''}

        /* Prevent page breaks */
        html, body {
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }
      }

      @media screen {
        #receipt-print-container {
          display: none;
        }
      }
    `;

    // Add elements to document
    document.head.appendChild(printStyles);
    document.body.appendChild(printContainer);

    // Print and cleanup
    window.print();

    // Clean up after printing
    setTimeout(() => {
      if (document.head.contains(printStyles)) {
        document.head.removeChild(printStyles);
      }
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 1000);
  };

  // Regenerate last receipt
  const regenerateLastReceipt = () => {
    if (lastReceiptData) {
      printReceipt(lastReceiptData.orderData, lastReceiptData.orderId, printerType);
      toast.success('Receipt regenerated!');
    } else {
      toast.error('No recent receipt to regenerate');
    }
  };

  // Handle product search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await posService.searchProductsByName(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      showError('Failed to search products');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle barcode scan
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      // Search in current search results first, then do a fresh search
      let product = searchResults.find(p => p.sku === barcodeInput.trim());

      if (!product) {
        // Do a fresh search for the SKU
        await handleSearch(barcodeInput.trim());
        // Check if we found it in the new results
        const freshResults = await posService.searchProductsByName(barcodeInput.trim());
        product = freshResults.find(p => p.sku === barcodeInput.trim());
      }

      if (product) {
        addToCart(product);
        setBarcodeInput('');
        showSuccess(`Added ${product.name} to cart`);
      } else {
        showError('Product not found');
      }
    } catch (error) {
      console.error('Barcode scan failed:', error);
      showError('Failed to process barcode');
    }
  };

  // Auto-process barcode when pasted or typed (for barcode scanners)
  const handleBarcodeChange = async (value: string) => {
    setBarcodeInput(value);

    // Auto-process if it looks like a complete barcode (8+ characters)
    if (value.length >= 8 && value.trim()) {
      try {
        // Search in current search results first, then do a fresh search
        let product = searchResults.find(p => p.sku === value.trim());

        if (!product) {
          // Do a fresh search for the SKU
          await handleSearch(value.trim());
          // Check if we found it in the new results
          const freshResults = await posService.searchProductsByName(value.trim());
          product = freshResults.find(p => p.sku === value.trim());
        }

        if (product) {
          addToCart(product);
          setBarcodeInput('');
          showSuccess(`Added ${product.name} to cart`);
        }
      } catch (error) {
        // Don't show error for auto-processing, user can still manually submit
        console.log('Auto-barcode processing failed:', error);
      }
    }
  };

  // Step 1: Create Order (when user clicks "Create Order")
  const handleCreateOrder = async () => {
    if (cart.length === 0) return;

    try {
      setProcessing(true);

      const orderData = {
        customer_name: customerName || "",
        payment_method: paymentMethod,
        cashier_id: user?.id || 0,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          price_at_sale: item.product.price,
        })),
      };

      const order = await posService.createOrder(orderData);
      setCurrentOrder(order);
      setOrderStep('payment');

      showSuccess(`Order #${order.id || 'NEW'} created successfully. Please process payment.`);

    } catch (error) {
      console.error('Order creation failed:', error);
      showError('Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  // Step 2: Complete Order (after payment is processed)
  const handleCompleteOrder = async () => {
    if (!currentOrder) return;

    try {
      setProcessing(true);

      const completedOrder = await posService.completeOrder(currentOrder.id);

      setLastOrderId(completedOrder.id || currentOrder.id);
      setLastReceiptData({ orderData: completedOrder, orderId: completedOrder.id || currentOrder.id });
      setOrderStep('completed');

      showSuccess(`Order #${completedOrder.id || currentOrder.id} completed successfully!`);

      // Clear cart immediately after completion
      clearCart();

      // Reset for next order after a short delay
      setTimeout(() => {
        setCurrentOrder(null);
        setOrderStep('cart');
        setSearchQuery('');
        setSearchResults([]);

        // Focus back on search input
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 3000);

    } catch (error) {
      console.error('Order completion failed:', error);
      showError('Failed to complete order');
    } finally {
      setProcessing(false);
    }
  };

  // Cancel current order
  const handleCancelOrder = async () => {
    if (!currentOrder) return;

    try {
      setProcessing(true);
      await posService.cancelOrder(currentOrder.id);

      setCurrentOrder(null);
      setOrderStep('cart');
      showSuccess(`Order #${currentOrder.id} cancelled`);

    } catch (error) {
      console.error('Order cancellation failed:', error);
      showError('Failed to cancel order');
    } finally {
      setProcessing(false);
    }
  };

  const cartTotal = getCartTotal();
  const cartItemCount = getCartItemCount();

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Product Search and Selection */}
      <div className="flex-1 space-y-6">
        <Card title="Product Search" className="h-full">
          <div className="space-y-4">
            {/* Barcode Scanner */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or enter SKU..."
                value={barcodeInput}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button type="submit" disabled={!barcodeInput.trim()}>
                Add
              </Button>
            </form>

            {/* Product Search */}
            <div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => {
                        addToCart(product);
                        showSuccess(`Added ${product.name} to cart`);
                      }}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          SKU: {product.sku} | Stock: {product.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </p>
                        {product.quantity <= product.reorder_level && (
                          <p className="text-xs text-red-600 dark:text-red-400">Low Stock</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">No products found</p>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart and Checkout */}
      <div className="w-full lg:w-96 space-y-6">
        {/* Cart */}
        <Card title={`Cart (${cartItemCount} items)`}>
          <div className="space-y-4">
            {cart.length > 0 ? (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                          {item.product.name}
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          ${item.product.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 10-4 0v4.01" />
                </svg>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Cart is empty</p>
              </div>
            )}
          </div>
        </Card>

        {/* Checkout */}
        {cart.length > 0 && (
          <Card title="Checkout">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="mobile_payment">Mobile Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                {orderStep === 'cart' && (
                  <>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={isProcessing}
                      loading={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? 'Creating Order...' : `Create Order - $${cartTotal.toFixed(2)}`}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={clearCart}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Clear Cart
                    </Button>
                  </>
                )}

                {orderStep === 'payment' && currentOrder && (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Order #{currentOrder.id || 'NEW'} created successfully.
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Process payment and complete the order.
                      </p>
                    </div>

                    <Button
                      onClick={handleCompleteOrder}
                      disabled={isProcessing}
                      loading={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? 'Completing Order...' : `Complete Payment - $${cartTotal.toFixed(2)}`}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleCancelOrder}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Cancel Order
                    </Button>
                  </>
                )}

                {orderStep === 'completed' && (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Order #{currentOrder?.id || 'NEW'} completed successfully!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                        Starting new order in 3 seconds...
                      </p>
                    </div>

                    <Button
                      onClick={() => lastReceiptData && printReceipt(lastReceiptData.orderData, lastReceiptData.orderId, printerType)}
                      className="w-full"
                      variant="outline"
                    >
                      🖨️ Print Receipt (Ctrl+P)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Receipt Actions & Printer Settings */}
        <Card title="Receipt & Printer Settings">
          <div className="space-y-4">
            {/* Printer Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Printer Type
              </label>
              <select
                value={printerType}
                onChange={(e) => setPrinterType(e.target.value as 'thermal' | 'standard')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="thermal">🖨️ Thermal Receipt Printer (80mm)</option>
                <option value="standard">🖨️ Standard Printer (A4)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {printerType === 'thermal'
                  ? 'Optimized for 80mm thermal receipt printers with minimal margins'
                  : 'Standard printer with normal margins and A4 paper size'
                }
              </p>
            </div>

            {/* Receipt Actions */}
            {lastReceiptData && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Receipt Actions
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={regenerateLastReceipt}
                    className="w-full"
                  >
                    🔄 Regenerate Last Receipt
                  </Button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Order #{lastReceiptData.orderId} • {printerType === 'thermal' ? 'Thermal' : 'Standard'} Format
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default POSInterface;
