import { apiRequest } from './client';
import { Position } from '../types/employee';

export async function getPositions(): Promise<{ success: boolean; data: Position[] }> {
  const response = await apiRequest('/positions', 'GET');
  return response as { success: boolean; data: Position[] };
}

export async function getPositionDetail(id: string): Promise<{ success: boolean; data: Position }> {
  const response = await apiRequest(`/positions/${id}`, 'GET');
  return response as { success: boolean; data: Position };
}

export async function createPosition(data: Partial<Position>): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest('/positions', 'POST', data);
  return response as { success: boolean; message: string };
}

export async function updatePosition(id: string, data: Partial<Position>): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/positions/${id}`, 'PATCH', data);
  return response as { success: boolean; message: string };
}

export async function deletePosition(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/positions/${id}`, 'DELETE');
  return response as { success: boolean; message: string };
}
