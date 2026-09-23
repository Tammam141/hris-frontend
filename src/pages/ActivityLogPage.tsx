import { useState, useEffect } from 'react';
import { getActivityLogsApi, ActivityLog, GetActivityLogsParams } from '../api/activityLog';
import { formatToJakartaTimeOnly, formatPlainDate } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import { ApiError } from '../api/client';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalData, setTotalData] = useState(0);

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
        limit: 50 // Standardize on 50 or 20 for log views
      };
      const res = await getActivityLogsApi(params);
      if (res.success) {
        setLogs(res.data);
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
          setTotalData(res.meta.total || 0);
        }
      }
    } catch (error) {
      const e = error as ApiError;
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
            Menampilkan {logs.length} dari {totalData} data
          </span>
        </div>
        
        {isLoading ? (
          <p className="table-cell-no-data">Memuat data...</p>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
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
                {logs.map(log => (
                  <tr key={log.id}>
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
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell-no-data">Belum ada data log aktivitas.</td>
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
