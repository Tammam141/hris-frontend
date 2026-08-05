import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {isAuthenticated && (
        <header className="app-navbar">
          <div className="navbar-brand">HRIS</div>
          <div className="navbar-right">
            <span className="navbar-user">
              <strong>{user?.full_name}</strong>
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}
