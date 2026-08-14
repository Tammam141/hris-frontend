import { useState, useEffect } from 'react';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import '../components/ui/leavemanagement.css';
import '../components/ui/leave.css';
import { AlertModal } from '../components/ui/AlertModal';
import { LeaveDetailModal } from '../components/ui/LeaveDetailModal';
import { CheckIcon } from '../components/icons/CheckIcon';
import { XIcon } from '../components/icons/XIcon';
import { getLeaveApprovals, approveLeaveRequest, rejectLeaveRequest, LeaveRequest } from '../api/leave';

export function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Filter
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const limit = 10;

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string; action: 'approve' | 'reject'; name: string }>({ isOpen: false, id: '', action: 'approve', name: '' });
  const [decisionNote, setDecisionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  const fetchApprovals = () => {
    setIsLoading(true);
    getLeaveApprovals({ page, limit, status: statusFilter === 'all' ? undefined : statusFilter })
      .then(res => {
        setRequests(res.data);
        if (res.meta) setTotalPages(res.meta.total_pages || 1);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [page, statusFilter]);

  const openConfirm = (id: string, action: 'approve' | 'reject', name: string) => {
    setConfirmModal({ isOpen: true, id, action, name });
    setDecisionNote('');
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (confirmModal.action === 'approve') {
        await approveLeaveRequest(confirmModal.id, decisionNote);
      } else {
        await rejectLeaveRequest(confirmModal.id, decisionNote);
      }
      
      setAlertModal({
        isOpen: true,
        title: 'Berhasil',
        message: `Cuti untuk ${confirmModal.name} berhasil ${confirmModal.action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        type: 'success'
      });
      fetchApprovals();
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Gagal',
        message: err.message || 'Terjadi kesalahan.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Persetujuan Cuti</h1>
            <p className="dashboard-subtitle">Kelola pengajuan cuti karyawan.</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['pending', 'approved', 'rejected', 'cancelled', 'all'].map(status => (
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
              {status === 'all' ? 'Semua' : 
               status === 'pending' ? 'Menunggu' : 
               status === 'approved' ? 'Disetujui' : 
               status === 'rejected' ? 'Ditolak' : 'Dibatalkan'}
            </button>
          ))}
        </div>

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Nama Karyawan</th>
                <th>Jenis Cuti</th>
                <th>Tanggal</th>
                <th>Total Hari</th>
                <th>Alasan</th>
                <th>Status</th>
                <th style={{ width: '200px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Memuat data...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Tidak ada pengajuan cuti saat ini.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td><div style={{ fontWeight: 500, color: '#0f172a' }}>{req.employee_name}</div></td>
                    <td>{req.leave_type_name}</td>
                    <td>{req.start_date.substring(0, 10)} s/d {req.end_date.substring(0, 10)}</td>
                    <td>{req.total_days} hari</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td>
                      <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-detail"
                          style={{ padding: '4px 12px' }}
                          onClick={() => setSelectedRequest(req)}
                          title="Lihat Detail"
                        >
                          Detail
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button 
                              className="btn" 
                              style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, transition: 'background-color 0.2s' }}
                              onClick={() => openConfirm(req.id, 'approve', req.employee_name)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                            >
                              <CheckIcon /> Setujui
                            </button>
                            <button 
                              className="btn" 
                              style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, transition: 'background-color 0.2s' }}
                              onClick={() => openConfirm(req.id, 'reject', req.employee_name)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                              <XIcon /> Tolak
                            </button>
                          </>
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
      </div>

      {/* Custom Action Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{confirmModal.action === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>&times;</button>
            </div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px' }}>
                  Apakah Anda yakin ingin {confirmModal.action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan cuti dari <strong>{confirmModal.name}</strong>?
                </p>
                <div className="form-group">
                  <label className="form-label">Catatan (Opsional)</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    placeholder="Masukkan catatan jika diperlukan..."
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>Batal</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn" 
                  style={{ 
                    backgroundColor: confirmModal.action === 'approve' ? '#16a34a' : '#dc2626',
                    color: '#fff',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? 'Memproses...' : (confirmModal.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        type={alertModal.type}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />

      <LeaveDetailModal
        isOpen={selectedRequest !== null}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
