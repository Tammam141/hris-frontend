import { apiRequest } from './client';

// INTERFACES

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  default_quota: number;
  deducts_balance: boolean;
  requires_attachment: boolean;
  attachment_required_after: number | null;
  max_days_per_request: number | null;
  min_notice_days: number | null;
  gender_restriction: 'male' | 'female' | null;
  is_active: boolean;
}

export interface LeaveRequestData {
  leave_type_id: string;
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  reason?: string;
}

export interface LeaveAttachment {
  id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  employee_name: string;
  leave_type_name: string;
  approver_id: string | null;
  attachment_required: boolean;
  attachments?: LeaveAttachment[];
  decision_note?: string;
  created_at?: string;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  period_year: number;
  balance: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

// LEAVE TYPES — CRUD (HR/Admin bisa tulis, semua bisa baca)

export async function getLeaveTypes(): Promise<{ data: LeaveType[] }> {
  return apiRequest('/leave-types', 'GET');
}

export async function getLeaveTypeDetail(id: string): Promise<{ data: LeaveType }> {
  return apiRequest(`/leave-types/${id}`, 'GET');
}

export async function createLeaveType(data: Partial<LeaveType>): Promise<{ success: boolean; message: string }> {
  return apiRequest('/leave-types', 'POST', data);
}

export async function updateLeaveType(id: string, data: Partial<LeaveType>): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/leave-types/${id}`, 'PATCH', data);
}

export async function deleteLeaveType(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/leave-types/${id}`, 'DELETE');
}

// LEAVE BALANCES

export async function getMyLeaveBalances(periodYear?: number): Promise<{ data: { employee_id: string; period_year: number; balances: LeaveBalance[] } }> {
  const query = periodYear ? `?period_year=${periodYear}` : '';
  return apiRequest(`/leave-balances/me${query}`, 'GET');
}

export async function getMyBalanceLedger(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<any>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest(`/leave-balances/me/ledger${qs ? '?' + qs : ''}`, 'GET');
}

export async function getEmployeeBalance(employeeId: string, periodYear?: number): Promise<any> {
  const query = periodYear ? `?period_year=${periodYear}` : '';
  return apiRequest(`/leave-balances/${employeeId}${query}`, 'GET');
}

export async function adjustBalance(data: {
  employee_id: string;
  leave_type_id: string;
  period_year: number;
  amount: number;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  const payload = {
    employee_id: data.employee_id,
    leave_type_id: data.leave_type_id,
    period_year: data.period_year,
    amount: data.amount,
    note: data.reason
  };
  return apiRequest('/leave-balances/adjustments', 'POST', payload);
}

// LEAVE REQUESTS — Pengajuan Cuti

export async function createLeaveRequest(data: LeaveRequestData): Promise<{ data: LeaveRequest }> {
  return apiRequest('/leave-requests', 'POST', data);
}

export async function getMyLeaveRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LeaveRequest>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest(`/leave-requests/me${qs ? '?' + qs : ''}`, 'GET');
}

export async function getLeaveRequestDetail(id: string): Promise<{ data: LeaveRequest }> {
  return apiRequest(`/leave-requests/${id}`, 'GET');
}

export async function getAllLeaveRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LeaveRequest>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest(`/leave-requests${qs ? '?' + qs : ''}`, 'GET');
}

// LEAVE APPROVALS

export async function getLeaveApprovals(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LeaveRequest>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest(`/leave-requests/approvals${qs ? '?' + qs : ''}`, 'GET');
}

export async function approveLeaveRequest(id: string, decisionNote?: string): Promise<any> {
  return apiRequest(`/leave-requests/${id}/approve`, 'PATCH', decisionNote ? { decision_note: decisionNote } : undefined);
}

export async function rejectLeaveRequest(id: string, decisionNote?: string): Promise<any> {
  return apiRequest(`/leave-requests/${id}/reject`, 'PATCH', decisionNote ? { decision_note: decisionNote } : undefined);
}

export async function cancelLeaveRequest(id: string): Promise<any> {
  return apiRequest(`/leave-requests/${id}/cancel`, 'PATCH');
}

// ATTACHMENTS

export async function uploadLeaveAttachment(requestId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`
  };
  
  const response = await fetch(`/api/v1/leave-requests/${requestId}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.message || 'Gagal mengunggah foto');
  }
  return responseData;
}

export async function getLeaveAttachments(requestId: string): Promise<{ data: LeaveAttachment[] }> {
  return apiRequest(`/leave-requests/${requestId}/attachments`, 'GET');
}

export async function getAttachmentSignedUrl(attachmentId: string): Promise<{ data: { url: string } }> {
  return apiRequest(`/leave-attachments/${attachmentId}/url`, 'GET');
}
