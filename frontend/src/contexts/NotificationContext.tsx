import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { inboxService } from '@/services/inbox.service';

export interface Notification {
    id: string;
    type: 'leave' | 'attendance' | 'system' | 'payroll' | 'task';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    refreshNotifications: () => Promise<void>;
    isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load from localStorage on mount and when user changes
    useEffect(() => {
        if (user?.id) {
            const saved = localStorage.getItem(`hrms_notifications_${user.id}`);
            if (saved) {
                try {
                    setNotifications(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse notifications from localStorage', e);
                }
            }
        } else {
            setNotifications([]);
        }
    }, [user?.id]);

    // Save to localStorage whenever notifications change
    useEffect(() => {
        if (user?.id) {
            localStorage.setItem(`hrms_notifications_${user.id}`, JSON.stringify(notifications));
        }
    }, [notifications, user?.id]);

    const refreshNotifications = useCallback(async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const tasks = await inboxService.getTasks();

            const taskNotifications: Notification[] = tasks.map(task => ({
                id: `task-${task.id}`,
                type: 'task',
                title: task.title,
                message: task.description || 'No description provided',
                timestamp: task.created_at,
                read: false, // We might need a better way to track read state for individual tasks if the backend doesn't provide it
                actionUrl: '/inbox'
            }));

            setNotifications(prev => {
                // Merge with existing notifications, avoiding duplicates by ID
                const existingIds = new Set(prev.map(n => n.id));
                const newOnes = taskNotifications.filter(tn => !existingIds.has(tn.id));
                return [...newOnes, ...prev].sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
            });
        } catch (error) {
            console.error('Failed to fetch notifications from inbox:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    // Initial fetch
    useEffect(() => {
        if (user?.id) {
            refreshNotifications();
        }
    }, [user?.id, refreshNotifications]);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            read: false,
            timestamp: new Date().toISOString(),
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            addNotification,
            refreshNotifications,
            isLoading
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
