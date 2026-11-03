const GENDER_LABELS: Record<string, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
};

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  probation: 'Masa percobaan',
  contract: 'Kontrak',
  permanent: 'Tetap',
  intern: 'Magang',
  resigned: 'Berhenti',
};

const ROLE_LABELS: Record<string, string> = {
  employee: 'Karyawan',
  admin: 'Admin',
};

const FEATURE_CATEGORY_LABELS: Record<string, string> = {
  employee: 'Karyawan',
  employment: 'Karyawan',
  organization: 'Organisasi',
  leave: 'Cuti',
  attendance: 'Absensi',
  system: 'Sistem',
  schedule: 'Jadwal Kerja',
  work_schedule: 'Jadwal Kerja',
  holiday: 'Hari Libur',
  department: 'Unit Organisasi',
  position: 'Jabatan',
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  company: 'Perusahaan',
  directorate: 'Direktorat',
  division: 'Divisi',
  department: 'Departemen',
  team: 'Tim',
};

export const ENTITY_LABELS: Record<string, string> = {
  user: 'Pengguna',
  employee: 'Karyawan',
  leave: 'Cuti',
  leave_request: 'Pengajuan Cuti',
  leave_type: 'Jenis Cuti',
  attendance: 'Absensi',
  department: 'Unit Organisasi',
  position: 'Jabatan',
  holiday: 'Hari Libur',
  work_schedule: 'Jadwal Kerja',
  schedule: 'Jadwal Kerja',
  access_profile: 'Hak Akses',
  feature: 'Izin',
  system: 'Sistem',
};

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Masuk',
  'auth.logout': 'Keluar',
  'auth.password_change': 'Ubah kata sandi',
  'auth.password_reset': 'Atur ulang kata sandi',
  'attendance.check_in': 'Absen masuk',
  'attendance.check_out': 'Absen pulang',
  'attendance.correct': 'Koreksi absensi',
  'attendance.close_day': 'Penutupan hari',
  'leave.create': 'Pengajuan cuti',
  'leave.approve': 'Menyetujui cuti',
  'leave.reject': 'Menolak cuti',
  'leave.cancel': 'Membatalkan cuti',
  'leave.balance_adjust': 'Penyesuaian saldo',
  'employee.create': 'Tambah karyawan',
  'employee.update': 'Ubah karyawan',
  'employee.delete': 'Hapus karyawan',
  'access_profile.create': 'Tambah hak akses',
  'access_profile.update': 'Ubah hak akses',
  'access_profile.delete': 'Hapus hak akses',
  'position.access_profile_assign': 'Pasang hak akses ke jabatan',
  'schedule.create': 'Tambah jadwal kerja',
  'schedule.update': 'Ubah jadwal kerja',
  'schedule.delete': 'Hapus jadwal kerja',
  'department.create': 'Tambah unit',
  'department.update': 'Ubah unit',
  'department.delete': 'Hapus unit',
  'position.create': 'Tambah jabatan',
  'position.update': 'Ubah jabatan',
  'position.delete': 'Hapus jabatan',
  'holiday.create': 'Tambah hari libur',
  'holiday.update': 'Ubah hari libur',
  'holiday.delete': 'Hapus hari libur',
  'leave_type.create': 'Tambah jenis cuti',
  'leave_type.update': 'Ubah jenis cuti',
  'leave_type.delete': 'Hapus jenis cuti',
};

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getGenderLabel(gender: string | null | undefined): string {
  if (!gender) return '-';
  return GENDER_LABELS[gender.toLowerCase()] || gender;
}

export function getEmploymentStatusLabel(status: string | null | undefined): string {
  if (!status) return '-';
  return EMPLOYMENT_STATUS_LABELS[status.toLowerCase()] || status;
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '-';
  return ROLE_LABELS[role.toLowerCase()] || role;
}

export function getFeatureCategoryLabel(category: string | null | undefined): string {
  if (!category) return '-';
  const clean = category.toLowerCase().trim();
  return FEATURE_CATEGORY_LABELS[clean] || category;
}

// Penamaan izin hak akses diselaraskan dengan menu sidebar
export const FEATURE_NAMES_BY_CODE: Record<string, string> = {
  // Karyawan
  'employee.approve_user': 'Persetujuan Akun',
  'employee.view_all': 'Daftar Karyawan',
  'employee.create': 'Tambah Karyawan',
  'employee.update': 'Ubah Karyawan',
  'employee.delete': 'Hapus Karyawan',

  // Organisasi
  'organization.manage': 'Struktur & Unit Organisasi',
  'organization.schedule': 'Jadwal Kerja',
  'organization.holiday': 'Hari Libur',

  // Cuti
  'leave.approve_team': 'Persetujuan Cuti Bawahan',
  'leave.approve_all': 'Persetujuan Semua Cuti',
  'leave.view_all': 'Semua Pengajuan Cuti',
  'leave.manage_type': 'Jenis Cuti',
  'leave.adjust_balance': 'Penyesuaian Saldo',

  // Absensi
  'attendance.view_team': 'Absensi Tim',
  'attendance.view_all': 'Semua Absensi',
  'attendance.report': 'Riwayat Tombol Absen',
  'attendance.correct': 'Koreksi Absensi',

  // Sistem
  'system.view_log': 'Log Aktivitas',
  'system.view_api_docs': 'Dokumentasi API',
};

