import { secureInvoke } from '../utils/apiInterceptor';
import { roleService } from './roleService';
import { onlineFirstService } from './onlineFirstService';
import { User, Role, Permission } from '../types';

console.log('📦 UserService module loading...');
console.log('📦 onlineFirstService imported:', !!onlineFirstService);

export const userService = {
  // Get all users - online first with local fallback
  getUsers: async (): Promise<User[]> => {
    try {
      // Try API first
      const response = await onlineFirstService.users.getAll();
      return response as User[];
    } catch (error) {
      try {
        return await secureInvoke('get_users');
      } catch (localError) {
        return [];
      }
    }
  },

  // Create a new user
  createUser: async (userData: {
    email: string;
    full_name: string;
    role: string;
    password: string;
    is_active?: boolean;
  }): Promise<User> => {
    try {
      // Try API first
      const response = await onlineFirstService.users.create({
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        password: userData.password,
        is_active: userData.is_active ?? true,
      });
      return response as User;
    } catch (error) {
      console.warn('Failed to create user via API, trying local:', error);
      // Fallback to local
      const userId = await secureInvoke('create_user', {
        email: userData.email,
        fullName: userData.full_name,
        role: userData.role,
        password: userData.password,
      });
      return {
        id: userId as number,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active ?? true,
        is_superuser: false,
        password_hash: '',
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  },

  // Update an existing user
  updateUser: async (
    userId: number,
    userData: {
      email: string;
      fullName: string;
      role: string;
    }
  ): Promise<void> => {
    return await secureInvoke('update_user', {
      userId,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
    });
  },

  // Delete a user
  deleteUser: async (userId: number): Promise<void> => {
    return await secureInvoke('delete_user', { userId });
  },

  // Get all roles - use role service
  getRoles: async (): Promise<Role[]> => {
    try {
      const rolesData = await roleService.getAllRoles();
      // Convert to Role[] format expected by UI
      return Object.keys(rolesData).map((name, index) => ({
        id: index + 1,
        name,
        description: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to get roles from API, using local fallback:', error);
      // Fallback to local
      try {
        return await secureInvoke('get_roles');
      } catch (localError) {
        console.warn('Local roles also failed, using defaults:', localError);
        return [
          { id: 1, name: 'admin', description: 'Administrator', created_at: new Date().toISOString() },
          { id: 2, name: 'manager', description: 'Manager', created_at: new Date().toISOString() },
          { id: 3, name: 'cashier', description: 'Cashier', created_at: new Date().toISOString() }
        ];
      }
    }
  },

  // Get all permissions - use role service
  getPermissions: async (): Promise<Permission[]> => {
    try {
      const permissions = await roleService.getAllPermissions();
      // Convert to Permission[] format expected by UI
      return permissions.map((name, index) => ({
        id: index + 1,
        name,
        description: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to get permissions from API, using local fallback:', error);
      // Fallback to local
      try {
        return await secureInvoke('get_permissions');
      } catch (localError) {
        console.warn('Local permissions also failed, using defaults:', localError);
        return [
          { id: 1, name: 'user_management', description: 'User Management', created_at: new Date().toISOString() },
          { id: 2, name: 'inventory_management', description: 'Inventory Management', created_at: new Date().toISOString() },
          { id: 3, name: 'sales_management', description: 'Sales Management', created_at: new Date().toISOString() },
          { id: 4, name: 'reporting', description: 'Reporting', created_at: new Date().toISOString() },
          { id: 5, name: 'system_settings', description: 'System Settings', created_at: new Date().toISOString() },
          { id: 6, name: 'dashboard_access', description: 'Dashboard Access', created_at: new Date().toISOString() }
        ];
      }
    }
  },
};
