import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.must_change_password && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" />;
  }

  if (!user?.must_change_password && location.pathname === '/force-change-password') {
    return <Navigate to="/dashboard" />;
  }

  return <Outlet />;
}
