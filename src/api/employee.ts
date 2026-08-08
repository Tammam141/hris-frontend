import { apiRequest } from './client';
import { ListEmployeesParams, ListEmployeesResponse, Department, Position, CreateEmployeePayload, UpdateEmployeePayload } from '../types/employee';

export async function getEmployees(params: ListEmployeesParams): Promise<ListEmployeesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.department_id) queryParams.append('department_id', params.department_id);
  if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const response = await apiRequest('/employees?' + queryParams.toString(), 'GET');
  
  return response as ListEmployeesResponse;
}

export async function getDepartments(): Promise<{ success: boolean; data: Department[] }> {
  const response = await apiRequest('/departments', 'GET');
  return response as { success: boolean; data: Department[] };
}

export async function getPositions(): Promise<{ success: boolean; data: Position[] }> {
  const response = await apiRequest('/positions', 'GET');
  return response as { success: boolean; data: Position[] };
}

export async function createEmployee(data: CreateEmployeePayload): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest('/employees', 'POST', data);
  return response as { success: boolean; message: string };
}

export async function updateEmployee(id: string, data: UpdateEmployeePayload): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/employees/${id}`, 'PATCH', data);
  return response as { success: boolean; message: string };
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest(`/employees/${id}`, 'DELETE');
  return response as { success: boolean; message: string };
}
