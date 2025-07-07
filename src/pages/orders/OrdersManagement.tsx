import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price?: number;
  price_at_sale?: number;
  product_name?: string;
}

interface Order {
  id: number;
  customer_name?: string;
  payment_method: string;
  cashier_id: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

interface UpdateOrderRequest {
  customer_name?: string;
  payment_method: 'cash' | 'card' | 'mobile';
  cashier_id: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
}

const OrdersManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateFormData, setUpdateFormData] = useState<UpdateOrderRequest>({
    customer_name: '',
    payment_method: 'cash',
    cashier_id: 0,
    status: 'pending'
  });
  const [pagination] = useState({
    skip: 0,
    limit: 100,
    total: 0
  });

  const { showError, showSuccess } = useToast();

  // Receipt generation function (copied from POS)
  const generateReceiptHTML = (orderData: any, orderId: number) => {
    const currentDate = new Date(orderData.created_at || new Date());
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

            const productName = item.product_name || item.name || `Product ${item.product_id || 'Unknown'}`;
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

  // Print receipt function
  const printOrderReceipt = (order: Order) => {
    const receiptHTML = generateReceiptHTML(order, order.id);

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
          size: 80mm auto;
          margin: 0;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Courier New', monospace !important;
          font-size: 11px !important;
          line-height: 1.1 !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        #receipt-print-container {
          font-weight: bold !important;
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
          font-weight: 900 !important;
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

    showSuccess(`Receipt for Order #${order.id} sent to printer`);
  };

  // Check if user has permission to access orders (admin or manager only)
  const hasOrdersAccess = user?.role === 'admin' || user?.role === 'manager';

  if (!hasOrdersAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators and managers can access the Orders Management page.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchOrders();
  }, [pagination.skip, pagination.limit]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Order[]>(`/sales/orders?skip=${pagination.skip}&limit=${pagination.limit}`);
      setOrders(response);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const order = await apiClient.get<Order>(`/sales/orders/${orderId}`);
      setSelectedOrder(order);
      setShowOrderDetails(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      showError('Failed to load order details');
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const updatedOrder = await apiClient.put<Order>(`/sales/orders/${selectedOrder.id}`, updateFormData);
      
      // Update the order in the list
      setOrders(orders.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));
      
      setSelectedOrder(updatedOrder);
      setShowUpdateForm(false);
      showSuccess('Order updated successfully');
    } catch (error) {
      console.error('Failed to update order:', error);
      showError('Failed to update order');
    }
  };

  const handleRefundOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.post(`/sales/orders/${orderId}/refund`);
      
      // Update the order status in the list
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'refunded' } : order
      ));
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'refunded' });
      }
      
      showSuccess('Order refunded successfully. Inventory has been updated.');
    } catch (error) {
      console.error('Failed to refund order:', error);
      showError('Failed to refund order');
    }
  };

  const openUpdateForm = (order: Order) => {
    setSelectedOrder(order);
    setUpdateFormData({
      customer_name: order.customer_name || '',
      payment_method: order.payment_method as 'cash' | 'card' | 'mobile',
      cashier_id: order.cashier_id,
      status: order.status as 'pending' | 'completed' | 'cancelled' | 'refunded'
    });
    setShowUpdateForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'cancelled':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'refunded':
        return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all sales orders
          </p>
        </div>
        <Button onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </div>

      {/* Orders List */}
      <Card title="Orders List">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2">Order ID</th>
                  <th className="text-left py-3 px-2">Customer</th>
                  <th className="text-left py-3 px-2">Payment Method</th>
                  <th className="text-right py-3 px-2">Total Amount</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Created Date</th>
                  <th className="text-center py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-2 font-medium">#{order.id}</td>
                    <td className="py-3 px-2">{order.customer_name || 'Walk-in Customer'}</td>
                    <td className="py-3 px-2 capitalize">{order.payment_method}</td>
                    <td className="py-3 px-2 text-right font-medium">${(order.total_amount ?? 0).toFixed(2)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-2">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUpdateForm(order)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printOrderReceipt(order)}
                          title="Print Receipt"
                        >
                          🖨️
                        </Button>
                        {order.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRefundOrder(order.id)}
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          </div>
        )}
      </Card>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Order Details - #{selectedOrder.id}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrderDetails(false)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</p>
                  <p className="text-gray-900 dark:text-white">{selectedOrder.customer_name || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</p>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</p>
                  <p className="text-gray-900 dark:text-white font-bold">${(selectedOrder.total_amount ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Created Date</p>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cashier ID</p>
                  <p className="text-gray-900 dark:text-white">{selectedOrder.cashier_id}</p>
                </div>
              </div>

              {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium mb-2">Order Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2">Product</th>
                          <th className="text-right py-2">Quantity</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item) => {
                          // Safe price calculation with fallbacks
                          const priceAtSale = item.price_at_sale ?? item.unit_price ?? 0;
                          const quantity = item.quantity ?? 0;
                          const itemTotal = quantity * priceAtSale;

                          return (
                            <tr key={item.id || Math.random()} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-2">{item.product_name || `Product ${item.product_id || 'Unknown'}`}</td>
                              <td className="py-2 text-right">{quantity}</td>
                              <td className="py-2 text-right">${priceAtSale.toFixed(2)}</td>
                              <td className="py-2 text-right">${itemTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No order items available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Order Modal */}
      {showUpdateForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Update Order - #{selectedOrder.id}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpdateForm(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={updateFormData.customer_name}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Walk-in Customer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={updateFormData.payment_method}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, payment_method: e.target.value as 'cash' | 'card' | 'mobile' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, status: e.target.value as 'pending' | 'completed' | 'cancelled' | 'refunded' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={handleUpdateOrder} className="flex-1">
                  Update Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
