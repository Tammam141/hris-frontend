export type UnitType = 'company' | 'directorate' | 'division' | 'department' | 'team';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  company: 'Perusahaan',
  directorate: 'Direktorat',
  division: 'Divisi',
  department: 'Departemen',
  team: 'Tim',
};

export interface Department {
  id: string;
  code: string;
  name: string;
  unit_type: UnitType;
  parent_id: string | null;
  is_active: boolean;
  max_concurrent_leave?: number | null;
  updated_at: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  level?: number;
  department_id: string | null;
  reports_to_position_id: string | null;
  is_unit_head: boolean;
  max_holders: number | null;
  current_holders?: number;
  department_code?: string | null;
  department_name?: string | null;
  reports_to_position_name?: string | null;
  is_active: boolean;
  updated_at: string;
}

export function positionLabel(p: { name: string; department_name?: string | null }): string {
  return p.department_name ? `${p.name} — ${p.department_name}` : p.name;
}

export interface PositionHolder {
  id: string;
  employee_number: string;
  full_name: string;
}

export interface PositionNode {
  id: string;
  code: string;
  name: string;
  reports_to_position_id: string | null;
  is_unit_head: boolean;
  max_holders: number | null;
  is_active: boolean;
  holders: PositionHolder[];
  direct_reports: PositionNode[];
}

export interface UnitNode {
  id: string;
  code: string;
  name: string;
  unit_type: UnitType;
  is_active: boolean;
  positions: PositionNode[];
  children: UnitNode[];
}

export interface OrgTreeResponse {
  units: UnitNode[];
  unassigned_positions: PositionNode[];
}

export interface LineManagerInfo {
  employee_id: string;
  full_name: string;
  position_id: string | null;
  position_name: string | null;
  source: 'override' | 'structure';
  levels_up: number;
}

export interface LineManagerResponse {
  employee_id: string;
  line_manager: LineManagerInfo | null;
}

export interface PositionLineManagerResponse {
  success: boolean;
  data: {
    position_id: string;
    line_manager: LineManagerInfo | null;
  };
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
  photo_path?: string | null;
  photo_url?: string | null;
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
  updated_at: string;
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
  role?: 'employee' | 'admin';
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
  updated_at: string;
}

export type CreateEmployeesBulkPayload = CreateEmployeePayload[];

export interface BulkCreateEmployeesResponse {
  success: boolean;
  message: string;
  data: {
    employee: EmployeeListItem;
    account: {
      id: string;
      email: string;
      role: string;
      must_change_password: boolean;
    };
  }[];
  meta: {
    created: number;
  };
}
