import { apiRequest } from './client';
import { WorkSchedule } from '../types/schedule';

export async function getSchedulesApi(): Promise<{ success: boolean; data: WorkSchedule[] }> {
  return apiRequest('/work-schedules', 'GET');
}

export async function getMyScheduleApi(): Promise<{ success: boolean; data: WorkSchedule | null }> {
  return apiRequest('/work-schedules/me', 'GET');
}

export async function getScheduleByIdApi(id: string): Promise<{ success: boolean; data: WorkSchedule }> {
  return apiRequest(`/work-schedules/${id}`, 'GET');
}

export async function createScheduleApi(data: Partial<WorkSchedule>): Promise<{ success: boolean; data: WorkSchedule; message?: string }> {
  return apiRequest('/work-schedules', 'POST', data);
}

export async function updateScheduleApi(id: string, data: Partial<WorkSchedule>): Promise<{ success: boolean; data: WorkSchedule; message?: string }> {
  return apiRequest(`/work-schedules/${id}`, 'PATCH', data);
}

export async function deleteScheduleApi(id: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/work-schedules/${id}`, 'DELETE');
}
