import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getTodayAttendanceApi, 
  checkInApi, 
  checkOutApi, 
  getMyAttendancesApi 
} from '../api/attendance';
import { AttendanceTodayResponse, Attendance, AttendanceSummary } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly, formatMinutesToDuration } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function AttendancePage() {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState<AttendanceTodayResponse | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Parallel fetch
      const [todayRes, historyRes] = await Promise.all([
        getTodayAttendanceApi(),
        getMyAttendancesApi() // Default to current month
      ]);

      if (todayRes.success) setTodayData(todayRes.data);
      if (historyRes.success) {
        setHistory(historyRes.data);
        if (historyRes.summary) setSummary(historyRes.summary);
      }
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat data absensi.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    try {
      await checkInApi();
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Berhasil melakukan absensi masuk.', type: 'success' });
      loadData();
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Gagal Absen', message: e.message || 'Gagal melakukan absensi masuk.', type: 'error' });
      // If error provides the attendance row, maybe we just reload data so it reflects
      loadData(); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    try {
      await checkOutApi();
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Berhasil melakukan absensi pulang.', type: 'success' });
      loadData();
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Gagal Absen', message: e.message || 'Gagal melakukan absensi pulang.', type: 'error' });
      loadData();
    } finally {
      setIsSubmitting(false);
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
          <h1 className="dashboard-title">Absensi Saya</h1>
          <p className="dashboard-subtitle">Lakukan absensi dan pantau riwayat kehadiran Anda.</p>
        </div>
      </div>

      {isLoading ? (
        <p>Memuat data...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card Absensi Hari Ini */}
          <div className="attendance-today-card">
            <h2 className="attendance-today-title">Absensi Hari Ini ({todayData?.date})</h2>
            
            <div className="attendance-today-content">
              <div className="attendance-schedule-info">
                <p className="attendance-schedule-label">Jadwal Berlaku</p>
                {todayData?.schedule ? (
                  <div>
                    <div className="attendance-schedule-name">{todayData.schedule.name} ({todayData.schedule.start_time.substring(0,5)} - {todayData.schedule.end_time.substring(0,5)})</div>
                    <div className="attendance-schedule-tolerance">Toleransi: {todayData.schedule.late_tolerance_minutes} menit</div>
                  </div>
                ) : (
                  <div className="attendance-no-schedule">Belum ada jadwal</div>
                )}
              </div>

              <div className="attendance-time-block">
                <p className="attendance-time-label">Jam Masuk</p>
                <div className={`attendance-time-value ${todayData?.attendance?.check_in_at ? 'check-in' : 'empty'}`}>
                  {todayData?.attendance?.check_in_at ? formatToJakartaTimeOnly(todayData.attendance.check_in_at) : '-'}
                </div>
              </div>

              <div className="attendance-time-block">
                <p className="attendance-time-label">Jam Pulang</p>
                <div className={`attendance-time-value ${todayData?.attendance?.check_out_at ? 'check-out' : 'empty'}`}>
                  {todayData?.attendance?.check_out_at ? formatToJakartaTimeOnly(todayData.attendance.check_out_at) : '-'}
                </div>
              </div>

              <div className="attendance-action-block">
                {todayData?.can_check_in && (
                  <button className="btn btn-primary btn-check-in" onClick={handleCheckIn} disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Absen Masuk'}
                  </button>
                )}
                {todayData?.can_check_out && (
                  <button className="btn btn-primary btn-check-out" onClick={handleCheckOut} disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Absen Pulang'}
                  </button>
                )}
                {!todayData?.can_check_in && !todayData?.can_check_out && todayData?.blocked_reason && (
                  <div className="attendance-blocked-msg">
                    {todayData.blocked_reason}
                  </div>
                )}
                {!todayData?.can_check_in && !todayData?.can_check_out && !todayData?.blocked_reason && todayData?.attendance?.check_out_at && (
                  <div className="attendance-done-msg">
                    Absensi hari ini selesai ✓
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ringkasan Bulanan */}
          {summary && (
            <div className="attendance-summary-grid">
              <div className="attendance-summary-card">
                <p className="attendance-summary-value present">{summary.present}</p>
                <p className="attendance-summary-label">Total Hadir</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value late">{summary.late}</p>
                <p className="attendance-summary-label">Total Terlambat</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value absent">{summary.absent}</p>
                <p className="attendance-summary-label">Tidak Hadir (Alpa)</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value leave">{summary.leave}</p>
                <p className="attendance-summary-label">Total Cuti</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value work">{formatMinutesToDuration(summary.total_work_minutes)}</p>
                <p className="attendance-summary-label">Total Jam Kerja</p>
              </div>
            </div>
          )}

          {/* Riwayat Absensi */}
          <div className="attendance-history-card">
            <h2 className="attendance-history-title">Riwayat Absensi Bulan Ini</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="attendance-table employee-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk (WIB)</th>
                    <th>Jam Pulang (WIB)</th>
                    <th>Status</th>
                    <th>Terlambat</th>
                    <th>Jam Kerja</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>{formatPlainDate(row.attendance_date)}</td>
                      <td>{row.check_in_at ? formatToJakartaTimeOnly(row.check_in_at) : '-'}</td>
                      <td>{row.check_out_at ? formatToJakartaTimeOnly(row.check_out_at) : '-'}</td>
                      <td>{translateStatus(row.status)}</td>
                      <td>{row.late_minutes > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{row.late_minutes} mnt</span> : <span style={{ color: '#94a3b8' }}>-</span>}</td>
                      <td>{row.work_minutes ? formatMinutesToDuration(row.work_minutes) : <span style={{ color: '#94a3b8' }}>-</span>}</td>
                      <td>
                        {row.note && row.note.startsWith('[') ? (
                          <div>
                            <span style={{ fontSize: '10px', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Dikoreksi</span>
                            <br/>
                            <span style={{ fontSize: '13px', color: '#475569' }}>{row.note}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || <span style={{ color: '#cbd5e1' }}>Tidak ada</span>}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>Tidak ada data absensi di bulan ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
