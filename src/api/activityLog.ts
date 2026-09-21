import { apiRequest } from './client';

export interface ActivityLog {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  status: 'success' | 'failed' | 'rejected' | string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface GetActivityLogsParams {
  action?: string;
  status?: string;
  entity?: string;
  entity_id?: string;
  actor_user_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogListResponse {
  success: boolean;
  data: ActivityLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getActivityLogsApi(params?: GetActivityLogsParams): Promise<ActivityLogListResponse> {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  return apiRequest(`/activity-logs${queryString ? `?${queryString}` : ''}`, 'GET');
}
