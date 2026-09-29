/**
 * Validasi Nama Lengkap sesuai aturan Backend HRIS:
 * - Hanya huruf (termasuk aksen/Unicode), spasi, titik, apostrof, tanda hubung.
 * - Harus diawali huruf.
 * - Panjang 3–150 karakter.
 */
export const FULL_NAME_REGEX = /^\p{L}[\p{L}\p{M} .'-]*$/u;
export const FULL_NAME_INVALID_MSG = 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung';

export function validateFullName(name: string): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return 'Nama lengkap wajib diisi';
  }
  if (trimmed.length < 3) {
    return 'Nama lengkap minimal 3 karakter';
  }
  if (trimmed.length > 150) {
    return 'Nama lengkap maksimal 150 karakter';
  }
  if (!FULL_NAME_REGEX.test(trimmed)) {
    return FULL_NAME_INVALID_MSG;
  }
  return null;
}
