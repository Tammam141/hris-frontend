import { ApiError } from '../api/client';

/**
 * Cek error RATE_LIMIT_EXCEEDED (429) dan jadikan Type Guard untuk objek `err.retryAfter`.
 * True bila `err.status === 429 && err.code === 'RATE_LIMIT_EXCEEDED'`
 */
export function isRateLimited(err: unknown): err is ApiError & { retryAfter: number } {
  if (typeof err === 'object' && err !== null) {
    const apiErr = err as ApiError;
    return (
      apiErr.status === 429 &&
      apiErr.code === 'RATE_LIMIT_EXCEEDED' &&
      typeof apiErr.retryAfter === 'number'
    );
  }
  return false;
}

/**
 * Alias untuk backward compatibility / komponen Alert UI.
 */
export function isRateLimit(err: unknown): err is ApiError {
  return isRateLimited(err);
}

/**
 * Mendapatkan pesan ramah pengguna dari error Rate Limit.
 */
export function getRateLimitMessage(err: unknown): string {
  if (isRateLimited(err)) {
    return err.message || `Terlalu banyak permintaan. Coba lagi dalam ${err.retryAfter} detik.`;
  }
  return 'Terjadi kesalahan pada server';
}
