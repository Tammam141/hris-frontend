import { ApiError } from '../api/client';

export interface StaleDataDetails {
  current: any;
  last_changed_by: {
    name: string | null;
    email: string | null;
    at: string;
  } | null;
}

export function isStaleData(err: unknown): err is ApiError & { details: StaleDataDetails } {
  if (typeof err === 'object' && err !== null) {
    const apiErr = err as any;
    return apiErr.status === 409 && apiErr.code === 'STALE_DATA';
  }
  return false;
}
