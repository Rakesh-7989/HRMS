import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Building2, Bell, Shield, Key, Moon, Sun,
  RefreshCw, Upload, Clock,
  FileText, ExternalLink, CreditCard, Trash2
} from 'lucide-react';
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
import { subscriptionService } from '@/services/subscription.service';
import { TwoFactorModal } from '@/components/forms/TwoFactorModal';

import { SuccessModal } from '@/components/ui/SuccessModal';

import { resolveImageUrl } from '@/utils/image';
import { showToast } from '@/utils/toast';
import defaultLogo from '../../Assests/logo.png';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, setUser } = useAuth();
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    leaveApprovals: true,
    attendanceAlerts: true,
  });

  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const isTenantAdmin = user?.role === 'ADMIN';

  const { data: subscription, isLoading: isSubLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
    enabled: isTenantAdmin,
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
              <OrganizationProfileSection userRole={user?.role} setSuccessConfig={setSuccessConfig} />

              <WorkingHoursSection userRole={user?.role} setSuccessConfig={setSuccessConfig} />

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Leave Policies</p>
                    <p className="text-xs text-gray-600 dark:text-muted">Manage leave types and accrual rules</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/leave/settings')}>
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Management */}
        {isTenantAdmin && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="text-primary" size={24} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Subscription Management
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/pricing')}
                className="gap-2"
              >
                Upgrade Plan
                <ExternalLink size={14} />
              </Button>
            </div>

            {isSubLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              </div>
            ) : subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">Current Plan</p>
                    <p className="text-xl font-bold text-primary">{subscription.plan_name}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      }`}>
                      {subscription.status}
                    </span>
                  </div>
                </div>

                {subscription.end_date && (
                  <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-500/5 text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/10">
                    Your subscription will {subscription.status === 'CANCELLED' ? 'expire' : 'renew'} on <b>{new Date(subscription.end_date).toLocaleDateString()}</b>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary hover:bg-primary/5 border border-primary/20"
                    onClick={() => navigate('/billing')}
                  >
                    View Billing History & Invoices
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <p className="text-gray-500 mb-3">No active subscription found</p>
                <Button size="sm" onClick={() => navigate('/pricing')}>Explore Plans</Button>
              </div>
            )}
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
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
            <div className="pt-2">
              <Button
                size="sm"
                className="w-full"
                onClick={() => showToast.success('Notification preferences saved!')}
              >
                Save Notification Preferences
              </Button>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center ${user?.two_factor_enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-white dark:bg-gray-800 text-primary'}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-600 dark:text-muted">
                    {user?.two_factor_enabled ? 'Securely enabled via Authenticator' : 'Add an extra layer of security'}
                  </p>
                </div>
              </div>
              <Button
                variant={user?.two_factor_enabled ? "outline" : "primary"}
                size="sm"
                onClick={() => setIs2FAModalOpen(true)}
              >
                {user?.two_factor_enabled ? 'Manage' : 'Enable'}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Active Sessions</p>
                <p className="text-sm text-gray-600 dark:text-muted">
                  View and manage active sessions across devices
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsSessionsModalOpen(true)}>
                View Sessions
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
        <TwoFactorModal
          isOpen={is2FAModalOpen}
          onClose={() => setIs2FAModalOpen(false)}
          isTwoFactorEnabled={!!user?.two_factor_enabled}
          onStatusChange={(enabled) => {
            if (user) {
              const updatedUser = { ...user, two_factor_enabled: enabled };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          }}
        />

        <SuccessModal
          isOpen={successConfig.isOpen}
          onClose={() => setSuccessConfig({ ...successConfig, isOpen: false })}
          title={successConfig.title}
          message={successConfig.message}
          type={successConfig.type}
        />
      </div>
    </DashboardLayout>
  );
};

const WorkingHoursSection: React.FC<{
  userRole?: string,
  setSuccessConfig: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>>
}> = ({ userRole, setSuccessConfig }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => adminService.getTenantProfile(),
    enabled: userRole === 'ADMIN' || userRole === 'HR' || userRole === 'MANAGER',
  });

  const workingHours = profile?.settings?.workingHours || {
    startTime: '09:00',
    endTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  };

  const [formData, setFormData] = useState(workingHours);

  const updateMutation = useMutation({
    mutationFn: (hours: any) => adminService.updateTenantProfile({
      settings: { workingHours: hours }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setIsModalOpen(false);
      setSuccessConfig({
        isOpen: true,
        title: 'Working Hours Updated',
        message: 'Default organization working hours have been updated.',
        type: 'success'
      });
    }
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const isTenantAdmin = userRole === 'ADMIN';

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-primary">
            <Clock size={20} />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Working Hours</p>
            <p className="text-xs text-gray-600 dark:text-muted">
              {workingHours.startTime} - {workingHours.endTime} ({workingHours.workingDays.length} days/week)
            </p>
          </div>
        </div>
        {isTenantAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/organisation?tab=shifts&subtab=manage')}>
            Configure
          </Button>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Working Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.workingDays.includes(day)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <b>Note:</b> These are global default hours. For custom requirements like Night Shifts or Rotation, please use advanced shift management.
              </p>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); navigate('/organisation?tab=shifts&subtab=manage'); }}
                className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Go to Shift Management <ExternalLink size={10} />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateMutation.mutate(formData)}
                isLoading={updateMutation.isPending}
              >
                Save Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const OrganizationProfileSection: React.FC<{
  userRole?: string,
  setSuccessConfig: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>>
}> = ({ userRole, setSuccessConfig }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    city: '',
    state: '',
    country: ''
  });
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => adminService.getTenantProfile(),
    enabled: userRole === 'ADMIN' || userRole === 'HR' || userRole === 'MANAGER',
  });

  const { user, setUser: setAuthUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const logoMutation = useMutation({
    mutationFn: (file: File) => adminService.uploadTenantLogo(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });

      // Update global auth state with new logo
      if (user && data?.logo_url) {
        const updatedUser = {
          ...user,
          tenant_settings: {
            ...(user.tenant_settings || {}),
            logo_url: data.logo_url
          }
        };
        setAuthUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setSuccessConfig({
        isOpen: true,
        title: 'Logo Updated',
        message: 'Organization logo has been updated successfully',
        type: 'success'
      });
      setUploading(false);
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to upload logo');
      setUploading(false);
    }
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => adminService.deleteTenantLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });

      // Update global auth state
      if (user) {
        const updatedUser = {
          ...user,
          tenant_settings: {
            ...(user.tenant_settings || {}),
            logo_url: undefined
          }
        };
        setAuthUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      showToast.success('Logo removed successfully');
    },
    onError: (err: any) => {
      showToast.error(err.message || 'Failed to remove logo');
    }
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast.error('Logo file size must be less than 2MB');
        return;
      }
      setUploading(true);
      logoMutation.mutate(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: adminService.updateTenantProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setIsEditing(false);
      setSuccessConfig({
        isOpen: true,
        title: 'Organization Updated',
        message: 'Organization details updated successfully',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update organization details',
        type: 'error'
      });
    }
  });

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      showToast.error('Organization name is required');
      return;
    }
    updateMutation.mutate(formData);
  };

  const startEditing = () => {
    setFormData({
      name: profile?.name || '',
      address: profile?.address || '',
      phone: profile?.phone || '',
      city: profile?.city || '',
      state: profile?.state || '',
      country: profile?.country || ''
    });
    setIsEditing(true);
  };

  const isTenantAdmin = userRole === 'ADMIN';

  if (isLoading) return <div className="p-3">Loading...</div>;

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-sm">
              <img
                src={profile?.settings?.logo_url ? resolveImageUrl(profile.settings.logo_url) : defaultLogo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {isTenantAdmin && (
              <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Update Logo"
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {uploading ? <RefreshCw size={20} className="animate-spin" /> : <Upload size={20} />}
                </button>
                {profile?.settings?.logo_url && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove the logo?')) {
                        deleteLogoMutation.mutate();
                      }
                    }}
                    disabled={deleteLogoMutation.isPending}
                    title="Remove Logo"
                    className="p-2 hover:bg-red-500/40 rounded-lg transition-colors disabled:cursor-not-allowed text-red-200"
                  >
                    {deleteLogoMutation.isPending ? <RefreshCw size={20} className="animate-spin" /> : <Trash2 size={20} />}
                  </button>
                )}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleLogoUpload}
          />
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Org Logo</p>
        </div>

        {/* Details Section */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Profile Details</h4>
            {isTenantAdmin && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                Edit Profile
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">Organization Name</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {profile?.name || 'Not set'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">Phone Number</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {profile?.phone || 'Not set'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 md:col-span-2 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">Address</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {profile?.address || 'Not set'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">City</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {profile?.city || 'Not set'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">State / Region</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {profile?.state || 'Not set'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white text-[10px] uppercase text-muted mb-1">Country</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {profile?.country || 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Organization Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="orgPhone">Phone Number</Label>
                <Input
                  id="orgPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="orgAddress">Address</Label>
                <textarea
                  id="orgAddress"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter organization address"
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgCity">City</Label>
                <Input
                  id="orgCity"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgState">State / Region</Label>
                <Input
                  id="orgState"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="orgCountry">Country</Label>
                <Input
                  id="orgCountry"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleUpdate} isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
