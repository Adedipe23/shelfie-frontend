
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { invoke } from '@tauri-apps/api/core';
import { syncService } from './services/syncService';
import { authService } from './services/authService';

// Layout Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ProductManagement from './pages/inventory/ProductManagement';
import SupplierManagement from './pages/inventory/SupplierManagement';

import POSInterface from './pages/pos/POSInterface';
import Reports from './pages/reports/Reports';
import OrdersManagement from './pages/orders/OrdersManagement';

function App() {
  const { isAuthenticated, isLoading, checkTokenExpiry } = useAuthStore();

  // Initialize database, auth, and sync service on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await invoke('init_database');

        // Initialize authentication state
        await authService.initializeAuth();

        // Check token expiry on app startup
        checkTokenExpiry();

        // Initialize sync service for offline functionality
        syncService.initialize();
      } catch (error) {
        // Silent error handling for production
      }
    };

    initializeApp();

    // Cleanup sync service on unmount
    return () => {
      syncService.destroy();
    };
  }, []); // Empty dependency array - only run once on mount

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }



  return (
    <Router>
      <div className="App min-h-screen bg-white">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* POS Routes */}
          <Route
            path="/cashier/pos"
            element={
              <ProtectedRoute permission="sales_management">
                <Layout>
                  <POSInterface />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Routes */}
          <Route
            path="/inventory/products"
            element={
              <ProtectedRoute permission="inventory_management">
                <Layout>
                  <ProductManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory/suppliers"
            element={
              <ProtectedRoute permission="inventory_management">
                <Layout>
                  <SupplierManagement />
                </Layout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/inventory/*"
            element={
              <ProtectedRoute permission="inventory_management">
                <Layout>
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">More inventory features coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Reports Routes */}
          <Route
            path="/reports/*"
            element={
              <ProtectedRoute permission="reporting">
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Orders Routes */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute permission="user_management">
                <Layout>
                  <OrdersManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute permission="user_management">
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute permission="user_management">
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
