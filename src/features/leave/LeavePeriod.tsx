import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { differenceInBusinessDays } from 'date-fns';
import '../../components/ui/leave.css';

export function LeavePeriod() {
  // State rentang tanggal cuti
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // State total hari kerja
  const [totalDays, setTotalDays] = useState<number>(0);

  // State alasan cuti
  const [reason, setReason] = useState<string>('');

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

  return (
    <div className="leave-container">
      <h2 className="leave-title">Pengajuan Cuti Karyawan</h2>
      
      <div className="leave-grid">
        <div className="leave-column-left">
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
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
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
        </div>

        <div className="leave-column-right">
          <span className="leave-total-title">Total</span>
          <span className="leave-total-number">{totalDays}</span>
        </div>
      </div>
    </div>
  );
}
