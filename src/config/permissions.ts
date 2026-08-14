import { User } from '../types/user';

// Konstanta Roles
export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

// Konstanta Positions
export const POSITIONS = {
  INTERN: 'Intern',
  QA_ENG: 'Quality Assurance (QA) Engineer',
  SWE: 'Software Engineer',
  STAFF: 'Staff',
  SENIOR: 'Senior Engineer',
  LEAD: 'Team Lead',
  MANAGER: 'Manager',
  CHIEF: 'Chief of Product',
} as const;

export interface AccessRule {
  roles?: string[];
  positions?: string[];
}

// Konfigurasi sentral per-rute
export const ROUTE_PERMISSIONS: Record<string, AccessRule> = {
  '/dashboard': { roles: [ROLES.ADMIN, ROLES.EMPLOYEE] },
  '/employee': { roles: [ROLES.ADMIN] },
  '/department': { roles: [ROLES.ADMIN] },
  '/position': { roles: [ROLES.ADMIN] },
  '/approval': { roles: [ROLES.ADMIN] },
  '/leave-management': { roles: [ROLES.ADMIN], positions: [POSITIONS.LEAD, POSITIONS.MANAGER, POSITIONS.CHIEF] },
  '/leave-types': { roles: [ROLES.ADMIN] },
  '/holidays': { roles: [ROLES.ADMIN] },
  '/balance-adjustments': { roles: [ROLES.ADMIN] },
  '/leave': { roles: [ROLES.ADMIN, ROLES.EMPLOYEE] },
  '/profile': { roles: [ROLES.ADMIN, ROLES.EMPLOYEE] },
};


export function hasAccess(
  userRole?: string,
  userPosition?: string | null,
  allowedRoles?: string[],
  allowedPositions?: string[]
): boolean {
  if ((!allowedRoles || allowedRoles.length === 0) && (!allowedPositions || allowedPositions.length === 0)) {
    return true;
  }

  const hasRoleAccess = allowedRoles && userRole ? allowedRoles.includes(userRole) : false;
  const hasPositionAccess = allowedPositions && userPosition ? allowedPositions.includes(userPosition) : false;

  return hasRoleAccess || hasPositionAccess;
}
