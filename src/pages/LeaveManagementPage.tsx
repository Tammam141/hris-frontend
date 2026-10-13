import { useState, useEffect, useCallback } from 'react';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import '../components/ui/leavemanagement.css';
import '../components/ui/leave.css';
import { AlertModal } from '../components/ui/AlertModal';
import { LeaveDetailModal } from '../components/ui/LeaveDetailModal';
import { CheckIcon } from '../components/icons/CheckIcon';
import { XIcon } from '../components/icons/XIcon';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { 
  getLeaveApprovals, 
  getAllLeaveRequests, 
  getLeaveRequestDetail, 
  approveLeaveRequest, 
  rejectLeaveRequest, 
  LeaveRequest, 
  LeaveColleagueOnLeave 
} from '../api/leave';
import { getActivityLogsApi, ActivityLog } from '../api/activityLog';
import { ShowIf } from '../components/ShowIf';
import { useAuth } from '../hooks/useAuth';
import { formatPlainDate, formatToJakartaTime } from '../utils/dateFormatter';
import { isStaffingLimitError, formatStaffingLimitMessage } from '../utils/staffingLimit';

type StatusFilterType = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all' | 'failed';

function formatShortDateRange(startStr: string, endStr: string): string {
  try {
    const s = parseISO(startStr.substring(0, 10));
    const e = parseISO(endStr.substring(0, 10));
    const sDate = s.getDate();
    const sMonth = s.getMonth();
    const eMonth = e.getMonth();
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (startStr.substring(0, 10) === endStr.substring(0, 10)) {
      return format(s, 'd MMM yyyy', { locale: idLocale });
    }
    if (sMonth === eMonth && sYear === eYear) {
      return `${sDate}–${format(e, 'd MMM yyyy', { locale: idLocale })}`;
    }
    return `${format(s, 'd MMM yyyy', { locale: idLocale })} – ${format(e, 'd MMM yyyy', { locale: idLocale })}`;
  } catch {
    return `${startStr} s/d ${endStr}`;
  }
}

