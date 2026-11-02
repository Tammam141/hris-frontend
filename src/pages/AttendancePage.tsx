import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getTodayAttendanceApi, 
  checkInApi, 
  checkOutApi, 
  getMyAttendancesApi,
  getAttendanceEvents
} from '../api/attendance';
import { AttendanceTodayResponse, Attendance, AttendanceSummary, AttendanceEvent } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly, formatMinutesToDuration } from '../utils/dateFormatter';
import { toUserMessage, toFieldErrorMessage } from '../utils/apiMessage';
import { formatTodayAttendanceHeader } from '../utils/labels';
import { AlertModal } from '../components/ui/AlertModal';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, store } from '../store';
import { addOfflineAttendance, removeOfflineAttendance } from '../store/attendanceSlice';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function AttendancePage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [period, setPeriod] = useState<{ month?: number; year?: number; start_date?: string; end_date?: string } | null>(null);

  const [todayData, setTodayData] = useState<AttendanceTodayResponse | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  const dispatch = useDispatch();
  const offlineQueue = useSelector((state: RootState) => state.attendance.offlineQueue);

  const selectedMonthRef = useRef(selectedMonth);
  const selectedYearRef = useRef(selectedYear);
  useEffect(() => {
    selectedMonthRef.current = selectedMonth;
    selectedYearRef.current = selectedYear;
  }, [selectedMonth, selectedYear]);

  const loadData = useCallback(async (m?: number, y?: number) => {
    setIsLoading(true);
    const month = m ?? selectedMonthRef.current;
    const year = y ?? selectedYearRef.current;

    try {
      // Parallel fetch
      const [todayRes, historyRes] = await Promise.all([
        getTodayAttendanceApi(),
        getMyAttendancesApi({ month, year })
      ]);

      if (todayRes.success) setTodayData(todayRes.data);
      if (historyRes.success) {
        setHistory(historyRes.data);
        if (historyRes.summary) setSummary(historyRes.summary);
        if (historyRes.period) setPeriod(historyRes.period);
      }

      // Fetch log absensi mentah secara terpisah agar tidak merusak halaman jika API 404 (belum siap)
      try {
        const eventsRes = await getAttendanceEvents({ 
          employee_id: user?.employee?.id, 
          limit: 10 // Ambil 10 log terakhir saja
        });
        if (eventsRes.success) setEvents(eventsRes.data);
      } catch (err) {
        // Abaikan error log agar halaman utama tetap bisa dibuka (misal API belum ada)
        console.warn('Gagal memuat log mentah absensi:', err);
      }

    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Gagal', message: toUserMessage(e, 'Gagal memuat data absensi.'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.employee?.id]);

  useEffect(() => {
    loadData(selectedMonth, selectedYear);
  }, [loadData, selectedMonth, selectedYear]);

  // Refresh otomatis saat tab kembali aktif (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Refresh otomatis saat batas absen lewat (absent_cutoff_time + 1 menit zona Asia/Jakarta)
  useEffect(() => {
    if (!todayData?.schedule?.absent_cutoff_time) return;

    try {
      const [cutH, cutM] = todayData.schedule.absent_cutoff_time.split(':').map(Number);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(new Date());

      const map: Record<string, number> = {};
      for (const p of parts) {
        if (p.type !== 'literal') {
          map[p.type] = parseInt(p.value, 10);
        }
      }

      // Target cutoff + 1 menit dalam detik hari ini di Jakarta
      const targetSec = cutH * 3600 + (cutM + 1) * 60;
      const currentSec = (map.hour || 0) * 3600 + (map.minute || 0) * 60 + (map.second || 0);
      const diffSec = targetSec - currentSec;

      if (diffSec > 0) {
        const timer = setTimeout(() => {
          loadData();
        }, diffSec * 1000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error('Error setting cutoff refresh timer:', err);
    }
  }, [todayData?.schedule?.absent_cutoff_time, loadData]);

  const isSyncingRef = useRef(false);

  // Proses sinkronisasi otomatis saat internet kembali menyala
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (isSyncingRef.current) return;
      
      // Ambil antrean langsung dari store (bukan closure)
      const currentQueue = store.getState().attendance.offlineQueue;
      const myQueue = [];
      const todayDate = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).substring(0, 10);
      
      for (const item of currentQueue) {
        if (!item.user_id) {
          // Buang antrean lama tanpa user_id
          dispatch(removeOfflineAttendance(item.id));
        } else if (item.user_id === user?.id) {
          // Buang jika bukan hari ini (Asia/Jakarta)
          const itemDate = new Date(item.offline_time).toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).substring(0, 10);
          if (itemDate !== todayDate) {
            dispatch(removeOfflineAttendance(item.id));
          } else {
            myQueue.push(item);
          }
        }
      }

      if (myQueue.length === 0) return;
      
      try {
        isSyncingRef.current = true;
        let syncCount = 0;
        
        for (const item of myQueue) {
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
            
            if (e.status === 409) {
              dispatch(removeOfflineAttendance(item.id));
              if (e.details?.attendance) {
                const backendTimeStr = item.type === 'check-in' ? e.details.attendance.check_in_at : e.details.attendance.check_out_at;
                if (backendTimeStr) {
                  const backendTimeMs = new Date(backendTimeStr).getTime();
                  const localTimeMs = new Date(item.offline_time).getTime();
                  
                  if (backendTimeMs === localTimeMs) {
                    syncCount++;
                    continue;
                  }
                }
              }
              setAlertInfo({ open: true, title: 'Sinkronisasi Ditolak', message: toUserMessage(e, 'Absensi sudah tercatat sebelumnya.'), type: 'error' });
            } else if (e.status === 400 || e.code === 'VALIDATION_ERROR') {
              dispatch(removeOfflineAttendance(item.id));
              setAlertInfo({ open: true, title: 'Absen Ditolak', message: toUserMessage(e, 'Data offline ditolak oleh sistem.'), type: 'error' });
            } else if (e.status === 401) {
              break;
            }
          }
        }

        if (syncCount > 0) {
          setAlertInfo({ open: true, title: 'Sinkronisasi Berhasil', message: `${syncCount} data absensi offline berhasil dikirim ke server!`, type: 'success' });
          loadData();
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Sinkronisasi saat komponen pertama kali dimuat jika online
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [dispatch, user?.id, loadData]);

  // Logika absen (menangani online & offline secara dinamis untuk masuk maupun pulang)
  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    const label = type === 'check-in' ? 'masuk' : 'pulang';

    if (!navigator.onLine) {
      const now = new Date().toISOString();
      
      // MENYIMPAN KE LOKAL SAAT OFFLINE
      dispatch(addOfflineAttendance({
        id: `${type}-${Date.now()}`,
        type,
        offline_time: now,
        user_id: user?.id
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
      let successMessage = `Berhasil melakukan absensi ${label}.`;
      if (type === 'check-in') {
        await checkInApi(undefined);
      } else {
        const res = await checkOutApi(undefined);
        if (res?.message) successMessage = res.message;
      }
      setAlertInfo({ open: true, title: 'Berhasil', message: successMessage, type: 'success' });
      loadData();
    } catch (e: any) {
      if (e.isNetworkError) {
        const now = new Date().toISOString();
        dispatch(addOfflineAttendance({
          id: `${type}-${Date.now()}`,
          type,
          offline_time: now,
          user_id: user?.id
        }));
        setAlertInfo({ open: true, title: 'Mode Offline (Gangguan)', message: `Gagal terhubung ke server. Absen ${label} disimpan di perangkat.`, type: 'success' });
        
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
      } else {
        setAlertInfo({ open: true, title: 'Gagal Absen', message: toUserMessage(e, `Gagal melakukan absensi ${label}.`), type: 'error' });
        loadData();
      }
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
      <div className="attendance-schedule-ranges-box">
        <div className="attendance-range-row">
          <span className="attendance-range-label present">Hadir</span>
          <span>{start} &ndash; {presentEnd}</span>
        </div>
        <div className="attendance-range-row late-row">
          <span className="attendance-range-label late">Terlambat</span>
          <span>{lateStart} &ndash; {cutoff}</span>
        </div>
        <div className="attendance-range-footer">
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

  const statusLabels: Record<string, string> = {
    present: 'Hadir',
    late: 'Terlambat',
    absent: 'Tidak Hadir',
    leave: 'Cuti',
    holiday: 'Libur'
  };

  const filteredHistory = history.filter(row => {
    if (filterDate && row.attendance_date.slice(0, 10) !== filterDate) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    return true;
  });

  const handleDateFilterChange = (value: string) => {
    setFilterDate(value);
    // Riwayat dimuat per bulan, jadi pindahkan periode ke bulan dari tanggal yang dipilih
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setSelectedYear(y);
        setSelectedMonth(m);
      }
    }
  };

  const handleResetFilter = () => {
    setFilterDate('');
    setFilterStatus('');
  };

  const handleDownload = () => {
    const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Tanggal', 'Jam Masuk (WIB)', 'Jam Pulang (WIB)', 'Status', 'Terlambat (menit)', 'Jam Kerja (menit)', 'Lembur (menit)', 'Catatan'];
    const rows = filteredHistory.map(row => [
      row.attendance_date.slice(0, 10),
      row.check_in_at ? formatToJakartaTimeOnly(row.check_in_at) : '',
      row.check_out_at ? formatToJakartaTimeOnly(row.check_out_at) : '',
      statusLabels[row.status] || row.status,
      row.late_minutes || 0,
      row.work_minutes || 0,
      row.overtime_minutes || 0,
      row.note || ''
    ]);
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formatLongDate = (iso: string) => {
      const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
      return `${d} ${monthNames[m - 1]} ${y}`;
    };
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const startIso = period?.start_date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endIso = period?.end_date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const periodText = `${formatLongDate(startIso)} - ${formatLongDate(endIso)}`;

    const emp = user?.employee;
    const employeeName = emp?.full_name || user?.full_name || '-';
    const identity = [
      ['Nama karyawan', employeeName],
      ['Nomor karyawan', emp?.employee_number || user?.employee_number || '-'],
      ['Unit', emp?.department_name || '-'],
      ['Jabatan', emp?.position_name || '-'],
      ['Periode', periodText],
    ];
    const identityLines = identity.map(r => r.map(csvCell).join(','));

    const tableLines = [header, ...rows].map(r => r.map(csvCell).join(','));
    const csv = [...identityLines, '', ...tableLines].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = employeeName.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Karyawan';
    a.download = `Absensi_${safeName}_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="attendance-page-layout">
          
          {/* Card Absensi Hari Ini */}
          <div className="attendance-today-card">
            <h2 className="attendance-today-title">{formatTodayAttendanceHeader(todayData?.date)}</h2>

            {todayData?.overnight_attendance && (
              <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                Anda belum absen pulang untuk <strong>{formatPlainDate(todayData.overnight_attendance.attendance_date)}</strong>
                {todayData.overnight_attendance.check_in_at ? `, masuk ${formatToJakartaTimeOnly(todayData.overnight_attendance.check_in_at)}` : ''}.
              </div>
            )}
            
            <div className="attendance-today-content">
              {offlineQueue.length > 0 && (
                <div className="attendance-offline-warning">
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

              {todayData?.attendance && !todayData.attendance.check_in_at && todayData.attendance.status && (
                <div className="attendance-time-block">
                  <p className="attendance-time-label">Status Hari Ini</p>
                  <div style={{ marginTop: '4px' }}>
                    {translateStatus(todayData.attendance.status)}
                  </div>
                </div>
              )}

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
                <p className="attendance-summary-label">Tidak hadir</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value leave">{summary.leave}</p>
                <p className="attendance-summary-label">Total Cuti</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value holiday">{summary.holiday ?? 0}</p>
                <p className="attendance-summary-label">Total Libur</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value work">{formatMinutesToDuration(summary.total_work_minutes)}</p>
                <p className="attendance-summary-label">Total Jam Kerja</p>
              </div>
              <div className="attendance-summary-card">
                <p className="attendance-summary-value work">{formatMinutesToDuration(summary.total_overtime_minutes ?? 0)}</p>
                <p className="attendance-summary-label">Total Lembur</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{summary.overtime_days ?? 0} hari</p>
              </div>
            </div>
          )}

          {/* Riwayat Absensi */}
          <div className="attendance-history-card">
            <div className="attendance-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="attendance-history-title">Riwayat Absensi</h2>
                {period?.start_date && period?.end_date && (
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                    Periode: {formatPlainDate(period.start_date)} &ndash; {formatPlainDate(period.end_date)}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="attendance-select-filter"
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                    color: '#374151'
                  }}
                >
                  <option value={1}>Januari</option>
                  <option value={2}>Februari</option>
                  <option value={3}>Maret</option>
                  <option value={4}>April</option>
                  <option value={5}>Mei</option>
                  <option value={6}>Juni</option>
                  <option value={7}>Juli</option>
                  <option value={8}>Agustus</option>
                  <option value={9}>September</option>
                  <option value={10}>Oktober</option>
                  <option value={11}>November</option>
                  <option value={12}>Desember</option>
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="attendance-select-filter"
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                    color: '#374151'
                  }}
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', margin: '12px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Tanggal</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => handleDateFilterChange(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: '#fff', color: '#374151' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: '#fff', color: '#374151' }}
                >
                  <option value="">Semua Status</option>
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="absent">Tidak Hadir</option>
                  <option value="leave">Cuti</option>
                  <option value="holiday">Libur</option>
                </select>
              </div>
              {(filterDate || filterStatus) && (
                <button type="button" className="btn btn-secondary" onClick={handleResetFilter} style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }}>Atur ulang</button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={filteredHistory.length === 0} style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem', marginLeft: 'auto' }}>
                Unduh CSV
              </button>
            </div>
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk (WIB)</th>
                    <th>Jam Pulang (WIB)</th>
                    <th>Status</th>
                    <th>Terlambat</th>
                    <th>Jam Kerja</th>
                    <th>Lembur</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(row => (
                    <tr key={row.id}>
                      <td className="table-cell-date">{formatPlainDate(row.attendance_date)}</td>
                      <td>{row.check_in_at ? formatToJakartaTimeOnly(row.check_in_at) : '-'}</td>
                      <td>{row.check_out_at ? formatToJakartaTimeOnly(row.check_out_at) : '-'}</td>
                      <td>{translateStatus(row.status)}</td>
                      <td>{row.late_minutes > 0 ? <span className="table-cell-late">{row.late_minutes} mnt</span> : <span className="table-cell-empty">-</span>}</td>
                      <td>{row.work_minutes ? formatMinutesToDuration(row.work_minutes) : <span className="table-cell-empty">-</span>}</td>
                      <td>{row.overtime_minutes > 0 ? formatMinutesToDuration(row.overtime_minutes) : <span className="table-cell-empty">-</span>}</td>
                      <td>
                        {(() => {
                          if (!row.note) return <span className="note-empty">Tidak ada</span>;
                          const note = row.note;
                          if (note.startsWith('[Offline attendance') || note.startsWith('[Absen offline')) {
                            return (
                              <div>
                                <span className="note-badge-offline">Offline</span>
                                <br />
                                <span className="note-text">{note}</span>
                              </div>
                            );
                          } else if (note.startsWith('[Corrected by') || note.startsWith('[Dikoreksi oleh')) {
                            return (
                              <div>
                                <span className="note-badge-corrected">Dikoreksi</span>
                                <br />
                                <span className="note-text">{note}</span>
                              </div>
                            );
                          } else {
                            return <span className="note-text">{note}</span>;
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="table-cell-no-data">Tidak ada data absensi pada periode ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Riwayat Tombol Absen Saya */}
          <div className="attendance-history-card">
            <div className="log-header-container">
              <div>
                <h2 className="attendance-history-title log-header-title">Riwayat tombol absen</h2>
                <p className="log-header-subtitle">10 percobaan absen terakhir, termasuk yang ditolak</p>
              </div>
            </div>
            
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Jenis</th>
                    <th>Waktu ditekan</th>
                    <th>Sumber</th>
                    <th>Status / Alasan ditolak</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(evt => (
                    <tr key={evt.id} className={evt.rejection_reason ? 'log-row-rejected' : 'log-row-default'}>
                      <td>
                        <span className={evt.kind === 'check_in' ? 'log-badge-checkin' : 'log-badge-checkout'}>
                          {evt.kind === 'check_in' ? 'Absen masuk' : 'Absen pulang'}
                        </span>
                      </td>
                      <td className="log-cell-time">
                        {new Date(evt.occurred_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                      </td>
                      <td className="log-cell-source">
                        {evt.source.replace('_', ' ')}
                      </td>
                      <td>
                        {evt.rejection_reason ? (
                          <div className="log-cell-rejected">
                            Ditolak: {toFieldErrorMessage(evt.rejection_reason)}
                          </div>
                        ) : (
                          <span className="log-cell-accepted">Diterima</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="log-cell-no-data">
                        Belum ada riwayat tombol absen.
                      </td>
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
