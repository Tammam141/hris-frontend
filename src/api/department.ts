import { apiRequest } from './client';
import { Department } from '../types/employee';

export async function getDepartments(): Promise<{ success: boolean; data: Department[] }> {
  const response = await apiRequest('/departments', 'GET');
  return response as { success: boolean; data: Department[] };
}

export async function getDepartmentDetail(id: string): Promise<{ success: boolean; data: Department }> {
  const response = await apiRequest(`/departments/${id}`, 'GET');
  return response as { success: boolean; data: Department };
}

export async function createDepartment(data: Partial<Department>): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest('/departments', 'POST', data);
  return response as { success: boolean; message: string };
}

export async function updateDepartment(id: string, data: Partial<Department>): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/departments/${id}`, 'PATCH', data);
  return response as { success: boolean; message: string };
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/departments/${id}`, 'DELETE');
  return response as { success: boolean; message: string };
}
