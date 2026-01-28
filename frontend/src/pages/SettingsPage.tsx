import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building2, Bell, Shield, Key, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SessionsModal } from '@/components/forms/SessionsModal';
import { ChangePasswordModal } from '@/components/forms/ChangePasswordModal';
import { toast } from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    leaveApprovals: true,
    attendanceAlerts: true,
  });

  const canManageOrg = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'MANAGER';

  return (
    <DashboardLayout
      title="Settings"
      breadcrumbs={[
        {
          label: 'Dashboard',
          href: user?.role === 'SUPER_ADMIN' ? '/dashboard/system' :
            user?.role === 'ADMIN' ? '/dashboard/organization' :
              user?.role === 'HR' ? '/dashboard/hr' :
                user?.role === 'MANAGER' ? '/dashboard/team' :
                  '/dashboard/personal'
        },
        { label: 'Settings' },
      ]}
    >
      <div className="max-w-4xl space-y-6">
        {/* Organization Settings */}
        {canManageOrg && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="text-primary" size={24} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Organization Settings
              </h3>
            </div>
            <p className="text-gray-600 dark:text-muted mb-4">
              Manage your organization profile and settings.
            </p>
            <div className="space-y-3">
              <OrganizationProfileSection userRole={user?.role} />

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Working Hours</p>
                  <p className="text-sm text-gray-600 dark:text-muted">Set default working hours</p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Leave Policies</p>
                  <p className="text-sm text-gray-600 dark:text-muted">Manage leave types and policies</p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-primary" size={24} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
          </div>
          <p className="text-gray-600 dark:text-muted mb-4">
            Configure notification preferences.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Receive notifications via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) =>
                    setNotifications({ ...notifications, email: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Receive browser push notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) =>
                    setNotifications({ ...notifications, push: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Leave Approval Alerts</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Get notified when leave requests need approval
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.leaveApprovals}
                  onChange={(e) =>
                    setNotifications({ ...notifications, leaveApprovals: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Attendance Alerts</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Get notified about attendance anomalies
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.attendanceAlerts}
                  onChange={(e) =>
                    setNotifications({ ...notifications, attendanceAlerts: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            {theme === 'dark' ? (
              <Moon className="text-primary" size={24} />
            ) : (
              <Sun className="text-primary" size={24} />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
          </div>
          <p className="text-gray-600 dark:text-muted mb-4">Customize the appearance of the application.</p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-sm text-gray-600 dark:text-muted">
                Switch between light and dark mode
              </p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2" size={16} />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="mr-2" size={16} />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-primary" size={24} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
          </div>
          <p className="text-gray-600 dark:text-muted mb-4">
            Manage security settings and access controls.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Update your account password
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsChangePasswordModalOpen(true)}>
                <Key className="mr-2" size={16} />
                Change
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  Add an extra layer of security
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Active Sessions</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  View and manage active sessions
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/activity')}>
                View
              </Button>
            </div>
          </div>
        </Card>

        <SessionsModal
          isOpen={isSessionsModalOpen}
          onClose={() => setIsSessionsModalOpen(false)}
        />
        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={() => setIsChangePasswordModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

const OrganizationProfileSection: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => adminService.getTenantProfile(),
    enabled: userRole === 'ADMIN' || userRole === 'HR' || userRole === 'MANAGER',
  });

  const updateMutation = useMutation({
    mutationFn: adminService.updateTenantProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setIsEditing(false);
      toast.success('Organization details updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update organization details');
    }
  });

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }
    updateMutation.mutate(formData);
  };

  const startEditing = () => {
    setFormData({
      name: profile?.name || '',
      address: profile?.address || ''
    });
    setIsEditing(true);
  };

  const isTenantAdmin = userRole === 'ADMIN';

  if (isLoading) return <div className="p-3">Loading...</div>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Profile Details</h4>
          {isTenantAdmin && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit Profile
            </Button>
          )}
        </div>

        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-white">Organization Name</p>
          <p className="text-sm text-gray-600 dark:text-muted">
            {profile?.name || 'Not set'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-white">Address</p>
          <p className="text-sm text-gray-600 dark:text-muted whitespace-pre-wrap">
            {profile?.address || 'Not set'}
          </p>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgAddress">Address</Label>
              <textarea
                id="orgAddress"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter organization address"
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleUpdate} isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
