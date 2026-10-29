import { ApiError } from '../api/client';
import { useState, useEffect, useCallback } from 'react';
import { getAllAttendancesApi, correctAttendanceApi, CorrectAttendancePayload } from '../api/attendance';
import { getDepartments } from '../api/department';
import { Attendance } from '../types/attendance';
import { Department } from '../types/employee';
import { formatPlainDate, formatToJakartaTimeOnly } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import { ShowIf } from '../components/ShowIf';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';
import { Pagination } from '../components/ui/Pagination';

import { useAuth } from '../hooks/useAuth';

export function AllAttendancesPage() {
  const { user } = useAuth();
  // 1. State dibungkus ke dalam satu objek (data, pagination, total)
  const [attendanceResponse, setAttendanceResponse] = useState({
    data: [] as Attendance[],
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Penanda data berasal dari cache lokal saat BE down
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  // State untuk Modal Koreksi
  const [correctionTarget, setCorrectionTarget] = useState<Attendance | null>(null);
  const [correctionForm, setCorrectionForm] = useState<CorrectAttendancePayload>({
    status: 'present',
    check_in_at: '',
    check_out_at: '',
    reason: '',
    updated_at: undefined
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string>>({});

  // State untuk OCC (Optimistic Locking)
  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  // State untuk Filter Absensi
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Applied Filter (aktif saat disubmit)
  const [appliedFilters, setAppliedFilters] = useState({
    date: '',
    employee: '',
    departmentId: '',
    status: ''
  });

  // Data referensi Departemen
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getDepartments()
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setDepartments(res.data);
          try {
            localStorage.setItem('cached_departments', JSON.stringify({ owner: user?.id, data: res.data }));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('cached_departments');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data)) {
              setDepartments(parsed.data);
            }
          }
        } catch {}
      });
  }, [user?.id]);

  const page = attendanceResponse.page;
  const setPage = (updater: number | ((p: number) => number)) =>
    setAttendanceResponse(prev => ({ ...prev, page: typeof updater === 'function' ? updater(prev.page) : updater }));

  const loadData = useCallback(() => {
    let ignore = false;
    setIsLoading(true);

    const params: Record<string, any> = {
      page,
      limit: attendanceResponse.limit
    };

    if (appliedFilters.date) {
      params.start_date = appliedFilters.date;
      params.end_date = appliedFilters.date;
    }
    if (appliedFilters.employee.trim()) {
      params.search = appliedFilters.employee.trim();
    }
    if (appliedFilters.departmentId) {
      params.department_id = appliedFilters.departmentId;
    }
    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }

    getAllAttendancesApi(params)
      .then(res => {
        if (ignore) return;
        if (res.success) {
          const newData = {
            data: res.data || [],
            total: res.meta?.total ?? 0,
            total_pages: res.meta?.total_pages ?? 1
          };
          setAttendanceResponse(prev => ({ ...prev, ...newData }));
          setIsOfflineMode(false);
          try {
            localStorage.setItem('cached_all_attendances', JSON.stringify({ owner: user?.id, ...newData, page, limit: attendanceResponse.limit }));
          } catch {}
        }
      })
      .catch(error => {
        if (ignore) return;
        const e = error as ApiError;
        if (e?.isNetworkError) {
          try {
            const cached = localStorage.getItem('cached_all_attendances');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data) && parsed.data.length > 0) {
                let filtered = [...parsed.data];
                if (appliedFilters.date) {
                  filtered = filtered.filter(a => a.attendance_date.startsWith(appliedFilters.date));
                }
                if (appliedFilters.employee.trim()) {
                  const q = appliedFilters.employee.trim().toLowerCase();
                  filtered = filtered.filter(a =>
                    (a.employee_name && a.employee_name.toLowerCase().includes(q)) ||
                    (a.employee_number && a.employee_number.toLowerCase().includes(q))
                  );
                }
                if (appliedFilters.departmentId) {
                  const dept = departments.find(d => d.id === appliedFilters.departmentId);
                  if (dept) {
                    filtered = filtered.filter(a => a.department_name === dept.name);
                  }
                }
                if (appliedFilters.status) {
                  filtered = filtered.filter(a => a.status === appliedFilters.status);
                }
                setAttendanceResponse(prev => ({
                  ...prev,
                  data: filtered,
                  total: filtered.length,
                  total_pages: Math.max(1, Math.ceil(filtered.length / prev.limit))
                }));
                setIsOfflineMode(true);
                return;
              }
            }
          } catch {}
        }

        setIsOfflineMode(false);
        setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat data absensi.', type: 'error' });
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, attendanceResponse.limit, appliedFilters, departments, user?.id]);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      date: filterDate,
      employee: filterEmployee,
      departmentId: filterDepartment,
      status: filterStatus
    });
    setPage(1);
  };

  const handleResetFilter = () => {
    setFilterDate('');
    setFilterEmployee('');
    setFilterDepartment('');
    setFilterStatus('');
    setAppliedFilters({
      date: '',
      employee: '',
      departmentId: '',
      status: ''
    });
    setPage(1);
  };

  const hasActiveFilter = Boolean(appliedFilters.date || appliedFilters.employee || appliedFilters.departmentId || appliedFilters.status);


  const translateStatus = (status: string) => {
    switch (status) {
      case 'present': return <span className="status-badge present">Hadir</span>;
      case 'late': return <span className="status-badge late">Terlambat</span>;
      case 'absent': return <span className="status-badge absent">Tidak Hadir</span>;
      case 'leave': return <span className="status-badge leave">Cuti</span>;
      case 'holiday': return <span className="status-badge holiday">Libur</span>;
      default: return status;
    }
  };

  const toJakartaHHmm = (iso: string | null | undefined) =>
    iso
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(iso))
      : '';

  const openCorrectionModal = (record: Attendance) => {
    setCorrectionTarget(record);
    setCorrectionForm({
      status: record.status as any,
      check_in_at: toJakartaHHmm(record.check_in_at),
      check_out_at: toJakartaHHmm(record.check_out_at),
      reason: '',
      updated_at: record.updated_at || undefined
    });
    setCorrectionErrors({});
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    setCorrectionErrors({});
    const newErrors: Record<string, string> = {};
    const trimmedReason = correctionForm.reason.trim();
    const needsTime = ['present', 'late'].includes(correctionForm.status);

    if (needsTime && !correctionForm.check_in_at) {
      newErrors.check_in_at = 'Jam masuk wajib diisi untuk status Hadir/Terlambat';
    }

    if (!correctionForm.check_in_at && correctionForm.check_out_at) {
      newErrors.check_in_at = 'Jam pulang tidak boleh diisi tanpa jam masuk';
    }

    if (trimmedReason.length < 10) {
      newErrors.reason = 'Alasan wajib diisi minimal 10 karakter';
    }

    if (Object.keys(newErrors).length > 0) {
      setCorrectionErrors(newErrors);
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      const toIso = (date: string, hhmm: string) => `${date}T${hhmm}:00+07:00`;
      const date = correctionTarget.attendance_date.slice(0, 10);

      let checkOutDate = date;
      // Jam pulang lebih kecil dari jam masuk = lembur lewat tengah malam, pakai tanggal esoknya
      if (correctionForm.check_out_at && correctionForm.check_in_at &&
          correctionForm.check_out_at <= correctionForm.check_in_at) {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        checkOutDate = d.toISOString().slice(0, 10);
      }

      const payload: CorrectAttendancePayload = {
        status: correctionForm.status,
        reason: trimmedReason,
        updated_at: correctionForm.updated_at,
        check_in_at: needsTime && correctionForm.check_in_at
          ? toIso(date, correctionForm.check_in_at) : null,
        check_out_at: needsTime && correctionForm.check_out_at
          ? toIso(checkOutDate, correctionForm.check_out_at) : null,
      };

      const res = await correctAttendanceApi(correctionTarget.id, payload);
      setAlertInfo({ open: true, title: 'Berhasil', message: res.message || 'Absensi berhasil dikoreksi.', type: 'success' });
      setCorrectionTarget(null);
      loadData();
    } catch (error) {
      const err = error as ApiError;
      if (isStaleData(err)) {
        setStaleDetails(err.details);
        setIsStaleModalOpen(true);
      } else if (err.errors && Array.isArray(err.errors)) {
        const backendErrors: Record<string, string> = {};
        err.errors.forEach((item: any) => {
          if (item.field) {
            backendErrors[item.field] = item.message;
          }
        });
        if (Object.keys(backendErrors).length > 0) {
          setCorrectionErrors(backendErrors);
          return;
        }
        setAlertInfo({ open: true, title: 'Validasi Gagal', message: err.message || 'Data koreksi tidak valid.', type: 'error' });
      } else {
        setAlertInfo({ open: true, title: 'Error', message: err.message || 'Gagal menyimpan koreksi absensi.', type: 'error' });
      }
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleStaleReload = () => {
    setIsStaleModalOpen(false);
    setCorrectionTarget(null);
    loadData();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Semua Absensi (Admin)</h1>
          <p className="dashboard-subtitle">Pantau riwayat kehadiran seluruh karyawan di perusahaan.</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" >
          Refresh
        </button>
      </div>

      {isOfflineMode && (
        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginTop: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data absensi lokal terakhir yang tersimpan di perangkat.</span>
        </div>
      )}

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        {/* Form Filter Absensi */}
        <form onSubmit={handleApplyFilter} style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'flex-end'
        }}>
          {/* Tanggal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tanggal</label>
            <input 
              type="date" 
              className="input-field" 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)} 
              style={{ padding: '8px 12px', fontSize: '13.5px', height: '40px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Karyawan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Karyawan</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Cari nama atau NIK..." 
              value={filterEmployee} 
              onChange={e => setFilterEmployee(e.target.value)} 
              style={{ padding: '8px 12px', fontSize: '13.5px', height: '40px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Departemen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Departemen</label>
            <select 
              className="input-field" 
              value={filterDepartment} 
              onChange={e => setFilterDepartment(e.target.value)} 
              style={{ padding: '8px 12px', fontSize: '13.5px', height: '40px', boxSizing: 'border-box' }}
            >
              <option value="">Semua Departemen</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</label>
            <select 
              className="input-field" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)} 
              style={{ padding: '8px 12px', fontSize: '13.5px', height: '40px', boxSizing: 'border-box' }}
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="absent">Tidak Hadir</option>
              <option value="leave">Cuti</option>
              <option value="holiday">Libur</option>
            </select>
          </div>

          {/* Aksi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Aksi</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: '8px 18px', fontSize: '13.5px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}
              >
                Terapkan
              </button>
              <button 
                type="button" 
                onClick={handleResetFilter} 
                className="btn btn-secondary" 
                style={{ padding: '8px 14px', fontSize: '13.5px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="attendance-card-header">
          <h2 className="attendance-history-title">Data Absensi Global</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Menampilkan {attendanceResponse.data.length} dari {attendanceResponse.total} data
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
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {/* 3. Map dipanggil dari attendanceResponse.data untuk memunculkan baris tabel */}
                {attendanceResponse.data && attendanceResponse.data.length > 0 && attendanceResponse.data.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {((attendanceResponse.page - 1) * attendanceResponse.limit) + index + 1}.
                    </td>
                    <td className="table-cell-date">{formatPlainDate(row.attendance_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee_name || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{row.position_name || '-'}</div>
                    </td>
                    <td>{row.department_name || '-'}</td>
                    <td>{row.check_in_at ? formatToJakartaTimeOnly(row.check_in_at) : '-'}</td>
                    <td>{row.check_out_at ? formatToJakartaTimeOnly(row.check_out_at) : '-'}</td>
                    <td>{translateStatus(row.status)}</td>
                    <td>
                      {row.check_in_source === 'offline_sync' || row.check_out_source === 'offline_sync' ? (
                        <div>
                          <span className="note-badge-offline">Offline</span>
                          <br/>
                          <span className="note-text">{row.note || '-'}</span>
                        </div>
                      ) : row.check_in_source === 'correction' || row.check_out_source === 'correction' ? (
                        <div>
                          <span className="note-badge-corrected">Dikoreksi</span>
                          <br/>
                          <span className="note-text">{row.note || '-'}</span>
                        </div>
                      ) : (
                        <span className="note-text">{row.note || <span className="note-empty">-</span>}</span>
                      )}
                    </td>
                    <td>
                      <ShowIf feature="attendance.correct">
                        {row.status === 'leave' && row.leave_request_id ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '12px', opacity: 0.5, cursor: 'not-allowed' }}
                            disabled
                            title="Hari cuti diubah lewat pengajuan cuti, bukan koreksi absensi"
                          >
                            Koreksi
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => openCorrectionModal(row)}
                          >
                            Koreksi
                          </button>
                        )}
                      </ShowIf>
                    </td>
                  </tr>
                ))}
                {attendanceResponse.data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="table-cell-no-data">
                      {hasActiveFilter 
                        ? 'Tidak ada data absensi yang sesuai dengan filter yang dipilih.' 
                        : 'Belum ada data absensi yang tercatat.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>          </div>
        )}

        {attendanceResponse.total_pages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={attendanceResponse.total_pages}
            totalItems={attendanceResponse.total}
            itemLabel="data absensi"
            prevLabel="Prev"
            nextLabel="Next"
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* Modal Koreksi */}
      {correctionTarget && (
        <div className="modal-overlay" onClick={() => !isSubmittingCorrection && setCorrectionTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Koreksi Absensi</h2>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setCorrectionTarget(null)}
                disabled={isSubmittingCorrection}
                title="Tutup"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                <div style={{ backgroundColor: '#f0f9ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '13.5px', color: '#0369a1', lineHeight: '1.5' }}>
                  Anda sedang mengoreksi absensi <strong>{correctionTarget.employee_name}</strong> pada tanggal <strong>{formatPlainDate(correctionTarget.attendance_date)}</strong>.
                </div>

                <div className="form-group">
                  <label className="form-label">Status Absensi <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className={`input-field ${correctionErrors.status ? 'error-border' : ''}`}
                    style={correctionErrors.status ? { borderColor: '#ef4444' } : undefined}
                    value={correctionForm.status} 
                    onChange={e => {
                      const newStatus = e.target.value as any;
                      const isNoTime = ['absent', 'leave', 'holiday'].includes(newStatus);
                      setCorrectionForm(prev => ({
                        ...prev,
                        status: newStatus,
                        check_in_at: isNoTime ? '' : prev.check_in_at,
                        check_out_at: isNoTime ? '' : prev.check_out_at,
                      }));
                      setCorrectionErrors(prev => ({ ...prev, status: '', check_in_at: '', check_out_at: '' }));
                    }}
                    required
                  >
                    <option value="present">Hadir</option>
                    <option value="late">Terlambat</option>
                    <option value="absent">Tidak Hadir</option>
                    <option value="holiday">Libur</option>
                  </select>
                  {correctionErrors.status && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{correctionErrors.status}</span>}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Jam Masuk {['present', 'late'].includes(correctionForm.status) && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input 
                      type="time" 
                      className={`input-field ${correctionErrors.check_in_at ? 'error-border' : ''}`}
                      style={correctionErrors.check_in_at ? { borderColor: '#ef4444' } : undefined}
                      value={correctionForm.check_in_at || ''} 
                      onChange={e => {
                        setCorrectionForm(prev => ({ ...prev, check_in_at: e.target.value }));
                        setCorrectionErrors(prev => ({ ...prev, check_in_at: '' }));
                      }}
                      disabled={['absent', 'leave', 'holiday'].includes(correctionForm.status)}
                    />
                    {correctionErrors.check_in_at && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{correctionErrors.check_in_at}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Pulang</label>
                    <input 
                      type="time" 
                      className={`input-field ${correctionErrors.check_out_at ? 'error-border' : ''}`}
                      style={correctionErrors.check_out_at ? { borderColor: '#ef4444' } : undefined}
                      value={correctionForm.check_out_at || ''} 
                      onChange={e => {
                        setCorrectionForm(prev => ({ ...prev, check_out_at: e.target.value }));
                        setCorrectionErrors(prev => ({ ...prev, check_out_at: '' }));
                      }}
                      disabled={['absent', 'leave', 'holiday'].includes(correctionForm.status)}
                    />
                    {correctionErrors.check_out_at && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{correctionErrors.check_out_at}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alasan Koreksi <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea 
                    className={`input-field ${correctionErrors.reason ? 'error-border' : ''}`}
                    style={correctionErrors.reason ? { borderColor: '#ef4444' } : undefined}
                    placeholder="Contoh: Lupa tap absen, mesin error..."
                    rows={3}
                    required
                    value={correctionForm.reason} 
                    onChange={e => {
                      setCorrectionForm(prev => ({ ...prev, reason: e.target.value }));
                      setCorrectionErrors(prev => ({ ...prev, reason: '' }));
                    }}
                  />
                  {correctionErrors.reason ? (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{correctionErrors.reason}</span>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Minimal 10 karakter.</p>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '20px 28px 24px 28px', gap: '16px', flexShrink: 0 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setCorrectionTarget(null)}
                  disabled={isSubmittingCorrection}
                  style={{ minWidth: '100px', padding: '10px 20px' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmittingCorrection}
                  style={{ minWidth: '140px', padding: '10px 20px' }}
                >
                  {isSubmittingCorrection ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {staleDetails && (
        <StaleDataModal
          isOpen={isStaleModalOpen}
          details={staleDetails}
          onClose={() => setIsStaleModalOpen(false)}
          onReload={handleStaleReload}
        />
      )}

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
