export interface WorkSchedule {
  id: string;
  name: string;
  is_default: boolean;                                // jadwal bawaan untuk semua divisi tanpa jadwal sendiri
  department_ids: string[];                           // divisi pemakai jadwal
  departments: { id: string; name: string }[];
  /** @deprecated LAMA, jangan dipakai lagi. Gunakan department_ids. */
  department_id?: string | null;
  start_time: string;           // string jam "HH:MM:SS" atau "HH:MM"
  end_time: string;
  late_tolerance_minutes: number;
  absent_cutoff_time: string;
  overtime_min_minutes: number; // minimal menit setelah jam pulang agar dihitung lembur (bawaan 30)
  works_monday: boolean;
  works_tuesday: boolean;
  works_wednesday: boolean;
  works_thursday: boolean;
  works_friday: boolean;
  works_saturday: boolean;
  works_sunday: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at: string;
}
