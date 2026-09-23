export interface AccessRule {
  features?: string[];
  adminOnly?: boolean;
}

// Konfigurasi sentral per-rute berbasis fitur
export const ROUTE_PERMISSIONS: Record<string, AccessRule> = {
  '/dashboard': {}, // Semua bisa akses
  '/employee': { features: ['employee.view_all'] },
  '/employee/create': { features: ['employee.create'] },
  '/department': { features: ['organization.manage'] },
  '/position': { features: ['organization.manage'] },
  '/approval': { features: ['employee.approve_user'] },
  '/leave-management': {}, // Semua bisa login untuk melihat bawahan
  '/leave-types': { features: ['leave.manage_type'] },
  '/holidays': { features: ['organization.holiday'] },
  '/balance-adjustments': { features: ['leave.adjust_balance'] },
  '/leave': {}, // Semua bisa akses cuti sendiri
  '/profile': {}, // Semua bisa edit profil sendiri
  '/features': { adminOnly: true }, // Hanya admin
  '/work-schedules': { features: ['organization.schedule'] },
  '/attendance': {}, // Semua bisa akses
  '/attendance/team': { features: ['attendance.view_team'] },
  '/attendance/all': { features: ['attendance.view_all'] },
  '/attendance/events': { features: ['attendance.report'] },
  '/employee/import-csv': { features: ['employee.create'] },
  '/activity-logs': { features: ['system.view_log'] },
};

export function hasRouteAccess(
  hasFeature: (code: string) => boolean,
  allowedFeatures?: string[]
): boolean {
  if (!allowedFeatures || allowedFeatures.length === 0) {
    return true;
  }

  // Jika butuh salah satu dari allowedFeatures (OR condition)
  return allowedFeatures.some(code => hasFeature(code));
}
