import type { Asset, AssetCategory } from '@/types';
import api from './api';

// Generate barcode utility
export const generateBarcode = (): string => {
  return Math.random().toString().slice(2, 14);
};

// Helper to extract user-friendly error messages from backend responses
const extractErrorMessage = (error: any): string => {
  // Check for validation errors with details (Zod errors)
  if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
    const issues = error.response.data.details;
    // Return the first validation error message
    if (issues.length > 0 && issues[0].message) {
      return issues[0].message;
    }
  }

  // Fallback to standard error messages
  return error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'An error occurred';
};

// Fetch configuration for asset types (returns default configurations)
export const fetchAssetConfiguration = async (category: AssetCategory): Promise<Partial<Asset['configuration']>> => {
  const configs: Record<AssetCategory, Partial<Asset['configuration']>> = {
    Laptop: {
      os: 'Windows 11',
      ram: '16GB',
      storage: '512GB SSD',
      processor: 'Intel i7',
      model: 'Dell XPS 13'
    },
    Desktop: {
      os: 'Windows 11',
      ram: '32GB',
      storage: '1TB SSD',
      processor: 'Intel i9',
      model: 'Dell OptiPlex'
    },
    Mobile: {
      os: 'Android 13',
      ram: '8GB',
      storage: '128GB',
      processor: 'Snapdragon 8 Gen 2',
      model: 'Samsung Galaxy S23'
    },
    Monitor: {},
    Printer: {},
    Other: {}
  };

  return configs[category] || {};
};

