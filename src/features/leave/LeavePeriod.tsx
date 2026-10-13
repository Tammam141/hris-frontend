import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO, eachDayOfInterval, startOfDay, addDays, isBefore } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AlertModal } from '../../components/ui/AlertModal';
import { 
  getLeaveTypes, 
  createLeaveRequest, 
  uploadLeaveAttachment, 
  cancelLeaveRequest, 
  getMyLeaveBalances, 
  getMyLeaveRequests, 
  getDepartmentLeaveCalendar,
  DepartmentCalendarResponse,
  DepartmentCalendarDay,
  LeaveType, 
  LeaveRequest 
} from '../../api/leave';
import { getHolidays, Holiday } from '../../api/holiday';
import { useAuth } from '../../hooks/useAuth';
import { compressImage } from '../../utils/imageCompressor';
import { isStaffingLimitError, formatStaffingLimitMessage } from '../../utils/staffingLimit';
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

  // State kalender batas cuti bersamaan departemen
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [deptCalendar, setDeptCalendar] = useState<DepartmentCalendarResponse['data'] | null>(null);

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

  // State pop-up konfirmasi peringatan cuti rekan satu divisi
  const [colleagueConfirmModal, setColleagueConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  // State pesan banner peringatan visual jika ada rekan cuti di tanggal terpilih
  const [colleagueWarning, setColleagueWarning] = useState<string>('');

  // Helper untuk mengekstrak array days dari respon kalender secara aman
  const getCalendarDays = useCallback((data: any): DepartmentCalendarDay[] => {
    if (!data) return [];
    if (Array.isArray(data.days)) return data.days;
    if (Array.isArray(data.data?.days)) return data.data.days;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }, []);

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

        // Muat hari libur tahun berjalan saat pertama kali halaman dibuka
        const currentYear = new Date().getFullYear();
        getHolidays({ year: currentYear, limit: 100 })
          .then(holsRes => {
            if (holsRes.data) setHolidays(holsRes.data);
          })
          .catch(() => {});
      })
      .catch(err => console.error(err));
  }, [user?.employee?.gender]);

  // Ambil data kalender kuota cuti bersamaan departemen (rentang maks 62 hari)
  const fetchDepartmentCalendar = useCallback((targetMonth: Date) => {
    const start = startOfDay(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1));
    const end = addDays(start, 61); // Tepat 62 hari inklusif
    getDepartmentLeaveCalendar(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      .then(res => {
        if (res && res.data) {
          setDeptCalendar(res.data);
        }
      })
      .catch(() => {
        // Abaikan bila user tanpa departemen atau error non-fatal
      });
  }, []);

  useEffect(() => {
    fetchDepartmentCalendar(calendarMonth);
  }, [fetchDepartmentCalendar, calendarMonth]);

  // Cek apakah jenis cuti saat ini dikecualikan dari batas staffing
  const selectedType = useMemo(
    () => leaveTypes.find(t => t.id.toString() === leaveType),
    [leaveTypes, leaveType]
  );
  const isExemptFromStaffing = Boolean(selectedType?.exempt_from_staffing_limit);

  // Kumpulan tanggal yang kuotanya penuh di departemen
  const fullDatesMap = useMemo(() => {
    const map = new Map<string, { on_leave: number }>();
    const days = getCalendarDays(deptCalendar);
    days.forEach(d => {
      if (d && d.is_full && d.date) {
        map.set(d.date.substring(0, 10), { on_leave: d.on_leave || 0 });
      }
    });
    return map;
  }, [deptCalendar, getCalendarDays]);

  // Kumpulan tanggal yang ada rekan satu divisi cuti (on_leave > 0) atau pengajuannya pending (pending > 0)
  const colleagueDaysMap = useMemo(() => {
    const map = new Map<string, { on_leave: number; pending: number }>();
    const days = getCalendarDays(deptCalendar);
    days.forEach(d => {
      if (d && d.date) {
        const dateKey = d.date.substring(0, 10);
        const onLeave = d.on_leave || 0;
        const pending = d.pending || 0;
        if (onLeave > 0 || pending > 0) {
          map.set(dateKey, { on_leave: onLeave, pending });
        }
      }
    });
    return map;
  }, [deptCalendar, getCalendarDays]);

  // Muat kalender departemen secara otomatis untuk rentang tanggal yang dipilih agar data selalu sinkron
  useEffect(() => {
    if (!startDate) return;
    const end = endDate || startDate;
    getDepartmentLeaveCalendar(format(startDate, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      .then(res => {
        if (res?.data) {
          setDeptCalendar(prev => {
            const prevDays = getCalendarDays(prev);
            const newDays = getCalendarDays(res.data);
            const dayMap = new Map<string, DepartmentCalendarDay>();
            prevDays.forEach(d => { if (d?.date) dayMap.set(d.date.substring(0, 10), d); });
            newDays.forEach(d => { if (d?.date) dayMap.set(d.date.substring(0, 10), d); });
            return {
              department: res.data.department || prev?.department || null,
              days: Array.from(dayMap.values())
            };
          });
        }
      })
      .catch(() => {});
  }, [startDate, endDate, getCalendarDays]);

  // Banner peringatan visual instan saat tanggal dipilih di kalender
  useEffect(() => {
    if (!startDate) {
      setColleagueWarning('');
      return;
    }
    const end = endDate || startDate;
    try {
      const days = eachDayOfInterval({ start: startDate, end });
      const conflicted = days
        .map(d => ({ date: d, info: colleagueDaysMap.get(format(d, 'yyyy-MM-dd')) }))
        .filter((item): item is { date: Date; info: { on_leave: number; pending: number } } =>
          Boolean(item.info && (item.info.on_leave > 0 || item.info.pending > 0))
        );

      if (conflicted.length > 0) {
        if (conflicted.length === 1) {
          const item = conflicted[0];
          const dStr = format(item.date, 'd MMM yyyy', { locale: idLocale });
          const parts: string[] = [];
          if (item.info.on_leave > 0) parts.push(`${item.info.on_leave} rekan sudah cuti`);
          if (item.info.pending > 0) parts.push(`${item.info.pending} rekan menunggu persetujuan`);
          setColleagueWarning(`Pada tanggal ${dStr} ada ${parts.join(' dan ')} di divisi Anda.`);
        } else {
          setColleagueWarning(`Terdapat ${conflicted.length} hari yang beririsan dengan jadwal cuti rekan satu divisi Anda.`);
        }
      } else {
        setColleagueWarning('');
      }
    } catch {
      setColleagueWarning('');
    }
  }, [startDate, endDate, colleagueDaysMap]);

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
    return holidays.filter(h => h && h.holiday_date).map(h => format(parseISO(h.holiday_date), 'yyyy-MM-dd'));
  }, [holidays]);

  // Blokir hari Sabtu (6), Minggu (0), libur nasional, tanggal cuti yang sudah ada, dan kuota penuh departemen
  const isDateAvailable = useCallback((date: Date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    if (holidayDates.includes(dateStr)) return false;

    // Cek apakah tanggal ini sudah ada di cuti yang disetujui/pending
    const isDisabled = disabledDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isDisabled) return false;

    // Jika jenis cuti TIDAK dikecualikan dari batas staf, tanggal dengan kuota penuh dinonaktifkan
    if (!isExemptFromStaffing && fullDatesMap.has(dateStr)) {
      return false;
    }

    return true;
  }, [holidayDates, disabledDates, isExemptFromStaffing, fullDatesMap]);

  // Berikan class penanda merah untuk tanggal kuota penuh dan titik kuning jika ada rekan cuti/pending pada DatePicker
  const getDayClassName = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!isExemptFromStaffing) {
      if (fullDatesMap.has(dateStr)) {
        return 'day-staffing-full';
      }
      if (colleagueDaysMap.has(dateStr)) {
        return 'day-staffing-warning';
      }
    }
    return '';
  }, [isExemptFromStaffing, fullDatesMap, colleagueDaysMap]);

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
      } catch {}

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
      } catch {
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

      // Validasi Saldo Cuti untuk jenis cuti yang memotong saldo
      if (selectedType.deducts_balance) {
        const sisa = balances[selectedType.id] ?? 0;
        if (totalDays > sisa) {
          setAlertType('error');
          setAlertMessage(
            `Saldo ${selectedType.name} Anda tersisa ${sisa} hari, sedangkan pengajuan ini ${totalDays} hari kerja. Hubungi HR bila saldo Anda seharusnya belum habis.`
          );
          setIsAlertOpen(true);
          return;
        }
      }

      // Validasi Batas Cuti Bersamaan Departemen
      if (!isExemptFromStaffing && startDate) {
        const end = endDate || startDate;
        const days = eachDayOfInterval({ start: startDate, end });

        // Selalu ambil data kalender departemen terbaru untuk rentang tanggal pengajuan
        let currentFullDates = fullDatesMap;
        let currentColleagueDays = colleagueDaysMap;
        try {
          const freshRes = await getDepartmentLeaveCalendar(format(startDate, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
          if (freshRes?.data) {
            const freshDays = getCalendarDays(freshRes.data);
            const freshFull = new Map<string, { on_leave: number }>();
            const freshColleague = new Map<string, { on_leave: number; pending: number }>();
            freshDays.forEach(d => {
              if (d?.date) {
                const dateKey = d.date.substring(0, 10);
                if (d.is_full) freshFull.set(dateKey, { on_leave: d.on_leave || 0 });
                const onLeave = d.on_leave || 0;
                const pending = d.pending || 0;
                if (onLeave > 0 || pending > 0) freshColleague.set(dateKey, { on_leave: onLeave, pending });
              }
            });
            currentFullDates = freshFull;
            currentColleagueDays = freshColleague;
          }
        } catch {
          // fallback ke map yang sudah tersimpan jika koneksi terganggu
        }

        // Pemeriksaan is_full yang sudah ada TETAP (tolak bila penuh)
        if (currentFullDates.size > 0) {
          const conflictedDays = days.filter(d => currentFullDates.has(format(d, 'yyyy-MM-dd')));
          if (conflictedDays.length > 0) {
            const formattedDates = conflictedDays.map(d => format(d, 'd MMM yyyy', { locale: idLocale })).join(', ');
            const deptName = deptCalendar?.department?.name ? ` ${deptCalendar.department.name}` : '';
            const maxLimit = typeof deptCalendar?.department?.max_concurrent_leave === 'number'
              ? ` (maksimal ${deptCalendar.department.max_concurrent_leave} orang)`
              : '';
            setAlertType('error');
            setAlertMessage(`Kuota cuti departemen${deptName}${maxLimit} sudah penuh pada ${formattedDates}. Pilih tanggal lain.`);
            setIsAlertOpen(true);
            return;
          }
        }

        // Tambahan: bila tidak penuh tetapi ada tanggal dalam rentang dengan on_leave > 0 atau pending > 0:
        const colleagueDays = days
          .map(d => ({ date: d, info: currentColleagueDays.get(format(d, 'yyyy-MM-dd')) }))
          .filter((item): item is { date: Date; info: { on_leave: number; pending: number } } => 
            Boolean(item.info && (item.info.on_leave > 0 || item.info.pending > 0))
          );

        if (colleagueDays.length > 0) {
          let confirmMsg = '';
          if (colleagueDays.length === 1) {
            const item = colleagueDays[0];
            const dateStr = format(item.date, 'd MMM yyyy', { locale: idLocale });
            const parts: string[] = [];
            if (item.info.on_leave > 0) {
              parts.push(`${item.info.on_leave} rekan satu divisi yang sudah cuti`);
            }
            if (item.info.pending > 0) {
              parts.push(`${item.info.pending} rekan yang pengajuannya menunggu persetujuan`);
            }
            confirmMsg = `Pada ${dateStr} ada ${parts.join(' dan ')}. Tetap ajukan?`;
          } else {
            const lines = colleagueDays.map(item => {
              const dStr = format(item.date, 'd MMM yyyy', { locale: idLocale });
              const parts: string[] = [];
              if (item.info.on_leave > 0) parts.push(`${item.info.on_leave} rekan satu divisi yang sudah cuti`);
              if (item.info.pending > 0) parts.push(`${item.info.pending} rekan menunggu persetujuan`);
              return `• ${dStr}: ${parts.join(', ')}`;
            }).join('\n');
            confirmMsg = `Terdapat rekan satu divisi yang memiliki jadwal cuti pada tanggal berikut:\n${lines}\n\nTetap ajukan?`;
          }

          setColleagueConfirmModal({
            isOpen: true,
            message: confirmMsg
          });
          return;
        }
      }
    }

    executeSubmit();
  }

  const executeSubmit = async () => {
    if (!startDate) return;

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
          fetchDepartmentCalendar(calendarMonth);
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
      fetchDepartmentCalendar(calendarMonth);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setAlertType('error');
      const apiErr = err as any;
      if (isStaffingLimitError(apiErr)) {
        setAlertMessage(formatStaffingLimitMessage(apiErr.details));
      } else if (apiErr?.details?.balance !== undefined) {
        const sisa = apiErr.details.balance;
        const requested = apiErr.details.requested ?? totalDays;
        const typeName = selectedType?.name || 'Cuti';
        setAlertMessage(
          `Saldo ${typeName} Anda tersisa ${sisa} hari, sedangkan pengajuan ini ${requested} hari kerja. Hubungi HR bila saldo Anda seharusnya belum habis.`
        );
      } else if (apiErr?.status === 409 && apiErr?.details?.conflicting_request_id) {
        setAlertMessage(`Tanggal yang Anda pilih bertabrakan dengan pengajuan cuti Anda yang lain.`);
      } else {
        setAlertMessage(apiErr?.message || 'Gagal mengajukan cuti.');
      }
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypeObj = leaveTypes.find(t => t.id.toString() === leaveType);
  const currentBalance = selectedTypeObj ? (balances[selectedTypeObj.id] ?? 0) : 0;
  const isInsufficientBalance = Boolean(selectedTypeObj?.deducts_balance && totalDays > currentBalance);

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
              dayClassName={getDayClassName}
              onMonthChange={(monthDate) => setCalendarMonth(monthDate)}
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
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
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

          {/* Batas kuota departemen */}
          {deptCalendar?.department && deptCalendar.department.max_concurrent_leave !== null && (
            <div className="leave-dept-info-card">
              <div className="leave-dept-info-header">
                <div className="leave-dept-info-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18"/>
                    <path d="M5 21V7l8-4v18"/>
                    <path d="M19 21V11l-6-4"/>
                    <path d="M9 9h1"/>
                    <path d="M9 13h1"/>
                    <path d="M9 17h1"/>
                  </svg>
                </div>
                <div>
                  Batas cuti bersamaan Dept. <strong>{deptCalendar.department.name}</strong>:
                  <span className="leave-dept-quota-badge">{deptCalendar.department.max_concurrent_leave} orang/hari</span>
                  {isExemptFromStaffing && (
                    <span className="leave-exempt-tag">Bebas Kuota</span>
                  )}
                </div>
              </div>

              {!isExemptFromStaffing && (
                <div className="leave-dept-legend">
                  <span className="leave-legend-item">
                    <span className="legend-indicator legend-indicator--full"></span>
                    <span>Merah: Kuota penuh</span>
                  </span>
                  <span className="leave-legend-item">
                    <span className="legend-indicator legend-indicator--warning"></span>
                    <span>Kuning: Ada rekan cuti / pending</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Peringatan jadwal cuti bersamaan rekan satu divisi */}
          {colleagueWarning && (
            <div className="leave-overlap-warning" style={{ backgroundColor: '#fffdf0', borderColor: '#fef08a' }}>
              <div className="leave-overlap-icon" style={{ color: '#ca8a04' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="leave-overlap-content">
                <h4 className="leave-overlap-title" style={{ color: '#854d0e' }}>Peringatan Jadwal Divisi</h4>
                <p className="leave-overlap-desc" style={{ color: '#a16207' }}>{colleagueWarning}</p>
              </div>
            </div>
          )}

          {/* Info cuti yang sudah ada */}
          {existingLeaves.length > 0 && (
            <div className="leave-overlap-warning">
              <div className="leave-overlap-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="leave-overlap-content">
                <h4 className="leave-overlap-title">Tanggal Tidak Tersedia</h4>
                <p className="leave-overlap-desc">
                  Anda sudah memiliki pengajuan cuti pada tanggal berikut (tidak bisa bertabrakan):
                </p>
                <ul className="leave-overlap-list">
                  {existingLeaves.map(l => {
                    let rangeStr = `${l.start_date.substring(0, 10)} s/d ${l.end_date.substring(0, 10)}`;
                    try {
                      const sDate = format(parseISO(l.start_date.substring(0, 10)), 'd MMM yyyy', { locale: idLocale });
                      const eDate = format(parseISO(l.end_date.substring(0, 10)), 'd MMM yyyy', { locale: idLocale });
                      rangeStr = sDate === eDate ? sDate : `${sDate} s/d ${eDate}`;
                    } catch {}

                    return (
                      <li key={l.id}>
                        <div className="leave-overlap-item-details">
                          <strong>{l.leave_type_name}</strong>
                          <span style={{ color: '#78350f' }}>— {rangeStr}</span>
                        </div>
                        <span className={`leave-overlap-status leave-overlap-status--${l.status}`}>
                          {l.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                        </span>
                      </li>
                    );
                  })}
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
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    let file = e.target.files[0];
                    
                    setIsLoading(true);
                    try {
                      file = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
                    } catch (err) {
                      console.error('Gagal mengompresi gambar:', err);
                    }
                    setIsLoading(false);

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
          
          <button 
            type="submit" 
            disabled={isLoading || isInsufficientBalance} 
            className="btn btn-primary leave-submit-btn" 
            style={{ 
              opacity: (isLoading || isInsufficientBalance) ? 0.6 : 1,
              cursor: isInsufficientBalance ? 'not-allowed' : undefined 
            }}
          >
            {isLoading ? 'Mengirim...' : 'Ajukan Cuti'}
          </button>
          {isInsufficientBalance && (
            <span style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', display: 'block', marginTop: '6px', fontWeight: 500 }}>
              Saldo tidak cukup
            </span>
          )}
        </div>
      </form>

      <AlertModal
        isOpen={isAlertOpen}
        title={alertType === 'success' ? 'Berhasil' : 'Peringatan'}
        type={alertType}
        message={alertMessage}
        onClose={() => setIsAlertOpen(false)}
      />

      {/* Pop-up Konfirmasi Cuti Bersamaan Rekan Satu Divisi */}
      {colleagueConfirmModal?.isOpen && (
        <div className="modal-overlay" onClick={() => setColleagueConfirmModal(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#b45309' }}>Konfirmasi Pengajuan Cuti</h3>
              <button type="button" className="modal-close-btn" onClick={() => setColleagueConfirmModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line', fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0' }}>
                {colleagueConfirmModal.message}
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setColleagueConfirmModal(null)}>
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  setColleagueConfirmModal(null);
                  executeSubmit();
                }}
              >
                Tetap Ajukan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
