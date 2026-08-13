import React, { useState, useEffect } from 'react';
import { getLeaveRequestDetail, getAttachmentSignedUrl, LeaveRequest } from '../../api/leave';
import '../../features/employee/employee-modal.css';
import '../ui/leave.css';

interface LeaveDetailModalProps {
  isOpen: boolean;
  request: LeaveRequest | null;
  onClose: () => void;
}

export function LeaveDetailModal({ isOpen, request, onClose }: LeaveDetailModalProps) {
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [attachmentSrc, setAttachmentSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !request) {
      setDetail(null);
      setAttachmentSrc(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getLeaveRequestDetail(request.id)
      .then(async (res) => {
        if (!isMounted) return;
        setDetail(res.data);

        // Fetch signed URL jika ada attachment
        if (res.data.attachments && res.data.attachments.length > 0) {
          try {
            const urlRes = await getAttachmentSignedUrl(res.data.attachments[0].id);
            if (isMounted) setAttachmentSrc(urlRes.data.url);
          } catch (err) {
            console.error('Failed to get signed URL', err);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

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

  const displayData = detail || request;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detail Pengajuan Cuti</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ padding: '16px 24px' }}>
          {isLoading && !detail ? (
            <p style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Memuat detail...</p>
          ) : (
            <>
              {displayData.employee_name && (
                <div className="leave-detail-row">
                  <span className="leave-detail-label">Karyawan</span>
                  <span className="leave-detail-value">{displayData.employee_name}</span>
                </div>
              )}

              <div className="leave-detail-row">
                <span className="leave-detail-label">Jenis Cuti</span>
                <span className="leave-detail-value">{displayData.leave_type_name}</span>
              </div>

              <div className="leave-detail-row">
                <span className="leave-detail-label">Tanggal</span>
                <span className="leave-detail-value">
                  {displayData.start_date.substring(0, 10)} s/d {displayData.end_date.substring(0, 10)}
                </span>
              </div>

              <div className="leave-detail-row">
                <span className="leave-detail-label">Total Hari</span>
                <span className="leave-detail-value">{displayData.total_days} hari kerja</span>
              </div>

              <div className="leave-detail-row">
                <span className="leave-detail-label">Alasan</span>
                <span className="leave-detail-value">{displayData.reason || '-'}</span>
              </div>

              <div className="leave-detail-row">
                <span className="leave-detail-label">Status</span>
                <span className="leave-detail-value">{getStatusBadge(displayData.status)}</span>
              </div>

              {displayData.decision_note && (
                <div className="leave-detail-row">
                  <span className="leave-detail-label">Catatan Penyetuju</span>
                  <span className="leave-detail-value" style={{ fontStyle: 'italic', color: '#475569' }}>
                    "{displayData.decision_note}"
                  </span>
                </div>
              )}

              {/* Foto Bukti */}
              {isLoading && (
                <div className="leave-detail-row" style={{ flexDirection: 'column' }}>
                  <span className="leave-detail-label" style={{ marginBottom: '8px' }}>Foto Bukti</span>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Memuat foto...</p>
                </div>
              )}

              {!isLoading && attachmentSrc && (
                <div className="leave-detail-row" style={{ flexDirection: 'column' }}>
                  <span className="leave-detail-label" style={{ marginBottom: '8px' }}>Foto Bukti</span>
                  <div className="leave-detail-attachment">
                    <img 
                      src={attachmentSrc} 
                      alt="Bukti Cuti" 
                      onClick={() => window.open(attachmentSrc, '_blank')}
                      title="Klik untuk memperbesar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {!isLoading && !attachmentSrc && (
                <div className="leave-detail-row" style={{ flexDirection: 'column' }}>
                  <span className="leave-detail-label" style={{ marginBottom: '8px' }}>Foto Bukti</span>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Tidak ada foto bukti yang dilampirkan.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
