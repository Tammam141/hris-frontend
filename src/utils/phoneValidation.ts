/**
 * Helper dan konstanta validasi pesan nomor telepon dari backend.
 */
export const PHONE_ALREADY_REGISTERED_MSG = 'Nomor telepon sudah terdaftar';
export const PHONE_ALREADY_REGISTERED_API_MSG = 'Phone number is already registered';
export const PHONE_FORMAT_INVALID_MSG = 'Format nomor telepon tidak valid, contoh: +628123456789';

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
