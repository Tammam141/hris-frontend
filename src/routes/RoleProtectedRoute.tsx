import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasAccess, AccessRule } from '../config/permissions';

interface RoleProtectedRouteProps {
  rule: AccessRule;
  redirectPath?: string;
}

export function RoleProtectedRoute({ rule, redirectPath = '/dashboard' }: RoleProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  // Jika belum login, biarkan router mengarahkan ke halaman login.
  // (Biasanya sudah ditangani oleh ProtectedRoute luar, tapi sebagai pengaman tambahan:)
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
    // Jika tidak memiliki izin, arahkan kembali ke halaman yang aman
    return <Navigate to={redirectPath} replace />;
  }

  // Jika memiliki izin, tampilkan rute anak-anaknya
  return <Outlet />;
}
