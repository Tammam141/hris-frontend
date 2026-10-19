export type UnitType = 'company' | 'directorate' | 'division' | 'department' | 'team';

export interface OrgHolder {
  id: string;
  employee_number: string;
  full_name: string;
}

export interface OrgPosition {
  id: string;
  code: string;
  name: string;
  reports_to_position_id: string | null;
  is_unit_head: boolean;
  max_holders: number | null; // null = tanpa batas kursi
  is_active: boolean;
  holders: OrgHolder[]; // [] = jabatan kosong
  direct_reports: OrgPosition[]; // bawahan di unit yang SAMA
}

export interface OrgUnit {
  id: string;
  code: string;
  name: string;
  unit_type: UnitType;
  is_active: boolean;
  positions: OrgPosition[]; // jabatan puncak di unit ini (biasanya kepala unit)
  children: OrgUnit[]; // sub-unit
}

export interface OrgTree {
  units: OrgUnit[];
  unassigned_positions: OrgPosition[];
}

export interface LineManagerResponse {
  employee_id: string;
  line_manager: null | {
    employee_id: string;
    full_name: string;
    position_id: string | null;
    position_name: string | null;
    source: 'override' | 'structure'; // override = atasan diisi manual di data karyawan
    levels_up: number; // 1 = atasan langsung, >1 = ada jabatan kosong yang dilewati
  };
}
