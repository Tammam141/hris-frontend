import { apiRequest } from './client';

export async function loginApi(email: string, password: string) {
  return apiRequest('/auth/login', 'POST', { email, password });
}

export async function registerApi(full_name: string, email: string, password: string, phone: string, gender: string, terms_accepted: boolean) {
  return apiRequest('/auth/register', 'POST', { full_name, email, password, phone, gender, terms_accepted });
}

export async function getMeApi() {
  return apiRequest('/auth/me', 'GET');
}
