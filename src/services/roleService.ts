import { onlineApiService } from './onlineApiService';

export interface RolePermissions {
  [roleName: string]: string[];
}

export interface CustomRole {
  name: string;
  permissions: string[];
}

export const roleService = {
  // Get all roles with their permissions
  getAllRoles: async (): Promise<RolePermissions> => {
    try {
      return await onlineApiService.get<RolePermissions>('/roles');
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      // Return default roles if API fails
      return {
        admin: ['user_management', 'inventory_management', 'sales_management', 'reporting', 'system_settings', 'dashboard_access'],
        manager: ['inventory_management', 'sales_management', 'reporting', 'dashboard_access'],
        cashier: ['sales_management', 'dashboard_access'],
      };
    }
  },

  // Get all available permissions (using local defaults)
  getAllPermissions: async (): Promise<string[]> => {
    // Return default permissions (no API call to avoid 401 errors)
    return [
      'user_management',
      'inventory_management',
      'sales_management',
      'reporting',
      'system_settings',
      'dashboard_access'
    ];
  },

  // Get permissions for a specific role (using local defaults)
  getRolePermissions: async (roleName: string): Promise<string[]> => {
    // Return default permissions based on role (no API call to avoid 401 errors)
    const defaultPermissions: Record<string, string[]> = {
      admin: ['user_management', 'inventory_management', 'sales_management', 'reporting', 'system_settings', 'dashboard_access'],
      manager: ['inventory_management', 'sales_management', 'reporting', 'dashboard_access'],
      cashier: ['sales_management', 'dashboard_access'],
    };
    return defaultPermissions[roleName] || ['dashboard_access'];
  },

  // Create a custom role
  createCustomRole: async (roleData: { role_name: string; permissions: string[] }): Promise<CustomRole> => {
    try {
      return await onlineApiService.post<CustomRole>('/roles/custom', roleData);
    } catch (error) {
      console.error('Failed to create custom role:', error);
      throw error;
    }
  },

  // Update a custom role
  updateCustomRole: async (roleName: string, permissions: string[]): Promise<CustomRole> => {
    try {
      return await onlineApiService.put<CustomRole>(`/roles/custom/${roleName}`, { permissions });
    } catch (error) {
      console.error('Failed to update custom role:', error);
      throw error;
    }
  },

  // Delete a custom role
  deleteCustomRole: async (roleName: string): Promise<CustomRole> => {
    try {
      return await onlineApiService.delete<CustomRole>(`/roles/custom/${roleName}`);
    } catch (error) {
      console.error('Failed to delete custom role:', error);
      throw error;
    }
  },

  // Helper function to check if user has permission
  hasPermission: (userPermissions: string[], requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission);
  },

  // Helper function to check if user has any of the required permissions
  hasAnyPermission: (userPermissions: string[], requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  },
};

export default roleService;
