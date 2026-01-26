import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { notificationsService, Notification } from '@/services/notifications.service';
import { Bell, CheckCheck, Trash2, Info, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const limit = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['notifications', page],
        queryFn: () => notificationsService.getNotifications(limit, page * limit),
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('All notifications marked as read');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationsService.deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Notification deleted');
        },
    });

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="text-green-500" size={20} />;
            case 'warning':
                return <AlertTriangle className="text-yellow-500" size={20} />;
            case 'error':
                return <AlertCircle className="text-red-500" size={20} />;
            default:
                return <Info className="text-blue-500" size={20} />;
        }
    };

    const notifications = data?.notifications || [];
    const unreadCount = data?.unread_count || 0;

    return (
        <DashboardLayout
            title="Notifications"
            breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Notifications</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Stay updated with company announcements and tasks
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCw size={16} className={cn("mr-2", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={() => markAllAsReadMutation.mutate()}>
                                <CheckCheck size={16} className="mr-2" />
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="p-0 overflow-hidden bg-white dark:bg-gray-900 border-light-border dark:border-dark-border">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                            <p className="mt-4 text-gray-500">Loading notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4">
                            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                                <Bell size={48} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All caught up!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mt-1">
                                No notifications for now. We'll let you know when there's something new.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-6 flex gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 relative group",
                                        !notification.read && "bg-blue-50/30 dark:bg-blue-900/10"
                                    )}
                                    onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <h4 className={cn(
                                                "text-base font-semibold text-gray-900 dark:text-white truncate",
                                                !notification.read && "font-bold"
                                            )}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                            {notification.message}
                                        </p>

                                        {notification.link && (
                                            <Button
                                                variant="ghost"
                                                className="p-0 h-auto mt-3 text-primary text-xs font-semibold hover:bg-transparent hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = notification.link!;
                                                }}
                                            >
                                                View Details →
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-red-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this notification?')) {
                                                    deleteMutation.mutate(notification.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                    {!notification.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {data && data.total_count > limit && (
                    <div className="flex items-center justify-between pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-500">
                            Page {page + 1} of {Math.ceil(data.total_count / limit)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={notifications.length < limit}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default NotificationsPage;
