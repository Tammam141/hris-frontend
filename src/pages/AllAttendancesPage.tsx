import { useState, useEffect } from 'react';
import { getAllAttendancesApi, correctAttendanceApi, CorrectAttendancePayload } from '../api/attendance';
import { Attendance } from '../types/attendance';
import { formatPlainDate, formatToJakartaTimeOnly } from '../utils/dateFormatter';
import { AlertModal } from '../components/ui/AlertModal';
import { ShowIf } from '../components/ShowIf';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import '../components/ui/dashboard.css';
import '../components/ui/attendance.css';

export function AllAttendancesPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  // State untuk Modal Koreksi
  const [correctionTarget, setCorrectionTarget] = useState<Attendance | null>(null);
  const [correctionForm, setCorrectionForm] = useState<CorrectAttendancePayload>({
    status: 'present',
    check_in_at: '',
    check_out_at: '',
    reason: '',
    updated_at: ''
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // State untuk OCC (Optimistic Locking)
  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getAllAttendancesApi(); // We can add filters here later if needed
      if (res.success) {
        setAttendances(res.data);
      }
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat data absensi.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

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

  const openCorrectionModal = (record: Attendance) => {
    setCorrectionTarget(record);
    setCorrectionForm({
      status: record.status as any,
      check_in_at: record.check_in_at ? record.check_in_at.substring(0, 5) : '', // 'HH:mm' expected usually, wait no format is HH:mm:ss in API? API takes string, let's keep it simple 'HH:mm' for input type time
      check_out_at: record.check_out_at ? record.check_out_at.substring(0, 5) : '',
      reason: '',
      updated_at: record.updated_at || ''
    });
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;
    if (correctionForm.reason.length < 10) {
      setAlertInfo({ open: true, title: 'Validasi Gagal', message: 'Alasan wajib diisi minimal 10 karakter.', type: 'error' });
      return;
    }
    
    setIsSubmittingCorrection(true);
    try {
      const payload: CorrectAttendancePayload = {
        ...correctionForm,
        check_in_at: correctionForm.check_in_at ? `${correctionForm.check_in_at}:00` : undefined,
        check_out_at: correctionForm.check_out_at ? `${correctionForm.check_out_at}:00` : undefined,
      };
      const res = await correctAttendanceApi(correctionTarget.id, payload);
      setAlertInfo({ open: true, title: 'Berhasil', message: res.message || 'Absensi berhasil dikoreksi.', type: 'success' });
      setCorrectionTarget(null);
      loadData();
    } catch (err: any) {
      if (isStaleData(err)) {
        setStaleDetails(err.details);
        setIsStaleModalOpen(true);
      } else {
        setAlertInfo({ open: true, title: 'Error', message: (err as any)?.message || 'Gagal menyimpan koreksi absensi.', type: 'error' });
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
        <button onClick={loadData} className="btn btn-secondary" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px' }}>
          Refresh
        </button>
      </div>

      <div className="attendance-history-card" style={{ marginTop: '24px' }}>
        <h2 className="attendance-history-title">Data Absensi Global</h2>
        {isLoading ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Memuat data...</p>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
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
                {attendances.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatPlainDate(row.attendance_date)}</td>
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
                          <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Offline</span>
                          <br/>
                          <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || '-'}</span>
                        </div>
                      ) : row.check_in_source === 'correction' || row.check_out_source === 'correction' ? (
                        <div>
                          <span style={{ fontSize: '10px', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', fontWeight: 600 }}>Dikoreksi</span>
                          <br/>
                          <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || '-'}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#475569' }}>{row.note || <span style={{ color: '#cbd5e1' }}>-</span>}</span>
                      )}
                    </td>
                    <td>
                      <ShowIf feature="attendance.correct">
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => openCorrectionModal(row)}
                        >
                          Koreksi
                        </button>
                      </ShowIf>
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Belum ada data absensi yang tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
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

      {/* Modal Koreksi */}
      {correctionTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Koreksi Absensi</h2>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
              Anda sedang mengoreksi absensi <strong>{correctionTarget.employee_name}</strong> pada tanggal {formatPlainDate(correctionTarget.attendance_date)}.
            </p>

            <form onSubmit={handleCorrectionSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label className="form-label">Status Absensi *</label>
                  <select 
                    className="input-field" 
                    value={correctionForm.status} 
                    onChange={e => setCorrectionForm(prev => ({ ...prev, status: e.target.value as any }))}
                    required
                  >
                    <option value="present">Hadir</option>
                    <option value="late">Terlambat</option>
                    <option value="absent">Tidak Hadir</option>
                    <option value="leave">Cuti</option>
                    <option value="holiday">Libur</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Jam Masuk</label>
                    <input 
                      type="time" 
                      className="input-field" 
                      value={correctionForm.check_in_at} 
                      onChange={e => setCorrectionForm(prev => ({ ...prev, check_in_at: e.target.value }))}
                      disabled={['absent', 'leave', 'holiday'].includes(correctionForm.status)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Jam Pulang</label>
                    <input 
                      type="time" 
                      className="input-field" 
                      value={correctionForm.check_out_at} 
                      onChange={e => setCorrectionForm(prev => ({ ...prev, check_out_at: e.target.value }))}
                      disabled={['absent', 'leave', 'holiday'].includes(correctionForm.status)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Alasan Koreksi *</label>
                  <textarea 
                    className="input-field" 
                    placeholder="Contoh: Lupa tap absen, mesin error..."
                    rows={3}
                    minLength={10}
                    required
                    value={correctionForm.reason} 
                    onChange={e => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Minimal 10 karakter.</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setCorrectionTarget(null)}
                  disabled={isSubmittingCorrection}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmittingCorrection}
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
    </div>
  );
}
