import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import '../ui/layout.css';
import { useAuth } from '../../hooks/useAuth';
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal';
import { UsersIcon } from '../icons/UsersIcon';
import { CalendarWeekIcon } from '../icons/CalendarWeekIcon';
import { BuildingIcon } from '../icons/BuildingIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { UserCheckIcon } from '../icons/UserCheckIcon';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (user?.must_change_password) {
      setIsChangePasswordOpen(true);
    }
  }, [user]);

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
          <button onClick={() => setIsChangePasswordOpen(true)} className="btn-logout" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Ganti Password
          </button>
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
              <>
                <NavLink to="/employee" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UsersIcon /> Employee
                </NavLink>
                <NavLink to="/department" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BuildingIcon /> Department
                </NavLink>
                <NavLink to="/position" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BriefcaseIcon /> Position
                </NavLink>
                <NavLink to="/approval" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheckIcon /> Persetujuan Akun
                </NavLink>
              </>
            )}
            <NavLink to="/leave" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarWeekIcon /> Cuti (Leave)
            </NavLink>
          </nav>
        </aside>

        {/* content */}
        <main className="app-content">
          {children}
        </main>

      </div>
      
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        mustChange={user?.must_change_password}
      />
    </div>
  );
}
