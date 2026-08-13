import React, { useEffect, useState } from 'react';
import { getMyLeaveRequests, cancelLeaveRequest, LeaveRequest } from '../../api/leave';
import { LeaveDetailModal } from '../../components/ui/LeaveDetailModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { isBefore, startOfDay, parseISO } from 'date-fns';
import '../../components/ui/employee.css';
import '../../components/ui/leave.css';

export function LeaveHistory() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Cancel state
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, type: 'success' as 'success' | 'error', message: '' });

  useEffect(() => {
    loadRequests();
  }, [page, statusFilter]);

  const loadRequests = () => {
    setIsLoading(true);
    getMyLeaveRequests({ page, limit, status: statusFilter })
      .then(res => {
        setRequests(res.data);
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
        }
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved':
        return <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Disetujui</span>;
      case 'rejected':
        return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Ditolak</span>;
      case 'cancelled':
        return <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Dibatalkan</span>;
      default:
        return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Menunggu</span>;
    }
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

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
      <h2 className="leave-title">Riwayat Pengajuan Cuti</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Pantau status pengajuan cuti Anda di bawah ini.</p>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              border: statusFilter === status ? 'none' : '1px solid #cbd5e1',
              backgroundColor: statusFilter === status ? '#1a78d7' : '#fff',
              color: statusFilter === status ? '#fff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {status === '' ? 'Semua' : 
             status === 'pending' ? 'Menunggu' : 
             status === 'approved' ? 'Disetujui' : 
             status === 'rejected' ? 'Ditolak' : 'Dibatalkan'}
          </button>
        ))}
      </div>

      <div className="employee-table-container">
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
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Memuat data...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada pengajuan cuti.</td>
              </tr>
            ) : (
              requests.map((req) => (
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
                        onClick={() => setSelectedRequest(req)}
                        title="Lihat Detail"
                      >
                        Detail
                      </button>
                      {canCancel(req) && (
                        <button 
                          className="btn-delete"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleCancelClick(req)}
                          title="Batalkan Cuti"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
