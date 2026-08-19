import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRouteAccess, AccessRule } from '../config/permissions';

interface FeatureProtectedRouteProps {
  rule: AccessRule;
  redirectPath?: string;
}

export function FeatureProtectedRoute({ rule, redirectPath = '/dashboard' }: FeatureProtectedRouteProps) {
  const { user, isAuthenticated, hasFeature } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Cek akses menggunakan fungsi bantuan berbasis fitur
  const isAllowed = hasRouteAccess(
    hasFeature, 
    rule.features
  );

  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