export const FEATURE_DESCRIPTIONS_BY_CODE: Record<string, string> = {
  'employee.approve_user': 'Meninjau dan menyetujui akun baru yang mendaftar mandiri (menu Persetujuan Akun).',
  'employee.view_all': 'Melihat daftar dan profil seluruh karyawan (menu Daftar Karyawan).',
  'employee.create': 'Menambah karyawan baru serta akunnya secara manual atau impor CSV (menu Tambah Karyawan & Impor CSV).',
  'employee.update': 'Mengubah data profil, jabatan, dan penempatan karyawan.',
  'employee.delete': 'Menghapus data karyawan dari sistem.',

  'organization.manage': 'Mengelola bagan organisasi, unit, jabatan, dan atasan (menu Struktur Organisasi, Unit Organisasi, Jabatan).',
  'organization.schedule': 'Mengatur jam kerja, hari kerja, dan toleransi absensi unit (menu Jadwal Kerja).',
  'organization.holiday': 'Mengelola hari libur nasional dan cuti bersama (menu Hari Libur).',

  'leave.approve_team': 'Menyetujui atau menolak cuti karyawan bawahan langsung (menu Persetujuan Cuti).',
  'leave.approve_all': 'Menyetujui atau menolak cuti seluruh karyawan perusahaan melebihi batas unit (menu Persetujuan Cuti).',
  'leave.view_all': 'Melihat seluruh riwayat pengajuan cuti semua karyawan (menu Persetujuan Cuti).',
  'leave.manage_type': 'Mengatur tipe cuti, kuota tahunan, dan aturan lampiran (menu Jenis Cuti).',
  'leave.adjust_balance': 'Menyesuaikan saldo cuti karyawan secara manual (menu Penyesuaian Saldo).',

  'attendance.view_team': 'Melihat kehadiran dan riwayat absensi bawahan langsung (menu Absensi Tim).',
  'attendance.view_all': 'Melihat dan mengekspor seluruh catatan absensi perusahaan (menu Semua Absensi).',
  'attendance.report': 'Melihat riwayat percobaan tekan tombol absen masuk dan pulang (menu Riwayat Tombol Absen).',
  'attendance.correct': 'Melakukan koreksi atau penyesuaian jam absensi karyawan.',

  'system.view_log': 'Melihat jejak riwayat aktivitas dan audit trail sistem (menu Log Aktivitas).',
  'system.view_api_docs': 'Melihat dokumentasi endpoint Swagger/OpenAPI (menu Dokumentasi API).',
};

export function getFeatureName(code: string | null | undefined, fallbackName?: string): string {
  if (!code) return fallbackName || '-';
  return FEATURE_NAMES_BY_CODE[code] || fallbackName || code;
}

export function getFeatureDescription(code: string | null | undefined, fallbackDesc?: string | null): string {
  if (!code) return fallbackDesc || '';
  return FEATURE_DESCRIPTIONS_BY_CODE[code] || fallbackDesc || '';
}

export function getUnitTypeLabel(unitType: string | null | undefined): string {
  if (!unitType) return '-';
  return UNIT_TYPE_LABELS[unitType.toLowerCase()] || unitType;
}

export function getEntityLabel(entity: string | null | undefined): string {
  if (!entity) return '-';
  return ENTITY_LABELS[entity.toLowerCase()] || entity;
}

export function getActivityActionLabel(action: string | null | undefined): { label: string; isKnown: boolean } {
  if (!action) return { label: '-', isKnown: false };
  const lower = action.toLowerCase();
  if (ACTIVITY_ACTION_LABELS[lower]) {
    return { label: ACTIVITY_ACTION_LABELS[lower], isKnown: true };
  }
  return { label: lower, isKnown: false };
}

export function parseDateSafe(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  // Handle YYYY-MM-DD
  if (typeof input === 'string') {
    const parts = input.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  const dt = new Date(input);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatPlainDate(input: string | Date | null | undefined): string {
  const d = parseDateSafe(input);
  if (!d) return typeof input === 'string' ? input : '-';
  const day = d.getDate();
  const month = ID_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatPlainDateRange(startDateStr: string | null | undefined, endDateStr: string | null | undefined): string {
  if (!startDateStr && !endDateStr) return '-';
  if (!startDateStr) return formatPlainDate(endDateStr);
  if (!endDateStr || startDateStr === endDateStr) return formatPlainDate(startDateStr);

  const start = parseDateSafe(startDateStr);
  const end = parseDateSafe(endDateStr);

  if (!start || !end) {
    return `${startDateStr} – ${endDateStr}`;
  }

  const sDay = start.getDate();
  const sMonth = ID_MONTHS[start.getMonth()];
  const sYear = start.getFullYear();

  const eDay = end.getDate();
  const eMonth = ID_MONTHS[end.getMonth()];
  const eYear = end.getFullYear();

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth} ${sYear}`;
  }

  if (sYear === eYear) {
    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
  }

  return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
}

export function formatTodayAttendanceHeader(date?: string | Date): string {
  const d = parseDateSafe(date) || new Date();
  const dayName = ID_DAYS[d.getDay()];
  const day = d.getDate();
  const month = ID_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `Absensi hari ini · ${dayName}, ${day} ${month} ${year}`;
}
