import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { differenceInBusinessDays } from 'date-fns';
import { AlertModal } from '../../components/ui/AlertModal';
import '../../components/ui/leave.css';

export function LeavePeriod() {
  // State rentang tanggal cuti
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // State total hari kerja
  const [totalDays, setTotalDays] = useState<number>(0);

  // State alasan cuti & tipe cuti
  const [reason, setReason] = useState<string>('');
  const [leaveType, setLeaveType] = useState<string>('tahunan');
  const [attachment, setAttachment] = useState<File | null>(null);

  // State notifikasi submit
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  // Blokir hari Sabtu (6) dan Minggu (0)
  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  // Kalkulasi total hari kerja otomatis
  useEffect(() => {
    if (startDate && endDate) {
      const businessDays = differenceInBusinessDays(endDate, startDate);
      if (businessDays < 0) {
        setTotalDays(0);
      } else {
        setTotalDays(businessDays + 1);
      }
    } else if (startDate && !endDate) {
      setTotalDays(1);
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      setAlertType('error');
      setAlertMessage('Harap pilih periode cuti terlebih dahulu.');
      setIsAlertOpen(true);
      return;
    }
    if (leaveType === 'sakit' && !attachment) {
      setAlertType('error');
      setAlertMessage('Harap unggah foto bukti untuk cuti sakit.');
      setIsAlertOpen(true);
      return;
    }

    // Mock Submit Success
    setAlertType('success');
    setAlertMessage(`Pengajuan Cuti ${leaveType === 'tahunan' ? 'Tahunan' : leaveType === 'sakit' ? 'Sakit' : 'Melahirkan'} berhasil diajukan dan sedang menunggu persetujuan HR.`);
    setIsAlertOpen(true);
    
    // Reset Form
    setDateRange([null, null]);
    setReason('');
    setAttachment(null);
    setLeaveType('tahunan');
  }

  return (
    <div className="leave-container">
      <h2 className="leave-title">Pengajuan Cuti Karyawan</h2>
      
      <form onSubmit={handleSubmit} className="leave-grid">
        <div className="leave-column-left">
          
          <div style={{ marginBottom: '16px' }}>
            <label className="leave-label">Jenis Cuti</label>
            <select 
              className="custom-datepicker-input" 
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="tahunan">Cuti Tahunan (Sisa: 12 Hari)</option>
              <option value="sakit">Cuti Sakit</option>
              <option value="melahirkan">Cuti Melahirkan</option>
            </select>
          </div>

          <label className="leave-label">Pilih Periode Cuti</label>
          <div style={{ position: 'relative' }}>
            <DatePicker
              selectsRange={true}
              startDate={startDate ?? undefined}
              endDate={endDate ?? undefined}
              onChange={(update) => setDateRange(update)}
              filterDate={isWeekday}
              minDate={new Date()} 
              showDisabledMonthNavigation
              placeholderText="Pilih rentang tanggal cuti..."
              className="custom-datepicker-input"
              dateFormat="dd MMMM yyyy"
              isClearable={true}
              onCalendarClose={() => {
                // Solusi alternatif: Jika pengguna hanya memilih 1 tanggal lalu menutup kalender,
                // jadikan tanggal tersebut sebagai startDate sekaligus endDate (cuti 1 hari).
                if (startDate && !endDate) {
                  setDateRange([startDate, startDate]);
                }
              }}
              onChangeRaw={(e) => e.preventDefault()} 
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
              style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <label className="leave-label">Alasan Cuti</label>
            <textarea
              className="custom-datepicker-input"
              style={{ minHeight: '100px', resize: 'vertical', marginTop: '8px' }}
              placeholder="Tuliskan alasan cuti Anda di sini..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className="leave-label">Upload Foto Bukti {leaveType === 'sakit' && <span style={{ color: '#dc2626' }}>*</span>}</label>
            <div className="file-upload-wrapper">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                      setAlertType('error');
                      setAlertMessage('Ukuran file foto tidak boleh melebihi 5 MB.');
                      setIsAlertOpen(true);
                      e.target.value = ''; // Reset input
                      setAttachment(null);
                      return;
                    }
                    setAttachment(file);
                  } else {
                    setAttachment(null);
                  }
                }}
                className="file-upload-input"
              />
              <div className="file-upload-text">
                {attachment ? attachment.name : 'Pilih file atau tarik ke sini (Maks 5MB)'}
              </div>
            </div>
          </div>
        </div>

        <div className="leave-column-right">
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span className="leave-total-title">Total Hari</span>
            <span className="leave-total-number" style={{ display: 'block', fontSize: '48px', color: '#1a78d7', fontWeight: 700, margin: '8px 0' }}>{totalDays}</span>
            <span style={{ fontSize: '14px', color: '#64748b' }}>hari kerja terpilih</span>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '14px', fontSize: '16px', fontWeight: 600 }}>
            Ajukan Cuti
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
