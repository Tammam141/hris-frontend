/**
 * Mengembalikan tanggal kalender polos tanpa konversi zona waktu (misal "2026-03-10").
 * Digunakan untuk tanggal absen, tanggal cuti, dsb yang hanya butuh YYYY-MM-DD.
 */
export function formatPlainDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // Terkadang backend mengembalikan "2026-03-10T00:00:00.000Z", kita hanya ambil depannya.
  return dateStr.split('T')[0];
}

/**
 * Memformat timestamp ke string representasi lokal dengan selalu memaksakan 
 * zona waktu Asia/Jakarta (WIB), mengabaikan zona waktu browser klien.
 */
export function formatToJakartaTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '-';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return timestamp;
  }
}

/**
 * Memformat timestamp ke HANYA JAM:MENIT (WIB).
 */
export function formatToJakartaTimeOnly(timestamp: string | null | undefined): string {
  if (!timestamp) return '-';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return timestamp;
  }
}

/**
 * Mengubah jumlah menit menjadi format ramah pengguna, misal "8 jam 30 menit".
 */
export function formatMinutesToDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined) return '-';
  if (totalMinutes === 0) return '0 menit';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);

  return parts.join(' ');
}
