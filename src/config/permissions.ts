import { User } from '../types/user';

// Konstanta Roles
export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  EMPLOYEE: 'employee',
} as const;

// Konstanta Positions
export const POSITIONS = {
  MANAGER: 'Manager',
} as const;

export interface AccessRule {
  roles?: string[];
  positions?: string[];
}

// Konfigurasi sentral per-rute
export const ROUTE_PERMISSIONS: Record<string, AccessRule> = {
  '/dashboard': { roles: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE] },
  '/employee': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/department': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/position': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/approval': { roles: [ROLES.ADMIN] },
  '/leave-management': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/leave-types': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/holidays': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/balance-adjustments': { roles: [ROLES.ADMIN, ROLES.HR] },
  '/leave': { roles: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE] },
};

/**
 * Fungsi bantuan untuk mengecek hak akses.
 * Jika salah satu kriteria (role atau posisi) terpenuhi, akses diberikan.
 */
export function hasAccess(
  userRole?: string,
  userPosition?: string | null,
  allowedRoles?: string[],
  allowedPositions?: string[]
): boolean {
  // Jika tidak ada batasan yang diberikan, maka dianggap bebas akses
  if ((!allowedRoles || allowedRoles.length === 0) && (!allowedPositions || allowedPositions.length === 0)) {
    return true;
  }

  const hasRoleAccess = allowedRoles && userRole ? allowedRoles.includes(userRole) : false;
  const hasPositionAccess = allowedPositions && userPosition ? allowedPositions.includes(userPosition) : false;

  return hasRoleAccess || hasPositionAccess;
}
