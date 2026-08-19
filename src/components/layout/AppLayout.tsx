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
import { ShowIf } from '../ShowIf';
import { ROUTE_PERMISSIONS } from '../../config/permissions';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // State untuk dropdown master data
  const [isMasterLeaveOpen, setIsMasterLeaveOpen] = useState(false);

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
            <ShowIf feature={ROUTE_PERMISSIONS['/dashboard'].features}>
              <NavLink to="/dashboard" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>Dashboard</NavLink>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/employee'].features}>
              <NavLink to="/employee" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UsersIcon /> Employee
              </NavLink>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/department'].features}>
              <NavLink to="/department" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BuildingIcon /> Department
              </NavLink>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/position'].features}>
              <NavLink to="/position" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BriefcaseIcon /> Position
              </NavLink>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/approval'].features}>
              <NavLink to="/approval" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheckIcon /> Persetujuan Akun
              </NavLink>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/leave-management'].features}>
              <NavLink to="/leave-management" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarWeekIcon /> Persetujuan Cuti
              </NavLink>
            </ShowIf>
            
            {/* Master Data Cuti Dropdown - Kita asumsikan jika bisa lihat leave-types, maka bisa lihat dropdown ini */}
            <ShowIf feature={ROUTE_PERMISSIONS['/leave-types'].features}>
              <div className="sidebar-dropdown-container">
                <button 
                  className="sidebar-link" 
                  onClick={() => setIsMasterLeaveOpen(!isMasterLeaveOpen)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px 16px', color: '#1e293b' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarWeekIcon /> Master Cuti</span>
                  <span style={{ transform: isMasterLeaveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '12px' }}>▼</span>
                </button>
                {isMasterLeaveOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                    <ShowIf feature={ROUTE_PERMISSIONS['/leave-types'].features}>
                      <NavLink to="/leave-types" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Jenis Cuti</NavLink>
                    </ShowIf>
                    <ShowIf feature={ROUTE_PERMISSIONS['/holidays'].features}>
                      <NavLink to="/holidays" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Hari Libur</NavLink>
                    </ShowIf>
                    <ShowIf feature={ROUTE_PERMISSIONS['/balance-adjustments'].features}>
                      <NavLink to="/balance-adjustments" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Penyesuaian Saldo</NavLink>
                    </ShowIf>
                  </div>
                )}
              </div>
            </ShowIf>

            <ShowIf feature={ROUTE_PERMISSIONS['/leave'].features}>
              <NavLink to="/leave" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarWeekIcon /> Cuti (Leave)
              </NavLink>
            </ShowIf>
            
            {/* Admin Only features */}
            {user?.role === 'admin' && (
              <NavLink to="/features" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheckIcon /> Matriks Fitur
              </NavLink>
            )}
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
