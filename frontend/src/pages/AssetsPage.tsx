import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/AuthContext';
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
  X,
  Loader2,
  AlertCircle,
  ClipboardList,
  Clock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { Asset, AssetStatus, AssetCategory } from '@/types';

export const AssetsPage: React.FC = () => {
  const { user } = useAuth();
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
  const [assignSubmitting, setAssignSubmitting] = useState(false);

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

  // Fetch employees for the assign modal
  // Backend returns employee_uuid (actual employee table ID) which we need for asset assignment
  const { data: employees = [] } = useQuery<Array<import('@/services/users.service').User & { employee_uuid?: string }>>({
    queryKey: ['users', 'employees'],
    queryFn: () => usersService.getUsers({ is_active: true }),
    enabled: showAssignModal && ['ADMIN', 'HR'].includes(user?.role || ''),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      assetsService.assignAsset(id, employeeId),
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

  const canManage = ['ADMIN', 'HR'].includes(user?.role || '');
  const canViewDetails = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(user?.role || '');
  const canRequestAsset = ['HR', 'MANAGER', 'EMPLOYEE'].includes(user?.role || '');
  const canViewBarcode = ['ADMIN', 'HR'].includes(user?.role || '');

  const handleAssign = (assetId: string) => {
    setAssignForm({ assetId, employeeId: '' });
    setShowAssignModal(true);
  };

  const handleUnassign = (assetId: string) => {
    navigate(`/assets/${assetId}/return`);
  };

  const handleRequest = (assetId: string) => {
    // TODO: Implement asset request backend endpoint
    toast.success(`Asset request for ${assetId} has been noted. Please contact your administrator.`);
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
      { id: assignForm.assetId, employeeId: assignForm.employeeId },
      {
        onSuccess: () => {
          toast.success('Asset assigned successfully!');
          setAssignForm({ assetId: '', employeeId: '' });
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

  // Get available assets for assignment
  const availableAssets = assets.filter((asset) => asset.status === 'AVAILABLE');

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-green-600 bg-green-100';
      case 'ASSIGNED':
        return 'text-blue-600 bg-blue-100';
      case 'UNDER_REPAIR':
        return 'text-orange-600 bg-orange-100';
      case 'RETIRED':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <DashboardLayout
      title={canManage ? 'Asset Management' : 'My Assets'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: canManage ? 'Assets' : 'My Assets' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'All')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            >
              <option value="All">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_REPAIR">Under Repair</option>
              <option value="RETIRED">Retired</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AssetCategory | 'All')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            >
              <option value="All">All Categories</option>
              <option value="Laptop">Laptop</option>
              <option value="Desktop">Desktop</option>
              <option value="Mobile">Mobile</option>
              <option value="Monitor">Monitor</option>
              <option value="Printer">Printer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {canRequestAsset && (
              <Button
                onClick={() => setShowRequestModal(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText size={18} />
                Request Asset
              </Button>
            )}
            {canManage && (
              <Button
                onClick={() => setShowAssignModal(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <UserPlus size={18} />
                Assign Asset
              </Button>
            )}
            {canManage || user?.role === 'HR' ? (
              <Button
                onClick={() => navigate('/assets/requests')}
                variant="outline"
                className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
              >
                <ClipboardList size={18} />
                Manage Requests
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/assets/requests')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Clock size={18} />
                My Requests
              </Button>
            )}
            {user?.role === 'ADMIN' && (
              <Button onClick={() => navigate('/assets/new')} className="flex items-center gap-2">
                <Plus size={18} />
                Add Asset
              </Button>
            )}
          </div>
        </div>

        {/* Assets Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Asset
                  </th>
                  {canViewBarcode && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Barcode
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
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
                      {canManage ? 'No assets found' : 'No assets assigned to you'}
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
                        <td className="px-4 py-4 whitespace-nowrap">
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        {asset.assigned_by_employee ? (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {asset.assigned_by_employee.first_name} {asset.assigned_by_employee.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {asset.assigned_date ? format(new Date(asset.assigned_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(asset.updated_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
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

                          {canManage ? (
                            <>
                              {user?.role === 'ADMIN' && (
                                <button
                                  onClick={() => navigate(`/assets/${asset.id}/edit`)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit Asset"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {asset.status === 'AVAILABLE' ? (
                                <button
                                  onClick={() => handleAssign(asset.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Assign Asset"
                                >
                                  <UserCheck size={16} />
                                </button>
                              ) : asset.status === 'ASSIGNED' ? (
                                <button
                                  onClick={() => handleUnassign(asset.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Unassign Asset"
                                >
                                  <UserX size={16} />
                                </button>
                              ) : null}
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
        </Card>
      </div>

      {/* Request Asset Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-purple-500/10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={22} className="text-primary" />
                Request New Asset
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRequestAssetSubmit} className="p-6 space-y-5">
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRequestModal(false)}
                  disabled={requestSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={requestSubmitting}
                  isLoading={requestSubmitting}
                  className="flex items-center gap-2"
                >
                  <FileText size={18} />
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 to-primary/10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={22} className="text-blue-500" />
                Assign Asset to Employee
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAssignAssetSubmit} className="p-6 space-y-5">
              {/* Select Asset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Asset *
                </label>
                <select
                  required
                  value={assignForm.assetId}
                  onChange={(e) => setAssignForm({ ...assignForm, assetId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">-- Select an available asset --</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_code}) - {asset.category}
                    </option>
                  ))}
                </select>
                {availableAssets.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    No available assets to assign. All assets are currently assigned or unavailable.
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
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">-- Select an employee --</option>
                  {employees
                    .filter((employee) => {
                      // Always exclude ADMIN from assignment
                      if (employee.role === 'ADMIN') return false;

                      // If logged-in user is HR, exclude HR role (only show MANAGER and EMPLOYEE)
                      if (user?.role === 'HR' && employee.role === 'HR') return false;

                      // Show all other employees
                      return true;
                    })
                    .map((employee) => (
                      <option key={employee.id} value={employee.employee_uuid || employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAssignModal(false)}
                  disabled={assignSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={assignSubmitting || availableAssets.length === 0}
                  isLoading={assignSubmitting}
                  className="flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  Assign Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
