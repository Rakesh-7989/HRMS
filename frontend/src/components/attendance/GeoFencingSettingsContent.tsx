import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { geoFencingService, GeoFenceLocation, CreateGeoFenceLocationData, GeoFencingSettings } from '@/services/geoFencing.service';
import { MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw, Check, X, ShieldCheck, Settings, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const GeoFencingSettingsContent: React.FC = () => {
    const queryClient = useQueryClient();

    // State
    const [locationDialogOpen, setLocationDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<GeoFenceLocation | null>(null);
    const [locationForm, setLocationForm] = useState<CreateGeoFenceLocationData>({
        name: '',
        description: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 100,
        is_active: true
    });

    // Queries
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: () => geoFencingService.getSettings(),
    });

    const { data: locations = [], isLoading: locationsLoading, refetch: refetchLocations } = useQuery({
        queryKey: ['geo-fencing-locations'],
        queryFn: () => geoFencingService.getLocations(true),
    });

    const { data: violations = [], isLoading: violationsLoading } = useQuery({
        queryKey: ['geo-fencing-violations'],
        queryFn: () => geoFencingService.getViolations({ limit: 20 }),
        enabled: !!settings?.is_enabled
    });

    // Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: (data: Partial<GeoFencingSettings>) => geoFencingService.updateSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-fencing-settings'] });
            toast.success('Geo-fencing settings updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update settings');
        }
    });

    const createLocationMutation = useMutation({
        mutationFn: (data: CreateGeoFenceLocationData) => geoFencingService.createLocation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-fencing-locations'] });
            handleCloseDialog();
            toast.success('Location added');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add location');
        }
    });

    const updateLocationMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateGeoFenceLocationData> }) =>
            geoFencingService.updateLocation(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-fencing-locations'] });
            handleCloseDialog();
            toast.success('Location updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update location');
        }
    });

    const deleteLocationMutation = useMutation({
        mutationFn: (id: string) => geoFencingService.deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-fencing-locations'] });
            toast.success('Location deleted');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete location');
        }
    });

    const handleToggleGeoFencing = () => {
        updateSettingsMutation.mutate({ is_enabled: !settings?.is_enabled });
    };

    const handleOpenLocationDialog = (location?: GeoFenceLocation) => {
        if (location) {
            setEditingLocation(location);
            setLocationForm({
                name: location.name,
                description: location.description || '',
                latitude: location.latitude,
                longitude: location.longitude,
                radius_meters: location.radius_meters,
                is_active: location.is_active
            });
        } else {
            setEditingLocation(null);
            setLocationForm({
                name: '',
                description: '',
                latitude: 0,
                longitude: 0,
                radius_meters: 100,
                is_active: true
            });
        }
        setLocationDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setLocationDialogOpen(false);
        setEditingLocation(null);
    };

    const handleSubmitLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!locationForm.name.trim()) {
            toast.error('Location name is required');
            return;
        }
        if (locationForm.latitude === 0 && locationForm.longitude === 0) {
            toast.error('Please enter valid coordinates');
            return;
        }

        if (editingLocation) {
            updateLocationMutation.mutate({ id: editingLocation.id, data: locationForm });
        } else {
            createLocationMutation.mutate(locationForm);
        }
    };

    const handleDeleteLocation = (id: string) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            deleteLocationMutation.mutate(id);
        }
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocationForm({
                        ...locationForm,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                    toast.success('Location captured from your device');
                },
                (error) => {
                    toast.error('Unable to get your location: ' + error.message);
                }
            );
        } else {
            toast.error('Geolocation is not supported by your browser');
        }
    };

    if (settingsLoading) {
        return <div className="p-8 text-center">Loading geo-fencing settings...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Main Toggle Card */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-xl",
                            settings?.is_enabled ? "bg-green-500/20" : "bg-gray-500/20"
                        )}>
                            <ShieldCheck size={28} className={settings?.is_enabled ? "text-green-400" : "text-gray-400"} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Geo-Fencing for Attendance</h2>
                            <p className="text-sm text-gray-300">
                                {settings?.is_enabled
                                    ? 'Employees can only clock in/out from allowed locations'
                                    : 'Geo-fencing is disabled. Employees can clock in/out from anywhere.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleGeoFencing}
                        disabled={updateSettingsMutation.isPending}
                        className="focus:outline-none"
                    >
                        {settings?.is_enabled ? (
                            <ToggleRight size={48} className="text-green-400" />
                        ) : (
                            <ToggleLeft size={48} className="text-gray-400" />
                        )}
                    </button>
                </div>
            </Card>

            {/* Settings Options */}
            {settings?.is_enabled && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-primary" />
                        Configuration Options
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings?.allow_clock_without_location}
                                onChange={(e) => updateSettingsMutation.mutate({ allow_clock_without_location: e.target.checked })}
                                className="w-5 h-5 rounded text-primary"
                            />
                            <div>
                                <p className="font-medium text-sm">Allow without location</p>
                                <p className="text-xs text-gray-500">Let employees clock in even if location is unavailable</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings?.require_high_accuracy}
                                onChange={(e) => updateSettingsMutation.mutate({ require_high_accuracy: e.target.checked })}
                                className="w-5 h-5 rounded text-primary"
                            />
                            <div>
                                <p className="font-medium text-sm">Require high accuracy</p>
                                <p className="text-xs text-gray-500">Use GPS instead of WiFi/Cell (slower but accurate)</p>
                            </div>
                        </label>
                    </div>
                    <div className="mt-4">
                        <Label className="block mb-2">Location Timeout (seconds)</Label>
                        <Input
                            type="number"
                            min={5}
                            max={120}
                            value={settings?.location_timeout_seconds || 30}
                            onChange={(e) => updateSettingsMutation.mutate({ location_timeout_seconds: parseInt(e.target.value) })}
                            className="w-32"
                        />
                    </div>
                </Card>
            )}

            {/* Locations Table */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin size={20} className="text-primary" />
                            Allowed Locations
                        </h3>
                        <p className="text-sm text-gray-500">Define office locations where employees can clock in/out</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchLocations()}>
                            <RefreshCw size={16} className="mr-1" />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => handleOpenLocationDialog()}>
                            <Plus size={16} className="mr-1" />
                            Add Location
                        </Button>
                    </div>
                </div>

                {locationsLoading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
                    </div>
                ) : locations.length === 0 ? (
                    <div className="text-center py-12">
                        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No locations configured</h3>
                        <p className="mt-1 text-sm text-gray-500">Add your office locations to enable geo-fencing.</p>
                        <Button className="mt-4" onClick={() => handleOpenLocationDialog()}>
                            <Plus size={16} className="mr-1" />
                            Add Location
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Coordinates</TableHead>
                                    <TableHead>Radius</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {locations.map((loc) => (
                                    <TableRow key={loc.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={16} className="text-primary" />
                                                <div>
                                                    <p className="font-medium">{loc.name}</p>
                                                    {loc.description && (
                                                        <p className="text-xs text-gray-500">{loc.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                                        </TableCell>
                                        <TableCell>{loc.radius_meters}m</TableCell>
                                        <TableCell>
                                            {loc.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <Check size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                                    <X size={12} /> Inactive
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenLocationDialog(loc)}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleDeleteLocation(loc.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Violation Logs */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle size={20} />
                            Recent Geo-Fence Violations
                        </h3>
                        <p className="text-sm text-gray-500">Audit log of blocked clock-in/out attempts</p>
                    </div>
                </div>

                {violationsLoading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
                    </div>
                ) : violations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No violations recorded.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Distance</TableHead>
                                    <TableHead>Device</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {violations.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">
                                            {v.first_name} {v.last_name}
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                v.action_type === 'CLOCK_IN' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                            )}>
                                                {v.action_type.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-red-600 font-medium">
                                            {v.violation_reason === 'OUTSIDE_ALLOWED_ZONE' ? 'Outside Allowed Zone' :
                                                v.violation_reason === 'LOCATION_REQUIRED' ? 'GPS Off / Denied' : v.violation_reason}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {v.distance_meters ? `${v.distance_meters}m` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                                                {v.device_type || 'Unknown'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500">
                                            {format(new Date(v.created_at), 'MMM dd, HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <Dialog
                open={locationDialogOpen}
                onOpenChange={handleCloseDialog}
                title={editingLocation ? 'Edit Location' : 'Add Location'}
                className="max-w-md"
            >
                <form onSubmit={handleSubmitLocation}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="loc-name" className="block mb-1.5">Location Name *</Label>
                            <Input
                                id="loc-name"
                                value={locationForm.name}
                                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                                placeholder="e.g., Main Office"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="loc-desc" className="block mb-1.5">Description</Label>
                            <Input
                                id="loc-desc"
                                value={locationForm.description}
                                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                                placeholder="e.g., 5th Floor, Building A"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="loc-lat" className="block mb-1.5">Latitude *</Label>
                                <Input
                                    id="loc-lat"
                                    type="number"
                                    step="any"
                                    value={locationForm.latitude}
                                    onChange={(e) => setLocationForm({ ...locationForm, latitude: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="loc-lng" className="block mb-1.5">Longitude *</Label>
                                <Input
                                    id="loc-lng"
                                    type="number"
                                    step="any"
                                    value={locationForm.longitude}
                                    onChange={(e) => setLocationForm({ ...locationForm, longitude: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} className="w-full">
                            <MapPin size={16} className="mr-1" />
                            Use My Current Location
                        </Button>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="loc-radius" className="block mb-1.5">Radius (meters)</Label>
                                <Input
                                    id="loc-radius"
                                    type="number"
                                    min={10}
                                    max={10000}
                                    value={locationForm.radius_meters}
                                    onChange={(e) => setLocationForm({ ...locationForm, radius_meters: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={locationForm.is_active}
                                        onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary"
                                    />
                                    <span className="text-sm">Active</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createLocationMutation.isPending || updateLocationMutation.isPending}>
                            {editingLocation ? 'Update' : 'Add Location'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};

export default GeoFencingSettingsContent;
