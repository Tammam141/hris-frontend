import { apiRequest } from './client';

export async function loginApi(email: string, password: string) {
  return apiRequest('/auth/login', 'POST', { email, password });
}

export async function registerApi(name: string, email: string, password: string) {
  return apiRequest('/auth/register', 'POST', { name, email, password });
}

export async function getMeApi() {
  return apiRequest('/auth/me', 'GET');
}
