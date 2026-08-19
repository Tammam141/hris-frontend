import { apiRequest } from './client';

export interface FeatureCategory {
  category: string;
  label: string;
  features: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  }[];
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
    level: number;
  }[];
  categories: FeatureCategory[];
  grants: PositionFeature[];
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

export async function updatePositionFeaturesApi(positionId: string, codes: string[]) {
  return apiRequest(`/positions/${positionId}/features`, 'PUT', { codes });
}
