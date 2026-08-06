import { ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import '../ui/layout.css';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // layout polos untuk guest
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <main>{children}</main>
      </div>
    );
  }

  // layout utama
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* navbar */}
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

      {/* main wrapper */}
      <div style={{ display: 'flex', flex: 1 }}>
        
        {/* sidebar */}
        <aside className="app-sidebar">
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="sidebar-link">Dashboard</NavLink>
            <NavLink to="/employee" className="sidebar-link">Employee</NavLink>
          </nav>
        </aside>

        {/* content */}
        <main style={{ flex: 1, padding: '24px' }}>
          {children}
        </main>

      </div>
    </div>
  );
}
