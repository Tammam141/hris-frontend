import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivityLogsApi, ActivityLog, GetActivityLogsParams } from '../api/activityLog';
import { formatToJakartaTimeOnly, formatPlainDate } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

// Ukuran data yang diambil per batch pada infinite scroll
const PAGE_SIZE = 15;

export function ActivityLogPage() {
  const { user } = useAuth();

  const [logResponse, setLogResponse] = useState({
    data: [] as ActivityLog[],
    total: 0,
    total_pages: 1
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  // State pemuatan batch berikutnya saat user scroll (tanpa me-reset tampilan tabel)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  // Elemen target (sentry) di bawah tabel yang dipantau oleh IntersectionObserver
  const sentryRef = useRef<HTMLDivElement | null>(null);

  // Form input filters
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    entity: '',
    entity_id: '',
    actor_user_id: '',
    start_date: '',
    end_date: ''
  });

  // Applied filters (hanya aktif saat klik 'Terapkan Filter')
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Fungsi pengambil data: me-replace jika page 1, atau menggabungkan (append) jika page > 1
  const loadData = useCallback(() => {
    let ignore = false;
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const params: GetActivityLogsParams = {
      ...appliedFilters,
      page,
      limit: PAGE_SIZE
    };

    getActivityLogsApi(params)
      .then(res => {
        if (ignore) return;
        if (res.success) {
          const newData = res.data || [];
          const total = res.meta?.total ?? 0;
          const totalPages = res.meta?.total_pages ?? 1;

          // Infinite scroll: gabungkan data baru ke data sebelumnya
          setLogResponse(prev => ({
            data: page === 1 ? newData : [...prev.data, ...newData],
            total,
            total_pages: totalPages
          }));
          setIsOfflineMode(false);

          // Simpan cache page 1 ke localStorage
          if (page === 1) {
            try {
              localStorage.setItem('cached_activity_logs', JSON.stringify({
                owner: user?.id,
                data: newData,
                total,
                total_pages: totalPages,
                page: 1,
                limit: PAGE_SIZE
              }));
            } catch {}
          }
        }
      })
      .catch(error => {
        if (ignore) return;
        const e = error as ApiError;
        if (e?.isNetworkError && page === 1) {
          try {
            const cached = localStorage.getItem('cached_activity_logs');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data) && parsed.data.length > 0) {
                setLogResponse({
                  data: parsed.data,
                  total: parsed.total ?? 0,
                  total_pages: parsed.total_pages ?? 1
                });
                setIsOfflineMode(true);
                return;
              }
            }
          } catch {}
        }

        setIsOfflineMode(false);
        setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat log aktivitas.', type: 'error' });
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [page, appliedFilters, user?.id]);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  // IntersectionObserver: mendeteksi saat pengguna scroll mendekati dasar tabel (rootMargin 150px)
  // dan secara otomatis menaikkan page untuk mengambil data berikutnya
  useEffect(() => {
    if (isLoading || isLoadingMore || page >= logResponse.total_pages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    const currentSentry = sentryRef.current;
    if (currentSentry) {
      observer.observe(currentSentry);
    }

    return () => {
      if (currentSentry) {
        observer.unobserve(currentSentry);
      }
    };
  }, [isLoading, isLoadingMore, page, logResponse.total_pages]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Reset page ke 1 saat filter baru diterapkan
  const handleApplyFilter = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleResetFilter = () => {
    const emptyFilters = {
      action: '',
      status: '',
      entity: '',
      entity_id: '',
      actor_user_id: '',
      start_date: '',
      end_date: ''
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
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
          <p className="dashboard-subtitle">Pantau jejak audit dan riwayat aktivitas sistem secara kontinu.</p>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button onClick={handleApplyFilter} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '4px' }}>
              Terapkan Filter
            </button>
            {(filters.action || filters.entity || filters.status || filters.start_date || filters.end_date) && (
              <button onClick={handleResetFilter} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '4px' }}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="attendance-history-title" style={{ margin: 0 }}>Data Log</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Memuat {logResponse.data.length} dari {logResponse.total} data
          </span>
        </div>
        
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '12px', color: '#64748b' }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#1a78d7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Memuat log aktivitas...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
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
                {logResponse.data && logResponse.data.length > 0 && logResponse.data.map((log, index) => (
                  <tr key={log.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {index + 1}.
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

        {/* Loading Spinner untuk baris tambahan saat scroll */}
        {isLoadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '8px', color: '#64748b', fontSize: '13px' }}>
            <div style={{ width: '18px', height: '18px', border: '2px solid #cbd5e1', borderTopColor: '#1a78d7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Memuat data log berikutnya...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Target elemen (sentry) untuk IntersectionObserver */}
        <div ref={sentryRef} style={{ height: '20px', margin: '8px 0' }} />

        {/* Fallback Tombol Manual Muat Lebih Banyak jika belum selesai */}
        {!isLoading && !isLoadingMore && page < logResponse.total_pages && (
          <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setPage(p => p + 1)}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '6px 18px', borderRadius: '20px' }}
            >
              Muat Lebih Banyak ({logResponse.data.length} dari {logResponse.total})
            </button>
          </div>
        )}

        {/* Indikator Semua Data Telah Dimuat */}
        {!isLoading && !isLoadingMore && page >= logResponse.total_pages && logResponse.data.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
            ✓ Seluruh {logResponse.total} log aktivitas telah ditampilkan
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
