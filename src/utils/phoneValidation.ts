/**
 * Helper dan konstanta validasi pesan nomor telepon dan batch rows dari backend.
 */
export const PHONE_ALREADY_REGISTERED_MSG = 'Nomor telepon sudah terdaftar';
export const PHONE_ALREADY_REGISTERED_API_MSG = 'Phone number is already registered';
export const PHONE_FORMAT_INVALID_MSG = 'Format nomor telepon tidak valid, contoh: +628123456789';

const DUPLICATE_ROW_PATTERN = /duplicates row (\d+)/i;

/**
 * Pengecekan nomor telepon kembar (Conflict):
 * HANYA bila status === 409 dan pesan === 'Phone number is already registered'
 */
export function isPhoneAlreadyRegisteredError(err: { status?: number; code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.status === 409 && err.message === PHONE_ALREADY_REGISTERED_API_MSG;
}

/**
 * Pengecekan error validasi format nomor telepon (status 400 / VALIDATION_ERROR).
 */
export function isPhoneFormatValidationError(err: { status?: number; code?: string; message?: string; errors?: any[] } | null | undefined): boolean {
  if (!err) return false;
  if (err.status === 400 || err.code === 'VALIDATION_ERROR') {
    if (err.message && err.message.toLowerCase().includes('phone')) return true;
    if (Array.isArray(err.errors) && err.errors.some((e: any) => e.field === 'phone' || e.message?.toLowerCase().includes('phone'))) {
      return true;
    }
  }
  return false;
}

/**
 * Memetakan error per-baris untuk field nomor telepon saat batch import / tambah banyak karyawan.
 * - "Phone number is already registered" -> "Nomor telepon sudah terdaftar"
 * - "Phone number duplicates row N in this request" -> "Nomor telepon kembar dengan baris N"
 * - Lainnya -> "Format nomor telepon tidak valid, contoh: +628123456789"
 */
export function phoneRowErrorMessage(apiMessage: string): string {
  if (apiMessage === PHONE_ALREADY_REGISTERED_API_MSG) return PHONE_ALREADY_REGISTERED_MSG;
  const twin = apiMessage?.match(DUPLICATE_ROW_PATTERN);
  if (twin) return `Nomor telepon kembar dengan baris ${twin[1]}`;
  return PHONE_FORMAT_INVALID_MSG;
}

/**
 * Memetakan error per-baris untuk field email saat batch import / tambah banyak karyawan.
 * - "Email is already registered" -> "Email sudah terdaftar"
 * - "Email duplicates row N in this request" -> "Email kembar dengan baris N"
 * - Lainnya -> pesan error dari API
 */
export function emailRowErrorMessage(apiMessage: string): string {
  if (apiMessage === 'Email is already registered' || apiMessage?.toLowerCase().includes('email is already registered')) {
    return 'Email sudah terdaftar';
  }
  const twin = apiMessage?.match(DUPLICATE_ROW_PATTERN);
  if (twin) return `Email kembar dengan baris ${twin[1]}`;
  return apiMessage || 'Email tidak valid';
}
