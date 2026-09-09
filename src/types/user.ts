export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'admin';
  features?: string[];
  must_change_password?: boolean;
  employee_id?: string;
  employee_number?: string;
  is_active?: boolean;
  last_login_at?: string;
  employee?: {
    id: string;
    employee_number: string;
    full_name: string;
    phone: string;
    gender: string;
    employment_status: string;
    join_date: string;
    department_name: string | null;
    position_name: string | null;
    manager_name: string | null;
    department_id?: string | null;
    position_id?: string | null;
    manager_id?: string | null;
    birth_date?: string | null;
    address?: string | null;
    photo_path?: string | null;
    photo_url?: string | null;
  } | null;
}
