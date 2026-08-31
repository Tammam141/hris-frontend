import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { getEmployees, createEmployee } from '../api/employee';
import { Department, Position, EmployeeListItem, CreateEmployeePayload } from '../types/employee';
import { AlertModal } from '../components/ui/AlertModal';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import '../components/ui/create-employee.css';

interface EmployeeFormState {
  id: string; // Internal ID for React key
  full_name: string;
  country_code: string;
  phone_number: string;
  gender: 'male' | 'female';
  email: string;
  password: string;
  role: 'employee' | 'admin';
  department_id: string;
  position_id: string;
  manager_id: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyForm = (): EmployeeFormState => ({
  id: generateId(),
  full_name: '',
  country_code: '+62',
  phone_number: '',
  gender: 'male',
  email: '',
  password: '',
  role: 'employee',
  department_id: '',
  position_id: '',
  manager_id: '',
});

export function EmployeeCreatePage() {
  const navigate = useNavigate();

  // ini array untuk form nya
  const [forms, setForms] = useState<EmployeeFormState[]>([createEmptyForm()]);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '' as React.ReactNode, type: 'success' as 'success' | 'error' });

  // State untuk menyimpan error dari backend. 
  // Format key field error: `${rowIndex}-${fieldName}`
  // Format key row error: `${rowIndex}-row`
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadReferences() {
      setLoading(true);
      try {
        const [depRes, posRes, empRes] = await Promise.all([
          getDepartments(),
          getPositions(),
          getEmployees({ limit: 100 }) // Ambil untuk daftar manajer
        ]);
        if (depRes.success) setDepartments(depRes.data);
        if (posRes.success) setPositions(posRes.data);
        if (empRes.success) setManagers(empRes.data);
      } catch (err: any) {
        setAlertInfo({ open: true, title: 'Error', message: err.message || 'Gagal memuat referensi data', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadReferences();
  }, []);

  const addForm = () => {
    // Membatasi penambahan baris maksimal hanya 4 form
    if (forms.length < 4) {
      setForms([...forms, createEmptyForm()]);
    }
  };

  const removeForm = (id: string) => {
    if (forms.length > 1) {
      setForms(forms.filter(f => f.id !== id));
      // Menghapus error lama mungkin ribet indeksnya, biarkan saja kita reset saat submit
    }
  };

  const updateForm = (id: string, field: keyof EmployeeFormState, value: string) => {
    setForms(forms.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({}); // Reset error sebelumnya
    
    let localErrors = 0;
    const newErrors: Record<string, string> = {};

    // Validasi basic frontend
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      if (!f.full_name || !f.email || !f.password || !f.phone_number) {
        newErrors[`${i}-row`] = 'Harap lengkapi semua field wajib';
        localErrors++;
      } else if (f.password.length < 8) {
        newErrors[`${i}-password`] = 'Minimal 8 karakter';
        localErrors++;
      }
      
      // Cek email duplikat di dalam satu form
      for (let j = i + 1; j < forms.length; j++) {
        if (forms[j].email && forms[j].email === f.email) {
          newErrors[`${j}-email`] = 'Email ini sudah dipakai di baris atasnya';
          localErrors++;
        }
      }
    }

    if (localErrors > 0) {
      setValidationErrors(newErrors);
      setAlertInfo({ open: true, title: 'Validasi Gagal', message: 'Terdapat beberapa kesalahan. Silakan periksa tanda merah pada form.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      // ini array dari state form
      const payloadEmployees: CreateEmployeePayload[] = forms.map(f => ({
        full_name: f.full_name,
        email: f.email,
        password: f.password,
        phone: `${f.country_code}${f.phone_number}`,
        gender: f.gender,
        role: f.role,
        department_id: f.department_id || undefined,
        position_id: f.position_id || undefined,
        manager_id: f.manager_id || undefined,
      }));

      // Jika cuma 1 karyawan, kirim sebagai Object (Single). Jika > 1, kirim sebagai Array (Multiple).
      const finalPayload = payloadEmployees.length === 1 ? payloadEmployees[0] : payloadEmployees;

      // Mengirimkan payload ke Backend
      const res = await createEmployee(finalPayload);
      
      // Pastikan res.data diubah jadi array untuk keperluan map (karena jika Single, BE mengembalikan Object)
      const dataArray = Array.isArray(res.data) ? res.data : [res.data];

      // Jika berhasil, tampilkan informasi akun yang terbuat
      setAlertInfo({ 
        open: true, 
        title: 'Berhasil', 
        message: (
          <div>
            <p style={{ marginBottom: '12px' }}>{res.message || `${dataArray.length} karyawan berhasil ditambahkan.`}</p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              {dataArray.map((d: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < dataArray.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                  <strong>{d.employee.full_name}</strong> (NIK: {d.employee.employee_number})<br/>
                  Email: {d.account.email}
                </div>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>Catat/bagikan informasi ini. Karyawan akan diminta mengubah password saat login pertama kali.</p>
          </div>
        ), 
        type: 'success' 
      });

      // Redirect setelah sukses (bisa menunggu user tutup modal, tapi kita redirect setelah beberapa detik atau biarkan user melihat dulu).
      // Lebih baik form dikosongkan jika user mau nambah lagi, atau arahkan kembali.
      setForms([createEmptyForm()]);
      
    } catch (err: any) {
      let errorParsed = false;
      const parsedErrors: Record<string, string> = {};

      if (err.code === 'VALIDATION_ERROR' && err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((e: any) => {
          // Format e.field: "employees.0.email"
          if (e.field && e.field.startsWith('employees.')) {
            const parts = e.field.split('.');
            if (parts.length >= 3) {
              const index = parts[1];
              const fieldName = parts.slice(2).join('.');
              parsedErrors[`${index}-${fieldName}`] = e.message;
            }
          }
        });
        errorParsed = true;
      } else if (err.code === 'BAD_REQUEST' && err.details?.failed_rows && Array.isArray(err.details.failed_rows)) {
        err.details.failed_rows.forEach((row: any) => {
          parsedErrors[`${row.index}-row`] = row.message;
        });
        errorParsed = true;
      }

      if (errorParsed) {
        setValidationErrors(parsedErrors);
        setAlertInfo({
          open: true,
          title: 'Selesai dengan Catatan',
          message: err.message || 'Terdapat baris yang bermasalah. Tidak ada karyawan yang ditambahkan. Silakan perbaiki lalu coba lagi.',
          type: 'error'
        });
      } else {
        // Fallback error biasa
        setAlertInfo({
          open: true,
          title: 'Error',
          message: err.message || 'Terjadi kesalahan saat memproses data',
          type: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getError = (index: number, field: string) => validationErrors[`${index}-${field}`];
  const getRowError = (index: number) => validationErrors[`${index}-row`];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row create-employee-header">
        <div>
          <button onClick={() => navigate('/employee')} className="create-employee-back-btn">
            ← Kembali ke Daftar Karyawan
          </button>
          <h1 className="dashboard-title">Tambah Karyawan Baru</h1>
          <p className="dashboard-subtitle">Anda dapat menambahkan banyak karyawan sekaligus.</p>
        </div>
        <div className="create-employee-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={addForm}
            disabled={forms.length >= 4 || isSubmitting}
            style={{ backgroundColor: forms.length >= 4 ? '#e2e8f0' : '#f8fafc', color: forms.length >= 4 ? '#94a3b8' : '#0f172a', border: '1px solid #cbd5e1' }}
          >
            + Tambah Baris Karyawan ({forms.length}/4)
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Memproses (Mohon Tunggu)...' : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat referensi...</div>
      ) : (
        <form onSubmit={handleSubmit} className="create-employee-form-container">
          {forms.map((form, index) => {
            const rowError = getRowError(index);
            const isRowError = !!rowError || Object.keys(validationErrors).some(k => k.startsWith(`${index}-`));

            return (
              <div key={form.id} className="create-employee-card" style={{ borderColor: isRowError ? '#f87171' : '#e2e8f0', borderWidth: isRowError ? '2px' : '1px' }}>
                <div className="create-employee-card-header">
                  <h3 className="create-employee-card-title">
                    <span className="create-employee-card-badge" style={{ backgroundColor: isRowError ? '#dc2626' : '#2563eb' }}>
                      {index + 1}
                    </span>
                    Data Karyawan
                  </h3>
                  {forms.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeForm(form.id)}
                      className="create-employee-remove-btn"
                    >
                      <TrashIcon /> Hapus Baris Ini
                    </button>
                  )}
                </div>

                {rowError && (
                  <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 500 }}>
                    {rowError}
                  </div>
                )}

                <div className="create-employee-grid">
                  
                  {/* Informasi Dasar */}
                  <div>
                    <label className="form-label">Nama Lengkap *</label>
                    <input type="text" className={`input-field ${getError(index, 'full_name') ? 'error-border' : ''}`} style={getError(index, 'full_name') ? { borderColor: '#ef4444' } : {}} required placeholder="John Doe" value={form.full_name} onChange={e => updateForm(form.id, 'full_name', e.target.value)} />
                    {getError(index, 'full_name') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'full_name')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Email Karyawan *</label>
                    <input type="email" className={`input-field ${getError(index, 'email') ? 'error-border' : ''}`} style={getError(index, 'email') ? { borderColor: '#ef4444' } : {}} required placeholder="john@company.com" value={form.email} onChange={e => updateForm(form.id, 'email', e.target.value)} />
                    {getError(index, 'email') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'email')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Nomor Telepon *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="input-field" style={{ width: '90px', borderColor: getError(index, 'phone') ? '#ef4444' : undefined }} value={form.country_code} onChange={e => updateForm(form.id, 'country_code', e.target.value)}>
                        <option value="+62">+62</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                      </select>
                      <input type="tel" className="input-field" required placeholder="8123456789" style={{ flex: 1, borderColor: getError(index, 'phone') ? '#ef4444' : undefined }} value={form.phone_number} onChange={e => updateForm(form.id, 'phone_number', e.target.value.replace(/\D/g, ''))} />
                    </div>
                    {getError(index, 'phone') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'phone')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Kata Sandi Akun *</label>
                    <input type="password" className="input-field" style={getError(index, 'password') ? { borderColor: '#ef4444' } : {}} required placeholder="Min. 8 karakter" minLength={8} value={form.password} onChange={e => updateForm(form.id, 'password', e.target.value)} />
                    {getError(index, 'password') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'password')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Jenis Kelamin</label>
                    <select className="input-field" value={form.gender} onChange={e => updateForm(form.id, 'gender', e.target.value)}>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  
                  {/* Organisasi & Peran */}
                  <div>
                    <label className="form-label">Role Akses *</label>
                    <select className="input-field" value={form.role} onChange={e => updateForm(form.id, 'role', e.target.value)}>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Departemen</label>
                    <select className="input-field" value={form.department_id} onChange={e => updateForm(form.id, 'department_id', e.target.value)}>
                      <option value="">-- Pilih Departemen --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Posisi / Jabatan</label>
                    <select className="input-field" value={form.position_id} onChange={e => updateForm(form.id, 'position_id', e.target.value)}>
                      <option value="">-- Pilih Jabatan --</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Manajer Atasan (Opsional)</label>
                    <select className="input-field" value={form.manager_id} onChange={e => updateForm(form.id, 'manager_id', e.target.value)}>
                      <option value="">-- Pilih Manajer --</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_number})</option>)}
                    </select>
                  </div>

                </div>
              </div>
            );
          })}
        </form>
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