export const assetsService = {
  // Get all assets
  getAssets: async (): Promise<Asset[]> => {
    const response = await api.get('/assets/list');
    return response.data?.data || [];
  },

  // Get asset by ID
  getAsset: async (id: string): Promise<Asset | null> => {
    const response = await api.get(`/assets/list/${id}`);
    return response.data?.data || null;
  },

  // Create asset
  createAsset: async (data: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'barcode'>): Promise<Asset> => {
    // Flatten configuration object into individual fields
    const payload = {
      asset_code: data.asset_code,
      name: data.name,
      category: data.category,
      description: data.description,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      manufacturer: data.manufacturer,
      serial_number: data.serial_number,
      warranty_expiry: data.warranty_expiry,
      status: data.status,
      notes: data.notes,
      // Configuration fields - flattened
      operating_system: data.configuration?.os,
      processor_cpu: data.configuration?.processor,
      ram: data.configuration?.ram,
      storage: data.configuration?.storage,
      graphics_gpu: data.configuration?.graphics,
      display: data.configuration?.display,
      battery: data.configuration?.battery,
      model_number: data.configuration?.model,
    };

    const response = await api.post('/assets/create', payload);
    return response.data?.data;
  },

  // Update asset
  updateAsset: async (id: string, data: Partial<Asset>): Promise<Asset> => {
    // Flatten configuration object into individual fields
    const payload: Record<string, unknown> = {
      asset_code: data.asset_code,
      name: data.name,
      category: data.category,
      description: data.description,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      manufacturer: data.manufacturer,
      serial_number: data.serial_number,
      warranty_expiry: data.warranty_expiry,
      status: data.status,
      notes: data.notes,
      // Configuration fields - flattened
      operating_system: data.configuration?.os,
      processor_cpu: data.configuration?.processor,
      ram: data.configuration?.ram,
      storage: data.configuration?.storage,
      graphics_gpu: data.configuration?.graphics,
      display: data.configuration?.display,
      battery: data.configuration?.battery,
      model_number: data.configuration?.model,
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const response = await api.put(`/assets/update/${id}`, payload);
    return response.data?.data;
  },

  // Delete asset (retire)
  deleteAsset: async (id: string): Promise<void> => {
    await api.delete(`/assets/delete/${id}`);
  },

  // Assign asset
  assignAsset: async (id: string, employeeId: string, accessories?: string[]): Promise<Asset> => {
    const response = await api.post(`/assets/${id}/assign`, { employee_id: employeeId, accessories });
    return response.data?.data;
  },

  // Unassign asset (return)
  unassignAsset: async (id: string, data?: { return_date?: string; condition?: string; notes?: string; checklist?: Array<{ item_name: string; is_returned: boolean; notes?: string }> }): Promise<Asset> => {
    const response = await api.post(`/assets/${id}/return`, data || {});
    return response.data?.data;
  },

  // Get active accessories for an asset (from DB)
  getAssetAccessories: async (id: string): Promise<Array<{ id: string; item_name: string; is_active: boolean; created_at: string }>> => {
    const response = await api.get(`/assets/${id}/accessories`);
    return response.data?.data || [];
  },

  // Swap asset — atomic return old + assign new
  swapAsset: async (oldAssetId: string, data: {
    new_asset_id: string;
    return_condition?: string;
    return_notes?: string;
    checklist?: Array<{ item_name: string; is_returned: boolean; notes?: string }>;
    new_accessories?: string[];
  }): Promise<Asset> => {
    const response = await api.post(`/assets/${oldAssetId}/swap`, data);
    return response.data?.data;
  },

  // Get barcode for asset
  getBarcode: async (id: string): Promise<string | null> => {
    try {
      const response = await api.get(`/assets/${id}/barcode`);
      return response.data?.data?.barcode || response.data?.data?.image || null;
    } catch {
      return null;
    }
  },

  // Get QR code for asset
  getQRCode: async (id: string): Promise<string | null> => {
    try {
      const response = await api.get(`/assets/${id}/qrcode`);
      return response.data?.data?.qrcode || null;
    } catch {
      return null;
    }
  },

  // Get asset tracking history
  getAssetTracking: async (id: string): Promise<unknown[]> => {
    const response = await api.get(`/assets/${id}/tracking`);
    return response.data?.data || [];
  },

  // Get asset usage history
  getAssetUsageHistory: async (id: string): Promise<unknown[]> => {
    const response = await api.get(`/assets/${id}/usage-history`);
    return response.data?.data || [];
  },

  // Submit asset request
  submitRequest: async (data: { asset_name: string; category: string; priority: string; reason: string }): Promise<unknown> => {
    try {
      const response = await api.post('/assets/requests/create', data);
      return response.data;
    } catch (error: any) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  },

  // List asset requests
  listRequests: async (): Promise<unknown[]> => {
    const response = await api.get('/assets/requests/list');
    return response.data?.data || [];
  },

  // Handle asset request (Approve/Reject)
  handleRequest: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; admin_notes?: string }): Promise<unknown> => {
    const response = await api.post(`/assets/requests/${id}/handle`, data);
    return response.data;
  },

  // Update request (Pending only)
  updateRequest: async (id: string, data: { asset_name?: string; category?: string; priority?: string; reason?: string }): Promise<unknown> => {
    try {
      const response = await api.put(`/assets/requests/${id}`, data);
      return response.data;
    } catch (error: any) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  },

  // Cancel request (Delete - Pending only)
  cancelRequest: async (id: string): Promise<unknown> => {
    const response = await api.delete(`/assets/requests/${id}`);
    return response.data;
  },

  // Get asset dashboard stats
  getDashboard: async (): Promise<{
    summary: {
      total_assets: number;
      assigned_count: number;
      available_count: number;
      under_repair_count: number;
      retired_count: number;
      total_purchase_value: number;
      total_book_value: number;
    };
    by_status: Array<{ status: string; count: number }>;
    by_category: Array<{ category: string; count: number }>;
    warranty_expiring_soon: number;
    recent_activity: Array<{
      event_type: string;
      description: string;
      created_at: string;
      asset_name: string;
      asset_code: string;
    }>;
  }> => {
    const response = await api.get('/assets/dashboard');
    return response.data?.data;
  },

  // Export assets as CSV download
  exportCSV: async (): Promise<void> => {
    const response = await api.get('/assets/export/csv', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Get warranty alerts
  getWarrantyAlerts: async (days: number = 30): Promise<Array<{
    id: string;
    asset_code: string;
    name: string;
    category: string;
    warranty_expiry: string;
    status: string;
    assigned_to_name: string | null;
  }>> => {
    const response = await api.get(`/assets/warranty-alerts?days=${days}`);
    return response.data?.data || [];
  },
};