import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO, eachDayOfInterval, startOfDay, addDays, isBefore } from 'date-fns';
import { AlertModal } from '../../components/ui/AlertModal';
import { getLeaveTypes, createLeaveRequest, uploadLeaveAttachment, cancelLeaveRequest, getMyLeaveBalances, getMyLeaveRequests, LeaveType, LeaveRequest } from '../../api/leave';
import { getHolidays, Holiday } from '../../api/holiday';
import { useAuth } from '../../hooks/useAuth';
import '../../components/ui/leave.css';

interface LeavePeriodProps {
  onSuccess?: () => void;
}

export function LeavePeriod({ onSuccess }: LeavePeriodProps) {
  // State rentang tanggal cuti
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // State total hari kerja
  const [totalDays, setTotalDays] = useState<number>(0);

  // State alasan cuti & tipe cuti
  const [reason, setReason] = useState<string>('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveType, setLeaveType] = useState<string>('');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { user } = useAuth();
  
  // State cuti yang sudah ada (untuk deteksi overlap)
  const [existingLeaves, setExistingLeaves] = useState<LeaveRequest[]>([]);
  // State libur nasional
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // State notifikasi submit
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);

  // Ambil tipe cuti, saldo, cuti yang sudah ada
  const fetchInitialData = useCallback(() => {
    const fetchAllLeaves = async () => {
      let all: LeaveRequest[] = [];
      let p = 1;
      while (true) {
        const res = await getMyLeaveRequests({ limit: 100, page: p }).catch(() => ({ data: [], meta: { total_pages: 1 } }));
        if (res.data) all = [...all, ...res.data];
        if (!res.meta || p >= res.meta.total_pages) break;
        p++;
      }
      return { data: all };
    };

    Promise.all([
      getLeaveTypes(), 
      getMyLeaveBalances().catch(() => null),
      fetchAllLeaves()
    ])
      .then(([typesRes, balRes, leavesRes]) => {
        // Filter leave types: active only, and match gender if restricted
        const validTypes = typesRes.data.filter(t => {
          if (!t.is_active) return false;
          if (t.gender_restriction && user?.employee?.gender) {
            return t.gender_restriction === user.employee.gender;
          }
          return true;
        });
        setLeaveTypes(validTypes);
        if (validTypes.length > 0) setLeaveType(validTypes[0].id.toString());
        
        if (balRes?.data?.balances) {
          const balMap: Record<string, number> = {};
          balRes.data.balances.forEach((b: any) => balMap[b.leave_type_id] = b.balance);
          setBalances(balMap);
        }

        // Simpan cuti yang approved atau pending untuk cek overlap
        const activeLeaves = (leavesRes.data || []).filter(
          (l: LeaveRequest) => l.status === 'approved' || l.status === 'pending'
        );
        setExistingLeaves(activeLeaves);
      })
      .catch(err => console.error(err));
  }, [user?.employee?.gender]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch holidays based on selected dateRange
  useEffect(() => {
    if (!startDate) return;
    const end = endDate || startDate;
    const startY = startDate.getFullYear();
    const endY = end.getFullYear();
    
    const fetchHols = async () => {
      let allHols: Holiday[] = [];
      for (let y = startY; y <= endY; y++) {
        const res = await getHolidays({ year: y, limit: 100 }).catch(() => ({ data: [] }));
        if (res.data) allHols = [...allHols, ...res.data];
      }
      setHolidays(allHols);
    };
    fetchHols();
  }, [startDate, endDate]);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Set tanggal-tanggal yang sudah dipakai cuti (disabled di kalender)
  const disabledDates = useMemo(() => {
    const dates: Date[] = [];
    existingLeaves.forEach(leave => {
      try {
        if (!leave.start_date || !leave.end_date) return;
        const start = parseISO(leave.start_date.substring(0, 10));
        const end = parseISO(leave.end_date.substring(0, 10));
        const days = eachDayOfInterval({ start, end });
        dates.push(...days);
      } catch { /* ignore parse errors */ }
    });
    return dates;
  }, [existingLeaves]);

  // Set tanggal libur nasional
  const holidayDates = useMemo(() => {
    return holidays.filter(h => h && h.date).map(h => format(parseISO(h.date), 'yyyy-MM-dd'));
  }, [holidays]);

  // Blokir hari Sabtu (6), Minggu (0), libur nasional, dan tanggal cuti yang sudah ada
  const isDateAvailable = useCallback((date: Date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    if (holidayDates.includes(dateStr)) return false;

    // Cek apakah tanggal ini sudah ada di cuti yang disetujui/pending
    const isDisabled = disabledDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    return !isDisabled;
  }, [holidayDates, disabledDates]);

  // Kalkulasi total hari kerja otomatis (estimasi frontend)
  useEffect(() => {
    if (startDate && endDate) {
      // Cek apakah dalam rentang ada hari yang sudah diambil cutinya
      let hasOverlap = false;
      try {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        for (const d of days) {
          const dateStr = format(d, 'yyyy-MM-dd');
          if (disabledDates.some(dd => format(dd, 'yyyy-MM-dd') === dateStr)) {
            hasOverlap = true;
            break;
          }
        }
      } catch (err) {}

      if (hasOverlap) {
        setAlertType('error');
        setAlertMessage('Rentang tanggal yang dipilih bertabrakan dengan pengajuan cuti lain. Silakan pilih rentang yang kosong.');
        setIsAlertOpen(true);
        setDateRange([null, null]);
        setTotalDays(0);
        return;
      }
    }

    if (startDate) {
      const end = endDate || startDate;
      try {
        let count = 0;
        const days = eachDayOfInterval({ start: startDate, end });
        days.forEach(d => {
          if (isDateAvailable(d)) count++;
        });
        setTotalDays(count);
      } catch (err) {
        setTotalDays(0);
      }
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate, disabledDates, isDateAvailable]);

  function handleFileSelect(file: File | null) {
    // Revoke old preview URL
    if (imagePreview) URL.revokeObjectURL(imagePreview);

    if (file) {
      setAttachment(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setAttachment(null);
      setImagePreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      setAlertType('error');
      setAlertMessage('Harap pilih periode cuti terlebih dahulu.');
      setIsAlertOpen(true);
      return;
    }
    if (!reason.trim()) {
      setAlertType('error');
      setAlertMessage('Harap isi alasan cuti terlebih dahulu.');
      setIsAlertOpen(true);
      return;
    }
    
    // Cek jika tipe cuti ini butuh lampiran di frontend (opsional, karena backend juga memvalidasi)
    const selectedType = leaveTypes.find(t => t.id.toString() === leaveType);
    if (selectedType?.requires_attachment && !attachment) {
      if (!selectedType.attachment_required_after || totalDays > selectedType.attachment_required_after) {
        setAlertType('error');
        setAlertMessage(`Harap unggah dokumen bukti untuk cuti ${selectedType.name}${selectedType.attachment_required_after ? ` (lebih dari ${selectedType.attachment_required_after} hari)` : ''}.`);
        setIsAlertOpen(true);
        return;
      }
    }

    // Validasi Notice Days & Max Days
    if (selectedType) {
      if (selectedType.min_notice_days !== null && selectedType.min_notice_days > 0) {
        const earliestDate = addDays(startOfDay(new Date()), selectedType.min_notice_days);
        if (isBefore(startOfDay(startDate), earliestDate)) {
          setAlertType('error');
          setAlertMessage(`Cuti ${selectedType.name} harus diajukan minimal H-${selectedType.min_notice_days} (${format(earliestDate, 'dd MMM yyyy')}).`);
          setIsAlertOpen(true);
          return;
        }
      }

      if (selectedType.max_days_per_request !== null && totalDays > selectedType.max_days_per_request) {
        setAlertType('error');
        setAlertMessage(`Cuti ${selectedType.name} maksimal ${selectedType.max_days_per_request} hari per pengajuan.`);
        setIsAlertOpen(true);
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await createLeaveRequest({
        leave_type_id: leaveType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate || startDate, 'yyyy-MM-dd'),
        reason
      });

      // Upload attachment jika dari backend dibilang required atau jika user melampirkan file opsional
      if (res.data.attachment_required || attachment) {
        if (!attachment) {
          // Backend minta lampiran (misal krn lebih dari batas hari) tapi user belum unggah
          // Batalkan cuti karena lampiran wajib
          await cancelLeaveRequest(res.data.id).catch(() => {});
          setAlertType('error');
          setAlertMessage(`Pengajuan ini membutuhkan lampiran foto bukti. Harap lampirkan foto dan coba lagi.`);
          setIsAlertOpen(true);
          setIsLoading(false);
          return;
        }

        try {
          await uploadLeaveAttachment(res.data.id, attachment);
        } catch (uploadErr: any) {
          // Foto gagal — batalkan cuti yang sudah dibuat supaya tidak terkirim tanpa bukti jika wajib
          await cancelLeaveRequest(res.data.id).catch(() => {});

          setAlertType('error');
          setAlertMessage(
            `Gagal mengunggah foto bukti: ${uploadErr.message || 'Terjadi kesalahan'}. Pengajuan cuti dibatalkan. Silakan coba lagi.`
          );
          setIsAlertOpen(true);
          fetchInitialData();
          setIsLoading(false);
          return;
        }
      }

      setAlertType('success');
      setAlertMessage('Pengajuan cuti berhasil diajukan dan sedang menunggu persetujuan HR.');
      setIsAlertOpen(true);
      
      // Reset Form & refresh data cuti
      setDateRange([null, null]);
      setReason('');
      handleFileSelect(null);
      fetchInitialData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setAlertType('error');
      // Handle Specific Backend Errors
      if (err.status === 409 && err.details?.conflicting_request_id) {
        setAlertMessage(`Tanggal yang Anda pilih bertabrakan dengan pengajuan cuti Anda yang lain.`);
      } else {
        setAlertMessage(err.message || 'Gagal mengajukan cuti.');
      }
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="leave-container">
      <h2 className="leave-title">Pengajuan Cuti Karyawan</h2>
      
      <form onSubmit={handleSubmit} className="leave-grid">
        <div className="leave-column-left">
          
          <div className="leave-form-group">
            <label className="leave-label">Jenis Cuti</label>
            <select 
              className="custom-datepicker-input" 
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.deducts_balance && balances[t.id] !== undefined ? `(Sisa: ${balances[t.id]} Hari)` : t.deducts_balance ? '(Memotong Saldo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <label className="leave-label">Pilih Periode Cuti</label>
          <div className="leave-datepicker-wrapper">
            <DatePicker
              selectsRange={true}
              startDate={startDate ?? undefined}
              endDate={endDate ?? undefined}
              onChange={(update) => setDateRange(update)}
              filterDate={isDateAvailable}
              minDate={new Date()} 
              showDisabledMonthNavigation
              placeholderText="Pilih rentang tanggal cuti..."
              className="custom-datepicker-input"
              dateFormat="dd MMMM yyyy"
              isClearable={true}
              onCalendarClose={() => {
                if (startDate && !endDate) {
                  setDateRange([startDate, startDate]);
                }
              }}
              onChangeRaw={(e) => { if (e) e.preventDefault(); }}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#64748b" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="leave-datepicker-icon"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>

          {/* Info cuti yang sudah ada */}
          {existingLeaves.length > 0 && (
            <div className="leave-overlap-warning">
              <div className="leave-overlap-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="leave-overlap-content">
                <span className="leave-overlap-title">Tanggal tidak tersedia:</span>
                <span className="leave-overlap-desc">
                  Anda sudah memiliki cuti pada tanggal berikut (tidak bisa overlap):
                </span>
                <ul className="leave-overlap-list">
                  {existingLeaves.map(l => (
                    <li key={l.id}>
                      <strong>{l.leave_type_name}</strong> — {l.start_date.substring(0, 10)} s/d {l.end_date.substring(0, 10)}
                      {' '}
                      <span className={`leave-overlap-status leave-overlap-status--${l.status}`}>
                        {l.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="leave-form-group">
            <label className="leave-label">Alasan Cuti <span className="leave-required-asterisk">*</span></label>
            <textarea
              className="custom-datepicker-input leave-textarea"
              placeholder="Tuliskan alasan cuti Anda di sini..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Tombol Upload selalu muncul, bersifat opsional/wajib sesuai kondisi, backend yg validasi akhir */}
          <div className="leave-upload-wrapper">
            <label className="leave-label">Upload Foto Bukti {leaveTypes.find(t => t.id.toString() === leaveType)?.requires_attachment ? <span className="leave-required-asterisk">*</span> : <span className="leave-optional-text">(Opsional)</span>}</label>
            <div className="file-upload-card">
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                      setAlertType('error');
                      setAlertMessage('Ukuran file foto tidak boleh melebihi 5 MB.');
                      setIsAlertOpen(true);
                      e.target.value = ''; // Reset input
                      handleFileSelect(null);
                      return;
                    }
                    handleFileSelect(file);
                  } else {
                    handleFileSelect(null);
                  }
                }}
                className="file-upload-input"
              />
              {imagePreview ? (
                <div className="file-upload-preview-wrapper">
                  <img src={imagePreview} alt="Preview" className="file-upload-preview-img" />
                  <div className="file-upload-preview-info">
                    <p className="file-upload-title">{attachment?.name}</p>
                    <p className="file-upload-subtitle">{attachment ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                  </div>
                  <button 
                    type="button" 
                    className="file-upload-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileSelect(null);
                      // Reset the file input
                      const input = e.currentTarget.closest('.file-upload-card')?.querySelector('input[type="file"]') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="file-upload-content">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="leave-upload-icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p className="file-upload-title">Pilih file atau tarik ke sini</p>
                  <p className="file-upload-subtitle">Maksimal ukuran file 5 MB (JPG, PNG, WebP)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="leave-column-right">
          <div className="leave-total-card">
            <span className="leave-total-title">Total Hari</span>
            <span className="leave-total-number">{totalDays}</span>
            <span className="leave-optional-text">hari kerja (estimasi)</span>
          </div>
          
          <button type="submit" disabled={isLoading} className="btn btn-primary leave-submit-btn" style={{ opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Mengirim...' : 'Ajukan Cuti'}
          </button>
        </div>
      </form>

      <AlertModal
        isOpen={isAlertOpen}
        title={alertType === 'success' ? 'Berhasil' : 'Peringatan'}
        type={alertType}
        message={alertMessage}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
}
