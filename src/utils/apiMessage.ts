import { ApiError } from '../api/client';

function translateAttendanceStatus(status: string): string {
  const map: Record<string, string> = {
    present: 'hadir',
    late: 'terlambat',
    absent: 'tidak hadir',
    'on leave': 'cuti',
    holiday: 'libur',
  };
  const key = status.trim().toLowerCase();
  return map[key] || status;
}

type DictionaryRule = {
  pattern: RegExp;
  replace: string | ((match: RegExpMatchArray) => string);
};

const ERROR_DICTIONARY: DictionaryRule[] = [
  {
    pattern: /Check-in closed at (\d{2}:\d{2})/i,
    replace: 'Absen masuk sudah ditutup pukul $1. Hari ini tercatat tidak hadir.',
  },
  {
    pattern: /You already checked in today at (\S+)/i,
    replace: 'Anda sudah absen masuk hari ini pukul $1.',
  },
  {
    pattern: /You already checked out today at (\S+)/i,
    replace: 'Anda sudah absen pulang hari ini pukul $1.',
  },
  {
    pattern: /haven't checked in today/i,
    replace: 'Anda belum absen masuk hari ini.',
  },
  {
    pattern: /can't check out before work starts at (\S+)/i,
    replace: 'Absen pulang baru bisa dilakukan setelah jam masuk ($1).',
  },
  {
    pattern: /is not a workday according to the (.+) schedule/i,
    replace: 'Hari ini bukan hari kerja menurut jadwal $1.',
  },
  {
    pattern: /is a holiday:\s*(.+)/i,
    replace: 'Hari ini libur: $1.',
  },
  {
    pattern: /You are on approved leave/i,
    replace: 'Anda sedang cuti pada tanggal ini.',
  },
  {
    pattern: /Today's attendance is recorded as (.+)/i,
    replace: (m: RegExpMatchArray) => `Absensi hari ini sudah tercatat sebagai ${translateAttendanceStatus(m[1])}.`,
  },
  {
    pattern: /No work schedule applies to you/i,
    replace: 'Belum ada jadwal kerja untuk Anda. Hubungi admin.',
  },
  {
    pattern: /Insufficient (.+) balance\. You have ([\d.]+) days? left, but your request is ([\d.]+)/i,
    replace: 'Saldo $1 tidak cukup. Sisa $2 hari, sedangkan pengajuan $3 hari.',
  },
  {
    pattern: /Requests for past dates are only allowed for sick leave/i,
    replace: 'Tanggal yang sudah lewat hanya bisa diajukan untuk cuti sakit.',
  },
  {
    pattern: /That date range contains no workdays/i,
    replace: 'Rentang tanggal tersebut tidak berisi hari kerja.',
  },
  {
    pattern: /That leave type is currently inactive/i,
    replace: 'Jenis cuti ini sedang tidak aktif.',
  },
  {
    pattern: /is not available for your gender/i,
    replace: 'Jenis cuti ini tidak tersedia untuk jenis kelamin Anda.',
  },
  {
    pattern: /must be requested at least (\d+) days?/i,
    replace: 'Jenis cuti ini harus diajukan paling lambat $1 hari sebelumnya.',
  },
  {
    pattern: /allows at most (\d+) workdays? per request/i,
    replace: 'Jenis cuti ini maksimal $1 hari kerja per pengajuan.',
  },
  {
    pattern: /You already have a leave request with status/i,
    replace: 'Anda sudah punya pengajuan cuti yang tanggalnya bertabrakan.',
  },
  {
    pattern: /The request status has changed, please reload/i,
    replace: 'Status pengajuan sudah berubah. Muat ulang halaman.',
  },
  {
    pattern: /You are not the approver for this leave request/i,
    replace: 'Anda bukan penyetuju pengajuan cuti ini.',
  },
  {
    pattern: /Current password is incorrect/i,
    replace: 'Kata sandi saat ini salah.',
  },
  {
    pattern: /Email is already registered/i,
    replace: 'Email sudah terdaftar.',
  },
  {
    pattern: /Phone number is already registered/i,
    replace: 'Nomor telepon sudah terdaftar.',
  },
  {
    pattern: /Token is invalid or has expired|Invalid token/i,
    replace: 'Tautan atau kode sudah tidak berlaku. Silakan minta yang baru.',
  },
  {
    pattern: /does not have access to the requested feature|don't have access to this feature/i,
    replace: 'Jabatan Anda tidak memiliki izin untuk tindakan ini.',
  },
  {
    pattern: /not logged in/i,
    replace: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
  },
  {
    pattern: /has not happened yet/i,
    replace: 'Jam yang diisi belum terjadi. Isi setelah jamnya lewat.',
  },
  {
    pattern: /Check-in time must be on the attendance date/i,
    replace: 'Jam masuk harus berada di tanggal absensi tersebut.',
  },
  {
    pattern: /Check-out time must be on .* or the following day/i,
    replace: 'Jam pulang paling lambat keesokan harinya.',
  },
  {
    pattern: /belongs to an approved leave request/i,
    replace: 'Hari ini termasuk cuti yang sudah disetujui. Ubah lewat pengajuan cutinya.',
  },
  {
    pattern: /already use another work schedule:\s*(.+)\.\s*Remove/i,
    replace: 'Unit berikut sudah memakai jadwal lain: $1. Lepaskan dulu dari jadwal tersebut.',
  },
  {
    pattern: /Working hours (\S+) overlap with another work schedule:\s*(.+?)\.\s*Schedules may only meet/i,
    replace: 'Jam kerja $1 beririsan dengan jadwal lain: $2. Jadwal hanya boleh bersambung, misalnya satu selesai 17:00 dan berikutnya mulai 17:00.',
  },
  {
    pattern: /Working hours (\S+) overlap with another work schedule:\s*(.+)/i,
    replace: 'Jam kerja $1 beririsan dengan jadwal lain: $2. Jadwal hanya boleh bersambung, misalnya satu selesai 17:00 dan berikutnya mulai 17:00.',
  },
  {
    pattern: /Choose at least one department/i,
    replace: 'Pilih minimal satu unit untuk jadwal ini.',
  },
  {
    pattern: /Some features are missing what they need/i,
    replace: 'Ada izin yang membutuhkan izin lain. Centang izin dasarnya terlebih dahulu.',
  },
  {
    pattern: /An access profile named (.+) already exists/i,
    replace: 'Hak akses bernama $1 sudah ada.',
  },
  {
    pattern: /is still used by (\d+) positions?/i,
    replace: 'Hak akses ini masih dipakai $1 jabatan. Pindahkan dulu jabatannya ke hak akses lain.',
  },
  {
    pattern: /is a standard access profile and cannot be deleted/i,
    replace: 'Hak akses standar tidak bisa dihapus.',
  },
  {
    pattern: /System access profile cannot be deleted/i,
    replace: 'Hak akses standar tidak bisa dihapus.',
  },
  {
    pattern: /Access profile not found/i,
    replace: 'Hak akses tidak ditemukan. Mungkin sudah dihapus.',
  },
  {
    pattern: /(.+) now has employee self-service access only/i,
    replace: '$1 sekarang hanya memiliki akses dasar.',
  },
  {
    pattern: /now has employee self-service access only/i,
    replace: 'Sekarang hanya memiliki akses dasar.',
  },
  {
    pattern: /(.+) now uses (.+)$/i,
    replace: '$1 sekarang memakai hak akses $2.',
  },
  {
    pattern: /now uses (.+)$/i,
    replace: 'Sekarang memakai hak akses $1.',
  },
  {
    pattern: /Access profile updated, the change applies to (\d+) positions?/i,
    replace: 'Hak akses disimpan dan langsung berlaku untuk $1 jabatan.',
  },
  {
    pattern: /Leave type code (.+) was used by a deleted leave type/i,
    replace: 'Kode $1 pernah dipakai jenis cuti yang sudah dihapus. Gunakan kode lain.',
  },
  {
    pattern: /Leave type code (.+) is already in use/i,
    replace: 'Kode jenis cuti $1 sudah dipakai.',
  },
  {
    pattern: /needs a default quota of at least 1 day/i,
    replace: 'Cuti yang memotong saldo wajib memiliki kuota minimal 1 hari.',
  },
  {
    pattern: /cannot be lowered to (\d+) days?/i,
    replace: 'Kuota tidak bisa diturunkan menjadi $1 hari karena ada karyawan yang sudah memakai lebih dari itu.',
  },
  {
    pattern: /cannot start deducting balance while (\d+)/i,
    replace: 'Masih ada $1 pengajuan yang menunggu. Selesaikan dulu sebelum mengaktifkan potong saldo.',
  },
  {
    pattern: /Validation failed/i,
    replace: 'Data yang diisi belum benar.',
  },
  {
    pattern: /Invalid email or password/i,
    replace: 'Email atau kata sandi salah.',
  },
  {
    pattern: /Password must be at least/i,
    replace: 'Kata sandi minimal 8 karakter.',
  },
  {
    pattern: /User not found/i,
    replace: 'Pengguna tidak ditemukan.',
  },
  {
    pattern: /Employee not found/i,
    replace: 'Data karyawan tidak ditemukan.',
  },
  {
    pattern: /Position not found/i,
    replace: 'Data jabatan tidak ditemukan.',
  },
  {
    pattern: /Department not found/i,
    replace: 'Data unit tidak ditemukan.',
  },
  {
    pattern: /Holiday not found/i,
    replace: 'Data hari libur tidak ditemukan.',
  },
  {
    pattern: /Leave request not found/i,
    replace: 'Data pengajuan cuti tidak ditemukan.',
  },
  {
    pattern: /Leave type not found/i,
    replace: 'Data jenis cuti tidak ditemukan.',
  },
  {
    pattern: /Work schedule not found/i,
    replace: 'Data jadwal kerja tidak ditemukan.',
  },
  {
    pattern: /Cannot delete department with active/i,
    replace: 'Unit tidak dapat dihapus karena masih memiliki data aktif.',
  },
  {
    pattern: /Cannot delete position with active/i,
    replace: 'Jabatan tidak dapat dihapus karena masih memiliki data aktif.',
  },
  {
    pattern: /Already checked in/i,
    replace: 'Anda sudah absen masuk hari ini.',
  },
  {
    pattern: /Already checked out/i,
    replace: 'Anda sudah absen pulang hari ini.',
  },
  {
    pattern: /Failed to fetch/i,
    replace: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  },
];

