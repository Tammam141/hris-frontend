import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { hasAccess } from '../config/permissions';

interface ShowIfProps {
  children: ReactNode;
  allowedRoles?: string[];
  allowedPositions?: string[];
}

/**
 * Komponen wrapper untuk merender UI secara kondisional
 * berdasarkan role atau position pengguna saat ini.
 */
export function ShowIf({ children, allowedRoles, allowedPositions }: ShowIfProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const isAllowed = hasAccess(
    user.role, 
    user.employee?.position_name, 
    allowedRoles, 
    allowedPositions
  );

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
