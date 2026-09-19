import { apiClient } from './client';

export const getNotifications = async (limit = 50) => {
  return apiClient(`/notifications?limit=${limit}`);
};

export const getUnreadCount = async () => {
  return apiClient(`/notifications/unread-count`);
};

export const markNotificationRead = async (id) => {
  return apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
};

export const markAllNotificationsRead = async () => {
  return apiClient(`/notifications/read-all`, { method: 'PATCH' });
};
