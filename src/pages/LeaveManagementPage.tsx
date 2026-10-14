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
import { useAuth } from '../hooks/useAuth';
import { formatToJakartaTime } from '../utils/dateFormatter';
import { isStaffingLimitError, formatStaffingLimitMessage } from '../utils/staffingLimit';
import { ApiError } from '../api/client';

type MainTabType = 'approvals' | 'recap' | 'failed';
type RecapFilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

function formatShortDateRange(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr) return '-';
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
  const { user, hasFeature } = useAuth();

  const myEmployeeId = user?.employee?.id ?? user?.employee_id;
  const canApproveAll = user?.role === 'admin' || hasFeature('leave.approve_all');
  const canApproveTeam = hasFeature('leave.approve_team');
  const canApprove = canApproveAll || canApproveTeam;
  const canViewAll = hasFeature('leave.view_all');
  const canViewLog = hasFeature('system.view_log');

  function canDecide(req: LeaveRequest) {
    if (req.status !== 'pending') return false;
    if (req.employee_id === myEmployeeId) return false;          // cuti sendiri
    if (canApproveAll) return true;
    return canApproveTeam && req.approver_id === myEmployeeId;   // bawahan langsung
  }

  // Tab utama
  const [mainTab, setMainTab] = useState<MainTabType>(() => {
    if (canApprove) return 'approvals';
    if (canViewAll) return 'recap';
    return 'failed';
  });

  // Sinkronisasi tab bila permissions dimuat
  useEffect(() => {
    if (mainTab === 'approvals' && !canApprove) {
      if (canViewAll) setMainTab('recap');
      else if (canViewLog) setMainTab('failed');
    } else if (mainTab === 'recap' && !canViewAll) {
      if (canApprove) setMainTab('approvals');
      else if (canViewLog) setMainTab('failed');
    }
  }, [canApprove, canViewAll, canViewLog, mainTab]);

  // Tab 1: Perlu Persetujuan
  const [approvalsResponse, setApprovalsResponse] = useState({
    data: [] as LeaveRequest[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });
  const [isApprovalsLoading, setIsApprovalsLoading] = useState(false);
  const [isApprovalsOffline, setIsApprovalsOffline] = useState(false);

  // Tab 2: Rekap
  const [recapFilter, setRecapFilter] = useState<RecapFilterType>('all');
  const [recapResponse, setRecapResponse] = useState({
    data: [] as LeaveRequest[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [isRecapOffline, setIsRecapOffline] = useState(false);

  // Tab 3: Gagal (Activity Logs)
  const [failedResponse, setFailedResponse] = useState({
    data: [] as ActivityLog[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });
  const [isFailedLoading, setIsFailedLoading] = useState(false);
  const [isFailedOffline, setIsFailedOffline] = useState(false);

  // Load Tab 1: Approvals
  const loadApprovals = useCallback(() => {
    if (!canApprove) return;
    setIsApprovalsLoading(true);
    const cacheKey = `cached_leave_approvals_${approvalsResponse.page}`;

    let ignore = false;
    getLeaveApprovals({
      page: approvalsResponse.page,
      limit: approvalsResponse.limit,
      status: 'pending'
    })
      .then(res => {
        if (ignore) return;
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        setApprovalsResponse(prev => ({ ...prev, ...newData }));
        setIsApprovalsOffline(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            owner: user?.id,
            ...newData,
            page: approvalsResponse.page,
            limit: approvalsResponse.limit
          }));
        } catch {}
      })
      .catch(err => {
        if (ignore) return;
        const apiErr = err as ApiError;
        if (apiErr?.isNetworkError) {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data)) {
                setApprovalsResponse(prev => ({
                  ...prev,
                  data: parsed.data,
                  total: parsed.total ?? 0,
                  total_pages: parsed.total_pages ?? 1
                }));
                setIsApprovalsOffline(true);
                return;
              }
            }
          } catch {}
        }
        setIsApprovalsOffline(false);
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setIsApprovalsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [canApprove, approvalsResponse.page, approvalsResponse.limit, user?.id]);

  useEffect(() => {
    if (mainTab === 'approvals') {
      const cleanup = loadApprovals();
      return cleanup;
    }
  }, [mainTab, loadApprovals]);

  // Load Tab 2: Recap
  const loadRecap = useCallback(() => {
    if (!canViewAll) return;
    setIsRecapLoading(true);
    const cacheKey = `cached_leave_recap_${recapFilter}_${recapResponse.page}`;
    const apiStatus = recapFilter === 'all' ? undefined : recapFilter;

    let ignore = false;
    getAllLeaveRequests({
      page: recapResponse.page,
      limit: recapResponse.limit,
      status: apiStatus
    })
      .then(res => {
        if (ignore) return;
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        setRecapResponse(prev => ({ ...prev, ...newData }));
        setIsRecapOffline(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            owner: user?.id,
            ...newData,
            page: recapResponse.page,
            limit: recapResponse.limit
          }));
        } catch {}
      })
      .catch(err => {
        if (ignore) return;
        const apiErr = err as ApiError;
        if (apiErr?.isNetworkError) {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data)) {
                setRecapResponse(prev => ({
                  ...prev,
                  data: parsed.data,
                  total: parsed.total ?? 0,
                  total_pages: parsed.total_pages ?? 1
                }));
                setIsRecapOffline(true);
                return;
              }
            }
          } catch {}
        }
        setIsRecapOffline(false);
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setIsRecapLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [canViewAll, recapFilter, recapResponse.page, recapResponse.limit, user?.id]);

  useEffect(() => {
    if (mainTab === 'recap') {
      const cleanup = loadRecap();
      return cleanup;
    }
  }, [mainTab, loadRecap]);

  // Load Tab 3: Failed
  const loadFailed = useCallback(() => {
    if (!canViewLog) return;
    setIsFailedLoading(true);
    const cacheKey = `cached_leave_failed_${failedResponse.page}`;

    let ignore = false;
    getActivityLogsApi({
      action: 'leave.create',
      status: 'failed',
      page: failedResponse.page,
      limit: failedResponse.limit
    })
      .then(res => {
        if (ignore) return;
        const newData = {
          data: res.data || [],
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        };
        setFailedResponse(prev => ({ ...prev, ...newData }));
        setIsFailedOffline(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            owner: user?.id,
            ...newData,
            page: failedResponse.page,
            limit: failedResponse.limit
          }));
        } catch {}
      })
      .catch(err => {
        if (ignore) return;
        const apiErr = err as ApiError;
        if (apiErr?.isNetworkError) {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data)) {
                setFailedResponse(prev => ({
                  ...prev,
                  data: parsed.data,
                  total: parsed.total ?? 0,
                  total_pages: parsed.total_pages ?? 1
                }));
                setIsFailedOffline(true);
                return;
              }
            }
          } catch {}
        }
        setIsFailedOffline(false);
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setIsFailedLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [canViewLog, failedResponse.page, failedResponse.limit, user?.id]);

  useEffect(() => {
    if (mainTab === 'failed') {
      const cleanup = loadFailed();
      return cleanup;
    }
  }, [mainTab, loadFailed]);

  // Refresh data setelah aksi keputusan
  const refreshActiveData = () => {
    if (canApprove) loadApprovals();
    if (canViewAll) loadRecap();
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
      refreshActiveData();
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
      refreshActiveData();
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

  const isCurrentTabOffline = 
    (mainTab === 'approvals' && isApprovalsOffline) ||
    (mainTab === 'recap' && isRecapOffline) ||
    (mainTab === 'failed' && isFailedOffline);

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Persetujuan & Rekap Cuti</h1>
            <p className="dashboard-subtitle">Kelola kotak masuk persetujuan serta pantau seluruh pengajuan cuti karyawan.</p>
          </div>
        </div>

        {isCurrentTabOffline && (
          <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data lokal terakhir yang tersimpan di perangkat.</span>
          </div>
        )}

        {/* Tab Navigasi Utama */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          {canApprove && (
            <button
              type="button"
              onClick={() => setMainTab('approvals')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: mainTab === 'approvals' ? 600 : 500,
                border: 'none',
                backgroundColor: mainTab === 'approvals' ? '#1a78d7' : '#f1f5f9',
                color: mainTab === 'approvals' ? '#fff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Perlu Persetujuan
            </button>
          )}
          {canViewAll && (
            <button
              type="button"
              onClick={() => setMainTab('recap')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: mainTab === 'recap' ? 600 : 500,
                border: 'none',
                backgroundColor: mainTab === 'recap' ? '#1a78d7' : '#f1f5f9',
                color: mainTab === 'recap' ? '#fff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Rekap
            </button>
          )}
          {canViewLog && (
            <button
              type="button"
              onClick={() => setMainTab('failed')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: mainTab === 'failed' ? 600 : 500,
                border: 'none',
                backgroundColor: mainTab === 'failed' ? '#dc2626' : '#fef2f2',
                color: mainTab === 'failed' ? '#fff' : '#b91c1c',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Gagal
            </button>
          )}
        </div>

        {/* TAB 1: PERLU PERSETUJUAN */}
        {mainTab === 'approvals' && (
          <div>
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
                    <th>Status</th>
                    <th style={{ width: '220px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isApprovalsLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Memuat pengajuan cuti...</td>
                    </tr>
                  ) : !approvalsResponse.data || approvalsResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Tidak ada pengajuan cuti yang perlu persetujuan.</td>
                    </tr>
                  ) : (
                    approvalsResponse.data.map((req, index) => (
                      <tr key={req.id}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                          {((approvalsResponse.page - 1) * approvalsResponse.limit) + index + 1}.
                        </td>
                        <td><div style={{ fontWeight: 500, color: '#0f172a' }}>{req.employee_name}</div></td>
                        <td>{req.leave_type_name}</td>
                        <td>{req.start_date.substring(0, 10)} s/d {req.end_date.substring(0, 10)}</td>
                        <td>{req.total_days} hari</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td>
                          <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className="btn-detail"
                              style={{ padding: '4px 12px' }}
                              onClick={() => setSelectedRequest(req)}
                              title="Lihat Detail"
                            >
                              Detail
                            </button>
                            {canDecide(req) ? (
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
                            ) : req.status === 'pending' && req.employee_id === myEmployeeId ? (
                              <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Menunggu persetujuan atasan/HR
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Approvals */}
            {approvalsResponse.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <button 
                  disabled={approvalsResponse.page === 1} 
                  onClick={() => setApprovalsResponse(prev => ({ ...prev, page: prev.page - 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: approvalsResponse.page === 1 ? '#f1f5f9' : '#fff', cursor: approvalsResponse.page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {approvalsResponse.page} dari {approvalsResponse.total_pages}</span>
                <button 
                  disabled={approvalsResponse.page === approvalsResponse.total_pages} 
                  onClick={() => setApprovalsResponse(prev => ({ ...prev, page: prev.page + 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: approvalsResponse.page === approvalsResponse.total_pages ? '#f1f5f9' : '#fff', cursor: approvalsResponse.page === approvalsResponse.total_pages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REKAP */}
        {mainTab === 'recap' && (
          <div>
            {/* Filter Status Berbentuk Pill */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'pending', label: 'Menunggu' },
                { id: 'approved', label: 'Disetujui' },
                { id: 'rejected', label: 'Ditolak' },
                { id: 'cancelled', label: 'Dibatalkan' }
              ].map(item => {
                const isActive = recapFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRecapFilter(item.id as RecapFilterType);
                      setRecapResponse(prev => ({ ...prev, page: 1 }));
                    }}
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
                    {item.label}
                  </button>
                );
              })}
            </div>

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
                    <th>Penyetuju</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isRecapLoading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Memuat data rekap cuti...</td>
                    </tr>
                  ) : !recapResponse.data || recapResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Tidak ada pengajuan cuti pada filter ini.</td>
                    </tr>
                  ) : (
                    recapResponse.data.map((req, index) => (
                      <tr key={req.id}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                          {((recapResponse.page - 1) * recapResponse.limit) + index + 1}.
                        </td>
                        <td><div style={{ fontWeight: 500, color: '#0f172a' }}>{req.employee_name}</div></td>
                        <td>{req.leave_type_name}</td>
                        <td>{req.start_date.substring(0, 10)} s/d {req.end_date.substring(0, 10)}</td>
                        <td>{req.total_days} hari</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                        <td>
                          <span style={{ color: req.approver_name ? '#0f172a' : '#94a3b8', fontSize: '13px' }}>
                            {req.approver_name || '-'}
                          </span>
                        </td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td>
                          <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className="btn-detail"
                              style={{ padding: '4px 12px' }}
                              onClick={() => setSelectedRequest(req)}
                              title="Lihat Detail"
                            >
                              Detail
                            </button>
                            {canDecide(req) ? (
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
                            ) : req.status === 'pending' && req.employee_id === myEmployeeId ? (
                              <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Menunggu persetujuan atasan/HR
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Recap */}
            {recapResponse.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <button 
                  disabled={recapResponse.page === 1} 
                  onClick={() => setRecapResponse(prev => ({ ...prev, page: prev.page - 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: recapResponse.page === 1 ? '#f1f5f9' : '#fff', cursor: recapResponse.page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {recapResponse.page} dari {recapResponse.total_pages}</span>
                <button 
                  disabled={recapResponse.page === recapResponse.total_pages} 
                  onClick={() => setRecapResponse(prev => ({ ...prev, page: prev.page + 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: recapResponse.page === recapResponse.total_pages ? '#f1f5f9' : '#fff', cursor: recapResponse.page === recapResponse.total_pages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GAGAL */}
        {mainTab === 'failed' && (
          <div>
            <div className="employee-table-wrapper">
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                Menampilkan jejak aktivitas pengajuan cuti yang gagal (misal: saldo tidak cukup atau melebihi kuota).
              </div>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>NO</th>
                    <th>Pemohon</th>
                    <th>Rentang Tanggal Cuti</th>
                    <th>Keterangan</th>
                    <th>Waktu Kejadian</th>
                  </tr>
                </thead>
                <tbody>
                  {isFailedLoading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Memuat log pengajuan cuti yang gagal...</td>
                    </tr>
                  ) : !failedResponse.data || failedResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Belum ada log pengajuan cuti yang gagal.</td>
                    </tr>
                  ) : (
                    failedResponse.data.map((log, index) => {
                      const startDate = log.metadata?.start_date;
                      const endDate = log.metadata?.end_date;
                      const dateDisplay = formatShortDateRange(startDate, endDate);
                      const applicant = log.actor_name ?? log.actor_email ?? 'System / Anonymous';
                      const errorMessage = log.metadata?.reason || log.summary || 'Percobaan pembuatan cuti gagal';
                      const errorCode = log.metadata?.code;

                      return (
                        <tr key={log.id}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                            {((failedResponse.page - 1) * failedResponse.limit) + index + 1}.
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>{applicant}</div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{dateDisplay}</td>
                          <td>
                            <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>
                              {errorMessage}
                            </div>
                            {errorCode && (
                              <span style={{ 
                                display: 'inline-block',
                                marginTop: '4px',
                                padding: '2px 6px',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}>
                                {errorCode}
                              </span>
                            )}
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

            {/* Pagination Failed */}
            {failedResponse.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                <button 
                  disabled={failedResponse.page === 1} 
                  onClick={() => setFailedResponse(prev => ({ ...prev, page: prev.page - 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: failedResponse.page === 1 ? '#f1f5f9' : '#fff', cursor: failedResponse.page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {failedResponse.page} dari {failedResponse.total_pages}</span>
                <button 
                  disabled={failedResponse.page === failedResponse.total_pages} 
                  onClick={() => setFailedResponse(prev => ({ ...prev, page: prev.page + 1 }))}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: failedResponse.page === failedResponse.total_pages ? '#f1f5f9' : '#fff', cursor: failedResponse.page === failedResponse.total_pages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
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
