import { ApiError } from '../api/client';
import { useState, useEffect } from 'react';
import { getTeamAttendancesApi } from '../api/attendance';
import { Attendance } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function TeamAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalData, setTotalData] = useState(0);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getTeamAttendancesApi({ page, limit: 20 });
      if (res.success) {
        setAttendances(res.data);
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
          setTotalData(res.meta.total || 0);
        }
      }
    } catch (error) {
      const e = error as ApiError;
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat data absensi tim.', type: 'error' });
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
          <h1 className="dashboard-title">Absensi Tim (Manajer)</h1>
          <p className="dashboard-subtitle">Pantau riwayat kehadiran bawahan Anda.</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        <div className="attendance-card-header">
          <h2 className="attendance-history-title">Data Absensi Tim</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Menampilkan {attendances.length} dari {totalData} data
          </span>
        </div>

        {isLoading ? (
          <p className="table-cell-no-data">Memuat data...</p>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
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
                    <td className="table-cell-date">{formatPlainDate(row.attendance_date)}</td>
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
                          <span className="note-badge-offline">Offline</span>
                          <br/>
                          <span className="note-text">{row.note || '-'}</span>
                        </div>
                      ) : row.check_in_source === 'correction' || row.check_out_source === 'correction' ? (
                        <div>
                          <span className="note-badge-corrected">Dikoreksi</span>
                          <br/>
                          <span className="note-text">{row.note || '-'}</span>
                        </div>
                      ) : (
                        <span className="note-text">{row.note || <span className="note-empty">-</span>}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell-no-data">Belum ada data absensi tim yang tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {page} dari {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === totalPages ? '#f1f5f9' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
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
