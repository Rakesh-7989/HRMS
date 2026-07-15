import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Laptop,
    Smartphone,
    Globe,
    Clock,
    ShieldCheck,
    LogOut,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { showToast } from '@/utils/toast';

interface SessionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    const { data: sessions, isLoading, error } = useQuery({
        queryKey: ['active-sessions'],
        queryFn: authService.listActiveSessions,
        enabled: isOpen
    });

    const logoutAllMutation = useMutation({
        mutationFn: authService.logoutAll,
        onSuccess: () => {
            showToast.success('Successfully logged out from other devices');
            queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
        },
        onError: (err: unknown) => {
            showToast.error((err as { message?: string }).message || 'Failed to logout from other devices');
        }
    });

    const getDeviceIcon = (device: string) => {
        const d = device.toLowerCase();
        if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) return <Smartphone size={18} />;
        if (d.includes('win') || d.includes('mac') || d.includes('linux')) return <Laptop size={18} />;
        return <Globe size={18} />;
    };

    const getBrowserInfo = (device: string) => {
        const d = device.toLowerCase();
        if (d.includes('chrome')) return 'Chrome';
        if (d.includes('firefox')) return 'Firefox';
        if (d.includes('safari')) return 'Safari';
        if (d.includes('edge')) return 'Edge';
        return 'Unknown Browser';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
                                <ShieldCheck size={20} />
                            </div>
                            <DialogTitle>Active Sessions</DialogTitle>
                        </div>
                        {sessions && sessions.length > 1 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30"
                                onClick={() => logoutAllMutation.mutate()}
                                isLoading={logoutAllMutation.isPending}
                            >
                                <LogOut className="mr-2" size={14} />
                                Logout Others
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <AlertCircle size={40} className="text-red-500 mb-2 opacity-50" />
                            <p className="text-gray-600 dark:text-muted">Failed to load active sessions.</p>
                            <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['active-sessions'] })}>
                                Try again
                            </Button>
                        </div>
                    ) : !sessions || sessions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 dark:text-muted">No active sessions found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session, index) => (
                                <div
                                    key={session.id}
                                    className={`p-4 rounded-xl border transition-all ${index === 0
                                        ? 'bg-brand-500/5 border-brand-500/20 ring-1 ring-primary/10'
                                        : 'bg-white dark:bg-white/5 border-gray-100 dark:border-gray-800'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <div className={`p-2.5 rounded-lg ${index === 0
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                {getDeviceIcon(session.device || '')}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
<h4 className="font-semibold text-gray-900 dark:text-white">
                                                            {getBrowserInfo(session.device || '')} on {session.ip_address || 'Unknown IP'}
                                                        </h4>
                                                    {index === 0 && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded uppercase">
                                                            <CheckCircle2 size={10} /> Current
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-muted">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Started: {session.last_active ? format(new Date(session.last_active), 'MMM dd, HH:mm') : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t dark:border-gray-800">
                    <Button variant="outline" className="w-full" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
