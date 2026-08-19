export interface AccessRule {
  features?: string[];
}

// Konfigurasi sentral per-rute berbasis fitur
export const ROUTE_PERMISSIONS: Record<string, AccessRule> = {
  '/dashboard': {}, // Semua bisa akses
  '/employee': { features: ['employee.view_all'] },
  '/department': { features: ['organization.manage'] },
  '/position': { features: ['organization.manage'] },
  '/approval': { features: ['employee.approve_user'] },
  '/leave-management': { features: ['leave.view_all'] },
  '/leave-types': { features: ['leave.manage_type'] },
  '/holidays': { features: ['organization.holiday'] },
  '/balance-adjustments': { features: ['leave.adjust_balance'] },
  '/leave': {}, // Semua bisa akses cuti sendiri
  '/profile': {}, // Semua bisa edit profil sendiri
  '/features': {}, // Fitur pengaturan admin, dicek dengan is_admin nanti atau tidak butuh fitur eksplisit (admin only)
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