export function translateMessage(rawMessage: string): string | null {
  if (!rawMessage || typeof rawMessage !== 'string') return null;

  for (const rule of ERROR_DICTIONARY) {
    const match = rawMessage.match(rule.pattern);
    if (match) {
      if (typeof rule.replace === 'function') {
        return rule.replace(match);
      }
      return rawMessage.replace(rule.pattern, rule.replace);
    }
  }

  return null;
}

export function toFieldErrorMessage(rawMessage: unknown): string {
  if (typeof rawMessage === 'string') {
    const translated = translateMessage(rawMessage);
    if (translated) return translated;
  }
  return 'Isian ini belum benar.';
}

export function toUserMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError | undefined;

  // 1. Network error check
  if (apiErr?.isNetworkError || (err instanceof TypeError && err.message === 'Failed to fetch')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  const rawMessage = apiErr?.message || (err instanceof Error ? err.message : '');

  // 2. Cocokkan dengan kamus regex
  if (rawMessage) {
    const translated = translateMessage(rawMessage);
    if (translated) {
      return translated;
    }
  }

  // 3. Status / Code check
  const code = apiErr?.code;
  const status = apiErr?.status;

  if (code === 'VALIDATION_ERROR') {
    return 'Data yang diisi belum benar. Periksa kembali isian yang ditandai.';
  }
  if (code === 'UNAUTHORIZED' || status === 401) {
    return 'Sesi Anda sudah berakhir. Silakan masuk kembali.';
  }
  if (code === 'FORBIDDEN' || status === 403) {
    return 'Jabatan Anda tidak memiliki izin untuk tindakan ini.';
  }
  if (code === 'NOT_FOUND' || status === 404) {
    return 'Data tidak ditemukan. Mungkin sudah dihapus.';
  }
  if (code === 'STALE_DATA') {
    return 'Data ini sudah diubah oleh pengguna lain. Muat ulang halaman.';
  }
  if (code === 'RATE_LIMIT_EXCEEDED' || status === 429) {
    if (rawMessage && rawMessage.startsWith('Terlalu banyak permintaan')) {
      return rawMessage;
    }
    return 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.';
  }
  if (status && status >= 500) {
    return 'Terjadi gangguan di server. Coba lagi beberapa saat lagi.';
  }

  // Log unknown message in DEV mode so dictionary can be supplemented
  if (import.meta.env.DEV && rawMessage) {
    console.warn(`[apiMessage] Unknown backend message: "${rawMessage}". Fallback used: "${fallback}"`);
  }

  // 4. Fallback (never return raw English message)
  return fallback;
}
