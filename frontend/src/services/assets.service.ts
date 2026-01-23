import type { Asset, AssetCategory } from '@/types';
import api from './api';

// Generate barcode utility
export const generateBarcode = (): string => {
  return Math.random().toString().slice(2, 14);
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
  assignAsset: async (id: string, employeeId: string): Promise<Asset> => {
    const response = await api.post(`/assets/${id}/assign`, { employee_id: employeeId });
    return response.data?.data;
  },

  // Unassign asset (return)
  unassignAsset: async (id: string, data?: { return_date?: string; condition?: string; notes?: string }): Promise<Asset> => {
    const response = await api.post(`/assets/${id}/return`, data || {});
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
    const response = await api.post('/assets/requests/create', data);
    return response.data;
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
};