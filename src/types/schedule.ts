export interface WorkSchedule {
  id: string;
  name: string;
  department_id: string | null; // null = jadwal bawaan untuk semua
  start_time: string;           // string jam "HH:MM:SS" atau "HH:MM"
  end_time: string;
  late_tolerance_minutes: number;
  absent_cutoff_time: string;
  works_monday: boolean;
  works_tuesday: boolean;
  works_wednesday: boolean;
  works_thursday: boolean;
  works_friday: boolean;
  works_saturday: boolean;
  works_sunday: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
