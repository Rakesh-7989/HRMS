import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Edit,
  Package,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  Download,
  Printer,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { AssetStatus } from '@/types';

export const AssetDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: asset, isLoading: isLoadingAsset } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsService.getAsset(id!),
    enabled: !!id,
  });

  const { data: barcodeImage } = useQuery({
    queryKey: ['assetBarcode', id],
    queryFn: () => assetsService.getBarcode(id!),
    enabled: !!id,
  });

  const [historyView, setHistoryView] = React.useState<'tracking' | 'usage' | null>(null);

  const { data: trackingHistory, isLoading: isLoadingTracking } = useQuery({
    queryKey: ['assetTracking', id],
    queryFn: () => assetsService.getAssetTracking(id!),
    enabled: !!id && historyView === 'tracking',
  });

  const { data: usageHistory, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['assetUsage', id],
    queryFn: () => assetsService.getAssetUsageHistory(id!),
    enabled: !!id && historyView === 'usage',
  });

  const canManage = user?.role === 'ADMIN';
  const canReturn = ['ADMIN', 'HR'].includes(user?.role || '');
  const canViewBarcode = ['ADMIN', 'HR'].includes(user?.role || '');
  const canView = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(user?.role || '');

  if (!canView) {
    return (
      <DashboardLayout title="Access Denied">
        <Card>
          <p className="text-center text-gray-500">You don't have permission to view assets.</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (isLoadingAsset) {
    return (
      <DashboardLayout title="Loading Asset...">
        <Card>
          <div className="flex justify-center p-8">
            <div className="animate-pulse">Loading...</div>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout title="Asset Not Found">
        <Card>
          <p className="text-center text-gray-500">Asset not found.</p>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-green-600 bg-green-100';
      case 'ASSIGNED':
        return 'text-blue-600 bg-blue-100';
      case 'REQUESTED':
        return 'text-yellow-600 bg-yellow-100';
      case 'UNDER_REPAIR':
        return 'text-orange-600 bg-orange-100';
      case 'RETIRED':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handlePrintBarcode = () => {
    if (barcodeImage) {
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
              <img src="${barcodeImage}" onload="window.print(); setTimeout(function() { window.close(); }, 500);" onerror="alert('Failed to load barcode'); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      toast.error('Barcode not available to print.');
    }
  };

  const handleDownloadBarcode = () => {
    if (barcodeImage) {
      const link = document.createElement('a');
      link.href = barcodeImage;
      link.download = `barcode-${asset?.asset_code || 'asset'}.png`;
      link.click();
    } else {
      toast.error('Barcode not available to download.');
    }
  };

  return (
    <DashboardLayout
      title={`Asset: ${asset.name}`}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: 'Assets', href: '/assets' },
        { label: asset.name },
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/assets')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Assets
          </Button>
          {canManage && (
            <Button
              onClick={() => navigate(`/assets/${asset.id}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit size={18} />
              Edit Asset
            </Button>
          )}
        </div>

        {/* Asset Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{asset.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{asset.asset_code}</p>
                </div>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(asset.status)}`}
                >
                  {asset.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Package className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium">{asset.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
                      <p className="font-medium">
                        {asset.purchase_date
                          ? format(new Date(asset.purchase_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Cost</p>
                      <p className="font-medium">
                        {asset.purchase_price ? `$${asset.purchase_price.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">

                  <div className="flex items-center gap-3">
                    <Shield className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Warranty Expiry</p>
                      <p className="font-medium">
                        {asset.warranty_expiry
                          ? format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                      <p className="font-medium">
                        {asset.assigned_employee
                          ? `${asset.assigned_employee.first_name} ${asset.assigned_employee.last_name}`
                          : 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {asset.manufacturer && (
                    <div className="flex items-center gap-3">
                      <Package className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manufacturer</p>
                        <p className="font-medium">{asset.manufacturer}</p>
                      </div>
                    </div>
                  )}

                  {asset.serial_number && (
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Serial Number</p>
                        <p className="font-medium">{asset.serial_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {asset.description && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-start gap-3">
                    <FileText className="text-gray-400 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Description
                      </p>
                      <p className="text-gray-900 dark:text-white">{asset.description}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Existing Notes section continues below */}
              {asset.notes && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-start gap-3">
                    <FileText className="text-gray-400 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notes</p>
                      <p className="text-gray-900 dark:text-white">{asset.notes}</p>
                    </div>
                  </div>
                </div>
              )}

            </Card>


            {asset.configuration && Object.keys(asset.configuration).length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asset.configuration.os && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Operating System</p>
                      <p className="font-medium">{asset.configuration.os}</p>
                    </div>
                  )}
                  {asset.configuration.ram && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">RAM</p>
                      <p className="font-medium">{asset.configuration.ram}</p>
                    </div>
                  )}
                  {asset.configuration.storage && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
                      <p className="font-medium">{asset.configuration.storage}</p>
                    </div>
                  )}
                  {asset.configuration.processor && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Processor</p>
                      <p className="font-medium">{asset.configuration.processor}</p>
                    </div>
                  )}
                  {asset.configuration.model && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Model</p>
                      <p className="font-medium">{asset.configuration.model}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Barcode */}
            {canViewBarcode && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barcode</h3>
                <div className="text-center">
                  <div className="bg-white border-2 border-gray-300 rounded p-4 mb-4 flex flex-col items-center justify-center overflow-hidden">
                    {barcodeImage ? (
                      <img src={barcodeImage} alt="Asset Barcode" className="max-w-full h-auto object-contain" />
                    ) : (
                      <div className="text-gray-400 text-sm">No barcode available</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrintBarcode}
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-2"
                    >
                      <Printer size={16} />
                      Print
                    </Button>
                    <Button
                      onClick={handleDownloadBarcode}
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            {(canManage || canReturn) && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {canManage && (
                    <Button
                      onClick={() => navigate(`/assets/${asset.id}/edit`)}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Edit size={16} className="mr-2" />
                      Edit Asset
                    </Button>
                  )}
                  {canReturn && asset.status === 'ASSIGNED' && (
                    <Button
                      onClick={() => navigate(`/assets/${asset.id}/return`)}
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      variant="outline"
                    >
                      <XCircle size={16} className="mr-2" />
                      Return / Unassign Asset
                    </Button>
                  )}
                  {/* Add more actions as needed */}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* History Section - Only for ADMIN and HR */}
        {canReturn && (
          <div className="mt-8">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Asset History</h3>
                <div className="flex space-x-4 mb-6">
                  <Button
                    variant={historyView === 'tracking' ? 'primary' : 'outline'}
                    onClick={() => setHistoryView('tracking')}
                  >
                    Tracking Events
                  </Button>
                  <Button
                    variant={historyView === 'usage' ? 'primary' : 'outline'}
                    onClick={() => setHistoryView('usage')}
                  >
                    Usage History
                  </Button>
                </div>

                {historyView === null && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p>Select a history type to view details</p>
                  </div>
                )}

                {historyView === 'tracking' && (
                  <div>
                    {isLoadingTracking ? (
                      <div className="text-center py-4">Loading tracking events...</div>
                    ) : trackingHistory?.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No tracking events found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Performed By</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {trackingHistory?.map((event: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{event.event_type}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{event.description || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {event.created_by_name || 'System'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {historyView === 'usage' && (
                  <div>
                    {isLoadingUsage ? (
                      <div className="text-center py-4">Loading usage history...</div>
                    ) : usageHistory?.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No usage history found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logged At</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {usageHistory?.map((usage: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {usage.first_name && usage.last_name
                                    ? `${usage.first_name} ${usage.last_name}`
                                    : usage.employee_id || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {usage.assigned_date ? format(new Date(usage.assigned_date), 'MMM dd, yyyy') : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {usage.return_date ? format(new Date(usage.return_date), 'MMM dd, yyyy') : <span className="text-green-600 dark:text-green-400 font-medium">Active</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                  {usage.description || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {usage.created_at ? format(new Date(usage.created_at), 'MMM dd, yyyy HH:mm') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div >
    </DashboardLayout >
  );
};
