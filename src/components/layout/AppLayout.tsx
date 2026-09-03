import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import '../ui/layout.css';
import { useAuth } from '../../hooks/useAuth';
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal';
import { UsersIcon } from '../icons/UsersIcon';
import { CalendarWeekIcon } from '../icons/CalendarWeekIcon';
import { BuildingIcon } from '../icons/BuildingIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { UserCheckIcon } from '../icons/UserCheckIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { BellIcon } from '../icons/BellIcon';
import { ShowIf } from '../ShowIf';
import { ROUTE_PERMISSIONS } from '../../config/permissions';
import { Avatar } from '../ui/Avatar';
import '../ui/notification.css';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showEmptyPopup, setShowEmptyPopup] = useState(false);
  
  // State untuk dropdown master data
  const [isMasterLeaveOpen, setIsMasterLeaveOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  // Notifikasi — nanti diisi dari WebSocket backend
  const notifications: any[] = [];
  const unreadCount = 0;

  useEffect(() => {
    if (user?.must_change_password) {
      setIsChangePasswordOpen(true);
    }
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const location = useLocation();

  // layout polos untuk guest atau force change password
  if (!isAuthenticated || location.pathname === '/force-change-password') {
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
          {/* Tombol Lonceng Notifikasi */}
          <div className="notif-bell-wrapper">
            <button 
              className="notif-bell-btn" 
              onClick={() => {
                if (notifications.length === 0) {
                  setShowEmptyPopup(true);
                  setTimeout(() => setShowEmptyPopup(false), 2500);
                } else {
                  navigate('/notifications');
                }
              }}
              title="Notifikasi"
            >
              <BellIcon size={22} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            {showEmptyPopup && (
              <div className="notif-empty-popup">Belum ada notifikasi</div>
            )}
          </div>

          <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Halo, <strong>{user?.employee?.full_name || user?.full_name || 'Pengguna'}</strong></span>
            <Avatar 
              photoUrl={user?.employee?.photo_url} 
              name={user?.full_name || ''} 
              size="36px" 
              fontSize="14px"
            />
          </div>
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
            
            <ShowIf feature={ROUTE_PERMISSIONS['/work-schedules'].features}>
              <NavLink to="/work-schedules" className="sidebar-link" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockIcon /> Jadwal Kerja
              </NavLink>
            </ShowIf>

            {/* Attendance Module */}
            <div className="sidebar-dropdown-container">
              <button 
                className="sidebar-link" 
                onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px 16px', color: '#1e293b' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClockIcon /> Modul Absensi</span>
                <span style={{ transform: isAttendanceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '12px' }}>▼</span>
              </button>
              {isAttendanceOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                  <ShowIf feature={ROUTE_PERMISSIONS['/attendance'].features}>
                    <NavLink to="/attendance" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Absensi Saya</NavLink>
                  </ShowIf>
                  <ShowIf feature={ROUTE_PERMISSIONS['/attendance/all'].features}>
                    <NavLink to="/attendance/all" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Semua Absensi</NavLink>
                  </ShowIf>
                  <ShowIf feature={['attendance.report']}>
                    <NavLink to="/attendance/events" className="sidebar-link" style={{ paddingLeft: '48px', fontSize: '14px', paddingTop: '8px', paddingBottom: '8px' }} onClick={() => setIsSidebarOpen(false)}>Log Mentah Absensi</NavLink>
                  </ShowIf>
                </div>
              )}
            </div>

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
