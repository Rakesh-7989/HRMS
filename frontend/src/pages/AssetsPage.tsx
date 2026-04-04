import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
  Search,
  Eye,
  Edit,
  UserCheck,
  UserPlus,
  UserX,
  Download,
  Printer,
  Loader2,
  AlertCircle,
  ClipboardList,
  FileText,
  RefreshCw,
  Trash2,
  BarChart3,
  Package,
  Wrench,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { Asset, AssetStatus, AssetCategory } from '@/types';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';

export const AssetsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'All'>('All');
  const navigate = useNavigate();

  // Request Asset Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    assetName: '',
    category: 'Laptop' as AssetCategory,
    reason: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
  });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Assign Asset Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assetId: '',
    employeeId: '',
  });
  const [assignAccessories, setAssignAccessories] = useState<string[]>([]);
  const [newAccessoryName, setNewAccessoryName] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Swap Asset Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapOldAssetId, setSwapOldAssetId] = useState('');
  const [swapNewAssetId, setSwapNewAssetId] = useState('');
  const [swapAccessories, setSwapAccessories] = useState<string[]>([]);
  const [swapNewAccessoryName, setSwapNewAccessoryName] = useState('');
  const [swapSubmitting, setSwapSubmitting] = useState(false);

  // Fetch assets from backend
  const { data: assets = [], isLoading, isError } = useQuery<Asset[]>({
    queryKey: ['assets', user?.role, user?.id],
    queryFn: () => {
      // Backend handles role-based filtering via JWT token
      return assetsService.getAssets();
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Fetch dashboard stats (those with view_dashboard or manage permission)
  const { data: dashboard } = useQuery({
    queryKey: ['asset-dashboard'],
    queryFn: () => assetsService.getDashboard(),
    enabled: hasPermission('assets', 'view_dashboard') || hasPermission('assets', 'manage'),
    staleTime: 60000,
  });

  const [exportingCSV, setExportingCSV] = useState(false);
  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      await assetsService.exportCSV();
      toast.success('Assets exported successfully!');
    } catch {
      toast.error('Failed to export assets.');
    } finally {
      setExportingCSV(false);
    }
  };

  // Fetch employees for the assign modal
  // Backend returns employee_uuid (actual employee table ID) which we need for asset assignment
  const { data: usersResponse } = useQuery({
    queryKey: ['users', 'employees'],
    queryFn: () => usersService.getUsers({ is_active: true }),
    enabled: showAssignModal && hasPermission('assets', 'assign'),
  });
  const employees = usersResponse?.data || [];

  const assignMutation = useMutation({
    mutationFn: ({ id, employeeId, accessories }: { id: string; employeeId: string; accessories?: string[] }) =>
      assetsService.assignAsset(id, employeeId, accessories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const swapMutation = useMutation({
    mutationFn: ({ oldAssetId, newAssetId, newAccessories }: { oldAssetId: string; newAssetId: string; newAccessories?: string[] }) =>
      assetsService.swapAsset(oldAssetId, {
        new_asset_id: newAssetId,
        return_condition: 'GOOD',
        new_accessories: newAccessories,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });



  // Filter assets based on search and filters
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = `${asset.name} ${asset.asset_code} ${asset.barcode || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || asset.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const canManage = hasPermission('assets', 'manage');
  const canManageRequests = hasPermission('assets', 'manage_requests') || canManage;
  const canCreate = hasPermission('assets', 'create') || canManage;
  const canUpdate = hasPermission('assets', 'update') || canManage;
  const canDelete = hasPermission('assets', 'delete') || canManage;
  const canViewDetails = hasPermission('assets', 'view') || canManage;
  const canRequestAsset = hasPermission('assets', 'request');
  const canViewBarcode = hasPermission('assets', 'view_barcode') || canManage;
  const canExportAssets = hasPermission('assets', 'export') || canManage;
  const canAssign = hasPermission('assets', 'assign') || canManage;

  const isAnyAdmin = canCreate || canUpdate || canDelete || canAssign || canManageRequests;

  const handleAssign = (assetId: string) => {
    setAssignForm({ assetId, employeeId: '' });
    setAssignAccessories([]);
    setNewAccessoryName('');
    setShowAssignModal(true);
  };

  const handleUnassign = (assetId: string) => {
    navigate(`/assets/${assetId}/return`);
  };

  const handleSwap = (assetId: string) => {
    setSwapOldAssetId(assetId);
    setSwapNewAssetId('');
    setSwapAccessories([]);
    setSwapNewAccessoryName('');
    setShowSwapModal(true);
  };

  const handleRequest = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setRequestForm({
        assetName: `Request for ${asset.name} (${asset.asset_code})`,
        category: asset.category,
        reason: '',
        priority: 'Medium',
      });
      setShowRequestModal(true);
    }
  };

  const handlePrintBarcode = async (assetId: string) => {
    try {
      const barcodeData = await assetsService.getBarcode(assetId);
      if (barcodeData) {
        // Open barcode in new window for printing
        const printWindow = window.open('', '_blank', 'width=600,height=400');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Print Barcode</title>
                <style>
                  body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                  img { max-width: 100%; max-height: 80vh; }
                </style>
              </head>
              <body>
                <img src="${barcodeData}" onload="window.print(); setTimeout(function() { window.close(); }, 500);" onerror="alert('Failed to load barcode'); window.close();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        toast.error('Barcode not available for this asset.');
      }
    } catch {
      toast.error('Failed to retrieve barcode.');
    }
  };

  const handleDownloadBarcode = async (assetId: string, assetCode: string) => {
    try {
      const barcodeData = await assetsService.getBarcode(assetId);
      if (barcodeData) {
        const link = document.createElement('a');
        link.href = barcodeData;
        link.download = `barcode-${assetCode}.png`;
        link.click();
      } else {
        toast.error('Barcode not available for this asset.');
      }
    } catch {
      toast.error('Failed to download barcode.');
    }
  };

  const handleRequestAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitting(true);

    try {
      await assetsService.submitRequest({
        asset_name: requestForm.assetName,
        category: requestForm.category,
        priority: requestForm.priority,
        reason: requestForm.reason
      });

      toast.success('Asset request submitted successfully!');

      setRequestForm({
        assetName: '',
        category: 'Laptop',
        reason: '',
        priority: 'Medium',
      });
      setShowRequestModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setRequestSubmitting(false);
    }
  };


  const handleAssignAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.assetId || !assignForm.employeeId) {
      toast.error('Please select both an asset and an employee.');
      return;
    }
    setAssignSubmitting(true);

    assignMutation.mutate(
      { id: assignForm.assetId, employeeId: assignForm.employeeId, accessories: assignAccessories.length > 0 ? assignAccessories : undefined },
      {
        onSuccess: () => {
          toast.success('Asset assigned successfully!');
          setAssignForm({ assetId: '', employeeId: '' });
          setAssignAccessories([]);
          setShowAssignModal(false);
          setAssignSubmitting(false);
        },
        onError: () => {
          toast.error('Failed to assign asset. Please try again.');
          setAssignSubmitting(false);
        },
      }
    );
  };

  const handleAddAccessory = () => {
    const t = newAccessoryName.trim();
    if (t && !assignAccessories.includes(t)) {
      setAssignAccessories((prev) => [...prev, t]);
      setNewAccessoryName('');
    }
  };

  const handleAddSwapAccessory = () => {
    const t = swapNewAccessoryName.trim();
    if (t && !swapAccessories.includes(t)) {
      setSwapAccessories((prev) => [...prev, t]);
      setSwapNewAccessoryName('');
    }
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapOldAssetId || !swapNewAssetId) {
      toast.error('Please select a replacement asset.');
      return;
    }
    setSwapSubmitting(true);

    swapMutation.mutate(
      { oldAssetId: swapOldAssetId, newAssetId: swapNewAssetId, newAccessories: swapAccessories.length > 0 ? swapAccessories : undefined },
      {
        onSuccess: () => {
          toast.success('Asset swapped successfully!');
          setSwapOldAssetId('');
          setSwapNewAssetId('');
          setSwapAccessories([]);
          setShowSwapModal(false);
          setSwapSubmitting(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to swap asset.');
          setSwapSubmitting(false);
        },
      }
    );
  };

  // Get available assets for assignment
  const availableAssets = assets.filter((asset) => asset.status === 'AVAILABLE');

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'ASSIGNED':
        return 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      case 'REQUESTED':
        return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'UNDER_REPAIR':
        return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
      case 'WRITTEN_OFF':
        return 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      case 'RETIRED':
      case 'DISPOSED':
        return 'text-slate-500 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-white/5 dark:border-white/10';
      case 'DOA':
      case 'LOST':
        return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-white/5 dark:border-white/10';
    }
  };

  return (
    <DashboardLayout
      title={canManage ? t('assets.assetManagement') : t('assets.myAssets')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
        { label: canManage ? t('common.breadcrumbs.assets') : t('assets.myAssets') },
      ]}
    >
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Statistics Dashboard */}
        {isAnyAdmin && dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: t('assets.totalAssets'), value: dashboard.summary.total_assets, sub: `₹${Number(dashboard.summary.total_book_value).toLocaleString()} value`, icon: Package, gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
              { label: t('assets.available'), value: dashboard.summary.available_count, icon: UserCheck, gradient: 'linear-gradient(135deg, #10b981, #059669)', status: 'text-emerald-500' },
              { label: t('assets.assigned'), value: dashboard.summary.assigned_count, icon: BarChart3, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', status: 'text-amber-500' },
              { label: t('assets.underRepair'), value: dashboard.summary.under_repair_count, icon: Wrench, gradient: 'linear-gradient(135deg, #ec4899, #db2777)', status: 'text-rose-500' }
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-[1.5rem] p-5 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300">
                  {/* Subtle Pattern */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <circle cx="80" cy="20" r="40" fill="currentColor" className="text-slate-900 dark:text-white" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/10"
                      style={{ background: stat.gradient }}
                    >
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    {idx === 3 && dashboard.warranty_expiring_soon > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                        {dashboard.warranty_expiring_soon} Warn
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    <h3 className={`text-4xl font-black mb-1 tracking-tighter leading-none ${stat.status || 'text-slate-900 dark:text-white'}`}>
                      {stat.value}
                    </h3>
                    <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">{stat.label}</p>
                    {stat.sub && (
                      <p className="text-slate-400/60 dark:text-slate-500/60 text-[9px] mt-2 font-bold uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full w-fit">
                        {stat.sub}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-col xl:flex-row gap-6 xl:items-center xl:justify-between py-2">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="w-full sm:w-80">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={t('assets.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-5 py-3 pl-12 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'All')}
                className="w-full sm:w-44 px-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all shadow-sm cursor-pointer appearance-none"
              >
                <option value="All">{t('assets.allStatus')}</option>
                {['AVAILABLE', 'ASSIGNED', 'UNDER_REPAIR', 'RETIRED', 'DOA', 'LOST', 'WRITTEN_OFF', 'DISPOSED'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as AssetCategory | 'All')}
                className="w-full sm:w-44 px-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all shadow-sm cursor-pointer appearance-none"
              >
                <option value="All">{t('assets.allCategories')}</option>
                {Array.from(new Set(assets.map(a => a.category))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 no-scrollbar">
            {canExportAssets && (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportCSV}
                disabled={exportingCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all whitespace-nowrap min-w-fit"
              >
                <Download size={18} className="text-indigo-500" />
                <span>{exportingCSV ? 'Exporting...' : t('assets.exportCSV')}</span>
              </motion.button>
            )}

            <AnimatePresence>
              {canRequestAsset && (
                <motion.button
                  key="request"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all whitespace-nowrap min-w-fit"
                >
                  <FileText size={18} className="text-amber-500" />
                  <span>{t('assets.request')}</span>
                </motion.button>
              )}

              {canAssign && (
                <motion.button
                  key="assign"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all whitespace-nowrap min-w-fit"
                >
                  <UserPlus size={18} className="text-emerald-500" />
                  <span>{t('assets.assign')}</span>
                </motion.button>
              )}

              <motion.button
                key="requests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/assets/requests')}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-sm font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 shadow-sm transition-all whitespace-nowrap min-w-fit"
              >
                <ClipboardList size={18} />
                <span>{canManage || user?.role === 'HR' ? t('assets.requests') : t('assets.myRequests')}</span>
              </motion.button>

              {canCreate && (
                <motion.button
                  key="add"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -2, shadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/assets/new')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary rounded-2xl text-sm font-bold text-white shadow-lg shadow-primary/20 whitespace-nowrap min-w-fit"
                >
                  <Plus size={18} />
                  <span>Add Asset</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Assets Table Container */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.asset')}</th>
                  {canViewBarcode && <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.barcode')}</th>}
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.category')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.status')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.assignedTo')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.assignedBy')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.assignedDate')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.lastUpdated')}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('assets.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="animate-spin" size={20} />
                        Loading assets...
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-red-500">
                        <AlertCircle size={24} />
                        <span>Failed to load assets. Please try again.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
                        >
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      {canManage ? t('assets.noAssetsFound') : t('assets.noAssetsAssigned')}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {asset.asset_code}
                          </div>
                        </div>
                      </td>
                      {canViewBarcode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handlePrintBarcode(asset.id)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Print Barcode"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                onClick={() => handleDownloadBarcode(asset.id, asset.asset_code)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Download Barcode"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-[10px] font-black rounded-full border ${getStatusColor(asset.status)} uppercase tracking-wider`}
                        >
                          {asset.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asset.assigned_employee ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.assigned_employee.first_name} {asset.assigned_employee.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asset.assigned_by_employee ? (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {asset.assigned_by_employee.first_name} {asset.assigned_by_employee.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {asset.assigned_date ? format(new Date(asset.assigned_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(asset.updated_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {canViewDetails && (
                            <button
                              onClick={() => navigate(`/assets/${asset.id}`)}
                              className="text-primary hover:text-primary-dark"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          )}

                          {(canUpdate || canAssign || canDelete) ? (
                            <>
                              {canUpdate && (
                                <button
                                  onClick={() => navigate(`/assets/${asset.id}/edit`)}
                                  className="text-violet-600 hover:text-violet-800"
                                  title="Edit Asset"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {canAssign && (
                                asset.status === 'AVAILABLE' ? (
                                  <button
                                    onClick={() => handleAssign(asset.id)}
                                    className="text-green-600 hover:text-green-800"
                                    title="Assign Asset"
                                  >
                                    <UserCheck size={16} />
                                  </button>
                                ) : asset.status === 'ASSIGNED' ? (
                                  <>
                                    <button
                                      onClick={() => handleSwap(asset.id)}
                                      className="text-amber-600 hover:text-amber-800"
                                      title="Swap / Upgrade Asset"
                                    >
                                      <RefreshCw size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleUnassign(asset.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Return Asset"
                                    >
                                      <UserX size={16} />
                                    </button>
                                  </>
                                ) : null
                              )}
                            </>
                          ) : (
                            canRequestAsset &&
                            asset.status === 'AVAILABLE' && (
                              <button
                                onClick={() => handleRequest(asset.id)}
                                className="text-purple-600 hover:text-purple-800"
                                title="Request Asset"
                              >
                                <UserCheck size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Asset Modal */}
      <Dialog
        open={showRequestModal}
        onOpenChange={(open) => !open && setShowRequestModal(false)}
        onBack={() => setShowRequestModal(false)}
        title="Request New Asset"
        description="Submit a request for a new asset"
        className="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRequestModal(false)}
                disabled={requestSubmitting}
                className="rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="request-asset-form"
                disabled={requestSubmitting}
                isLoading={requestSubmitting}
                className="rounded-2xl bg-primary text-white font-bold flex items-center gap-2 min-w-[140px]"
              >
                <PlusCircle size={18} />
                Submit Request
              </Button>
            </div>
          }
      >
        <form id="request-asset-form" onSubmit={handleRequestAssetSubmit} className="space-y-5">
          {/* Asset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset Name / Description *
            </label>
            <input
              type="text"
              required
              value={requestForm.assetName}
              onChange={(e) => setRequestForm({ ...requestForm, assetName: e.target.value })}
              placeholder="e.g., MacBook Pro 16-inch, Dell Monitor 27-inch"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              required
              value={requestForm.category}
              onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value as AssetCategory })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="Laptop">Laptop</option>
              <option value="Desktop">Desktop</option>
              <option value="Mobile">Mobile</option>
              <option value="Monitor">Monitor</option>
              <option value="Printer">Printer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority *
            </label>
            <select
              required
              value={requestForm.priority}
              onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="Low">Low - Can wait</option>
              <option value="Medium">Medium - Needed soon</option>
              <option value="High">High - Urgent</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Request *
            </label>
            <textarea
              required
              value={requestForm.reason}
              onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
              placeholder="Please provide a brief explanation of why you need this asset..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none font-medium"
            />
          </div>
        </form>
      </Dialog>

      {/* Assign Asset Modal */}
      <Dialog
        open={showAssignModal}
        onOpenChange={(open) => !open && setShowAssignModal(false)}
        onBack={() => setShowAssignModal(false)}
        title="Assign Asset"
        description="Assign an available asset to an employee"
        className="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                disabled={assignSubmitting}
                className="rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="assign-asset-form"
                disabled={assignSubmitting || availableAssets.length === 0}
                isLoading={assignSubmitting}
                className="rounded-2xl bg-primary text-white font-bold flex items-center gap-2 min-w-[140px]"
              >
                <CheckCircle2 size={18} />
                Assign Asset
              </Button>
            </div>
          }
      >
        <form id="assign-asset-form" onSubmit={handleAssignAssetSubmit} className="p-1 space-y-5">
          {/* Select Asset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Asset *
            </label>
            <select
              required
              value={assignForm.assetId}
              onChange={(e) => setAssignForm({ ...assignForm, assetId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
            >
              <option value="">-- Select an available asset --</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.asset_code}) - {asset.category}
                </option>
              ))}
            </select>
            {availableAssets.length === 0 && (
              <p className="mt-2 text-sm text-fuchsia-600 dark:text-fuchsia-400 font-medium">
                No available assets to assign.
              </p>
            )}
          </div>

          {/* Select Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Employee *
            </label>
            <select
              required
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
            >
              <option value="">-- Select an employee --</option>
              {employees
                .filter((employee) => {
                  if (employee.role === 'ADMIN') return false;
                  if (user?.role === 'HR' && employee.role === 'HR') return false;
                  return true;
                })
                .map((employee) => (
                  <option key={employee.id} value={employee.employee_uuid || employee.id}>
                    {employee.first_name} {employee.last_name} ({employee.email})
                  </option>
                ))}
            </select>
          </div>

          {/* Accessories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accessories Being Given
            </label>
            <div className="space-y-3">
              {assignAccessories.map((acc, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-3 py-2 rounded-xl">{acc}</span>
                  <button type="button" onClick={() => setAssignAccessories(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all duration-200"><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAccessoryName}
                  onChange={(e) => setNewAccessoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAccessory();
                    }
                  }}
                  placeholder="e.g. Charger, Mouse..."
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                />
                <Button
                  type="button"
                  onClick={handleAddAccessory}
                  disabled={!newAccessoryName.trim()}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap px-4 rounded-xl border-primary text-primary font-bold hover:bg-primary/5"
                >
                  + Add
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Swap Asset Modal */}
      <Dialog
        open={showSwapModal}
        onOpenChange={(open) => !open && setShowSwapModal(false)}
        onBack={() => setShowSwapModal(false)}
        title="Swap / Upgrade Asset"
        description="Replace an existing asset with a new one"
        className="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSwapModal(false)}
                disabled={swapSubmitting}
                className="rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="swap-asset-form"
                disabled={swapSubmitting || !swapNewAssetId}
                isLoading={swapSubmitting}
                className="rounded-2xl bg-primary text-white font-bold flex items-center gap-2 min-w-[140px]"
              >
                <RefreshCw size={18} />
                Swap Asset
              </Button>
            </div>
          }
      >
        <form id="swap-asset-form" onSubmit={handleSwapSubmit} className="p-1 space-y-5">
          {/* Old Asset Info */}
          <div className="p-4 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Returning Current Asset</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {assets.find(a => a.id === swapOldAssetId)?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">#{assets.find(a => a.id === swapOldAssetId)?.asset_code}</p>
          </div>

          {/* Select New Asset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Replacement Asset *
            </label>
            <select
              required
              value={swapNewAssetId}
              onChange={(e) => setSwapNewAssetId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
            >
              <option value="">-- Select a replacement --</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.asset_code}) - {asset.category}
                </option>
              ))}
            </select>
          </div>

          {/* Accessories for new asset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accessories for New Asset
            </label>
            <div className="space-y-3">
              {swapAccessories.map((acc, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-3 py-2 rounded-xl">{acc}</span>
                  <button type="button" onClick={() => setSwapAccessories(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all duration-200"><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={swapNewAccessoryName}
                  onChange={(e) => setSwapNewAccessoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSwapAccessory();
                    }
                  }}
                  placeholder="e.g. Charger, Mouse..."
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                />
                <Button
                  type="button"
                  onClick={handleAddSwapAccessory}
                  disabled={!swapNewAccessoryName.trim()}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap px-4 rounded-xl border-primary text-primary font-bold hover:bg-primary/5"
                >
                  + Add
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </DashboardLayout >
  );
};
