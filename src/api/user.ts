import { apiRequest } from './client';

export interface PendingUser {
  id: string;
  email: string;
  created_at: string;
}

export async function getPendingUsers(): Promise<{ success: boolean; data: PendingUser[] }> {
  const response = await apiRequest('/users/pending', 'GET');
  return response as { success: boolean; data: PendingUser[] };
}

export async function approveUser(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/users/${id}/approve`, 'PATCH');
  return response as { success: boolean; message: string };
}

export async function setUserActive(id: string, is_active: boolean): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/users/${id}/status`, 'PATCH', { is_active });
  return response as { success: boolean; message: string };
}
