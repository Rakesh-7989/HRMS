import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { LineChart } from '@/components/charts/LineChart';
import { Building2, Activity, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { SkeletonChart } from '@/components/ui/Skeleton';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: () => dashboardService.getSystemDashboard(),
  });

  const metrics = data?.metrics || {
    active_tenants: 0,
    total_tenants: 0,
    total_users: 0,
    total_employees: 0,
    active_tenants_24h: 0,
    active_users_24h: 0,
  };
  const systemHealth = data?.systemHealth || {
    active_orgs: 0,
    active_users: 0,
    pending_pwd_change: 0,
    inactive_users: 0,
  };

  return (
    <DashboardLayout
      title="System Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/system' },
        { label: 'System' },
      ]}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tenants"
            value={metrics.total_tenants || 0}
            change={12}
            icon={Building2}
            iconColor="text-accent-blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Users"
            value={metrics.total_users || 0}
            change={8.5}
            icon={Users}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="Active Sessions (24h)"
            value={metrics.active_users_24h || 0}
            icon={Activity}
            iconColor="text-accent-purple"
            isLoading={isLoading}
          />
          <StatCard
            title="System Health"
            value="99.9%"
            change={0.1}
            icon={TrendingUp}
            iconColor="text-primary"
            isLoading={isLoading}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            <Button size="md" onClick={() => navigate('/tenants')} className="w-full md:w-auto">
              <Building2 size={18} />
              Manage Tenants
            </Button>
            <Button size="md" variant="outline" onClick={() => navigate('/activity')} className="w-full md:w-auto">
              <Activity size={18} />
              Audit Activity
            </Button>
            <Button size="md" variant="ghost" onClick={() => navigate('/settings')} className="w-full md:w-auto">
              <TrendingUp size={18} />
              System Settings
            </Button>
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tenant Growth (30 Days)</h3>
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <LineChart
                data={data?.tenantGrowth?.map((tg) => ({
                  date: format(new Date(tg.date), 'MMM dd'),
                  Tenants: tg.new_tenants,
                })) || []}
                dataKeys={['Tenants']}
                xKey="date"
                height={300}
              />
            )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">User Growth (30 Days)</h3>
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <LineChart
                data={data?.userGrowth?.map((ug) => ({
                  date: format(new Date(ug.date), 'MMM dd'),
                  Users: ug.new_users,
                })) || []}
                dataKeys={['Users']}
                xKey="date"
                height={300}
              />
            )}
            </Card>
          </motion.div>
        </div>

        {/* System Health & Top Tenants */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Health Metrics</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                  <span className="text-sm text-muted">Active Organizations</span>
                  <span className="font-bold text-lg">{systemHealth.active_orgs || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                  <span className="text-sm text-muted">Active Users</span>
                  <span className="font-bold text-lg">{systemHealth.active_users || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                  <span className="text-sm text-muted">Pending Password Changes</span>
                  <span className="font-bold text-lg">{systemHealth.pending_pwd_change || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                  <span className="text-sm text-muted">Inactive Users</span>
                  <span className="font-bold text-lg">{systemHealth.inactive_users || 0}</span>
                </div>
              </div>
            )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Top Active Tenants</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.topActiveTenants?.slice(0, 5).map((tenant, idx) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center font-bold text-white shadow-glow"
                    >
                      {idx + 1}
                    </motion.div>
                      <div>
                        <p className="font-semibold">{tenant.name}</p>
                        <p className="text-xs text-muted">{tenant.user_count} users</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{tenant.session_count} sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

