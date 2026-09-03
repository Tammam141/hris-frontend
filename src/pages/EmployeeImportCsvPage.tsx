import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { getEmployees, createEmployee } from '../api/employee';
import { Department, Position, EmployeeListItem, CreateEmployeePayload } from '../types/employee';
import { validateEmployeeDates } from '../utils/dateValidation';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

interface CsvRow {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  role: string;
  birth_date: string;
  address: string;
  join_date: string;
  employment_status: string;
  // Kolom original dari file CSV
  department: string;
  position: string;
  manager: string;
  
  // UUID hasil pencarian
  department_id?: string;
  position_id?: string;
  manager_id?: string;
}

export function EmployeeImportCsvPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Reference data
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [positionList, setPositionList] = useState<Position[]>([]);
  const [managerList, setManagerList] = useState<EmployeeListItem[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Menyimpan error spesifik: format key `${rowIndex}-${fieldName}`
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '' as React.ReactNode, type: 'success' as 'success' | 'error' });

  // Ambil daftar referensi saat komponen dimuat
  useEffect(() => {
    async function loadReferences() {
      setIsLoadingRefs(true);
      try {
        const [depRes, posRes, empRes] = await Promise.all([
          getDepartments(),
          getPositions(),
          getEmployees({ limit: 100 }) 
        ]);
        if (depRes.success) setDepartmentList(depRes.data);
        if (posRes.success) setPositionList(posRes.data);
        if (empRes.success) setManagerList(empRes.data);
      } catch (err: any) {
        console.error('Gagal memuat referensi data:', err);
      } finally {
        setIsLoadingRefs(false);
      }
    }
    loadReferences();
  }, []);

  const handleDownloadTemplate = () => {
    const headers = "full_name,email,phone,password,gender,role,birth_date,address,join_date,employment_status,department,position,manager";
    const rows = [
      "John Doe,john@company.com,+628123456789,12345678,male,employee,1995-03-15,Jl. Merdeka No. 10 Jakarta,2022-01-10,permanent,Engineering,Frontend Developer,",
      "Jane Smith,jane@company.com,+628123456790,12345678,female,employee,1998-07-22,Jl. Sudirman No. 5 Bandung,2023-05-15,contract,Marketing,Marketing Staff,",
      "Ahmad Fauzi,ahmad@company.com,+628123456791,12345678,male,employee,1990-01-10,Jl. Gatot Subroto No. 8 Surabaya,2020-03-01,permanent,HRD,HR Manager,",
      "Siti Nurhaliza,siti@company.com,+628123456792,12345678,female,employee,1997-11-30,Jl. Diponegoro No. 3 Yogyakarta,2023-08-01,probation,Finance,Accountant,Ahmad Fauzi",
      "Rudi Hartono,rudi@company.com,+628123456793,12345678,male,employee,1993-05-18,Jl. Ahmad Yani No. 12 Semarang,2021-11-12,permanent,Engineering,Backend Developer,John Doe"
    ];
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_karyawan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParsedRows([]); 
      setIsReviewing(false); 
      setValidationErrors({});
    }
  };

  const handleParseCSV = () => {
    if (!file) return;

    // 1. Buat index pencarian untuk resolusi UUID
    const deptLookup = new Map<string, string[]>();
    departmentList.forEach(d => {
      const key = d.name.toLowerCase().trim();
      if (!deptLookup.has(key)) deptLookup.set(key, []);
      deptLookup.get(key)!.push(d.id);
      
      if (d.code) {
         const codeKey = d.code.toLowerCase().trim();
         if (!deptLookup.has(codeKey)) deptLookup.set(codeKey, []);
         deptLookup.get(codeKey)!.push(d.id);
      }
    });
    
    const positionLookup = new Map<string, string[]>();
    positionList.forEach(p => {
      const key = p.name.toLowerCase().trim();
      if (!positionLookup.has(key)) positionLookup.set(key, []);
      positionLookup.get(key)!.push(p.id);
      
      if (p.code) {
         const codeKey = p.code.toLowerCase().trim();
         if (!positionLookup.has(codeKey)) positionLookup.set(codeKey, []);
         positionLookup.get(codeKey)!.push(p.id);
      }
    });
    
    const managerLookup = new Map<string, string[]>();
    managerList.forEach(m => {
      const key = m.full_name.toLowerCase().trim();
      if (!managerLookup.has(key)) managerLookup.set(key, []);
      managerLookup.get(key)!.push(m.id);
      
      if (m.employee_number) {
         const numKey = m.employee_number.toLowerCase().trim();
         if (!managerLookup.has(numKey)) managerLookup.set(numKey, []);
         managerLookup.get(numKey)!.push(m.id);
      }
    });

    // 2. Baca dan parse isi CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        alert('File CSV kosong atau tidak memiliki data selain header.');
        return;
      }
      
      if (lines.length - 1 > 500) {
        alert('Maksimal 500 karyawan dalam satu permintaan. Silakan pecah file CSV Anda.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows: CsvRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());// Memotong teks berdasarkan koma
        if (values.length >= headers.length) {
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          // 3. Cocokkan teks CSV dengan data referensi (UUID)
          const deptKey = row.department?.toLowerCase().trim();
          const positionKey = row.position?.toLowerCase().trim();
          const managerKey = row.manager?.toLowerCase().trim();

          const deptIds = deptKey ? (deptLookup.get(deptKey) || []) : [];
          const positionIds = positionKey ? (positionLookup.get(positionKey) || []) : [];
          const managerIds = managerKey ? (managerLookup.get(managerKey) || []) : [];

          // 4. Ambil ID pertama jika pencarian berhasil (meskipun ada duplikat/ambigu di database)
          row.department_id = deptIds.length > 0 ? deptIds[0] : '';
          row.position_id = positionIds.length > 0 ? positionIds[0] : '';
          row.manager_id = managerIds.length > 0 ? managerIds[0] : '';

          rows.push(row as CsvRow);
        }
      }

      if (rows.length === 0) {
        alert('Tidak ditemukan data karyawan yang valid di dalam file CSV.');
        return;
      }

      setParsedRows(rows);
      setIsReviewing(true);
    };
    reader.readAsText(file);
  };

  const handleResetUpload = () => {
    setFile(null);
    setParsedRows([]);
    setIsReviewing(false);
    setValidationErrors({});
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const updateRowField = (index: number, field: keyof CsvRow, value: string) => {
    const newData = [...parsedRows];
    newData[index] = { ...newData[index], [field]: value };
    setParsedRows(newData);
  };

  const handleSubmitToBackend = async () => {
    // 1. Validasi: Cegah submit jika ada UUID yang belum terselesaikan
    let hasUnresolvedFields = false;
    let missingPositionCount = 0;
    const newErrors: Record<string, string> = {};
    let localErrors = 0;

    parsedRows.forEach((row, idx) => {
      if (row.department && !row.department_id) hasUnresolvedFields = true;
      if (row.position && !row.position_id) hasUnresolvedFields = true;
      if (row.manager && !row.manager_id) hasUnresolvedFields = true;
      
      if (!row.position_id) missingPositionCount++;

      // Validasi Tanggal
      const dateErrors = validateEmployeeDates(row.birth_date, row.join_date);
      dateErrors.forEach(err => {
        newErrors[`${idx}-${err.field}`] = err.message;
        localErrors++;
      });
    });

    if (hasUnresolvedFields) {
      setAlertInfo({
        open: true,
        title: 'Resolusi Data Gagal',
        message: 'Ada beberapa baris dengan nama Departemen, Jabatan, atau Manajer yang tidak ditemukan (atau ambigu). Silakan pilih secara manual dari dropdown di tabel.',
        type: 'error'
      });
      return;
    }

    if (localErrors > 0) {
      setValidationErrors(newErrors);
      setAlertInfo({
        open: true,
        title: 'Validasi Tanggal Gagal',
        message: 'Terdapat kesalahan pada tanggal lahir atau tanggal bergabung. Silakan perbaiki baris yang ditandai merah.',
        type: 'error'
      });
      return;
    }

    if (missingPositionCount > 0) {
      const confirmProceed = window.confirm(`${missingPositionCount} baris belum punya jabatan, mereka tidak akan melihat menu apa pun sampai jabatannya diisi. Tetap lanjutkan?`);
      if (!confirmProceed) return;
    }

    setValidationErrors({});
    setIsSubmitting(true);
    
    // 2. Siapkan payload array
    const payloadArray: CreateEmployeePayload[] = parsedRows.map(row => ({
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      password: row.password,
      gender: row.gender as any,
      role: row.role as any || 'employee',
      birth_date: row.birth_date || undefined,
      address: row.address || undefined,
      join_date: row.join_date || undefined,
      employment_status: row.employment_status as any,
      department_id: row.department_id || undefined,
      position_id: row.position_id || undefined,
      manager_id: row.manager_id || undefined
    }));

    // Ubah Array menjadi Object dengan key index
    const payloadObject = Object.assign({}, payloadArray);

    try {
      // 3. Kirim object ber-index ke API backend
      const res = await createEmployee(payloadObject);
      
      // Pastikan res.data diubah jadi array untuk mapping
      const dataArray = Array.isArray(res.data) ? res.data : Object.values(res.data || {});
      
      setAlertInfo({
        open: true,
        title: 'Berhasil',
        message: (
          <div>
            <p style={{ marginBottom: '12px' }}>{res.message || `${payloadArray.length} karyawan berhasil ditambahkan.`}</p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              {dataArray.map((d: any, idx: number) => {
                const rowIndex = d.index !== undefined ? d.index : idx;
                return (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < dataArray.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>Baris {rowIndex + 1}</span> ➔ <strong>{d.employee?.full_name || '-'}</strong> (NIK: {d.employee?.employee_number || '-'})<br/>
                    Email: {d.account?.email || '-'}
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>Karyawan dapat login menggunakan password default yang Anda tentukan.</p>
          </div>
        ),
        type: 'success'
      });
      
      setTimeout(() => {
        navigate('/employee');
      }, 2000);
      
    } catch (err: any) {
      let errorParsed = false;
      const parsedErrors: Record<string, string> = {};

      // 4. Parsing pesan error validasi per baris
      if (err.code === 'BAD_REQUEST' && err.details?.failed_rows && Array.isArray(err.details.failed_rows)) {
        err.details.failed_rows.forEach((row: any) => {
          parsedErrors[`${row.index}-row`] = row.message;
          if (row.errors && Array.isArray(row.errors)) {
            row.errors.forEach((e: any) => {
              parsedErrors[`${row.index}-${e.field}`] = e.message;
            });
          }
        });
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

  const genderLabel = (g: string) => {
    if (g === 'male') return 'Laki-laki';
    if (g === 'female') return 'Perempuan';
    return g;
  };

  const getError = (index: number, field: string) => validationErrors[`${index}-${field}`];
  const getRowError = (index: number) => validationErrors[`${index}-row`];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row create-employee-header">
        <div>
          <button onClick={() => navigate('/employee')} className="create-employee-back-btn" disabled={isSubmitting}>
            ← Kembali ke Daftar Karyawan
          </button>
          <h1 className="dashboard-title">Upload Karyawan via CSV</h1>
          <p className="dashboard-subtitle">Tambahkan data banyak karyawan sekaligus menggunakan file CSV.</p>
        </div>
      </div>

      <div className="csv-template-bar">
        <div className="csv-template-info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, color: '#3b82f6' }}>
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Template CSV</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>Download template, isi data karyawan, lalu upload kembali di bawah.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary csv-download-btn" onClick={handleDownloadTemplate} disabled={isSubmitting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download Template
        </button>
      </div>

      <div className="csv-main-content">
        <div className="dashboard-card csv-upload-area">
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            {isReviewing ? 'Review Data Karyawan' : 'Upload File CSV'}
          </h2>

          {!isReviewing && (
            <>
              <div className="csv-dropzone">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#94a3b8', marginBottom: '12px' }}>
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ color: '#475569', marginBottom: '4px', fontWeight: 500 }}>Pilih file CSV untuk di-upload</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>Format yang didukung: .csv</p>
                <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} id="csv-upload" />
                <label htmlFor="csv-upload" className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', margin: 0 }}>
                  Telusuri File
                </label>
                {file && (
                  <div style={{ marginTop: '16px', padding: '10px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontWeight: 500, fontSize: '14px' }}>
                    File terpilih: <strong>{file.name}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => navigate('/employee')}>Batal</button>
                <button className="btn btn-primary" onClick={handleParseCSV} disabled={!file || isLoadingRefs}>
                  {isLoadingRefs ? 'Memuat data...' : 'Upload & Review'}
                </button>
              </div>
            </>
          )}

          {isReviewing && parsedRows.length > 0 && (
            <>
              {Object.keys(validationErrors).length > 0 ? (
                <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#b91c1c', fontWeight: 500 }}>
                  Terdapat kesalahan validasi. Silakan periksa kotak merah di bawah.
                </div>
              ) : (
                <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#1e40af' }}>
                  Ditemukan <strong>{parsedRows.length}</strong> baris data karyawan. Pastikan data (terutama Dropdown pilihan) sudah benar sebelum mengirim.
                </div>
              )}

              <div className="csv-review-table-wrapper" style={{ maxHeight: '600px' }}>
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th className="csv-sticky-header">No</th>
                      <th className="csv-sticky-header">Nama Lengkap</th>
                      <th className="csv-sticky-header">Email</th>
                      <th className="csv-sticky-header">Telepon</th>
                      <th className="csv-sticky-header">Password</th>
                      <th className="csv-sticky-header">Gender</th>
                      <th className="csv-sticky-header">Role</th>
                      <th className="csv-sticky-header">Tanggal Lahir</th>
                      <th className="csv-sticky-header">Tgl Gabung</th>
                      <th className="csv-sticky-header">Status</th>
                      <th className="csv-sticky-header">Departemen</th>
                      <th className="csv-sticky-header">Posisi</th>
                      <th className="csv-sticky-header">Manajer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => {
                      const rowErrorMsg = getRowError(idx);
                      const isRowError = !!rowErrorMsg || Object.keys(validationErrors).some(k => k.startsWith(`${idx}-`));

                      return (
                        <tr key={idx} style={{ backgroundColor: isRowError ? '#fef2f2' : undefined }}>
                          <td style={{ fontWeight: 600, color: isRowError ? '#b91c1c' : '#64748b' }}>
                            {idx + 1}
                            {rowErrorMsg && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', maxWidth: '100px' }}>{rowErrorMsg}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: getError(idx, 'full_name') ? '#ef4444' : undefined }}>{row.full_name}</div>
                            {getError(idx, 'full_name') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'full_name')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'email') ? '#ef4444' : undefined }}>{row.email}</div>
                            {getError(idx, 'email') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'email')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'phone') ? '#ef4444' : undefined }}>{row.phone}</div>
                            {getError(idx, 'phone') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'phone')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'password') ? '#ef4444' : '#94a3b8' }}>{'•'.repeat(8)}</div>
                            {getError(idx, 'password') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'password')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'gender') ? '#ef4444' : undefined }}>{genderLabel(row.gender)}</div>
                            {getError(idx, 'gender') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'gender')}</div>}
                          </td>
                          <td>
                            <span style={{ 
                              padding: '2px 10px', 
                              borderRadius: '999px', 
                              fontSize: '12px', 
                              fontWeight: 600,
                              backgroundColor: getError(idx, 'role') ? '#fef2f2' : row.role === 'admin' ? '#fef3c7' : '#dcfce7',
                              color: getError(idx, 'role') ? '#ef4444' : row.role === 'admin' ? '#92400e' : '#166534',
                              textTransform: 'capitalize',
                              border: getError(idx, 'role') ? '1px solid #ef4444' : 'none'
                            }}>
                              {row.role || 'employee'}
                            </span>
                            {getError(idx, 'role') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'role')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'birth_date') ? '#ef4444' : undefined }}>{row.birth_date || '-'}</div>
                            {getError(idx, 'birth_date') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', maxWidth: '120px' }}>{getError(idx, 'birth_date')}</div>}
                          </td>
                          <td>
                            <div style={{ color: getError(idx, 'join_date') ? '#ef4444' : undefined }}>{row.join_date || '-'}</div>
                            {getError(idx, 'join_date') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', maxWidth: '120px' }}>{getError(idx, 'join_date')}</div>}
                          </td>
                          <td>
                            <select 
                              value={row.employment_status || 'probation'} 
                              onChange={(e) => updateRowField(idx, 'employment_status', e.target.value)}
                              className="input-field"
                              style={{ width: '120px', padding: '6px', fontSize: '13px' }}
                            >
                              <option value="probation">Probation</option>
                              <option value="contract">Contract</option>
                              <option value="permanent">Permanent</option>
                              <option value="intern">Intern</option>
                            </select>
                          </td>
                          <td>
                            <select 
                              value={row.department_id || ''} 
                              onChange={(e) => updateRowField(idx, 'department_id', e.target.value)}
                              className={`input-field ${((row.department && !row.department_id) || getError(idx, 'department_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'department_id') || (row.department && !row.department_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.department ? `Pilih (${row.department})` : '-- Kosong --'}</option>
                              {departmentList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {getError(idx, 'department_id') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'department_id')}</div>}
                            {(row.department && !row.department_id && !getError(idx, 'department_id')) && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>Departemen tidak ditemukan</div>}
                          </td>
                          <td>
                            <select 
                              value={row.position_id || ''} 
                              onChange={(e) => updateRowField(idx, 'position_id', e.target.value)}
                              className={`input-field ${((row.position && !row.position_id) || getError(idx, 'position_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'position_id') || (row.position && !row.position_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.position ? `Pilih (${row.position})` : '-- Kosong --'}</option>
                              {positionList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {getError(idx, 'position_id') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'position_id')}</div>}
                            {(row.position && !row.position_id && !getError(idx, 'position_id')) && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>Jabatan tidak ditemukan</div>}
                          </td>
                          <td>
                            <select 
                              value={row.manager_id || ''} 
                              onChange={(e) => updateRowField(idx, 'manager_id', e.target.value)}
                              className={`input-field ${((row.manager && !row.manager_id) || getError(idx, 'manager_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'manager_id') || (row.manager && !row.manager_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.manager ? `Pilih (${row.manager})` : '-- Kosong --'}</option>
                              {managerList.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_number})</option>)}
                            </select>
                            {getError(idx, 'manager_id') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'manager_id')}</div>}
                            {(row.manager && !row.manager_id && !getError(idx, 'manager_id')) && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>Manajer tidak ditemukan</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={handleResetUpload} disabled={isSubmitting}>
                  Upload Ulang
                </button>
                <button className="btn btn-primary btn-success" onClick={handleSubmitToBackend} disabled={isSubmitting}>
                  {isSubmitting ? 'Memproses...' : `Kirim ${parsedRows.length} Karyawan`}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="dashboard-card csv-guide-panel">
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>Panduan</h2>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
            <strong>Format Kolom CSV:</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>full_name</strong> — Nama lengkap <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>email</strong> — Email karyawan <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>phone</strong> — No. telepon <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>password</strong> — Min. 8 karakter <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>gender</strong> — male / female <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>role</strong> — employee / admin <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>birth_date</strong> — Format YYYY-MM-DD</li>
              <li><strong>address</strong> — Alamat lengkap</li>
              <li><strong>join_date</strong> — Format YYYY-MM-DD</li>
              <li><strong>employment_status</strong> — probation / contract / permanent / intern</li>
              <li><strong>department</strong> — Nama/Kode departemen</li>
              <li><strong>position</strong> — Nama/Kode jabatan</li>
              <li><strong>manager</strong> — Nama/NIK manajer</li>
            </ul>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}><span style={{ color: '#dc2626' }}>*</span> = wajib diisi</p>
          </div>

          <div style={{ backgroundColor: '#fefce8', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#854d0e', marginTop: '12px', lineHeight: '1.6' }}>
            <strong>Perhatian:</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Gunakan pemisah <strong>koma (,)</strong></li>
              <li>Jangan ada koma di dalam isi data</li>
              <li>Baris pertama harus berisi header kolom</li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#166534', marginTop: '12px', lineHeight: '1.6' }}>
            <strong>Tips:</strong>
            <p style={{ marginTop: '4px' }}>Download template di atas, buka dengan Excel/Spreadsheet, isi data lalu simpan sebagai CSV.</p>
          </div>
        </div>
      </div>
      
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
