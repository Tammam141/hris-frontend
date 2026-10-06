/**
 * Aturan validasi password saat registrasi:
 * - Minimal 8 karakter
 * - Maksimal 72 karakter (batas dari backend)
 * - Mengandung huruf besar (uppercase: A-Z)
 * - Mengandung huruf kecil (lowercase: a-z)
 * - Mengandung angka (digit: 0-9)
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MAX_MSG = `Password maksimal ${PASSWORD_MAX_LENGTH} karakter`;
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;

export const PASSWORD_UPPERCASE_MSG = 'Password harus mengandung setidaknya satu huruf besar (A-Z)';
export const PASSWORD_LOWERCASE_MSG = 'Password harus mengandung setidaknya satu huruf kecil (a-z)';
export const PASSWORD_NUMBER_MSG = 'Password harus mengandung setidaknya satu angka (0-9)';

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password wajib diisi';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return PASSWORD_MAX_MSG;
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return PASSWORD_UPPERCASE_MSG;
  }
  if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return PASSWORD_LOWERCASE_MSG;
  }
  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return PASSWORD_NUMBER_MSG;
  }
  return null;
}

/**
 * Mengenali error "password lama salah" dari PATCH /auth/password.
 * Backend saat ini membalas 401 "Current password is incorrect",
 * dan mungkin nanti diubah menjadi 400. Keduanya ditangani di sini.
 */
export const WRONG_CURRENT_PASSWORD_MSG = 'Password lama salah';

export function isWrongCurrentPasswordError(err: { status?: number; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.message === 'Current password is incorrect') return true;
  return err.status === 401;
}

