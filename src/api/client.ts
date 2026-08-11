const API_URL = '/api/v1';

export async function apiRequest(endpoint: string, method: string, body?: object) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const response = await fetch(API_URL + endpoint, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
    if (data?.details) error.details = data.details;
    if (response.status === 429 && data?.code) error.code = data.code;
    throw error;
  }

  return data;
}
