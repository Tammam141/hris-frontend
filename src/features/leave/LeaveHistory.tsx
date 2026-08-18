import React, { useEffect, useState } from 'react';
import { getMyLeaveRequests, cancelLeaveRequest, LeaveRequest } from '../../api/leave';
import { LeaveDetailModal } from '../../components/ui/LeaveDetailModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { isBefore, startOfDay, parseISO } from 'date-fns';
import { LeaveCalendar } from './LeaveCalendar';
import '../../components/ui/employee.css';
import '../../components/ui/leave.css';

interface LeaveHistoryProps {
  refreshKey?: number;
}

export function LeaveHistory({ refreshKey = 0 }: LeaveHistoryProps) {
  // State: Data
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State: UI & Filters
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // State: Modals
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, type: 'success' as 'success' | 'error', message: '' });

  // Effects
  useEffect(() => {
    loadRequests();
  }, [page, statusFilter, refreshKey, viewMode]);

  // Handlers
  const loadRequests = () => {
    setIsLoading(true);
    const currentLimit = viewMode === 'calendar' ? 500 : limit;
    const currentPage = viewMode === 'calendar' ? 1 : page;

    getMyLeaveRequests({ page: currentPage, limit: currentLimit, status: statusFilter })
      .then(res => {
        setRequests(res.data);
        if (res.meta) setTotalPages(res.meta.total_pages || 1);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  const handleCancelClick = (req: LeaveRequest) => {
    setRequestToCancel(req);
    setIsCancelConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!requestToCancel) return;
    try {
      await cancelLeaveRequest(requestToCancel.id);
      setAlertInfo({ open: true, type: 'success', message: 'Pengajuan cuti berhasil dibatalkan.' });
      loadRequests();
    } catch (err: any) {
      setAlertInfo({ open: true, type: 'error', message: err.message || 'Gagal membatalkan cuti.' });
    } finally {
      setIsCancelConfirmOpen(false);
      setRequestToCancel(null);
    }
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string, color: string, text: string }> = {
      approved: { bg: '#dcfce7', color: '#166534', text: 'Disetujui' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Ditolak' },
      cancelled: { bg: '#f1f5f9', color: '#475569', text: 'Dibatalkan' },
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Menunggu' },
    };
    const style = badges[status] || badges['pending'];
    return (
      <span style={{ backgroundColor: style.bg, color: style.color, padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>
        {style.text}
      </span>
    );
  };

  const canCancel = (req: LeaveRequest) => {
    if (req.status === 'pending') return true;
    if (req.status === 'approved') {
      const today = startOfDay(new Date());
      const startDate = startOfDay(parseISO(req.start_date.substring(0, 10)));
      return isBefore(today, startDate);
    }
    return false;
  };

  // Renderers
  const renderFilterTabs = () => {
    const tabs = [
      { id: '', label: 'Semua' },
      { id: 'pending', label: 'Menunggu' },
      { id: 'approved', label: 'Disetujui' },
      { id: 'rejected', label: 'Ditolak' },
      { id: 'cancelled', label: 'Dibatalkan' },
    ];

    return (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                border: isActive ? 'none' : '1px solid #cbd5e1',
                backgroundColor: isActive ? '#1a78d7' : '#fff',
                color: isActive ? '#fff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderTableData = () => {
    if (isLoading) {
      return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Memuat data...</td></tr>;
    }
    if (requests.length === 0) {
      return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada pengajuan cuti.</td></tr>;
    }
    return requests.map((req) => (
      <tr key={req.id}>
        <td><div style={{ fontWeight: 500, color: '#0f172a' }}>{req.leave_type_name}</div></td>
        <td>{req.start_date.substring(0, 10)} s/d {req.end_date.substring(0, 10)}</td>
        <td>{req.total_days} hari</td>
        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
        <td>{getStatusBadge(req.status)}</td>
        <td>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-detail"
              style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, borderRadius: '20px', border: '1px solid #bfdbfe' }}
              onClick={() => setSelectedRequest(req)}
              title="Lihat Detail"
            >
              Detail
            </button>
            {canCancel(req) && (
              <button 
                className="btn-delete"
                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, borderRadius: '20px', border: '1px solid #fca5a5' }}
                onClick={() => handleCancelClick(req)}
                title="Batalkan Cuti"
              >
                Batal
              </button>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
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
    );
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
      {/* Header & View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="leave-title">Riwayat Pengajuan Cuti</h2>
          <p style={{ color: '#64748b' }}>Pantau status pengajuan cuti Anda di bawah ini.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
           <button onClick={() => setViewMode('list')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? '#0f172a' : '#64748b', fontWeight: 600, cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Tabel</button>
           <button onClick={() => setViewMode('calendar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: viewMode === 'calendar' ? '#fff' : 'transparent', color: viewMode === 'calendar' ? '#0f172a' : '#64748b', fontWeight: 600, cursor: 'pointer', boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Kalender</button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' ? (
        <>
          {renderFilterTabs()}
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Jenis Cuti</th>
                  <th>Tanggal</th>
                  <th>Total Hari</th>
                  <th>Alasan</th>
                  <th>Status</th>
                  <th style={{ width: '150px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {renderTableData()}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      ) : (
        <div style={{ marginTop: '24px' }}>
          <LeaveCalendar requests={requests} onSelectEvent={setSelectedRequest} />
        </div>
      )}

      {/* Modals */}
      <LeaveDetailModal
        isOpen={selectedRequest !== null}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        title="Batalkan Pengajuan Cuti"
        message="Apakah Anda yakin ingin membatalkan pengajuan cuti ini?"
        confirmText="Ya, Batalkan"
        isDestructive={true}
        onConfirm={confirmCancel}
        onCancel={() => {
          setIsCancelConfirmOpen(false);
          setRequestToCancel(null);
        }}
      />

      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.type === 'success' ? 'Berhasil' : 'Error'}
        type={alertInfo.type}
        message={alertInfo.message}
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
