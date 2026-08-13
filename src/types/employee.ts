export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  level: number;
  is_active: boolean;
}

export interface EmployeeListItem {
  id: string;
  employee_number: string;
  full_name: string;
  email: string | null;
  position_name: string | null;
  department_name: string | null;
  manager_name: string | null;
  is_active: boolean;
  user_id?: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  phone: string;
  gender: 'male' | 'female';
  birth_date: string | null;
  address: string | null;
  employment_status: string;
  join_date: string | null;
  resign_date: string | null;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
}

export interface ListEmployeesResponse {
  success: boolean;
  data: EmployeeListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ListEmployeesParams {
  search?: string;
  department_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateEmployeePayload {
  full_name: string;
  email: string;
  password?: string;
  role?: 'employee' | 'hr' | 'admin';
  phone: string;
  gender: 'male' | 'female';
  birth_date?: string;
  address?: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
  employment_status?: 'probation' | 'contract' | 'permanent' | 'intern' | 'resigned';
  join_date?: string;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  is_active?: boolean;
  resign_date?: string;
}
