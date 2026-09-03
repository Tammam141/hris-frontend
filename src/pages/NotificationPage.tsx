import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../types/notification';
import { BellIcon } from '../components/icons/BellIcon';
import { updateNotification, markAllAsReadLocal, setUnreadCount } from '../store/notificationSlice';
import { markNotificationRead, markAllNotificationsRead } from '../api/notification';
import '../components/ui/notification.css';
import '../components/ui/dashboard.css';

export function NotificationPage() {
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notification.items);
  const unreadCount = useSelector((state: RootState) => state.notification.unreadCount);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Jangan lakukan apapun jika sudah dibaca, tapi karena kita mau ubah state, 
    // kita bisa optimis atau panggil API lalu update.
    const notif = notifications.find(n => n.id === id);
    if (notif?.is_read) return;

    try {
      const res = await markNotificationRead(id);
      if (res.success && res.data) {
        dispatch(updateNotification(res.data));
        dispatch(setUnreadCount(res.meta.unread));
      }
    } catch {
      // 404 akan masuk ke catch (biasanya jika sudah dibaca/tidak ada), bisa trigger refresh nantinya
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        dispatch(markAllAsReadLocal());
        dispatch(setUnreadCount(res.meta.unread));
      }
    } catch {
      // Abaikan
    }
  };

  const handleClickItem = (notif: Notification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    navigate(notif.link);
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'leave_approval_needed':
      case 'leave_status_changed':
        return (
          <div className="notification-icon leave">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        );
      case 'account_approval_needed':
        return (
          <div className="notification-icon account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="notification-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <BellIcon size={20} />
          </div>
        );
    }
  };

  return (
    <div className="notification-page">
      <div className="notification-page-header">
        <div>
          <h1 className="notification-page-title">Notifikasi</h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              {unreadCount} belum dibaca
            </p>
          )}
        </div>
        {notifications.length > 0 && unreadCount > 0 && (
          <button className="notification-mark-all-btn" onClick={handleMarkAllAsRead}>
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="notification-empty">
          <div className="notification-empty-icon">
            <BellIcon size={36} color="#94a3b8" />
          </div>
          <h3 className="notification-empty-title">Tidak ada notifikasi</h3>
          <p className="notification-empty-subtitle">
            Semua notifikasi Anda akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notif: Notification) => (
            <div
              key={notif.id}
              className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
              onClick={() => handleClickItem(notif)}
            >
              {getNotifIcon(notif.type)}
              <div className="notification-content">
                <p className="notification-title">{notif.title}</p>
                <p className="notification-message">{notif.message}</p>
                <div className="notification-time">{formatTimeAgo(notif.created_at)}</div>
              </div>
              {!notif.is_read && <div className="notification-unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
