import { apiRequest } from './client';
import { OrgTree, LineManagerResponse } from '../types/org';

export async function getOrgTree(): Promise<{ success: boolean; data: OrgTree }> {
  const response = await apiRequest('/org/tree', 'GET');
  return response as { success: boolean; data: OrgTree };
}

export async function getLineManager(employeeId: string): Promise<{ success: boolean; data: LineManagerResponse }> {
  const response = await apiRequest(`/employees/${employeeId}/line-manager`, 'GET');
  return response as { success: boolean; data: LineManagerResponse };
}
