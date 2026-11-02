import { apiRequest } from './client';

export interface AccessProfile {
  id: string;
  code?: string;
  name: string;
  description: string | null;
  is_system: boolean;
  codes: string[];
  position_count: number;
  employee_count: number;
  updated_at: string;
}

export interface FeatureItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_sensitive?: boolean;
  requires?: string[];
}

export interface FeatureCategory {
  category: string;
  label: string;
  features: FeatureItem[];
}

export interface PositionFeature {
  position_id: string;
  feature_id: string;
}

export interface FeatureMatrixResponse {
  positions: {
    id: string;
    code: string;
    name: string;
    level?: number;
    department_id?: string | null;
    department_name?: string | null;
    is_unit_head?: boolean;
    access_profile_id?: string | null;
    updated_at: string;
  }[];
  categories: FeatureCategory[];
  access_profiles?: AccessProfile[];
  grants?: PositionFeature[];
}

export async function getFeaturesApi() {
  return apiRequest('/features', 'GET');
}

export async function getFeatureMatrixApi(): Promise<{ success: boolean; data: FeatureMatrixResponse }> {
  return apiRequest('/features/matrix', 'GET');
}

export async function getPositionFeaturesApi(positionId: string) {
  return apiRequest(`/positions/${positionId}/features`, 'GET');
}

export async function updatePositionFeaturesApi(positionId: string, codes: string[], updated_at?: string) {
  return apiRequest(`/positions/${positionId}/features`, 'PUT', { codes, updated_at });
}

export async function getAccessProfilesApi(): Promise<{ success: boolean; data: AccessProfile[] }> {
  return apiRequest('/access-profiles', 'GET');
}

export async function getAccessProfileDetailApi(id: string): Promise<{ success: boolean; data: AccessProfile }> {
  return apiRequest(`/access-profiles/${id}`, 'GET');
}

export async function createAccessProfileApi(data: { name: string; description?: string; codes: string[] }): Promise<{ success: boolean; data: AccessProfile; message?: string }> {
  return apiRequest('/access-profiles', 'POST', data);
}

export async function updateAccessProfileApi(id: string, data: { name?: string; description?: string; codes?: string[]; updated_at?: string }): Promise<{ success: boolean; data: AccessProfile; message?: string }> {
  return apiRequest(`/access-profiles/${id}`, 'PATCH', data);
}

export async function deleteAccessProfileApi(id: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/access-profiles/${id}`, 'DELETE');
}

export async function updatePositionAccessProfileApi(positionId: string, data: { access_profile_id: string | null; updated_at?: string }): Promise<{ success: boolean; data: any; message?: string }> {
  return apiRequest(`/positions/${positionId}/access-profile`, 'PUT', data);
}

