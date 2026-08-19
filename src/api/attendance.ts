import { apiRequest } from './client';
import { Attendance, AttendanceSummary, AttendanceTodayResponse, MonthlyReportRow } from '../types/attendance';

export async function checkInApi(note?: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/attendances/check-in', 'POST', { note });
}

export async function checkOutApi(note?: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/attendances/check-out', 'POST', { note });
}

export async function getTodayAttendanceApi(): Promise<{ success: boolean; data: AttendanceTodayResponse }> {
  return apiRequest('/attendances/today', 'GET');
}

export interface AttendanceListResponse {
  success: boolean;
  data: Attendance[];
  summary?: AttendanceSummary;
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getMyAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/me${query ? `?${query}` : ''}`, 'GET');
}

export async function getTeamAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/team${query ? `?${query}` : ''}`, 'GET');
}

export async function getAllAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances${query ? `?${query}` : ''}`, 'GET');
}

export async function getAttendanceReportApi(params?: Record<string, any>): Promise<{ success: boolean; data: MonthlyReportRow[] }> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/report${query ? `?${query}` : ''}`, 'GET');
}

export interface CorrectAttendancePayload {
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday';
  check_in_at?: string;
  check_out_at?: string;
  reason: string;
}

export async function correctAttendanceApi(id: string, data: CorrectAttendancePayload): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/attendances/${id}/correct`, 'PATCH', data);
}
