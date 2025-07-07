import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { authService } from '../services/authService';
import { roleService } from '../services/roleService';
import tauriApi from '../services/tauri';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { isAuthenticated, login, setLoading, setError, clearError } = useAuthStore();
  const { isLoading, error } = useAppStore();

  // Database is initialized in App.tsx, no need to initialize here

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Login form submitted with:', { email: email.trim(), password: '***' });

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setLoading(true);
    clearError();

    try {
      const response = await authService.login(email.trim(), password);

      // Convert User to UserInfo for the store with permissions
      const permissions = await roleService.getRolePermissions(response.user.role);
      const userInfo = {
        id: response.user.id,
        email: response.user.email,
        full_name: response.user.full_name,
        role: response.user.role,
        permissions: permissions,
      };

      login(response.token, userInfo);
      console.log('Login successful, redirecting...');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = tauriApi.handleTauriError(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ISMS</h1>
          <p className="text-muted-foreground mt-2">Integrated Supermarket Management System</p>
        </div>

        <Card title="Sign In" description="Enter your credentials to access the system">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              required
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              required
            />

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
