import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { getEmployees, createEmployee } from '../api/employee';
import { Department, Position, EmployeeListItem, CreateEmployeePayload } from '../types/employee';
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
  // Kolom original dari file CSV
  department: string;
  position: string;
  manager: string;
  
  // Kolom hasil konversi (Resolved IDs) yang akan dikirim ke Backend (UUID)
  department_id?: string;
  position_id?: string;
  manager_id?: string;
}

export function EmployeeImportCsvPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dataReview, setDataReview] = useState<CsvRow[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Reference data
  const [daftarDepartemen, setDaftarDepartemen] = useState<Department[]>([]);
  const [daftarJabatan, setDaftarJabatan] = useState<Position[]>([]);
  const [daftarManajer, setDaftarManajer] = useState<EmployeeListItem[]>([]);
  const [sedangMemuatReferensi, setSedangMemuatReferensi] = useState(false);
  const [sedangMengirim, setSedangMengirim] = useState(false);

  // State Errors
  // errorValidasi menyimpan error spesifik untuk menyorot kotak merah di tabel. 
  // Format key: `${indeksBaris}-${namaKolom}`
  const [errorValidasi, setErrorValidasi] = useState<Record<string, string>>({});
  const [infoAlert, setInfoAlert] = useState({ open: false, title: '', message: '' as React.ReactNode, type: 'success' as 'success' | 'error' });

  // Efek ini dijalankan sekali saat halaman pertama kali dibuka
  // Mengambil daftar referensi: Departemen, Jabatan, dan daftar Manajer (Karyawan) dari Backend
  useEffect(() => {
    async function muatReferensi() {
      setSedangMemuatReferensi(true);
      try {
        const [depRes, posRes, empRes] = await Promise.all([
          getDepartments(),
          getPositions(),
          getEmployees({ limit: 100 }) // Batasi 100, disesuaikan kebutuhan daftar manajer
        ]);
        if (depRes.success) setDaftarDepartemen(depRes.data);
        if (posRes.success) setDaftarJabatan(posRes.data);
        if (empRes.success) setDaftarManajer(empRes.data);
      } catch (err: any) {
        console.error('Gagal memuat referensi data:', err);
      } finally {
        setSedangMemuatReferensi(false);
      }
    }
    muatReferensi();
  }, []);

  const unduhTemplateCSV = () => {
    const headers = "full_name,email,phone,password,gender,role,birth_date,address,department,position,manager";
    const rows = [
      "John Doe,john@company.com,+628123456789,12345678,male,employee,1995-03-15,Jl. Merdeka No. 10 Jakarta,Engineering,Frontend Developer,",
      "Jane Smith,jane@company.com,+628123456790,12345678,female,employee,1998-07-22,Jl. Sudirman No. 5 Bandung,Marketing,Marketing Staff,",
      "Ahmad Fauzi,ahmad@company.com,+628123456791,12345678,male,employee,1990-01-10,Jl. Gatot Subroto No. 8 Surabaya,HRD,HR Manager,",
      "Siti Nurhaliza,siti@company.com,+628123456792,12345678,female,employee,1997-11-30,Jl. Diponegoro No. 3 Yogyakarta,Finance,Accountant,Ahmad Fauzi",
      "Rudi Hartono,rudi@company.com,+628123456793,12345678,male,employee,1993-05-18,Jl. Ahmad Yani No. 12 Semarang,Engineering,Backend Developer,John Doe"
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

  // Fungsi untuk menangani saat user memilih file di input
  const pilihFileCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setDataReview([]); // Reset data hasil review
      setIsReviewing(false); // Kembalikan ke mode upload
      setErrorValidasi({}); // Bersihkan error sebelumnya
    }
  };

  // Fungsi utama untuk membaca isi file CSV dan melakukan pencocokan Nama ke UUID (UUID Resolution)
  const prosesFileDanReview = () => {
    if (!file) return;

    // 1. Buat Peta Pencocokan (Lookup Maps)
    // Tujuannya: Agar saat mencocokkan string dari CSV ke database menjadi sangat cepat tanpa harus melooping array terus menerus.
    // Map ini menyimpan struktur: "kata kunci (huruf kecil)" -> [Daftar UUID yang cocok]
    
    // Map untuk Departemen (berdasarkan Nama dan Kode)
    const petaDepartemen = new Map<string, string[]>();
    daftarDepartemen.forEach(d => {
      const key = d.name.toLowerCase().trim();
      if (!petaDepartemen.has(key)) petaDepartemen.set(key, []);
      petaDepartemen.get(key)!.push(d.id);
      
      if (d.code) {
         const codeKey = d.code.toLowerCase().trim();
         if (!petaDepartemen.has(codeKey)) petaDepartemen.set(codeKey, []);
         petaDepartemen.get(codeKey)!.push(d.id);
      }
    });
    
    // Map untuk Jabatan / Posisi (berdasarkan Nama dan Kode)
    const petaJabatan = new Map<string, string[]>();
    daftarJabatan.forEach(p => {
      const key = p.name.toLowerCase().trim();
      if (!petaJabatan.has(key)) petaJabatan.set(key, []);
      petaJabatan.get(key)!.push(p.id);
      
      if (p.code) {
         const codeKey = p.code.toLowerCase().trim();
         if (!petaJabatan.has(codeKey)) petaJabatan.set(codeKey, []);
         petaJabatan.get(codeKey)!.push(p.id);
      }
    });
    
    // Map untuk Manajer (berdasarkan Nama Lengkap dan NIK/Employee Number)
    const petaManajer = new Map<string, string[]>();
    daftarManajer.forEach(m => {
      const key = m.full_name.toLowerCase().trim();
      if (!petaManajer.has(key)) petaManajer.set(key, []);
      petaManajer.get(key)!.push(m.id);
      
      if (m.employee_number) {
         const numKey = m.employee_number.toLowerCase().trim();
         if (!petaManajer.has(numKey)) petaManajer.set(numKey, []);
         petaManajer.get(numKey)!.push(m.id);
      }
    });

    // 2. Baca isi file menggunakan FileReader browser
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        alert('File CSV kosong atau tidak memiliki data selain header.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows: CsvRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Pemisahan kolom CSV sederhana dengan koma (belum menangani koma di dalam tanda kutip string)
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= headers.length) {
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          // 3. Resolusi ID berdasarkan teks dari CSV
          // Cocokkan teks yang diketik di CSV dengan daftar referensi yang sudah dimuat
          const kunciDept = row.department?.toLowerCase().trim();
          const kunciPosisi = row.position?.toLowerCase().trim();
          const kunciManajer = row.manager?.toLowerCase().trim();

          const daftarIdDept = kunciDept ? (petaDepartemen.get(kunciDept) || []) : [];
          const daftarIdPosisi = kunciPosisi ? (petaJabatan.get(kunciPosisi) || []) : [];
          const daftarIdManajer = kunciManajer ? (petaManajer.get(kunciManajer) || []) : [];

          // Hanya isikan ID otomatis jika pencarian menghasilkan tepat SATU hasil.
          // Jika hasilnya 0 (tidak ketemu) atau > 1 (ambigu / nama kembar), biarkan kosong
          // agar Admin bisa memilih secara manual di tabel Review.
          row.department_id = daftarIdDept.length === 1 ? daftarIdDept[0] : '';
          row.position_id = daftarIdPosisi.length === 1 ? daftarIdPosisi[0] : '';
          row.manager_id = daftarIdManajer.length === 1 ? daftarIdManajer[0] : '';

          rows.push(row as CsvRow);
        }
      }

      if (rows.length === 0) {
        alert('Tidak ditemukan data karyawan yang valid di dalam file CSV.');
        return;
      }

      setDataReview(rows);
      setIsReviewing(true);
    };
    reader.readAsText(file);
  };

  const uploadUlang = () => {
    setFile(null);
    setDataReview([]);
    setIsReviewing(false);
    setErrorValidasi({});
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const perbaruiDataReview = (index: number, field: keyof CsvRow, value: string) => {
    const newData = [...dataReview];
    newData[index] = { ...newData[index], [field]: value };
    setDataReview(newData);
  };

  const kirimDataKeBackend = async () => {
    // 1. Validasi Pra-Pengiriman (Pre-submission Validation)
    // Cegah user mengirim form jika ada teks (departemen/posisi/manajer) yang diketik di CSV 
    // tetapi belum berhasil diubah menjadi ID/UUID yang sah (karena salah ketik atau ambigu).
    let adaDataBelumTuntas = false;
    dataReview.forEach(row => {
      if (row.department && !row.department_id) adaDataBelumTuntas = true;
      if (row.position && !row.position_id) adaDataBelumTuntas = true;
      if (row.manager && !row.manager_id) adaDataBelumTuntas = true;
    });

    if (adaDataBelumTuntas) {
      setInfoAlert({
        open: true,
        title: 'Resolusi Data Gagal',
        message: 'Ada beberapa baris dengan nama Departemen, Jabatan, atau Manajer yang tidak ditemukan (atau ambigu). Silakan pilih secara manual dari dropdown di tabel.',
        type: 'error'
      });
      return;
    }

    setErrorValidasi({});
    setSedangMengirim(true);
    // 2. Siapkan array Payload (Hanya field yang valid)
    const payload: CreateEmployeePayload[] = dataReview.map(row => ({
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      password: row.password,
      gender: row.gender as any,
      role: row.role as any || 'employee',
      birth_date: row.birth_date || undefined,
      address: row.address || undefined,
      // Field konversi (Bukan teks asli yang dikirim melainkan ID-nya)
      department_id: row.department_id || undefined,
      position_id: row.position_id || undefined,
      manager_id: row.manager_id || undefined
    }));

    try {
      // 3. Eksekusi permintaan ke Backend
      const res = await createEmployee(payload);
      
      setInfoAlert({
        open: true,
        title: 'Berhasil',
        message: res.message || `${payload.length} karyawan berhasil ditambahkan.`,
        type: 'success'
      });
      
      setTimeout(() => {
        navigate('/employee');
      }, 2000);
      
    } catch (err: any) {
      let errorParsed = false;
      const parsedErrors: Record<string, string> = {};

      // 4. Penanganan Error
      // Jika Backend menolak karena kesalahan pada array karyawan (BAD_REQUEST & failed_rows)
      if (err.code === 'BAD_REQUEST' && err.details?.failed_rows && Array.isArray(err.details.failed_rows)) {
        err.details.failed_rows.forEach((row: any) => {
          // Menyimpan pesan kesalahan khusus untuk baris ini
          parsedErrors[`${row.index}-row`] = row.message;
          // Memetakan pesan kesalahan ke setiap kolom (field) spesifik di baris tersebut
          if (row.errors && Array.isArray(row.errors)) {
            row.errors.forEach((e: any) => {
              parsedErrors[`${row.index}-${e.field}`] = e.message;
            });
          }
        });
        errorParsed = true;
      }

      if (errorParsed) {
        setErrorValidasi(parsedErrors);
        
        // Membaca informasi ringkasan (Total valid vs invalid) dari backend untuk ditampilkan di header
        let summaryMessage = err.message || 'Terdapat baris yang bermasalah. Tidak ada karyawan yang ditambahkan. Silakan perbaiki lalu coba lagi.';
        if (err.details && err.details.total !== undefined) {
          summaryMessage = `${err.details.invalid} baris perlu diperbaiki, belum ada yang ditambahkan (Total: ${err.details.total}).`;
        }

        setInfoAlert({
          open: true,
          title: 'Validasi Gagal',
          message: summaryMessage,
          type: 'error'
        });
      } else {
        setInfoAlert({
          open: true,
          title: 'Error',
          message: err.message || 'Terjadi kesalahan saat memproses data',
          type: 'error'
        });
      }
    } finally {
      setSedangMengirim(false);
    }
  };

  const genderLabel = (g: string) => {
    if (g === 'male') return 'Laki-laki';
    if (g === 'female') return 'Perempuan';
    return g;
  };

  const getError = (index: number, field: string) => errorValidasi[`${index}-${field}`];
  const getRowError = (index: number) => errorValidasi[`${index}-row`];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row create-employee-header">
        <div>
          <button onClick={() => navigate('/employee')} className="create-employee-back-btn" disabled={sedangMengirim}>
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
        <button type="button" className="btn btn-primary csv-download-btn" onClick={unduhTemplateCSV} disabled={sedangMengirim}>
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
                <input type="file" accept=".csv" onChange={pilihFileCSV} style={{ display: 'none' }} id="csv-upload" />
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
                <button className="btn btn-primary" onClick={prosesFileDanReview} disabled={!file || sedangMemuatReferensi}>
                  {sedangMemuatReferensi ? 'Memuat data...' : 'Upload & Review'}
                </button>
              </div>
            </>
          )}

          {isReviewing && dataReview.length > 0 && (
            <>
              {Object.keys(errorValidasi).length > 0 ? (
                <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#b91c1c', fontWeight: 500 }}>
                  Terdapat kesalahan validasi. Silakan periksa kotak merah di bawah.
                </div>
              ) : (
                <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#1e40af' }}>
                  Ditemukan <strong>{dataReview.length}</strong> baris data karyawan. Pastikan data (terutama Dropdown pilihan) sudah benar sebelum mengirim.
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
                      <th className="csv-sticky-header">Departemen</th>
                      <th className="csv-sticky-header">Posisi</th>
                      <th className="csv-sticky-header">Manajer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataReview.map((row, idx) => {
                      const errorBarisIni = getRowError(idx);
                      const barisError = !!errorBarisIni || Object.keys(errorValidasi).some(k => k.startsWith(`${idx}-`));

                      return (
                        <tr key={idx} style={{ backgroundColor: barisError ? '#fef2f2' : undefined }}>
                          <td style={{ fontWeight: 600, color: barisError ? '#b91c1c' : '#64748b' }}>
                            {idx + 1}
                            {errorBarisIni && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', maxWidth: '100px' }}>{errorBarisIni}</div>}
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
                            {getError(idx, 'birth_date') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'birth_date')}</div>}
                          </td>
                          <td>
                            <select 
                              value={row.department_id || ''} 
                              onChange={(e) => perbaruiDataReview(idx, 'department_id', e.target.value)}
                              className={`input-field ${((row.department && !row.department_id) || getError(idx, 'department_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'department_id') || (row.department && !row.department_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.department ? `Pilih (${row.department})` : '-- Kosong --'}</option>
                              {daftarDepartemen.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {getError(idx, 'department_id') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'department_id')}</div>}
                            {(row.department && !row.department_id && !getError(idx, 'department_id')) && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>Departemen tidak ditemukan</div>}
                          </td>
                          <td>
                            <select 
                              value={row.position_id || ''} 
                              onChange={(e) => perbaruiDataReview(idx, 'position_id', e.target.value)}
                              className={`input-field ${((row.position && !row.position_id) || getError(idx, 'position_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'position_id') || (row.position && !row.position_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.position ? `Pilih (${row.position})` : '-- Kosong --'}</option>
                              {daftarJabatan.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {getError(idx, 'position_id') && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{getError(idx, 'position_id')}</div>}
                            {(row.position && !row.position_id && !getError(idx, 'position_id')) && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>Jabatan tidak ditemukan</div>}
                          </td>
                          <td>
                            <select 
                              value={row.manager_id || ''} 
                              onChange={(e) => perbaruiDataReview(idx, 'manager_id', e.target.value)}
                              className={`input-field ${((row.manager && !row.manager_id) || getError(idx, 'manager_id')) ? 'error-border' : ''}`}
                              style={{ width: '140px', padding: '6px', fontSize: '13px', borderColor: getError(idx, 'manager_id') || (row.manager && !row.manager_id) ? '#ef4444' : undefined }}
                            >
                              <option value="">{row.manager ? `Pilih (${row.manager})` : '-- Kosong --'}</option>
                              {daftarManajer.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_number})</option>)}
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
                <button className="btn btn-secondary" onClick={uploadUlang} disabled={sedangMengirim}>
                  Upload Ulang
                </button>
                <button className="btn btn-primary btn-success" onClick={kirimDataKeBackend} disabled={sedangMengirim}>
                  {sedangMengirim ? 'Memproses...' : `Kirim ${dataReview.length} Karyawan`}
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
        isOpen={infoAlert.open}
        title={infoAlert.title}
        type={infoAlert.type}
        message={infoAlert.message}
        onClose={() => setInfoAlert(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
