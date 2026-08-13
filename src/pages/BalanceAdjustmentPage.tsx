import React, { useState, useEffect } from 'react';
import { getEmployees } from '../api/employee';
import { getLeaveTypes, adjustBalance, getEmployeeBalance, LeaveType } from '../api/leave';
import { Employee } from '../types/employee';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';

export function BalanceAdjustmentPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  
  // Selection State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('');
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  
  // Current Balance Info
  const [currentBalanceInfo, setCurrentBalanceInfo] = useState<any>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Form State
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('');
  
  // Modals
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load employees (max 100 for dropdown, idealnya select2/autocomplete)
    getEmployees({ page: 1, limit: 100 })
      .then(res => setEmployees(res.data))
      .catch(err => console.error(err));
      
    getLeaveTypes()
      .then(res => {
        // Hanya ambil yg memotong saldo dan aktif
        const deductingTypes = res.data.filter(t => t.deducts_balance && t.is_active);
        setLeaveTypes(deductingTypes);
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch current balance when selection changes
  useEffect(() => {
    if (selectedEmployeeId && selectedLeaveTypeId && periodYear) {
      setIsLoadingBalance(true);
      getEmployeeBalance(selectedEmployeeId, periodYear)
        .then(res => {
          const bal = res.data?.balances?.find((b: any) => b.leave_type_id.toString() === selectedLeaveTypeId);
          setCurrentBalanceInfo(bal || { balance: 0 });
        })
        .catch(() => {
          setCurrentBalanceInfo({ balance: 0 });
        })
        .finally(() => setIsLoadingBalance(false));
    } else {
      setCurrentBalanceInfo(null);
    }
  }, [selectedEmployeeId, selectedLeaveTypeId, periodYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedLeaveTypeId || amount === '' || !reason.trim()) {
      setAlertInfo({ open: true, title: 'Error', message: 'Harap lengkapi semua field.', type: 'error' });
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await adjustBalance({
        employee_id: selectedEmployeeId,
        leave_type_id: selectedLeaveTypeId,
        period_year: periodYear,
        amount: Number(amount),
        reason
      });
      
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Saldo cuti berhasil disesuaikan.', type: 'success' });
      // Reset form (kecuali employee & leave type agar bisa lihat saldo terupdate)
      setAmount('');
      setReason('');
      
      // Trigger re-fetch balance
      const currentEmployee = selectedEmployeeId;
      setSelectedEmployeeId('');
      setTimeout(() => setSelectedEmployeeId(currentEmployee), 100);
      
    } catch (err: any) {
      setAlertInfo({ open: true, title: 'Gagal', message: err.message || 'Gagal menyesuaikan saldo cuti.', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Penyesuaian Saldo Cuti</h1>
            <p className="dashboard-subtitle">Tambahkan atau kurangi saldo cuti karyawan secara manual.</p>
          </div>
        </div>

        <div style={{ maxWidth: '600px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Karyawan</label>
              <select className="input-field" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} required>
                <option value="">-- Pilih Karyawan --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_number})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Jenis Cuti</label>
                <select className="input-field" value={selectedLeaveTypeId} onChange={e => setSelectedLeaveTypeId(e.target.value)} required>
                  <option value="">-- Pilih Jenis Cuti --</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tahun Periode</label>
                <input type="number" className="input-field" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))} required />
              </div>
            </div>

            {/* Tampilkan Saldo Saat Ini */}
            {selectedEmployeeId && selectedLeaveTypeId && (
              <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Saldo saat ini:</span>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {isLoadingBalance ? (
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#94a3b8' }}>...</span>
                  ) : (
                    <span style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{currentBalanceInfo?.balance ?? 0}</span>
                  )}
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Hari</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Jumlah Penyesuaian (Hari) <span style={{color: 'red'}}>*</span></label>
              <input 
                type="number" 
                className="input-field" 
                value={amount} 
                onChange={e => setAmount(e.target.value !== '' ? Number(e.target.value) : '')} 
                required 
                placeholder="Gunakan angka negatif untuk mengurangi saldo (contoh: -2)"
              />
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Contoh: 5 (menambah 5 hari), -2 (mengurangi 2 hari)</span>
            </div>

            <div className="form-group">
              <label className="form-label">Alasan Penyesuaian <span style={{color: 'red'}}>*</span></label>
              <textarea 
                className="input-field" 
                rows={3} 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required 
                placeholder="Alasan wajib diisi sebagai bukti audit..."
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              Simpan Penyesuaian
            </button>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Penyesuaian"
        message={`Anda akan ${Number(amount) > 0 ? 'menambahkan' : 'mengurangi'} ${Math.abs(Number(amount))} hari saldo cuti untuk karyawan ini. Lanjutkan?`}
        confirmText="Ya, Lanjutkan"
        isDestructive={false}
        onConfirm={confirmSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />

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
