import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService, fetchAssetConfiguration } from '@/services/assets.service';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import type { Asset, AssetCategory, AssetStatus } from '@/types';

interface AssetFormData {
  asset_code: string; // Changed from asset_id
  name: string;
  category: AssetCategory;
  description?: string; // NEW FIELD
  status: AssetStatus;
  purchase_date?: string;
  purchase_price?: number; // Changed from purchase_cost
  manufacturer?: string; // NEW FIELD
  serial_number?: string; // NEW FIELD
  warranty_expiry?: string;
  notes?: string;
  configuration: {
    os?: string;
    ram?: string;
    storage?: string;
    processor?: string;
    model?: string;
    display?: string;
    graphics?: string;
    battery?: string;
  };
}

export const AddAssetPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AssetFormData>({
    asset_code: '', // Changed from asset_id
    name: '',
    category: 'Laptop',
    description: '', // NEW
    status: 'AVAILABLE',
    purchase_date: '',
    purchase_price: 0, // Changed from purchase_cost
    manufacturer: '', // NEW
    serial_number: '', // NEW
    warranty_expiry: '',
    notes: '',
    configuration: {},
  });

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset data if editing
  const { data: asset, isLoading: isLoadingAsset } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsService.getAsset(id!),
    enabled: !!isEdit && !!id,
  });

  // Populate form when asset data is loaded
  useEffect(() => {
    if (asset && isEdit) {
      type AssetWithFields = Asset & {
        operating_system?: string;
        processor_cpu?: string;
        ram?: string;
        storage?: string;
        graphics_gpu?: string;
        display?: string;
        battery?: string;
        model_number?: string;
      };
      const a = asset as AssetWithFields;

      setFormData({
        asset_code: a.asset_code, // Changed
        name: a.name,
        category: a.category,
        description: a.description || '', // NEW
        status: a.status,
        purchase_date: a.purchase_date || '',
        purchase_price: a.purchase_price ? Number(a.purchase_price) : 0,
        manufacturer: a.manufacturer || '', // NEW
        serial_number: a.serial_number || '', // NEW
        warranty_expiry: a.warranty_expiry || '',
        notes: a.notes || '',
        configuration: a.configuration || {
          os: a.operating_system,
          processor: a.processor_cpu,
          ram: a.ram,
          storage: a.storage,
          graphics: a.graphics_gpu,
          display: a.display,
          battery: a.battery,
          model: a.model_number,
        },
      });
    }
  }, [asset, isEdit]);

  // Handle category change and fetch configuration
  const handleCategoryChange = async (category: AssetCategory) => {
    setFormData((prev) => ({ ...prev, category }));

    if (['Laptop', 'Desktop', 'Mobile'].includes(category)) {
      setIsLoadingConfig(true);
      try {
        const config = await fetchAssetConfiguration(category);
        setFormData((prev) => ({
          ...prev,
          configuration: { ...prev.configuration, ...config },
        }));
      } catch (error) {
        console.error('Failed to fetch configuration:', error);
        // Keep existing configuration or show error
      } finally {
        setIsLoadingConfig(false);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'barcode'>) =>
      assetsService.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast('Asset created successfully', { icon: '✅' });
      navigate('/assets');
    },
    onError: (err: Error) => {
      setError(err.message);
      toast(err.message, { icon: '⚠️' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) =>
      assetsService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast('Asset updated successfully', { icon: '✅' });
      navigate('/assets');
    },
    onError: (err: Error) => {
      setError(err.message);
      toast(err.message, { icon: '⚠️' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client-side validation to surface missing required fields
    if (!formData.asset_code || !formData.asset_code.trim() || !formData.name || !formData.name.trim()) {
      setError('Please provide both Asset Code and Asset Name.');
      toast('Please provide both Asset Code and Asset Name.', { icon: '⚠️' });
      return;
    }

    const submitData = {
      ...formData,
      asset_code: formData.asset_code?.trim(),
      name: formData.name?.trim(),
      purchase_date: formData.purchase_date ? formData.purchase_date : undefined,
      warranty_expiry: formData.warranty_expiry ? formData.warranty_expiry : undefined,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : undefined,
      configuration:
        Object.keys(formData.configuration).length > 0 ? formData.configuration : undefined,
    };

    if (isEdit && id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleInputChange = (
    field: keyof AssetFormData,
    value: string | number | AssetFormData['configuration']
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value as unknown as AssetFormData[typeof field] }));
  };

  const handleConfigChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, [field]: value },
    }));
  };

  const canManage = user?.role === 'ADMIN';

  if (!canManage) {
    return (
      <DashboardLayout title="Access Denied">
        <Card>
          <p className="text-center text-gray-500">You don't have permission to manage assets.</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (isEdit && isLoadingAsset) {
    return (
      <DashboardLayout title="Loading...">
        <Card>
          <div className="flex justify-center p-8">
            <Skeleton variant="circular" width={24} height={24} />
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={isEdit ? 'Edit Asset' : 'Add New Asset'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: 'Assets', href: '/assets' },
        { label: isEdit ? 'Edit' : 'Add' },
      ]}
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset Code *
                </label>
                <input
                  type="text"
                  value={formData.asset_code}
                  onChange={(e) => handleInputChange('asset_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Brief description of the asset"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Printer">Printer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as AssetStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select Status</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="REQUESTED">REQUESTED</option>
                  <option value="UNDER_REPAIR">UNDER_REPAIR</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Price
                </label>
                <input
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    handleInputChange('purchase_price', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="e.g., Dell, HP, Apple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => handleInputChange('serial_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Device serial number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => handleInputChange('warranty_expiry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              {/* Configuration Section - MOVED INSIDE GRID */}
              <div className="col-span-1 md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Technical Configuration
                  {isLoadingConfig && <Skeleton variant="circular" width={16} height={16} />}
                </h3>

                {['Laptop', 'Desktop', 'Mobile'].includes(formData.category) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Operating System
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.os || ''}
                        onChange={(e) => handleConfigChange('os', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., Windows 11"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Processor (CPU)
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.processor || ''}
                        onChange={(e) => handleConfigChange('processor', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., Intel i7"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        RAM
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.ram || ''}
                        onChange={(e) => handleConfigChange('ram', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., 16GB"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Storage
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.storage || ''}
                        onChange={(e) => handleConfigChange('storage', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., 512GB SSD"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Graphics (GPU)
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.graphics || ''}
                        onChange={(e) => handleConfigChange('graphics', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., NVIDIA RTX 3060"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.display || ''}
                        onChange={(e) => handleConfigChange('display', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., 15.6 inch 4K"
                      />
                    </div>

                    {formData.category !== 'Desktop' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Battery
                        </label>
                        <input
                          type="text"
                          value={formData.configuration.battery || ''}
                          onChange={(e) => handleConfigChange('battery', e.target.value)}
                          className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="e.g., 86Wh"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Model Number
                      </label>
                      <input
                        type="text"
                        value={formData.configuration.model || ''}
                        onChange={(e) => handleConfigChange('model', e.target.value)}
                        className="w-full px-3 py-2 border border-white dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="e.g., Dell XPS 15"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                    Configuration fields available for Laptop, Desktop, Mobile.
                  </p>
                )}
              </div>

              {/* Notes - MOVED INSIDE GRID */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Additional notes about the asset..."
                />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/assets')}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="animate-spin" size={18} />
                )}
                <Save size={18} />
                {isEdit ? 'Update Asset' : 'Create Asset'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};
