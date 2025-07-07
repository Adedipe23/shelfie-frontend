import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { inventoryService } from '../services/inventoryService';
import { posService } from '../services/posService';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import ExpiryAlerts from '../components/inventory/ExpiryAlerts';
import { Order } from '../types';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, authToken, hasPermission } = useAuthStore();
  const { isOnline } = useAppStore();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalValue: 0,
    recentOrders: [] as Order[],
    todaysSales: 0,
    loading: true,
  });

  // Only fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchDashboardData();
    } else {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  }, [isAuthenticated, authToken]);

  const fetchDashboardData = async () => {
    try {
      const [products, lowStockProducts, allRecentOrders] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getLowStockProducts(),
        posService.getRecentOrders(10),
      ]);

      // Filter orders by cashier if user is cashier and sort by latest date
      let filteredOrders = user?.role === 'cashier'
        ? allRecentOrders.filter(order => order.cashier_id === user.id)
        : allRecentOrders;

      // Sort by created_at date (most recent first)
      const recentOrders = filteredOrders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const todaysSales = recentOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          const today = new Date();
          return orderDate.toDateString() === today.toDateString();
        })
        .reduce((sum, order) => sum + order.total_amount, 0);

      setDashboardData({
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        totalValue,
        recentOrders,
        todaysSales,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showError('Failed to load dashboard data');
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const stats = [
    {
      title: 'Today\'s Sales',
      value: `$${dashboardData.todaysSales.toFixed(2)}`,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      title: 'Low Stock Items',
      value: dashboardData.lowStockCount.toString(),
      change: dashboardData.lowStockCount > 0 ? 'Needs attention' : 'All good',
      changeType: dashboardData.lowStockCount > 0 ? 'negative' as const : 'positive' as const,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
    {
      title: 'Inventory Value',
      value: `$${dashboardData.totalValue.toFixed(2)}`,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stat.value}
                </p>
                {stat.change && (
                  <p className={`text-sm mt-1 ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : stat.changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                  }`}>
                    {stat.change}
                  </p>
                )}
              </div>
              <div className="text-muted-foreground">
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-6">
        <ExpiryAlerts />
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Orders" description="Latest sales transactions">
          <div className="space-y-4">
            {dashboardData.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : dashboardData.recentOrders.length > 0 ? (
              dashboardData.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Order #{order.id} - {order.customer_name || 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()} • {order.payment_method}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    ${order.total_amount.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No recent orders</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Quick Actions" description="Common tasks and shortcuts">
          <div className="grid grid-cols-2 gap-4">
            {/* POS - Available to all roles */}
            <button
              onClick={() => navigate('/pos')}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="text-primary mb-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-medium">New Sale</h3>
              <p className="text-sm text-muted-foreground">Start POS transaction</p>
            </button>

            {/* Add Product - Manager/Admin only */}
            {(hasPermission('inventory_management') || user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => navigate('/inventory/products')}
                className="p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <div className="text-primary mb-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="font-medium">Add Product</h3>
                <p className="text-sm text-muted-foreground">Add new inventory item</p>
              </button>
            )}

            {/* Reports - Manager/Admin only */}
            {(hasPermission('reporting') || user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => navigate('/reports')}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="text-primary mb-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-medium">View Reports</h3>
                <p className="text-sm text-muted-foreground">Sales & inventory reports</p>
              </button>
            )}

            {/* User Management - Admin only */}
            {(hasPermission('user_management') || user?.role === 'admin') && (
              <button
                onClick={() => navigate('/admin/users')}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="text-primary mb-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-medium">Manage Users</h3>
                <p className="text-sm text-muted-foreground">User administration</p>
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
