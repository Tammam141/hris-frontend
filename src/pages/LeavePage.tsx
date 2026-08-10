import { LeavePeriod } from '../features/leave/LeavePeriod';
import '../components/ui/dashboard.css';

export function LeavePage() {
  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <h1 className="dashboard-title">Pengajuan Cuti (Leave Request)</h1>
        <p className="dashboard-subtitle">Silakan tentukan periode cuti yang Anda inginkan.</p>
        
        {/* Render Komponen LeavePeriod */}
        <div style={{ marginTop: '24px' }}>
          <LeavePeriod />
        </div>
      </div>
    </div>
  );
}
