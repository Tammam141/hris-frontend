import { clearSession } from '../utils/session';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  errors?: any;
  isNetworkError?: boolean;
  retryAfter?: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const API_URL = API_BASE + '/api/v1';

export async function apiRequest(endpoint: string, method: string, body?: object, options?: { timeout?: number }) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {};
  
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  let signal: AbortSignal | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Mekanisme Timeout:
  // Jika options.timeout diisi (misal: saat bulk request), kita buat AbortController
  // untuk menghentikan paksa (abort) request jika melebihi batas waktu yang ditentukan.
  // Jika options.timeout KOSONG (undefined/default), maka mekanisme abort ini tidak dipakai.
  // Request akan bergantung pada batas waktu default bawaan Browser (sekitar 2 - 5 menit).
  if (options?.timeout) {
    const controller = new AbortController();
    signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), options.timeout);
  }

  try {
    const response = await fetch(API_URL + endpoint, {
      method: method,
      headers: headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
      signal,
    });
    
    if (timeoutId) clearTimeout(timeoutId);

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      const err = new Error(
        !response.ok
          ? `Terjadi kesalahan pada server (Status: ${response.status}). Respons bukan JSON yang valid.`
          : 'Gagal memproses respons dari server'
      ) as ApiError;
      err.status = response.status;
      throw err;
    }

    if (response.status === 401 && endpoint !== '/auth/login') {
      clearSession().then(() => {
        window.location.href = '/login';
      });
      // Throw error anyway to stop execution chain
      const err = new Error(data?.message || 'Sesi Anda telah berakhir, silakan login kembali') as ApiError;
      err.status = response.status;
      throw err;
    }

    if (!response.ok || (data.success !== undefined && !data.success)) {
      // Rate Limit: Tangkap 429 RATE_LIMIT_EXCEEDED & baca header Retry-After untuk hitung mundur
      if (data?.code === 'RATE_LIMIT_EXCEEDED') {
        const retryHeader = response.headers ? response.headers.get('Retry-After') : null;
        const parsed = retryHeader ? parseInt(retryHeader, 10) : NaN;
        const retryAfter = !isNaN(parsed) && parsed > 0 ? parsed : 60;

        const errorMsg = `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.`;
        const error = new Error(errorMsg) as ApiError;
        error.status = response.status || 429;
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.retryAfter = retryAfter;
        if (data?.details) error.details = data.details;
        if (data?.errors) error.errors = data.errors;
        throw error;
      }

      let errorMsg = data?.message || 'Terjadi kesalahan pada server';
      
      // Parse array errors if available
      if (data?.errors && Array.isArray(data.errors)) {
        errorMsg = data.errors.map((e: any) => e.message).join(', ');
      }
      
      const error = new Error(errorMsg) as ApiError;
      error.status = response.status;
      if (data?.details) error.details = data.details;
      if (data?.code) error.code = data.code;
      if (data?.errors) error.errors = data.errors; // Store raw errors for specific handling
      throw error;
    }

    return data;

  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Permintaan ke server kehabisan waktu (Timeout). Silakan coba lagi.') as ApiError;
      timeoutErr.isNetworkError = true;
      throw timeoutErr;
    }
    
    // Check for network errors like TypeError: Failed to fetch
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      (err as any).isNetworkError = true;
    }
    throw err;
  }
}
