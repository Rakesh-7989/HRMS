import type { Asset } from '@/types';

export const MOCK_ASSETS: Asset[] = [
    {
        id: '1',
        asset_code: 'AST-001',
        name: 'Dell Laptop XPS 13',
        barcode: '123456789012',
        category: 'Laptop',
        status: 'ASSIGNED',
        assigned_to: 'sample-user-1',
        assigned_employee: {
            first_name: 'John',
            last_name: 'Doe'
        },
        location: 'Floor 1, Room 101',
        purchase_date: '2023-01-15',
        purchase_price: 1200,
        warranty_expiry: '2026-01-15',
        configuration: {
            os: 'Windows 11',
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel i7',
            model: 'XPS 13 9310'
        },
        notes: 'High-performance laptop for development',
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-06-01T14:30:00Z'
    },
    {
        id: '2',
        asset_code: 'AST-002',
        name: 'HP Monitor 27"',
        barcode: '123456789013',
        category: 'Monitor',
        status: 'AVAILABLE',
        location: 'IT Storage',
        purchase_date: '2023-02-20',
        purchase_price: 300,
        warranty_expiry: '2026-02-20',
        notes: '4K monitor',
        created_at: '2023-02-20T10:00:00Z',
        updated_at: '2023-02-20T10:00:00Z'
    },
    {
        id: '3',
        asset_code: 'AST-003',
        name: 'iPhone 13 Pro',
        barcode: '123456789014',
        category: 'Mobile',
        status: 'AVAILABLE',
        location: 'Mobile',
        purchase_date: '2023-03-10',
        purchase_price: 999,
        warranty_expiry: '2025-03-10',
        configuration: {
            os: 'iOS 17',
            ram: '6GB',
            storage: '256GB',
            processor: 'A15 Bionic',
            model: 'iPhone 13 Pro'
        },
        notes: 'Company phone',
        created_at: '2023-03-10T10:00:00Z',
        updated_at: '2023-07-15T09:00:00Z'
    },
    {
        id: '4',
        asset_code: 'AST-004',
        name: 'MacBook Pro 16"',
        barcode: '123456789015',
        category: 'Laptop',
        status: 'REQUESTED',
        assigned_to: 'sample-user-3', // Requested
        assigned_employee: {
            first_name: 'Bob',
            last_name: 'Johnson'
        },
        location: 'Pending Assignment',
        purchase_date: '2023-04-01',
        purchase_price: 2400,
        configuration: {
            os: 'macOS Sonoma',
            ram: '32GB',
            storage: '1TB SSD',
            processor: 'Apple M3 Max',
            model: 'MacBook Pro 16"'
        },
        notes: 'High-end development machine',
        created_at: '2023-04-01T10:00:00Z',
        updated_at: '2023-08-01T11:00:00Z'
    }
];
