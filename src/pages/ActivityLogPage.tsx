import { useState, useEffect } from 'react';
import { getActivityLogsApi, ActivityLog, GetActivityLogsParams } from '../api/activityLog';
import { formatToJakartaTimeOnly, formatPlainDate } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import { ApiError } from '../api/client';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function ActivityLogPage() {
  // 1. State dibungkus ke dalam satu objek (data, pagination, total)
  const [logResponse, setLogResponse] = useState({
    data: [] as ActivityLog[],
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Penanda data berasal dari cache lokal saat BE down
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  const page = logResponse.page;
  const setPage = (updater: number | ((p: number) => number)) =>
    setLogResponse(prev => ({ ...prev, page: typeof updater === 'function' ? updater(prev.page) : updater }));

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    entity: '',
    entity_id: '',
    actor_user_id: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: GetActivityLogsParams = {
        ...filters,
        page,
        limit: logResponse.limit
      };
      const res = await getActivityLogsApi(params);
      if (res.success) {
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        // 2. Data respon backend dibungkus ke state logResponse
        setLogResponse(prev => ({ ...prev, ...newData }));
        setIsOfflineMode(false);
        // Simpan cadangan ke localStorage saat BE sukses
        try {
          localStorage.setItem('cached_activity_logs', JSON.stringify({ ...newData, page, limit: logResponse.limit }));
        } catch {}
      }
    } catch (error) {
      // Jika BE mati / down: ambil data cadangan dari localStorage
      try {
        const cached = localStorage.getItem('cached_activity_logs');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setLogResponse(prev => ({
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
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat log aktivitas.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilter = () => {
    if (page !== 1) {
      setPage(1); // loadData will be called by useEffect
    } else {
      loadData();
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="log-cell-accepted">Sukses</span>;
      case 'failed':
      case 'rejected':
      case 'error':
        return <span className="log-cell-rejected">Gagal</span>;
      default:
        return <span className="log-cell-source">{status}</span>;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Log Aktivitas Sistem</h1>
          <p className="dashboard-subtitle">Pantau jejak audit dan aktivitas yang terjadi di dalam sistem.</p>
        </div>
      </div>

      {isOfflineMode && (
        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginTop: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data log lokal terakhir yang tersimpan di perangkat.</span>
        </div>
      )}

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Tindakan</label>
            <input name="action" value={filters.action} onChange={handleFilterChange} placeholder="Contoh: create, update" style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Modul/Entitas</label>
            <input name="entity" value={filters.entity} onChange={handleFilterChange} placeholder="Contoh: employee" style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <option value="">Semua Status</option>
              <option value="success">Sukses</option>
              <option value="failed">Gagal</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Dari Tanggal</label>
            <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Sampai Tanggal</label>
            <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleApplyFilter} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '4px' }}>Terapkan Filter</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="attendance-history-title" style={{ margin: 0 }}>Data Log</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Menampilkan {logResponse.data.length} dari {logResponse.total} data
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
                  <th>Waktu</th>
                  <th>Aktor</th>
                  <th>Tindakan</th>
                  <th>Entitas</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                  <th>IP & Agent</th>
                </tr>
              </thead>
              <tbody>
                {/* 3. Map dipanggil dari logResponse.data untuk memunculkan baris tabel */}
                {logResponse.data && logResponse.data.length > 0 && logResponse.data.map((log, index) => (
                  <tr key={log.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {((logResponse.page - 1) * logResponse.limit) + index + 1}.
                    </td>
                    <td className="table-cell-date" style={{ whiteSpace: 'nowrap' }}>
                      {formatPlainDate(log.created_at)}<br/>
                      <span className="log-cell-time">{formatToJakartaTimeOnly(log.created_at)}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{log.actor_name || 'System / Anonymous'}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>
                      <span className="log-cell-source">{log.entity}</span>
                      {log.entity_id && <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {log.entity_id}</div>}
                    </td>
                    <td>{renderStatus(log.status)}</td>
                    <td><span className="note-text">{log.description || '-'}</span></td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{log.ip_address || '-'}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent || ''}>{log.user_agent || '-'}</div>
                    </td>
                  </tr>
                ))}
                {logResponse.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="table-cell-no-data">Belum ada data log aktivitas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {logResponse.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {page} dari {logResponse.total_pages}</span>
            <button 
              disabled={page === logResponse.total_pages} 
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === logResponse.total_pages ? '#f1f5f9' : '#fff', cursor: page === logResponse.total_pages ? 'not-allowed' : 'pointer' }}
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
