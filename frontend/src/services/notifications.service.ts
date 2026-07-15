import api from './api';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    link?: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unread_count: number;
    total_count: number;
}

class NotificationsService {
    async getNotifications(limit: number = 20, offset: number = 0): Promise<NotificationsResponse> {
        const response = await api.get('/notifications', {
            params: { limit, offset }
        });
        return response.data;
    }

    async getUnreadCount(): Promise<number> {
        const response = await api.get('/notifications/unread-count');
        return response.data.count;
    }

    async markAsRead(notificationId: string): Promise<void> {
        await api.patch(`/notifications/${notificationId}/read`);
    }

    async markAllAsRead(): Promise<void> {
        await api.patch('/notifications/mark-all-read');
    }

    async deleteNotification(notificationId: string): Promise<void> {
        await api.delete(`/notifications/${notificationId}`);
    }
}

export const notificationsService = new NotificationsService();
