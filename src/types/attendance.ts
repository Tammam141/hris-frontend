import { WorkSchedule } from './schedule';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday';

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;     
  check_in_at: string | null;  
  check_out_at: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  work_minutes: number | null;
  leave_request_id: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
  
  employee_name?: string;
  employee_number?: string;
  department_name?: string;
  position_name?: string;
}

export interface AttendanceTodayResponse {
  date: string;
  server_time: string;           
  schedule: WorkSchedule | null;
  attendance: Attendance | null;
  can_check_in: boolean;
  can_check_out: boolean;
  blocked_reason: string | null;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  total_late_minutes: number;
  total_work_minutes: number;
}

export interface MonthlyReportRow {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string;
  position_name: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  total_late_minutes: number;
  total_work_minutes: number;
}
