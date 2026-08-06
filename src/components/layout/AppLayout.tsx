import { useState, ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import '../ui/layout.css';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="hamburger-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <div className="navbar-brand">HRIS</div>
        </div>
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
      <div className="app-main-wrapper">
        
        {/* Overlay when sidebar is open on mobile */}
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* sidebar */}
        <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>Dashboard</NavLink>
            {(user?.role === 'hr' || user?.role === 'admin') && (
              <NavLink to="/employee" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>Employee</NavLink>
            )}
          </nav>
        </aside>

        {/* content */}
        <main className="app-content">
          {children}
        </main>

      </div>
    </div>
  );
}
