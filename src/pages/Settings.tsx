import React from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Settings: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  const { user } = useAuthStore();

  const themes = [
    { value: 'light', label: 'Light', description: 'Light theme' },
    { value: 'dark', label: 'Dark', description: 'Dark theme' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your application preferences and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <Card title="Appearance" description="Customize the look and feel of the application">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Theme</label>
              <div className="mt-2 space-y-2">
                {themes.map((themeOption) => (
                  <label key={themeOption.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={themeOption.value}
                      checked={theme === themeOption.value}
                      onChange={() => setTheme(themeOption.value as any)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {themeOption.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {themeOption.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Settings */}
        <Card title="Profile" description="Your account information">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="mt-1 text-sm text-muted-foreground">
                {user?.full_name}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="mt-1 text-sm text-muted-foreground">
                {user?.email}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <div className="mt-1 text-sm text-muted-foreground capitalize">
                {user?.role}
              </div>
            </div>

            <div className="pt-4">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </div>
        </Card>

        {/* System Information */}
        <Card title="System Information" description="Application and system details">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Application Version</label>
              <div className="mt-1 text-sm text-muted-foreground">
                v1.0.0
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Database Status</label>
              <div className="mt-1 flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Last Sync</label>
              <div className="mt-1 text-sm text-muted-foreground">
                Never (Offline Mode)
              </div>
            </div>
          </div>
        </Card>

        {/* Permissions */}
        <Card title="Permissions" description="Your current access permissions">
          <div className="space-y-2">
            {user?.permissions?.map((permission) => (
              <div key={permission} className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-foreground capitalize">
                  {permission.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
