import { useEffect, useState } from 'react';
import { LeavePeriod } from '../features/leave/LeavePeriod';
import { LeaveHistory } from '../features/leave/LeaveHistory';
import { getMyLeaveBalances, LeaveBalance } from '../api/leave';
import '../components/ui/dashboard.css';
import '../components/ui/leave.css';

export function LeavePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getMyLeaveBalances()
      .then(res => {
        if (res.data && res.data.balances) {
          setBalances(res.data.balances);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshKey]); // Juga di-refresh kalau ada pengajuan cuti baru!

  return (
    <div className="dashboard-container leave-page-container">
      <div className="dashboard-card leave-page-card">
        <h1 className="dashboard-title">Pengajuan Cuti</h1>
        <p className="dashboard-subtitle">Silakan tentukan periode cuti yang Anda inginkan.</p>
        
        {/* Saldo Cuti */}
        {!loading && balances.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {balances.map(b => (
              <div key={b.leave_type_id} style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '180px',
                flex: '1'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>
                  Saldo {b.leave_type_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{b.balance}</span>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Hari</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="leave-page-content">
          {/* Bagian Atas: Form Pengajuan */}
          <div>
            <LeavePeriod onSuccess={() => setRefreshKey(k => k + 1)} />
          </div>

          {/* Bagian Bawah: Riwayat Pengajuan */}
          <div>
            <LeaveHistory refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
