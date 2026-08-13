import { apiRequest } from './client';

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  is_collective_leave: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getHolidays(params?: {
  page?: number;
  limit?: number;
  year?: number;
}): Promise<PaginatedResponse<Holiday>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.year) query.set('year', String(params.year));
  const qs = query.toString();
  return apiRequest(`/holidays${qs ? '?' + qs : ''}`, 'GET');
}

export async function getHolidayDetail(id: string): Promise<{ data: Holiday }> {
  return apiRequest(`/holidays/${id}`, 'GET');
}

export async function createHoliday(data: {
  name: string;
  date: string;
  is_collective_leave: boolean;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest('/holidays', 'POST', data);
}

export async function updateHoliday(
  id: string,
  data: Partial<{ name: string; date: string; is_collective_leave: boolean }>
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/holidays/${id}`, 'PATCH', data);
}

export async function deleteHoliday(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/holidays/${id}`, 'DELETE');
}
