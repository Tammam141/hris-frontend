import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { hasRouteAccess } from '../config/permissions';

interface ShowIfProps {
  children: ReactNode;
  feature?: string | string[]; // bisa satu string atau array of string
}

/**
 * Komponen wrapper untuk merender UI secara kondisional
 * berdasarkan fitur (permissions) pengguna saat ini.
 */
export function ShowIf({ children, feature }: ShowIfProps) {
  const { user, isAuthenticated, hasFeature } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  // Jika tidak diberikan prop feature, otomatis diizinkan
  if (!feature) {
    return <>{children}</>;
  }

  const featuresToCheck = Array.isArray(feature) ? feature : [feature];
  const isAllowed = hasRouteAccess(hasFeature, featuresToCheck);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
