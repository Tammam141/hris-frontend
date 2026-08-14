import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasAccess, AccessRule } from '../config/permissions';

interface RoleProtectedRouteProps {
  rule: AccessRule;
  redirectPath?: string;
}

export function RoleProtectedRoute({ rule, redirectPath = '/dashboard' }: RoleProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Cek akses menggunakan fungsi bantuan
  const isAllowed = hasAccess(
    user.role, 
    user.employee?.position_name, 
    rule.roles, 
    rule.positions
  );

  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
