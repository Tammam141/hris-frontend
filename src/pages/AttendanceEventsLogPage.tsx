import React, { useState, useEffect } from 'react';
import { getAttendanceEvents } from '../api/attendance';
import { AttendanceEvent, GetAttendanceEventsParams } from '../types/attendance';
import '../components/ui/dashboard.css';
import { AlertModal } from '../components/ui/AlertModal';

export function AttendanceEventsLogPage() {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters
  const [onlyRejected, setOnlyRejected] = useState(false);
  const [kind, setKind] = useState<'check_in' | 'check_out' | ''>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params: GetAttendanceEventsParams = {
        page,
        limit: 20
      };
      
      if (onlyRejected) params.only_rejected = true;
      if (kind) params.kind = kind;

      const res = await getAttendanceEvents(params);
      if (res.success) {
        setEvents(res.data);
        setTotalPages(res.meta.total_pages);
        setTotalRecords(res.meta.total);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat log absensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, onlyRejected, kind]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(d);
    } catch (e) {
      return isoString;
    }
  };

  const formatDelay = (seconds: number) => {
    if (!seconds) return '0d';
    if (seconds < 60) return `${seconds}d`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ${seconds%60}d`;
    return `${Math.floor(seconds/3600)}j ${Math.floor((seconds%3600)/60)}m`;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Log Absensi Mentah</h1>
          <p className="dashboard-subtitle">Jejak rekaman penekanan tombol absensi secara real-time</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label" style={{ marginBottom: '8px' }}>Filter Jenis</label>
          <select 
            className="input-field" 
            style={{ width: '200px' }}
            value={kind} 
            onChange={(e) => { setKind(e.target.value as any); setPage(1); }}
          >
            <option value="">Semua (Masuk & Keluar)</option>
            <option value="check_in">Hanya Check-In</option>
            <option value="check_out">Hanya Check-Out</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', color: '#334155', fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={onlyRejected}
              onChange={(e) => { setOnlyRejected(e.target.checked); setPage(1); }}
              style={{ width: '18px', height: '18px' }}
            />
            Hanya Tampilkan yang Ditolak
          </label>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat log data...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada rekaman absensi yang ditemukan.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Jenis</th>
                <th>Waktu Ditekan (Occurred At)</th>
                <th>Diterima Server (Received At)</th>
                <th>Delay</th>
                <th>Sumber</th>
                <th>Status / Alasan Ditolak</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} style={{ backgroundColor: evt.rejection_reason ? '#fef2f2' : 'transparent' }}>
                  <td>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{evt.employee_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{evt.employee_number}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                      backgroundColor: evt.kind === 'check_in' ? '#dcfce7' : '#f1f5f9',
                      color: evt.kind === 'check_in' ? '#166534' : '#475569'
                    }}>
                      {evt.kind === 'check_in' ? 'Check-In' : 'Check-Out'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{formatDate(evt.occurred_at)}</td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(evt.received_at)}</td>
                  <td>
                    <span style={{ 
                      color: evt.delay_seconds > 60 ? '#ca8a04' : '#64748b', 
                      fontWeight: evt.delay_seconds > 60 ? 600 : 400 
                    }}>
                      {formatDelay(evt.delay_seconds)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                      {evt.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {evt.rejection_reason ? (
                      <div>
                        <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>DITOLAK</span>
                        <div style={{ fontSize: '13px', color: '#b91c1c' }}>{evt.rejection_reason}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>Diterima</span>
                    )}
                    {evt.note && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                        Catatan: {evt.note}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Total {totalRecords} data
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Sebelumnya
            </button>
            <span style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              Halaman {page} / {totalPages}
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={!!errorMsg}
        title="Error"
        type="error"
        message={errorMsg}
        onClose={() => setErrorMsg('')}
      />
    </div>
  );
}
