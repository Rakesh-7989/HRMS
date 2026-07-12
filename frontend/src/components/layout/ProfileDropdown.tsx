import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
    ChevronRight,
    Edit3,
    ExternalLink,
    CheckCircle2,
    ArrowLeft,
    Settings,
    Camera,
    Upload,
    Trash2,
    Eye,
    X,
    Clock,
    Minus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { resolveImageUrl } from '@/utils/image';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { useTranslation } from 'react-i18next';

interface ProfileDropdownProps {
    onClose: () => void;
}

type UserStatus = 'available' | 'busy' | 'dnd' | 'away' | 'offline';
type ViewState = 'main' | 'status' | 'message' | 'photo';

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onClose }) => {
    const { user, logout, setUser } = useAuth();
    const { myStatus: status, updateMyStatus: setStatus, updateMyStatusMessage } = useChat();
    const { confirm } = useConfirm();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [view, setView] = useState<ViewState>('main');
    const [message, setMessage] = useState('');
    const [expiryOption, setExpiryOption] = useState('none');
    const [showPhotoPreview, setShowPhotoPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleStatusChange = (newStatus: UserStatus) => {
        setStatus(newStatus);
        setView('main');
    };

    const handleSaveMessage = () => {
        let expiryDate = new Date();
        if (expiryOption === '1h') expiryDate.setHours(expiryDate.getHours() + 1);
        else if (expiryOption === '4h') expiryDate.setHours(expiryDate.getHours() + 4);
        else if (expiryOption === 'today') expiryDate.setHours(23, 59, 59, 999);
        else if (expiryOption === 'week') expiryDate.setDate(expiryDate.getDate() + 7);
        else expiryDate = null as any;

        updateMyStatusMessage(message, expiryDate ? expiryDate.toISOString() : null);
        setView('main');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        try {
            // Using dynamic import to avoid circular dep issues if any, preserving existing pattern
            const res = await import('@/services/api').then(m => m.default.post('/users/me/profile-photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }));

            if (user && res.data.data) {
                // Determine the new photo URL from response
                // The backend returns the updated employee object in plain data or data.updated
                // Adjust based on your backend response structure
                const updatedPhotoUrl = res.data.data.profile_photo_url || res.data.data.updated?.profile_photo_url;

                // Optimistically update user context
                setUser({ ...user, profile_photo_url: updatedPhotoUrl });
                setView('main');
            }
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

    const handleRemovePhoto = async () => {
        const isConfirmed = await confirm({
            title: t('profile.profileDropdown.removeProfilePhotoTitle'),
            message: t('profile.profileDropdown.removeProfilePhotoMessage'),
            confirmText: t('profile.profileDropdown.remove'),
            cancelText: t('common.cancel'),
            type: 'destructive'
        });

        if (!isConfirmed) return;

        try {
            await import('@/services/api').then(m => m.default.delete('/users/me/profile-photo'));
            if (user) {
                // Use undefined instead of null to match User interface
                setUser({ ...user, profile_photo_url: undefined });
                setView('main');
            }

        } catch (err) {
            console.error("Remove failed", err);
        }
    };

    const getStatusInfo = (s: UserStatus) => {
        switch (s) {
            case 'available': return { label: 'Available', color: 'available' };
            case 'busy': return { label: 'Busy', color: 'busy' };
            case 'dnd': return { label: 'Do not disturb', color: 'dnd' };
            case 'away': return { label: 'Away', color: 'away' };
            case 'offline': return { label: 'Appear offline', color: 'offline' };
            default: return { label: 'Available', color: 'available' };
        }
    };

    const currentStatus = getStatusInfo(status);

    return (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-white dark:bg-[#161A1F] border border-gray-200 dark:border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {view === 'main' ? (
                <>
                    {/* Header with User Info */}
                    <div className="p-4 bg-gradient-to-br from-brand-500/5 to-transparent dark:from-white/5">
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</span>
                             <Button variant="ghost" 
                                onClick={async () => {
                                    onClose();
                                    await logout();
                                }}
                                className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 transition-colors px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                            >
                                Sign out
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative group cursor-pointer" onClick={() => setView('photo')}>
                                <div className="h-14 w-14 rounded-full bg-white dark:bg-gray-800 p-0.5 shadow-elev-1 ring-1 ring-gray-100 dark:ring-gray-700">
                                    <div className="h-full w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-400 relative">
                                        {user?.profile_photo_url ? (
                                            <img src={resolveImageUrl(user.profile_photo_url)} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            user?.first_name?.charAt(0) || 'U'
                                        )}

                                        {/* Photo Edit Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={18} className="text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className={cn(
                                    "absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center shadow-elev-1",
                                    status === 'available' ? 'bg-green-500' :
                                        status === 'away' ? 'bg-amber-500' :
                                            status === 'dnd' || status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                                )}>
                                    {status === 'available' && <CheckCircle2 size={12} className="text-white" />}
                                    {status === 'away' && <Clock size={12} className="text-white" />}
                                    {status === 'dnd' && <Minus size={12} className="text-white" />}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                    {user?.first_name} {user?.last_name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                                    {user?.email}
                                </p>
                                {status ? (
                                    <span className="text-gray-500 dark:text-gray-400 capitalize">{t(`profile.profileDropdown.${status}`)}</span>
                                ) : (
                                    <span className="text-gray-400 italic">{t('profile.profileDropdown.setAStatus')}</span>
                                )}
                                 <Button variant="ghost" 
                                    onClick={() => { onClose(); navigate('/profile'); }}
                                    className="text-xs font-medium text-brand-500 hover:text-brand-600 hover:underline flex items-center gap-1"
                                >
                                    Manage Profile <ExternalLink size={10} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-2 space-y-1">
                        {/* Status Menu Item */}
                         <Button variant="ghost" 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                            onClick={() => setView('status')}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {status === 'available' ? <CheckCircle2 size={16} /> : <div className={`w-3 h-3 rounded-full ${currentStatus.color}`} />}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">Status</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{currentStatus.label}</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                        </Button>

                        {/* Status Message Item */}
                         <Button variant="ghost" 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                            onClick={() => setView('message')}
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Edit3 size={16} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">Set status message</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                    {message || "What's happening?"}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                        </Button>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-4" />

                    <div className="p-2">
                         <Button variant="ghost" 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                            onClick={() => { onClose(); navigate('/settings'); }}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                                <Settings size={16} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">Settings</span>
                        </Button>
                    </div>
                </>
            ) : view === 'photo' ? (
                <div className="animate-in slide-in-from-right duration-200 bg-white dark:bg-gray-900 h-full">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                         <Button variant="ghost" 
                            onClick={() => setView('main')}
                            className="p-1.5 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Profile Photo</span>
                    </div>

                    <div className="p-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800">
                        <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-elev-3 ring-4 ring-white dark:ring-gray-800">
                            {user?.profile_photo_url ? (
                                <img src={resolveImageUrl(user.profile_photo_url)} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-gray-400">
                                    {user?.first_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-2 space-y-1">
                        {user?.profile_photo_url && (
                             <Button variant="ghost" 
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setShowPhotoPreview(true)}
                            >
                                <Eye size={18} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">View photo</span>
                            </Button>
                        )}

                         <Button variant="ghost" 
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={18} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Upload photo</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </Button>

                        {user?.profile_photo_url && (
                             <Button variant="ghost" 
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
                                onClick={handleRemovePhoto}
                            >
                                <Trash2 size={18} className="text-red-500 group-hover:text-red-600" />
                                <span className="text-sm font-medium text-red-600 group-hover:text-red-700">Remove photo</span>
                            </Button>
                        )}
                    </div>
                </div>
            ) : view === 'status' ? (
                <div className="animate-in slide-in-from-right duration-200 bg-white dark:bg-gray-900 h-full">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                         <Button variant="ghost" 
                            onClick={() => setView('main')}
                            className="p-1.5 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Set Status</span>
                    </div>

                    <div className="p-2 space-y-1">
                        {(['available', 'busy', 'dnd', 'away', 'offline'] as UserStatus[]).map((s) => {
                            const info = getStatusInfo(s);
                            const isActive = status === s;
                            return (
                                 <Button variant="ghost" 
                                    key={s}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-500/5 dark:bg-brand-500/10 ring-1 ring-brand-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    onClick={() => handleStatusChange(s)}
                                >
                                    <div className={`w-3 h-3 rounded-full ${s === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : s === 'busy' ? 'bg-error-500' : s === 'dnd' ? 'bg-error-500' : s === 'away' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                    <span className={`text-sm font-medium ${isActive ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {info.label}
                                    </span>
                                    {isActive && <CheckCircle2 size={16} className="ml-auto text-brand-500" />}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="animate-in slide-in-from-right duration-200 bg-white dark:bg-gray-900 h-full">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                         <Button variant="ghost" 
                            onClick={() => setView('main')}
                            className="p-1.5 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Status Message</span>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="What's happening?"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-elev-1"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={100}
                                autoFocus
                            />
                            <Edit3 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Clear after</label>
                            <div className="relative">
                                <select
                                    className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                                    value={expiryOption}
                                    onChange={(e) => setExpiryOption(e.target.value)}
                                >
                                    <option value="none">Don't clear</option>
                                    <option value="1h">1 Hour</option>
                                    <option value="4h">4 Hours</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                </select>
                                <ChevronRight size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                             <Button variant="ghost" 
                                onClick={() => setView('main')}
                                className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                            >
                                Cancel
                            </Button>
                             <Button variant="ghost" 
                                onClick={handleSaveMessage}
                                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 text-white rounded-xl text-sm font-semibold hover:shadow-elev-4 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Save Status
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Preview Dialog */}
            <Dialog open={showPhotoPreview} onOpenChange={setShowPhotoPreview}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-black/90 border-none">
                    <div className="relative flex items-center justify-center p-4 min-h-[400px]">
                        <DialogClose className="absolute top-4 right-4 text-white/70 hover:text-white">
                            <X size={24} />
                        </DialogClose>
                        {user?.profile_photo_url && (
                            <img
                                src={resolveImageUrl(user.profile_photo_url)}
                                alt="Profile Full"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-elev-6"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
