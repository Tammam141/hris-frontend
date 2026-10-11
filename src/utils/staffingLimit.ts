import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export interface StaffingLimitFullDate {
  date: string;
  on_leave?: number;
}

export interface StaffingLimitDetails {
  department_name?: string;
  max_concurrent_leave?: number;
  full_dates?: StaffingLimitFullDate[];
  can_override?: boolean;
}

export function isStaffingLimitError(err: any): boolean {
  if (!err) return false;
  return err.status === 409 && (err.code === 'STAFFING_LIMIT_REACHED' || err.error?.code === 'STAFFING_LIMIT_REACHED');
}

export function formatStaffingLimitMessage(details?: StaffingLimitDetails): string {
  if (!details) {
    return 'Kuota cuti bersamaan departemen sudah penuh. Silakan pilih tanggal lain.';
  }

  const deptName = details.department_name ? ` ${details.department_name}` : '';
  const maxLimit = typeof details.max_concurrent_leave === 'number'
    ? ` (maksimal ${details.max_concurrent_leave} orang)`
    : '';

  let dateListStr = '';
  if (details.full_dates && details.full_dates.length > 0) {
    dateListStr = details.full_dates.map(item => {
      try {
        const rawDate = item.date.substring(0, 10);
        return format(parseISO(rawDate), 'd MMM yyyy', { locale: id });
      } catch {
        return item.date;
      }
    }).join(', ');
  }

  if (dateListStr) {
    return `Kuota cuti departemen${deptName}${maxLimit} sudah penuh pada ${dateListStr}. Pilih tanggal lain.`;
  }

  return `Kuota cuti departemen${deptName}${maxLimit} sudah penuh. Silakan pilih tanggal lain.`;
}
