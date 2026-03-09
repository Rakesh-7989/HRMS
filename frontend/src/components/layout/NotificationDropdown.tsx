import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, Notification } from '@/services/notifications.service';
import { Bell, CheckCheck, X, Info, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onToggle }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch notifications
    const { data: notificationsData } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsService.getNotifications(10, 0),
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="text-green-500" size={18} />;
            case 'warning':
                return <AlertTriangle className="text-yellow-500" size={18} />;
            case 'error':
                return <AlertCircle className="text-red-500" size={18} />;
            default:
                return <Info className="text-violet-500" size={18} />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    const unreadCount = notificationsData?.unread_count || 0;
    const notifications = notificationsData?.notifications || [];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={onToggle}
                className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
            >
                <Bell size={18} className="text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed left-4 right-4 top-[70px] w-auto mt-0 max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-96 sm:max-h-[500px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Notifications {unreadCount > 0 && `(${unreadCount})`}
                            </h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllAsReadMutation.mutate()}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                        disabled={markAllAsReadMutation.isPending}
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={16} className="text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <Bell size={48} className="text-gray-300 dark:text-gray-700 mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                        No notifications yet
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                                        We'll notify you when something important happens
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            'px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                                            !notification.read
                                                ? 'bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <Link
                                    to="/notifications"
                                    onClick={onClose}
                                    className="text-xs text-primary hover:underline font-medium block text-center"
                                >
                                    View all notifications
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
