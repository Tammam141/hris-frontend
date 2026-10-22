import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { getEmployees, createEmployee } from '../api/employee';
import { Department, Position, EmployeeListItem, CreateEmployeePayload, positionLabel } from '../types/employee';
import { validateEmployeeDates } from '../utils/dateValidation';
import { validateFullName } from '../utils/nameValidation';
import { AlertModal } from '../components/ui/AlertModal';
import { TrashIcon } from '../components/icons/TrashIcon';
import { LineManagerField } from '../features/employee/LineManagerField';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import '../components/ui/create-employee.css';
import { PasswordRequirements } from '../components/ui/PasswordRequirements';
import { validatePassword, PASSWORD_MAX_LENGTH } from '../utils/passwordValidation';
import { 
  PHONE_ALREADY_REGISTERED_MSG, 
  isPhoneAlreadyRegisteredError,
  phoneRowErrorMessage,
  emailRowErrorMessage
} from '../utils/phoneValidation';

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
  birth_date: string;
  address: string;
  employment_status: 'probation' | 'contract' | 'permanent' | 'intern' | 'resigned';
  join_date: string;
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
  birth_date: '',
  address: '',
  employment_status: 'probation',
  join_date: '',
});

export function EmployeeCreatePage() {
  const navigate = useNavigate();

  // ini array untuk form nya
  const [forms, setForms] = useState<EmployeeFormState[]>(() => {
    const savedForms = localStorage.getItem('employeeFormsDraft');
    if (savedForms) {
      try {
        const parsed = JSON.parse(savedForms);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...createEmptyForm(),
            ...item,
            password: '', // Keamanan: password tidak pernah dimuat dari draft
          }));
        }
      } catch (e) {
        console.error("Gagal parse draft form dari localStorage", e);
      }
    }
    return [createEmptyForm()];
  });

  // Simpan ke local storage dengan debounce ~500 ms dan TANPA password
  useEffect(() => {
    const timer = setTimeout(() => {
      // Jika seluruh form kosong (misal baru direset atau awal mount), hapus draft
      const isEveryFormEmpty = forms.every(f => 
        !f.full_name?.trim() && 
        !f.email?.trim() && 
        !f.phone_number?.trim() && 
        !f.department_id && 
        !f.position_id && 
        !f.birth_date && 
        !f.join_date &&
        !f.address?.trim()
      );

      if (isEveryFormEmpty) {
        localStorage.removeItem('employeeFormsDraft');
      } else {
        const draft = forms.map(f => {
          const { password: _p, ...rest } = f;
          void _p;
          return rest;
        });
        localStorage.setItem('employeeFormsDraft', JSON.stringify(draft));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [forms]);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '' as React.ReactNode, type: 'success' as 'success' | 'error' | 'warning' });

  // State untuk menyimpan error dari backend. 
  // Format key field error: `${rowIndex}-${fieldName}`
  // Format key row error: `${rowIndex}-row`
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const initialFormsRef = useRef(forms);
  const hasLoadedManagersRef = React.useRef(false);
  const loadManagers = React.useCallback(async () => {
    if (hasLoadedManagersRef.current) return;
    hasLoadedManagersRef.current = true;
    try {
      const empRes = await getEmployees({ limit: 100, page: 1 });
      if (empRes.success && empRes.data) {
        let allEmployees = [...empRes.data];
        const totalPages = empRes.meta?.total_pages || 1;
        if (totalPages > 1) {
          const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
            getEmployees({ limit: 100, page: i + 2 })
          );
          const otherPagesRes = await Promise.allSettled(pagePromises);
          otherPagesRes.forEach((res) => {
            if (res.status === 'fulfilled' && res.value.data) {
              allEmployees = [...allEmployees, ...res.value.data];
            }
          });
        }
        setManagers(allEmployees);
      }
    } catch {
      // Abaikan jika error
    }
  }, []);

  // Muat referensi hanya sekali saat mount agar form tidak remount/kehilangan fokus saat mengetik
  useEffect(() => {
    async function loadReferences() {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          getDepartments(),
          getPositions(),
        ]);
        
        const depRes = results[0];
        const posRes = results[1];

        if (depRes.status === 'fulfilled' && depRes.value.success) {
          setDepartments(depRes.value.data);
        }
        if (posRes.status === 'fulfilled' && posRes.value.success) {
          setPositions(posRes.value.data);
        }

        // Pengecekan draft punya manager_id cukup sekali saat mount dari initialFormsRef
        if (initialFormsRef.current.some(f => Boolean(f.manager_id))) {
          loadManagers();
        }
      } catch (err: any) {
        setAlertInfo({ open: true, title: 'Error', message: (err as any)?.message || 'Gagal memuat referensi data', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Wajib []: jangan tambahkan forms agar tidak re-trigger tiap ketikan

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

  const handleDepartmentChange = (rowId: string, deptId: string) => {
    setForms(forms.map(f => {
      if (f.id !== rowId) return f;
      // Saat departemen berganti, posisi dan atasan harus direset
      return { ...f, department_id: deptId, position_id: '', manager_id: '' };
    }));
  };

  const handlePositionChange = (rowId: string, posId: string) => {
    setForms(forms.map(f => {
      if (f.id !== rowId) return f;
      return { ...f, position_id: posId, manager_id: '' };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({}); // Reset error sebelumnya
    
    let localErrors = 0;
    const newErrors: Record<string, string> = {};

    // Validasi basic frontend: pastikan semua field wajib terisi
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      let rowHasEmpty = false;

      if (!f.full_name?.trim()) {
        newErrors[`${i}-full_name`] = 'Nama lengkap wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      } else {
        const nameErr = validateFullName(f.full_name);
        if (nameErr) {
          newErrors[`${i}-full_name`] = nameErr;
          localErrors++;
        }
      }

      if (!f.email?.trim()) {
        newErrors[`${i}-email`] = 'Email karyawan wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.phone_number?.trim()) {
        newErrors[`${i}-phone`] = 'Nomor telepon wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.password) {
        newErrors[`${i}-password`] = 'Kata sandi akun wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      } else {
        const passwordErr = validatePassword(f.password);
        if (passwordErr) {
          newErrors[`${i}-password`] = passwordErr;
          localErrors++;
        }
      }

      if (!f.department_id) {
        newErrors[`${i}-department_id`] = 'Departemen wajib dipilih';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.position_id) {
        newErrors[`${i}-position_id`] = 'Posisi / jabatan wajib dipilih';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.join_date) {
        newErrors[`${i}-join_date`] = 'Tanggal bergabung wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.birth_date) {
        newErrors[`${i}-birth_date`] = 'Tanggal lahir wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      }

      if (!f.address?.trim()) {
        newErrors[`${i}-address`] = 'Alamat lengkap wajib diisi';
        localErrors++;
        rowHasEmpty = true;
      }

      if (rowHasEmpty) {
        newErrors[`${i}-row`] = 'Harap lengkapi semua field wajib';
      }

      // Cek email & nomor telepon duplikat di dalam satu form
      for (let j = i + 1; j < forms.length; j++) {
        if (forms[j].email && forms[j].email.toLowerCase().trim() === f.email.toLowerCase().trim()) {
          newErrors[`${j}-email`] = 'Email ini sudah dipakai di baris atasnya';
          localErrors++;
        }
        if (forms[j].phone_number && forms[j].phone_number.trim() === f.phone_number.trim()) {
          newErrors[`${j}-phone`] = 'Nomor telepon ini sudah dipakai di baris atasnya';
          localErrors++;
        }
      }

      // Validasi Tanggal jika keduanya terisi
      if (f.birth_date && f.join_date) {
        const dateErrors = validateEmployeeDates(f.birth_date, f.join_date);
        dateErrors.forEach(err => {
          newErrors[`${i}-${err.field}`] = err.message;
          localErrors++;
        });
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
        birth_date: f.birth_date || undefined,
        address: f.address || undefined,
        employment_status: f.employment_status as any,
        join_date: f.join_date || undefined,
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
              {dataArray.map((d: any, idx: number) => {
                const rowIndex = d.index !== undefined ? d.index : idx;
                return (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < dataArray.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>Baris {rowIndex + 1}</span> ➔ <strong>{d.employee.full_name}</strong> (NIK: {d.employee.employee_number})<br/>
                    Email: {d.account.email}
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>Catat/bagikan informasi ini. Karyawan akan diminta mengubah password saat login pertama kali.</p>
          </div>
        ), 
        type: 'success' 
      });

      // Redirect setelah sukses (bisa menunggu user tutup modal, tapi kita redirect setelah beberapa detik atau biarkan user melihat dulu).
      // Lebih baik form dikosongkan jika user mau nambah lagi, atau arahkan kembali.
      localStorage.removeItem('employeeFormsDraft');
      setForms([createEmptyForm()]);
      setValidationErrors({});
      
    } catch (err: any) {
      let errorParsed = false;
      const parsedErrors: Record<string, string> = {};

      if (err.code === 'VALIDATION_ERROR' && err.errors && Array.isArray(err.errors)) {
        // Objek tunggal: field = "email" dll
        err.errors.forEach((e: any) => {
          if (e.field) {
            // Karena ini single object, indexnya selalu 0
            let msg = e.message;
            if (e.field === 'phone') {
              msg = phoneRowErrorMessage(e.message);
            } else if (e.field === 'email') {
              msg = emailRowErrorMessage(e.message);
            }
            parsedErrors[`0-${e.field}`] = msg;
          }
        });
        errorParsed = true;
      } else if (err.code === 'BAD_REQUEST' && err.details?.failed_rows && Array.isArray(err.details.failed_rows)) {
        // Array payload:
        err.details.failed_rows.forEach((row: any) => {
          parsedErrors[`${row.index}-row`] = row.message;
          if (row.errors && Array.isArray(row.errors)) {
            row.errors.forEach((e: any) => {
              let msg = e.message;
              if (e.field === 'phone') {
                msg = phoneRowErrorMessage(e.message);
              } else if (e.field === 'email') {
                msg = emailRowErrorMessage(e.message);
              } else if (e.field === 'position_id') {
                msg = e.message || 'Kuota kursi jabatan ini sudah penuh';
              }
              parsedErrors[`${row.index}-${e.field}`] = msg;
            });
          }
        });
        errorParsed = true;
      } else if (err.code === 'CONFLICT' || err.status === 409) {
        // Objek tunggal conflict, arahkan ke field yang sesuai
        if (isPhoneAlreadyRegisteredError(err)) {
          parsedErrors['0-phone'] = PHONE_ALREADY_REGISTERED_MSG;
        } else if (err.details?.field === 'position_id' || err.message?.toLowerCase().includes('position') || err.message?.toLowerCase().includes('kuota') || err.message?.toLowerCase().includes('quota')) {
          parsedErrors['0-position_id'] = err.message || 'Kuota kursi jabatan ini sudah penuh';
        } else {
          parsedErrors['0-email'] = err.message || 'Email sudah terdaftar';
        }
        errorParsed = true;
      }

      if (errorParsed) {
        setValidationErrors(parsedErrors);
        
        let summaryMessage = err.message || 'Terdapat baris yang bermasalah. Tidak ada karyawan yang ditambahkan. Silakan perbaiki lalu coba lagi.';
        if (err.details && err.details.total !== undefined) {
          summaryMessage = `${err.details.invalid} baris perlu diperbaiki, belum ada yang ditambahkan (Total: ${err.details.total}).`;
        }

        setAlertInfo({
          open: true,
          title: 'Validasi Gagal',
          message: summaryMessage,
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

  const handleResetForm = () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan semua data pada form ini? Data yang belum tersimpan akan hilang.')) {
      localStorage.removeItem('employeeFormsDraft');
      setForms([createEmptyForm()]);
      setValidationErrors({});
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
          <p className="dashboard-subtitle">Anda dapat menambahkan banyak karyawan sekaligus.</p>
        </div>
        <div className="create-employee-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button 
            type="button" 
            className="btn" 
            onClick={handleResetForm}
            disabled={isSubmitting}
            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
          >
            Bersihkan Form
          </button>
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select className="input-field" style={{ width: '90px', borderColor: getError(index, 'phone') ? '#ef4444' : undefined }} value={form.country_code} onChange={e => updateForm(form.id, 'country_code', e.target.value)}>
                        <option value="+62">+62</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                      </select>
                      <input type="tel" className="input-field" required placeholder="8123456789" style={{ flex: 1, minWidth: 0, borderColor: getError(index, 'phone') ? '#ef4444' : undefined }} value={form.phone_number} onChange={e => updateForm(form.id, 'phone_number', e.target.value.replace(/\D/g, ''))} />
                    </div>
                    {getError(index, 'phone') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'phone')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Kata Sandi Akun *</label>
                    <input type="password" className="input-field" style={getError(index, 'password') ? { borderColor: '#ef4444' } : {}} required placeholder="Min. 8 karakter (huruf besar, kecil, angka & simbol)" minLength={8} maxLength={PASSWORD_MAX_LENGTH} value={form.password} onChange={e => updateForm(form.id, 'password', e.target.value)} />
                    <PasswordRequirements password={form.password} />
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
                    <label className="form-label">Departemen *</label>
                    <select 
                      className={`input-field ${getError(index, 'department_id') ? 'error-border' : ''}`}
                      style={getError(index, 'department_id') ? { borderColor: '#ef4444' } : {}}
                      required
                      value={form.department_id} 
                      onChange={e => handleDepartmentChange(form.id, e.target.value)}
                    >
                      <option value="">-- Pilih Departemen --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {getError(index, 'department_id') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'department_id')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Posisi / Jabatan *</label>
                    <select 
                      className={`input-field ${getError(index, 'position_id') ? 'error-border' : ''}`}
                      style={getError(index, 'position_id') ? { borderColor: '#ef4444' } : {}}
                      required
                      disabled={!form.department_id}
                      value={form.position_id} 
                      onChange={e => handlePositionChange(form.id, e.target.value)}
                    >
                      <option value="">{form.department_id ? '-- Pilih Posisi --' : 'Pilih departemen terlebih dahulu'}</option>
                      {(form.department_id ? positions.filter(p => p.department_id === form.department_id) : []).map(p => {
                        let label = positionLabel(p);
                        if (p.max_holders !== null && p.max_holders !== undefined) {
                          if (p.current_holders !== undefined) {
                            const rem = Math.max(0, p.max_holders - p.current_holders);
                            label += ` (kuota: ${p.max_holders}, sisa: ${rem})`;
                          } else {
                            label += ` (kuota: ${p.max_holders})`;
                          }
                        }
                        return <option key={p.id} value={p.id}>{label}</option>;
                      })}
                    </select>
                    {getError(index, 'position_id') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'position_id')}</span>}
                  </div>
                  <LineManagerField
                    positionId={form.position_id}
                    managerId={form.manager_id}
                    onManagerChange={v => updateForm(form.id, 'manager_id', v)}
                    managers={managers}
                    onLoadManagers={loadManagers}
                  />
                  <div>
                    <label className="form-label">Status Kepegawaian</label>
                    <select className="input-field" value={form.employment_status} onChange={e => updateForm(form.id, 'employment_status', e.target.value as any)}>
                      <option value="probation">Probation</option>
                      <option value="contract">Contract</option>
                      <option value="permanent">Permanent</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tanggal Bergabung *</label>
                    <input type="date" required className={`input-field ${getError(index, 'join_date') ? 'error-border' : ''}`} style={getError(index, 'join_date') ? { borderColor: '#ef4444' } : {}} value={form.join_date} onChange={e => updateForm(form.id, 'join_date', e.target.value)} />
                    {getError(index, 'join_date') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'join_date')}</span>}
                  </div>
                  <div>
                    <label className="form-label">Tanggal Lahir *</label>
                    <input type="date" required className={`input-field ${getError(index, 'birth_date') ? 'error-border' : ''}`} style={getError(index, 'birth_date') ? { borderColor: '#ef4444' } : {}} value={form.birth_date} onChange={e => updateForm(form.id, 'birth_date', e.target.value)} />
                    {getError(index, 'birth_date') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'birth_date')}</span>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Alamat Lengkap *</label>
                    <textarea className="input-field" rows={2} required style={getError(index, 'address') ? { borderColor: '#ef4444' } : {}} value={form.address} onChange={e => updateForm(form.id, 'address', e.target.value)} />
                    {getError(index, 'address') && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{getError(index, 'address')}</span>}
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
