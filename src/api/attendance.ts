import { apiRequest } from './client';
import { Attendance, AttendanceSummary, AttendanceTodayResponse, MonthlyReportRow } from '../types/attendance';

// Fungsi menembak API absensi masuk (mendukung parameter offline_time jika baru online)
export async function checkInApi(note?: string, offline_time?: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/attendances/check-in', 'POST', { note, offline_time });
}

// Fungsi menembak API absensi pulang (mendukung parameter offline_time jika baru online)
export async function checkOutApi(note?: string, offline_time?: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest('/attendances/check-out', 'POST', { note, offline_time });
}

// Mengambil data dashboard hari ini (jadwal, status absen, dll)
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

// Mengambil daftar riwayat absensi khusus untuk user yang sedang login
export async function getMyAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/me${query ? `?${query}` : ''}`, 'GET');
}

// Mengambil daftar riwayat absensi untuk bawahan (khusus role Manager/Supervisor)
export async function getTeamAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/team${query ? `?${query}` : ''}`, 'GET');
}

// Mengambil daftar riwayat absensi seluruh karyawan (khusus role HR/Admin)
export async function getAllAttendancesApi(params?: Record<string, any>): Promise<AttendanceListResponse> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances${query ? `?${query}` : ''}`, 'GET');
}

// Mengambil rekap/laporan bulanan absensi (khusus HR/Admin)
export async function getAttendanceReportApi(params?: Record<string, any>): Promise<{ success: boolean; data: MonthlyReportRow[] }> {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  return apiRequest(`/attendances/report${query ? `?${query}` : ''}`, 'GET');
}

// Tipe data untuk fitur koreksi absensi oleh HR
export interface CorrectAttendancePayload {
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday';
  check_in_at?: string;
  check_out_at?: string;
  reason: string;
}

// Fungsi mengeksekusi koreksi absensi (khusus HR/Admin)
export async function correctAttendanceApi(id: string, data: CorrectAttendancePayload): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/attendances/${id}/correct`, 'PATCH', data);
}
