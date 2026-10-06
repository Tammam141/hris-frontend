import { ApiError } from '../api/client';
import { useState, useEffect } from 'react';
import { getTeamAttendancesApi } from '../api/attendance';
import { Attendance } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function TeamAttendancePage() {
  // 1. State dibungkus ke dalam satu objek (data, pagination, total)
  const [teamAttendanceResponse, setTeamAttendanceResponse] = useState({
    data: [] as Attendance[],
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Penanda data berasal dari cache lokal saat BE down
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  const page = teamAttendanceResponse.page;
  const totalPages = teamAttendanceResponse.total_pages;
  const setPage = (updater: number | ((p: number) => number)) =>
    setTeamAttendanceResponse(prev => ({ ...prev, page: typeof updater === 'function' ? updater(prev.page) : updater }));

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getTeamAttendancesApi({ page, limit: teamAttendanceResponse.limit });
      if (res.success) {
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        // 2. Data respon backend dibungkus ke state teamAttendanceResponse
        setTeamAttendanceResponse(prev => ({ ...prev, ...newData }));
        setIsOfflineMode(false);
        // Simpan cadangan ke localStorage saat BE sukses
        try {
          localStorage.setItem('cached_team_attendances', JSON.stringify({ ...newData, page, limit: teamAttendanceResponse.limit }));
        } catch {}
      }
    } catch (error) {
      // Jika BE mati / down: ambil data cadangan dari localStorage
      try {
        const cached = localStorage.getItem('cached_team_attendances');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setTeamAttendanceResponse(prev => ({
              ...prev,
              data: parsed.data,
              total: parsed.total ?? 0,
              total_pages: parsed.total_pages ?? 1
            }));
            setIsOfflineMode(true);
            return;
          }
        }
      } catch {}

      const e = error as ApiError;
      setIsOfflineMode(false);
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

      {isOfflineMode && (
        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginTop: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data absensi tim lokal terakhir yang tersimpan di perangkat.</span>
        </div>
      )}

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        <div className="attendance-card-header">
          <h2 className="attendance-history-title">Data Absensi Tim</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Menampilkan {teamAttendanceResponse.data.length} dari {teamAttendanceResponse.total} data
          </span>
        </div>

        {isLoading ? (
          <p className="table-cell-no-data">Memuat data...</p>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>NO</th>
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
                {/* 3. Map dipanggil dari teamAttendanceResponse.data untuk memunculkan baris tabel */}
                {teamAttendanceResponse.data && teamAttendanceResponse.data.length > 0 && teamAttendanceResponse.data.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {((teamAttendanceResponse.page - 1) * teamAttendanceResponse.limit) + index + 1}.
                    </td>
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
                {teamAttendanceResponse.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="table-cell-no-data">Belum ada data absensi tim yang tercatat.</td>
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
