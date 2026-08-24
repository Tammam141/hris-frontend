import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { getEmployees, createEmployee } from '../api/employee';
import { Department, Position, EmployeeListItem } from '../types/employee';
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

  // array untuk form nya
  const [forms, setForms] = useState<EmployeeFormState[]>([createEmptyForm()]);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '' as React.ReactNode, type: 'success' as 'success' | 'error' });

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
    if (forms.length < 4) {
      setForms([...forms, createEmptyForm()]);
    }
  };

  const removeForm = (id: string) => {
    if (forms.length > 1) {
      setForms(forms.filter(f => f.id !== id));
    }
  };

  const updateForm = (id: string, field: keyof EmployeeFormState, value: string) => {
    setForms(forms.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi basic
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      if (!f.full_name || !f.email || !f.password || !f.phone_number) {
        setAlertInfo({ open: true, title: 'Validasi Gagal', message: `Harap lengkapi semua field wajib pada Karyawan #${i + 1}`, type: 'error' });
        return;
      }
      if (f.password.length < 8) {
        setAlertInfo({ open: true, title: 'Validasi Gagal', message: `Kata sandi Karyawan #${i + 1} minimal 8 karakter`, type: 'error' });
        return;
      }
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // ini untuk tembak create employee ke be
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      try {
        const payload = {
          full_name: f.full_name,
          email: f.email,
          password: f.password,
          phone: `${f.country_code}${f.phone_number}`,
          gender: f.gender,
          role: f.role,
          department_id: f.department_id || undefined,
          position_id: f.position_id || undefined,
          manager_id: f.manager_id || undefined,
        };
        await createEmployee(payload);
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`Karyawan #${i + 1} (${f.full_name}): ${err.message || 'Gagal menyimpan'}`);
      }
    }

    setIsSubmitting(false);

    if (failCount === 0) {
      setAlertInfo({ 
        open: true, 
        title: 'Berhasil', 
        message: `${successCount} Karyawan berhasil ditambahkan.`, 
        type: 'success' 
      });
      // Redirect back after a short delay
      setTimeout(() => navigate('/employee'), 1500);
    } else {
      setAlertInfo({
        open: true,
        title: 'Selesai dengan Catatan',
        message: (
          <div>
            <p>Berhasil: {successCount}, Gagal: {failCount}</p>
            <ul style={{ color: '#dc2626', marginTop: '8px', paddingLeft: '16px', fontSize: '13px' }}>
              {errors.map((e, idx) => <li key={idx}>{e}</li>)}
            </ul>
            <p style={{ marginTop: '8px', fontSize: '13px' }}>Anda bisa mengabaikan yang sudah berhasil dan memperbaiki data yang gagal, atau kembali.</p>
          </div>
        ),
        type: 'error'
      });
      
      // Hapus form yang berhasil saja agar sisanya bisa diperbaiki
      // (Untuk MVP kita biarkan saja formnya, user bisa kembali manual)
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row create-employee-header">
        <div>
          <button onClick={() => navigate('/employee')} className="create-employee-back-btn">
            ← Kembali ke Daftar Karyawan
          </button>
          <h1 className="dashboard-title">Tambah Karyawan Baru</h1>
          <p className="dashboard-subtitle">Anda dapat menambahkan hingga 4 karyawan sekaligus.</p>
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat referensi...</div>
      ) : (
        <form onSubmit={handleSubmit} className="create-employee-form-container">
          {forms.map((form, index) => (
            <div key={form.id} className="create-employee-card">
              <div className="create-employee-card-header">
                <h3 className="create-employee-card-title">
                  <span className="create-employee-card-badge">
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

              <div className="create-employee-grid">
                
                {/* Informasi Dasar */}
                <div>
                  <label className="form-label">Nama Lengkap *</label>
                  <input type="text" className="input-field" required placeholder="John Doe" value={form.full_name} onChange={e => updateForm(form.id, 'full_name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Email Karyawan *</label>
                  <input type="email" className="input-field" required placeholder="john@company.com" value={form.email} onChange={e => updateForm(form.id, 'email', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Nomor Telepon *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="input-field" style={{ width: '90px' }} value={form.country_code} onChange={e => updateForm(form.id, 'country_code', e.target.value)}>
                      <option value="+62">+62</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <input type="tel" className="input-field" required placeholder="8123456789" style={{ flex: 1 }} value={form.phone_number} onChange={e => updateForm(form.id, 'phone_number', e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Kata Sandi Akun *</label>
                  <input type="password" className="input-field" required placeholder="Min. 8 karakter" minLength={8} value={form.password} onChange={e => updateForm(form.id, 'password', e.target.value)} />
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
          ))}
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
