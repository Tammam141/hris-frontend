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
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOfflineAttendance, removeOfflineAttendance } from '../store/attendanceSlice';
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

  const dispatch = useDispatch();
  const offlineQueue = useSelector((state: RootState) => state.attendance.offlineQueue);

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

  // Proses sinkronisasi otomatis saat internet kembali menyala
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (offlineQueue.length === 0) return;
      
      let syncCount = 0;
      for (const item of offlineQueue) {
        try {
          // --- MENGIRIM KE API SAAT ONLINE KEMBALI ---
          if (item.type === 'check-in') {
            await checkInApi(item.note, item.offline_time);
          } else {
            await checkOutApi(item.note, item.offline_time);
          }
          dispatch(removeOfflineAttendance(item.id));
          syncCount++;
        } catch (e: any) {
          console.error('Failed to sync offline attendance', e);
          
          if (e.status === 409 && e.details?.attendance) {
            // 409 Conflict: Hari ini sudah absen.
            // Bandingkan apakah ini sebenarnya data kita yang sudah masuk?
            const backendTimeStr = item.type === 'check-in' ? e.details.attendance.check_in_at : e.details.attendance.check_out_at;
            
            if (backendTimeStr) {
              const backendTimeMs = new Date(backendTimeStr).getTime();
              const localTimeMs = new Date(item.offline_time).getTime();
              
              if (backendTimeMs === localTimeMs) {
                dispatch(removeOfflineAttendance(item.id));
                syncCount++;
              } else {
                dispatch(removeOfflineAttendance(item.id));
                setAlertInfo({ open: true, title: 'Sinkronisasi Ditolak', message: e.message || 'Absensi sudah tercatat sebelumnya. Hubungi atasan jika ini keliru.', type: 'error' });
              }
            } else {
              dispatch(removeOfflineAttendance(item.id));
            }
          } else if (e.status === 400 || e.code === 'VALIDATION_ERROR' || (e.message && e.message.includes('ditutup'))) {
            dispatch(removeOfflineAttendance(item.id));
            setAlertInfo({ open: true, title: 'Absen Ditolak', message: e.message || 'Data offline ditolak oleh sistem.', type: 'error' });
          } else if (e.status === 401) {
            break;
          }
        }
      }

      if (syncCount > 0) {
        setAlertInfo({ open: true, title: 'Sinkronisasi Berhasil', message: `${syncCount} data absensi offline berhasil dikirim ke server!`, type: 'success' });
        loadData();
      }
    };

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);

    if (navigator.onLine && offlineQueue.length > 0) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [offlineQueue, dispatch]);

  // Logika absen (menangani online & offline secara dinamis untuk masuk maupun pulang)
  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    const label = type === 'check-in' ? 'masuk' : 'pulang';

    if (!navigator.onLine) {
      const now = new Date().toISOString();
      
      // MENYIMPAN KE LOKAL SAAT OFFLINE
      dispatch(addOfflineAttendance({
        id: `${type}-${Date.now()}`,
        type,
        offline_time: now
      }));
      
      setAlertInfo({ open: true, title: 'Mode Offline', message: `Anda sedang offline. Absen ${label} disimpan di perangkat dan akan otomatis dikirim saat koneksi pulih.`, type: 'success' });
      
      setTodayData(prev => {
        if (!prev) return prev;
        const newAttendance = { ...prev.attendance };
        if (type === 'check-in') {
          (newAttendance as any).check_in_at = now;
          return { ...prev, can_check_in: false, attendance: newAttendance as any };
        } else {
          (newAttendance as any).check_out_at = now;
          return { ...prev, can_check_out: false, attendance: newAttendance as any };
        }
      });
      return;
    }

    // JIKA ONLINE
    setIsSubmitting(true);
    try {
      // Merekam waktu presisi saat tombol ditekan
      const exactTimePressed = new Date().toISOString();

      if (type === 'check-in') {
        await checkInApi(undefined, exactTimePressed);
      } else {
        await checkOutApi(undefined, exactTimePressed);
      }
      setAlertInfo({ open: true, title: 'Berhasil', message: `Berhasil melakukan absensi ${label}.`, type: 'success' });
      loadData();
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Gagal Absen', message: e.message || `Gagal melakukan absensi ${label}.`, type: 'error' });
      loadData(); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMinutesToTimeStr = (timeStr: string, minutes: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderScheduleRanges = () => {
    if (!todayData?.schedule) return null;
    const { start_time, late_tolerance_minutes, absent_cutoff_time } = todayData.schedule;
    const start = start_time.substring(0, 5);
    const presentEnd = addMinutesToTimeStr(start, late_tolerance_minutes);
    const lateStart = addMinutesToTimeStr(start, late_tolerance_minutes + 1);
    const cutoff = absent_cutoff_time.substring(0, 5);

    return (
      <div className="attendance-schedule-ranges" style={{ marginTop: '12px', fontSize: '13px', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#16a34a' }}>Hadir</span>
          <span>{start} &ndash; {presentEnd}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, color: '#ca8a04' }}>Terlambat</span>
          <span>{lateStart} &ndash; {cutoff}</span>
        </div>
        <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500, textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
          Lewat {cutoff} dihitung tidak hadir
        </div>
      </div>
    );
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
              {offlineQueue.length > 0 && (
                <div style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fde047' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Ada {offlineQueue.length} data absensi tertunda di perangkat ini. Data akan dikirim otomatis setelah internet terhubung.
                </div>
              )}
              
              <div className="attendance-schedule-info">
                <p className="attendance-schedule-label">Jadwal Berlaku</p>
                {todayData?.schedule ? (
                  <div>
                    <div className="attendance-schedule-name">{todayData.schedule.name} ({todayData.schedule.start_time.substring(0,5)} - {todayData.schedule.end_time.substring(0,5)})</div>
                    {renderScheduleRanges()}
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
                  <button className="btn btn-primary btn-check-in" onClick={() => handleAttendance('check-in')} disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Absen Masuk'}
                  </button>
                )}
                {todayData?.can_check_out && (
                  <button className="btn btn-primary btn-check-out" onClick={() => handleAttendance('check-out')} disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Absen Pulang'}
                  </button>
                )}
                {!todayData?.can_check_in && !todayData?.can_check_out && todayData?.blocked_reason && (
                  <div className="attendance-blocked-msg" style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, textAlign: 'center', marginTop: '16px' }}>
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
                        {row.note && row.note.startsWith('[Absen offline') ? (
                          <div>
                            <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Offline</span>
                            <br/>
                            <span style={{ fontSize: '13px', color: '#475569' }}>{row.note}</span>
                          </div>
                        ) : row.note && row.note.startsWith('[') ? (
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
