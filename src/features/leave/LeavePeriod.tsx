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
          <label className="leave-label">Pilih Periode Cuti (Leave Period)</label>
          <DatePicker
            selectsRange={true}
            startDate={startDate ?? undefined}
            endDate={endDate ?? undefined}
            onChange={(update) => setDateRange(update)}
            filterDate={isWeekday}
            placeholderText="Pilih rentang tanggal cuti..."
            className="custom-datepicker-input"
            dateFormat="dd MMMM yyyy"
            isClearable={true}
          />
        </div>

        <div className="leave-column-right">
          <span className="leave-total-title">Total Working Days</span>
          <span className="leave-total-number">{totalDays}</span>
          <span className="leave-total-note">* Weekends are excluded automatically</span>
        </div>
      </div>
    </div>
  );
}
