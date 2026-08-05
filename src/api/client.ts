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

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Terjadi kesalahan pada server');
  }

  return data;
}
