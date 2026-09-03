export interface Notification {
  id: string;
  type: 'leave_approval_needed' | 'leave_status_changed' | 'account_approval_needed';
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  /** Halaman tujuan saat notifikasi diklik */
  link: string;
}