export function LeaveManagementPage() {
  const { hasFeature } = useAuth();
  const canViewAll = hasFeature('leave.view_all');

  // Filter status berbentuk pill
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('pending');
  const isFailed = statusFilter === 'failed';

  // State untuk data cuti
  const [leaveResponse, setLeaveResponse] = useState({
    data: [] as LeaveRequest[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });

  // State untuk data pengajuan cuti yang gagal (activity logs)
  const [failedResponse, setFailedResponse] = useState({
    data: [] as ActivityLog[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Pagination helper
  const page = isFailed ? failedResponse.page : leaveResponse.page;
  const totalPages = isFailed ? failedResponse.total_pages : leaveResponse.total_pages;
  const setPage = (updater: number | ((p: number) => number)) => {
    if (isFailed) {
      setFailedResponse(prev => ({ ...prev, page: typeof updater === 'function' ? updater(prev.page) : updater }));
    } else {
      setLeaveResponse(prev => ({ ...prev, page: typeof updater === 'function' ? updater(prev.page) : updater }));
    }
  };

  // State konfirmasi modal Setujui / Tolak
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    id: string; 
    action: 'approve' | 'reject'; 
    name: string; 
  }>({ isOpen: false, id: '', action: 'approve', name: '' });
  const [decisionNote, setDecisionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State peringatan rekan cuti saat approve
  const [colleaguesOnLeave, setColleaguesOnLeave] = useState<LeaveColleagueOnLeave[]>([]);
  const [isLoadingColleagues, setIsLoadingColleagues] = useState(false);

  // State untuk dialog paksa setujui (override batas kuota departemen)
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    fullDatesStr: string;
    note: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
    fullDatesStr: '',
    note: '',
  });
  const [overrideError, setOverrideError] = useState('');

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Load data berdasarkan filter aktif
  const loadData = useCallback(() => {
    setIsLoading(true);

    if (statusFilter === 'failed') {
      const cacheKey = `cached_leave_failed_${failedResponse.page}`;
      getActivityLogsApi({
        action: 'leave.create',
        status: 'failed',
        page: failedResponse.page,
        limit: failedResponse.limit
      })
        .then(res => {
          const newData = {
            data: res.data || [],
            total: res.meta?.total ?? 0,
            total_pages: res.meta?.total_pages ?? 1
          };
          setFailedResponse(prev => ({ ...prev, ...newData }));
          setIsOfflineMode(false);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ ...newData, page: failedResponse.page, limit: failedResponse.limit }));
          } catch {}
        })
        .catch(err => {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && Array.isArray(parsed.data)) {
                setFailedResponse(prev => ({ ...prev, data: parsed.data, total: parsed.total ?? 0, total_pages: parsed.total_pages ?? 1 }));
                setIsOfflineMode(true);
                return;
              }
            }
          } catch {}
          setIsOfflineMode(false);
          console.error(err);
        })
        .finally(() => setIsLoading(false));
      return;
    }

    // Jika canViewAll (HR) dan statusFilter !== 'pending', ambil dari getAllLeaveRequests agar rekap semua pengajuan muncul
    const useAllRequests = canViewAll && statusFilter !== 'pending';
    const cacheKey = useAllRequests
      ? `cached_leave_all_${statusFilter}`
      : `cached_leave_approvals_${statusFilter}`;
    
    const apiCall = useAllRequests
      ? getAllLeaveRequests({ page: leaveResponse.page, limit: leaveResponse.limit, status: statusFilter === 'all' ? undefined : statusFilter })
      : getLeaveApprovals({ page: leaveResponse.page, limit: leaveResponse.limit, status: statusFilter === 'all' ? undefined : statusFilter });

    apiCall
      .then(res => {
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        setLeaveResponse(prev => ({ ...prev, ...newData }));
        setIsOfflineMode(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ...newData, page: leaveResponse.page, limit: leaveResponse.limit }));
        } catch {}
      })
      .catch(err => {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
              setLeaveResponse(prev => ({
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
        setIsOfflineMode(false);
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [statusFilter, canViewAll, leaveResponse.page, leaveResponse.limit, failedResponse.page, failedResponse.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterClick = (filter: StatusFilterType) => {
    setStatusFilter(filter);
    if (filter === 'failed') {
      setFailedResponse(prev => ({ ...prev, page: 1 }));
    } else {
      setLeaveResponse(prev => ({ ...prev, page: 1 }));
    }
  };

  const openConfirm = async (id: string, action: 'approve' | 'reject', name: string) => {
    setConfirmModal({ isOpen: true, id, action, name });
    setDecisionNote('');
    setColleaguesOnLeave([]);

    if (action === 'approve') {
      setIsLoadingColleagues(true);
      try {
        const detailRes = await getLeaveRequestDetail(id);
        if (detailRes?.data?.colleagues_on_leave && detailRes.data.colleagues_on_leave.length > 0) {
          setColleaguesOnLeave(detailRes.data.colleagues_on_leave);
        }
      } catch (err) {
        console.error('Gagal mengambil detail rekan cuti:', err);
      } finally {
        setIsLoadingColleagues(false);
      }
    }
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
      loadData();
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (err: any) {
      if (confirmModal.action === 'approve' && isStaffingLimitError(err)) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (err.details?.can_override) {
          let dateList = '';
          if (err.details?.full_dates && err.details.full_dates.length > 0) {
            dateList = err.details.full_dates.map((d: any) => {
              try {
                return format(parseISO(d.date.substring(0, 10)), 'd MMM yyyy', { locale: idLocale });
              } catch {
                return d.date;
              }
            }).join(', ');
          } else {
            dateList = 'tanggal yang diajukan';
          }

          setOverrideModal({
            isOpen: true,
            id: confirmModal.id,
            name: confirmModal.name,
            fullDatesStr: dateList,
            note: decisionNote || '',
          });
          setOverrideError('');
          return;
        } else {
          setAlertModal({
            isOpen: true,
            title: 'Kuota Cuti Departemen Penuh',
            message: `${formatStaffingLimitMessage(err.details)} Pengajuan ini tidak dapat disetujui.`,
            type: 'error'
          });
          return;
        }
      }

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

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overrideModal.note.trim().length < 10) {
      setOverrideError('Alasan persetujuan wajib diisi minimal 10 karakter.');
      return;
    }
    setIsSubmitting(true);
    try {
      await approveLeaveRequest(overrideModal.id, {
        override_staffing_limit: true,
        decision_note: overrideModal.note.trim()
      });
      setOverrideModal(prev => ({ ...prev, isOpen: false }));
      setAlertModal({
        isOpen: true,
        title: 'Berhasil',
        message: `Cuti untuk ${overrideModal.name} berhasil disetujui (override kuota cuti departemen).`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setOverrideError(err.message || 'Gagal menyetujui pengajuan cuti.');
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
      case 'failed':
        return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Gagal</span>;
      default:
        return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Menunggu</span>;
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Persetujuan & Rekap Cuti</h1>
            <p className="dashboard-subtitle">Kelola kotak masuk persetujuan serta pantau seluruh pengajuan cuti karyawan.</p>
          </div>
        </div>

        {isOfflineMode && (
          <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data lokal terakhir yang tersimpan di perangkat.</span>
          </div>
        )}

        {/* Filter Status Berbentuk Pill */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'pending', label: 'Menunggu' },
            { id: 'approved', label: 'Disetujui' },
            { id: 'rejected', label: 'Ditolak' },
            { id: 'cancelled', label: 'Dibatalkan' },
            { id: 'all', label: 'Semua' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleFilterClick(item.id as StatusFilterType)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                border: statusFilter === item.id ? 'none' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === item.id ? '#1a78d7' : '#fff',
                color: statusFilter === item.id ? '#fff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </button>
          ))}

          <ShowIf feature={['system.view_log']}>
            <button
              type="button"
              onClick={() => handleFilterClick('failed')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                border: statusFilter === 'failed' ? 'none' : '1px solid #fca5a5',
                backgroundColor: statusFilter === 'failed' ? '#dc2626' : '#fff',
                color: statusFilter === 'failed' ? '#fff' : '#b91c1c',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Pengajuan Gagal
            </button>
          </ShowIf>
        </div>

        {/* TABEL PENGAJUAN GAGAL */}
        {isFailed ? (
          <div className="employee-table-wrapper">
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
              Menampilkan jejak aktivitas pengajuan cuti yang gagal (misal: saldo tidak cukup atau melebihi kuota).
            </div>
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>NO</th>
                  <th>Aktor / Pemohon</th>
                  <th>Rentang Tanggal Cuti</th>
                  <th>Alasan Pengajuan</th>
                  <th>Keterangan / Error</th>
                  <th>Waktu Kejadian</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Memuat log aktivitas...</td>
                  </tr>
                ) : !failedResponse.data || failedResponse.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Belum ada log pengajuan cuti yang gagal.</td>
                  </tr>
                ) : (
                  failedResponse.data.map((log, index) => {
                    const startDate = log.metadata?.start_date;
                    const endDate = log.metadata?.end_date;
                    const dateDisplay = startDate && endDate
                      ? `${formatPlainDate(startDate)} s/d ${formatPlainDate(endDate)}`
                      : '-';

                    return (
                      <tr key={log.id}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                          {((failedResponse.page - 1) * failedResponse.limit) + index + 1}.
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#0f172a' }}>
                            {log.actor_name || 'System / Anonymous'}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{dateDisplay}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.metadata?.reason || '-'}
                        </td>
                        <td>
                          <span style={{ color: '#dc2626', fontSize: '13px' }}>
                            {log.description || 'Percobaan pembuatan cuti gagal'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '13px', color: '#64748b' }}>
                          {formatToJakartaTime(log.occurred_at || log.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TABEL DAFTAR PENGAJUAN CUTI (MENUNGGU / DISETUJUI / DITOLAK / DIBATALKAN / SEMUA) */
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>NO</th>
                  <th>Nama Karyawan</th>
                  <th>Jenis Cuti</th>
                  <th>Tanggal</th>
                  <th>Total Hari</th>
                  <th>Alasan</th>
                  {canViewAll && <th>Penyetuju</th>}
                  <th>Status</th>
                  <th style={{ width: statusFilter === 'pending' ? '200px' : '90px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canViewAll ? 9 : 8} style={{ textAlign: 'center', padding: '24px' }}>Memuat data...</td>
                  </tr>
                ) : !leaveResponse.data || leaveResponse.data.length === 0 ? (
                  <tr>
                    <td colSpan={canViewAll ? 9 : 8} style={{ textAlign: 'center', padding: '24px' }}>Tidak ada pengajuan cuti pada filter ini.</td>
                  </tr>
                ) : (
                  leaveResponse.data.map((req, index) => (
                    <tr key={req.id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {((leaveResponse.page - 1) * leaveResponse.limit) + index + 1}.
                      </td>
                      <td><div style={{ fontWeight: 500, color: '#0f172a' }}>{req.employee_name}</div></td>
                      <td>{req.leave_type_name}</td>
                      <td>{req.start_date.substring(0, 10)} s/d {req.end_date.substring(0, 10)}</td>
                      <td>{req.total_days} hari</td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                      {canViewAll && (
                        <td>
                          <span style={{ color: req.approver_name ? '#0f172a' : '#94a3b8', fontSize: '13px' }}>
                            {req.approver_name || '-'}
                          </span>
                        </td>
                      )}
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
        )}

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

      {/* Custom Action Modal (Setujui / Tolak) */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{confirmModal.action === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>&times;</button>
            </div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px' }}>
                  Apakah Anda yakin ingin {confirmModal.action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan cuti dari <strong>{confirmModal.name}</strong>?
                </p>

                {/* Peringatan Rekan Satu Divisi yang Cutinya Bentrok */}
                {confirmModal.action === 'approve' && (
                  <>
                    {isLoadingColleagues ? (
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>
                        Memeriksa jadwal rekan satu divisi...
                      </div>
                    ) : colleaguesOnLeave.length > 0 ? (
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>
                          ⚠️ Rekan satu divisi yang cutinya bentrok:
                        </div>
                        <ul style={{ margin: '0', paddingLeft: '18px', color: '#78350f', lineHeight: '1.6' }}>
                          {colleaguesOnLeave.map((c, idx) => (
                            <li key={idx}>
                              <strong>{c.employee_name}</strong>, {c.leave_type_name}, {formatShortDateRange(c.start_date, c.end_date)} ({c.status === 'approved' ? 'Disetujui' : c.status === 'pending' ? 'Menunggu' : c.status})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}

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

      {/* Override Staffing Limit Modal */}
      {overrideModal.isOpen && (
        <div className="modal-overlay" onClick={() => setOverrideModal({ ...overrideModal, isOpen: false })}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#b45309' }}>Konfirmasi Paksa Setujui (Override)</h2>
              <button type="button" className="modal-close-btn" onClick={() => setOverrideModal({ ...overrideModal, isOpen: false })}>&times;</button>
            </div>
            <form onSubmit={handleOverrideSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
                  Kuota cuti departemen penuh pada <strong>{overrideModal.fullDatesStr}</strong>. Tetap setujui pengajuan cuti untuk <strong>{overrideModal.name}</strong>?
                </div>

                {overrideError && (
                  <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
                    {overrideError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Alasan Tetap Menyetujui <span style={{ color: '#dc2626' }}>*</span> (Min. 10 karakter)
                  </label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    required
                    minLength={10}
                    placeholder="Masukkan alasan mengapa kuota departemen dilewati..."
                    value={overrideModal.note}
                    onChange={(e) => {
                      setOverrideModal({ ...overrideModal, note: e.target.value });
                      if (e.target.value.trim().length >= 10) setOverrideError('');
                    }}
                  />
                  <span style={{ fontSize: '12px', color: overrideModal.note.trim().length < 10 ? '#dc2626' : '#16a34a', display: 'block', marginTop: '4px' }}>
                    {overrideModal.note.trim().length}/10 karakter minimal
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOverrideModal({ ...overrideModal, isOpen: false })}>Batal</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || overrideModal.note.trim().length < 10}
                  className="btn" 
                  style={{ 
                    backgroundColor: '#d97706',
                    color: '#fff',
                    opacity: (isSubmitting || overrideModal.note.trim().length < 10) ? 0.6 : 1,
                    cursor: overrideModal.note.trim().length < 10 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? 'Memproses...' : 'Ya, Tetap Setujui'}
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
