import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { adminService, TenantProfile } from '@/services/admin.service';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '@/utils/constants';

// Get base URL without /api suffix
const BASE_URL = API_BASE_URL.replace('/api', '');

export const PayrollSettings: React.FC = () => {
    const [profile, setProfile] = useState<TenantProfile | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await adminService.getTenantProfile();
            setProfile(data);
            if (data.settings?.logo_url) {
                setLogoPreview(`${BASE_URL}${data.settings.logo_url}`);
            }
        } catch (err) {
            console.error('Failed to load profile', err);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview local immediately (optional, but nice)
        const objectUrl = URL.createObjectURL(file);
        setLogoPreview(objectUrl);

        try {
            setUploading(true);
            const result = await adminService.uploadTenantLogo(file);
            // Update with server URL to ensure persistence check
            if (result && result.logo_url) {
                setLogoPreview(`${BASE_URL}${result.logo_url}`);
            }
            alert('Logo uploaded successfully!');
        } catch (err: any) {
            alert('Failed to upload logo: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-lg font-semibold mb-6">Payroll Settings</h3>

            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium mb-2">Company Logo</h4>
                    <p className="text-sm text-gray-500 mb-4">This logo will be displayed on payslips and other generated documents.</p>

                    <div className="flex items-start gap-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-40 h-40 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="mx-auto mb-2" size={24} />
                                    <span className="text-xs">No Logo</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-elev-1 text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Upload className="mr-2" size={16} />
                                    {uploading ? 'Uploading...' : 'Upload New Logo'}
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Recommended size: 200x200px (Max 2MB).
                                <br />Supported formats: PNG, JPG.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-4">Payslip Customization</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                            <p className="text-xs text-gray-500 mb-3">Select the primary color used in Generated Payslips.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={profile?.settings?.primary_color || '#1a365d'}
                                    onChange={(e) => {
                                        setProfile(prev => prev ? ({
                                            ...prev,
                                            settings: { ...(prev.settings || {}), primary_color: e.target.value }
                                        }) : null);
                                    }}
                                    className="h-10 w-20 p-1 rounded border border-gray-300 cursor-pointer"
                                />
                                <span className="text-sm font-mono text-gray-600 uppercase">
                                    {profile?.settings?.primary_color || '#1a365d'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={async () => {
                                    try {
                                        setUploading(true);
                                        await adminService.updateTenantProfile({
                                            settings: {
                                                primary_color: profile?.settings?.primary_color
                                            }
                                        });
                                        alert('Settings saved successfully!');
                                    } catch (err: any) {
                                        alert('Failed to save settings: ' + err.message);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                                className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50"
                            >
                                Save Customization
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-4">Company Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-500">Company Name</label>
                            <div className="mt-1 font-medium">{profile?.name || '—'}</div>
                        </div>
                        <div>
                            <label className="block text-gray-500">Domain</label>
                            <div className="mt-1 font-medium">{profile?.domain || '—'}</div>
                        </div>
                        <div>
                            <label className="block text-gray-500">Email</label>
                            <div className="mt-1 font-medium">{profile?.email || '—'}</div>
                        </div>
                        <div>
                            <label className="block text-gray-500">Phone</label>
                            <div className="mt-1 font-medium">{profile?.phone || '—'}</div>
                        </div>
                        <div>
                            <label className="block text-gray-500">Address</label>
                            <div className="mt-1 font-medium">{[profile?.address, profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || '—'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
