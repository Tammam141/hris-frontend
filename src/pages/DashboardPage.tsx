import { useAuth } from '../hooks/useAuth';
import '../components/ui/dashboard.css';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">
          Selamat datang {user?.full_name}, Anda telah berhasil login
        </h1>
      </div>
    </div>
  );
}
