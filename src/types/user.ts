export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
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
  } | null;
}
