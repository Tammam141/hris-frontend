const API_URL = '/api/v1';

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
  let timeoutId: NodeJS.Timeout | undefined;

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

    const data = await response.json();

  if (response.status === 401 && endpoint !== '/auth/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    // Throw error anyway to stop execution chain
    throw new Error(data?.message || 'Sesi Anda telah berakhir, silakan login kembali');
  }

  if (!response.ok || !data.success) {
    let errorMsg = data?.message || 'Terjadi kesalahan pada server';
    
    // Parse array errors if available
    if (data?.errors && Array.isArray(data.errors)) {
      errorMsg = data.errors.map((e: any) => e.message).join(', ');
    }
    
    const error: any = new Error(errorMsg);
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
      throw new Error('Permintaan ke server kehabisan waktu (Timeout). Silakan coba lagi.');
    }
    throw err;
  }
}
