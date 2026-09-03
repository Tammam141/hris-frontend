import { apiRequest } from './client';
import { Notification } from '../types/notification';

export interface GetNotificationsParams {
  only_unread?: boolean;
  page?: number;
  limit?: number;
}

export interface GetNotificationsResponse {
  success: boolean;
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    unread: number;
  };
}

export async function getNotifications(params?: GetNotificationsParams): Promise<GetNotificationsResponse> {
  const query = new URLSearchParams();
  if (params?.only_unread !== undefined) query.append('only_unread', String(params.only_unread));
  if (params?.page !== undefined) query.append('page', String(params.page));
  if (params?.limit !== undefined) query.append('limit', String(params.limit));

  const qs = query.toString();
  const url = qs ? `/notifications?${qs}` : '/notifications';
  
  const response = await apiRequest(url, 'GET');
  return response as GetNotificationsResponse;
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; data: Notification; meta: { unread: number } }> {
  const response = await apiRequest(`/notifications/${id}/read`, 'PATCH');
  return response as { success: boolean; data: Notification; meta: { unread: number } };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; meta: { unread: number; updated: number } }> {
  const response = await apiRequest(`/notifications/read-all`, 'PATCH');
  return response as { success: boolean; meta: { unread: number; updated: number } };
}
