import React, { useState, useEffect } from 'react';
import { getAllAttendancesApi } from '../api/attendance';
import { Attendance } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly, formatMinutesToDuration } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function AllAttendancesPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getAllAttendancesApi(); // We can add filters here later if needed
      if (res.success) {
        setAttendances(res.data);
      }
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat data absensi.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'present': return <span className="status-badge present">Hadir</span>;
      case 'late': return <span className="status-badge late">Terlambat</span>;
      case 'absent': return <span className="status-badge absent">Tidak Hadir</span>;
      case 'leave': return <span className="status-badge leave">Cuti</span>;
      case 'holiday': return <span className="status-badge holiday">Libur</span>;
      default: return status;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Semua Absensi (Admin)</h1>
          <p className="dashboard-subtitle">Pantau riwayat kehadiran seluruh karyawan di perusahaan.</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px' }}>
          Refresh
        </button>
      </div>

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        <h2 className="attendance-history-title">Data Absensi Global</h2>
        {isLoading ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Memuat data...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="attendance-table employee-table" style={{ width: '100%', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatPlainDate(row.attendance_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee_name || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{row.position_name || '-'}</div>
                    </td>
                    <td>{row.department_name || '-'}</td>
                    <td>{row.check_in_at ? formatToJakartaTimeOnly(row.check_in_at) : '-'}</td>
                    <td>{row.check_out_at ? formatToJakartaTimeOnly(row.check_out_at) : '-'}</td>
                    <td>{translateStatus(row.status)}</td>
                    <td>
                      {row.check_in_source === 'offline_sync' || row.check_out_source === 'offline_sync' ? (
                        <div>
                          <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Offline</span>
                          <br/>
                          <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || '-'}</span>
                        </div>
                      ) : row.check_in_source === 'correction' || row.check_out_source === 'correction' ? (
                        <div>
                          <span style={{ fontSize: '10px', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Dikoreksi</span>
                          <br/>
                          <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || '-'}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || <span style={{ color: '#cbd5e1' }}>-</span>}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Belum ada data absensi yang tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.title}
        type={alertInfo.type}
        message={alertInfo.message}
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
