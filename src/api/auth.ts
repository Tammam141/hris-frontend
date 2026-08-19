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

export async function updateMeApi(data: { full_name?: string, phone?: string, birth_date?: string, address?: string }) {
  return apiRequest('/auth/me', 'PATCH', data);
}


export async function changePasswordApi(current_password: string, new_password: string) {
  return apiRequest('/auth/password', 'PATCH', { current_password, new_password });
}

export async function verifyEmailApi(email: string, code: string) {
  return apiRequest('/auth/verify-email', 'POST', { email, code });
}

export async function resendVerificationApi(email: string) {
  return apiRequest('/auth/resend-verification', 'POST', { email });
}

export async function forgotPasswordApi(email: string) {
  return apiRequest('/auth/forgot-password', 'POST', { email });
}

export async function resetPasswordApi(email: string, token: string, password: string, password_confirmation: string) {
  return apiRequest('/auth/reset-password', 'POST', { email, token, password, password_confirmation });
}

export async function uploadMyPhotoApi(data: FormData) {
  return apiRequest('/auth/me/photo', 'POST', data);
}

export async function deleteMyPhotoApi() {
  return apiRequest('/auth/me/photo', 'DELETE');
}
