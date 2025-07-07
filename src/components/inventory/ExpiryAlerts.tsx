import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { inventoryService } from '../../services/inventoryService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../hooks/useToast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Product } from '../../types';

const ExpiryAlerts: React.FC = () => {
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, authToken } = useAuthStore();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    // Only fetch alerts when authenticated
    if (isAuthenticated && authToken) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authToken]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [expiring, lowStock] = await Promise.all([
        notificationService.getExpiringProducts(7), // Products expiring in 7 days
        inventoryService.getLowStockProducts(),
      ]);
      setExpiringProducts(expiring);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      showError('Failed to load inventory alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAlerts = async () => {
    try {
      await notificationService.checkAlerts();
      await fetchAlerts();
      showSuccess('Alerts checked and updated');
    } catch (error) {
      console.error('Failed to check alerts:', error);
      showError('Failed to check alerts');
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return { text: 'Expired', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/20' };
    if (days === 0) return { text: 'Expires today', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/20' };
    if (days === 1) return { text: 'Expires tomorrow', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/20' };
    if (days <= 3) return { text: `${days} days left`, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/20' };
    return { text: `${days} days left`, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' };
  };

  if (loading) {
    return (
      <Card title="Inventory Alerts">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  const totalAlerts = expiringProducts.length + lowStockProducts.length;

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Inventory Alerts</span>
            {totalAlerts > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {totalAlerts} alerts
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckAlerts}
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Check Alerts
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Expiring Products */}
        {expiringProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <svg className="h-4 w-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Products Expiring Soon ({expiringProducts.length})
            </h4>
            <div className="space-y-2">
              {expiringProducts.map((product) => {
                const status = getExpiryStatus(product.expiry_date!);
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        SKU: {product.sku} | Stock: {product.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.text}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(product.expiry_date!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low Stock Products */}
        {lowStockProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <svg className="h-4 w-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Low Stock Products ({lowStockProducts.length})
            </h4>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {product.quantity} left
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Reorder at: {product.reorder_level}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Alerts */}
        {totalAlerts === 0 && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">All Good!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No inventory alerts at this time.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ExpiryAlerts;
