import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Selamat Datang di Dashboard HRIS!</h1>
        <p className="dashboard-subtitle">
          Anda berhasil login sebagai <strong>{user?.name}</strong>.
        </p>

        <div className="dashboard-info">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>
      </div>
    </div>
  );
}
