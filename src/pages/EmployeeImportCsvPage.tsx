import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

// Tipe data untuk setiap baris hasil parsing CSV (sesuai dengan form Tambah Karyawan)
interface CsvRow {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  role: string;
  birth_date: string;
  address: string;
  department: string;
  position: string;
  manager: string;
}

export function EmployeeImportCsvPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  // State untuk menyimpan data hasil parsing CSV (untuk di-review)
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  // State untuk menandakan apakah file sudah di-parse dan siap di-review
  const [isReviewing, setIsReviewing] = useState(false);

  // Fungsi untuk mendownload template CSV (pemisah koma, 5 baris contoh)
  const handleDownloadTemplate = () => {
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

  // Fungsi saat user memilih file CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setParsedData([]);
      setIsReviewing(false);
    }
  };

  // Fungsi untuk parsing file CSV menjadi array data dan menampilkan review
  const handleUploadAndReview = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Pisahkan baris, buang baris kosong
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        alert('File CSV kosong atau tidak memiliki data selain header.');
        return;
      }

      // Baris pertama adalah header
      const headers = lines[0].split(',').map(h => h.trim());
      const rows: CsvRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= headers.length) {
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          rows.push(row as CsvRow);
        }
      }

      if (rows.length === 0) {
        alert('Tidak ditemukan data karyawan yang valid di dalam file CSV.');
        return;
      }

      setParsedData(rows);
      setIsReviewing(true);
    };
    reader.readAsText(file);
  };

  // Fungsi reset (kembali ke tampilan upload)
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setIsReviewing(false);
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Fungsi kirim data ke Backend (TODO: Akan diimplementasikan nanti)
  const handleSubmit = () => {
    alert(`${parsedData.length} data karyawan siap dikirim ke server. (Logika API belum diimplementasikan)`);
  };

  // Mapping label gender agar lebih mudah dibaca
  const genderLabel = (g: string) => {
    if (g === 'male') return 'Laki-laki';
    if (g === 'female') return 'Perempuan';
    return g;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header-row create-employee-header">
        <div>
          <button onClick={() => navigate('/employee')} className="create-employee-back-btn">
            ← Kembali ke Daftar Karyawan
          </button>
          <h1 className="dashboard-title">Upload Karyawan via CSV</h1>
          <p className="dashboard-subtitle">Tambahkan data banyak karyawan sekaligus menggunakan file CSV.</p>
        </div>
      </div>

      {/* Bagian Template: Download Template CSV */}
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
        <button 
          type="button" 
          className="btn btn-primary csv-download-btn"
          onClick={handleDownloadTemplate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download Template
        </button>
      </div>

      {/* Konten Utama */}
      <div className="csv-main-content">
        
        {/* Kiri: Area Upload / Review */}
        <div className="dashboard-card csv-upload-area">
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            {isReviewing ? 'Review Data Karyawan' : 'Upload File CSV'}
          </h2>

          {/* Tampilan Upload (sebelum review) */}
          {!isReviewing && (
            <>
              <div className="csv-dropzone">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#94a3b8', marginBottom: '12px' }}>
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ color: '#475569', marginBottom: '4px', fontWeight: 500 }}>Pilih file CSV untuk di-upload</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>Format yang didukung: .csv</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
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
                <button className="btn btn-secondary" onClick={() => navigate('/employee')}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={handleUploadAndReview} disabled={!file}>
                  Upload & Review
                </button>
              </div>
            </>
          )}

          {/* Tampilan Review (setelah upload & parsing) */}
          {isReviewing && parsedData.length > 0 && (
            <>
              <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#1e40af' }}>
                Ditemukan <strong>{parsedData.length}</strong> baris data karyawan dari file <strong>{file?.name}</strong>. Pastikan data sudah benar sebelum mengirim.
              </div>

              <div className="csv-review-table-wrapper">
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
                      <th className="csv-sticky-header">Alamat</th>
                      <th className="csv-sticky-header">Departemen</th>
                      <th className="csv-sticky-header">Posisi</th>
                      <th className="csv-sticky-header">Manajer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{row.full_name}</td>
                        <td>{row.email}</td>
                        <td>{row.phone}</td>
                        <td style={{ color: '#94a3b8' }}>{'•'.repeat(8)}</td>
                        <td>{genderLabel(row.gender)}</td>
                        <td>
                          <span style={{ 
                            padding: '2px 10px', 
                            borderRadius: '999px', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            backgroundColor: row.role === 'admin' ? '#fef3c7' : row.role === 'hr' ? '#e0e7ff' : '#dcfce7',
                            color: row.role === 'admin' ? '#92400e' : row.role === 'hr' ? '#3730a3' : '#166534',
                            textTransform: 'capitalize'
                          }}>
                            {row.role || 'employee'}
                          </span>
                        </td>
                        <td>{row.birth_date || '-'}</td>
                        <td>{row.address || '-'}</td>
                        <td>{row.department || '-'}</td>
                        <td>{row.position || '-'}</td>
                        <td>{row.manager || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tombol Aksi di Bawah Kanan */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={handleReset}>
                  Upload Ulang
                </button>
                <button className="btn btn-primary btn-success" onClick={handleSubmit}>
                  Kirim {parsedData.length} Karyawan
                </button>
              </div>
            </>
          )}
        </div>

        {/* Kanan: Panduan */}
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
              <li><strong>role</strong> — employee / hr / admin <span style={{ color: '#dc2626' }}>*</span></li>
              <li><strong>birth_date</strong> — Format YYYY-MM-DD</li>
              <li><strong>address</strong> — Alamat lengkap</li>
              <li><strong>department</strong> — Nama departemen</li>
              <li><strong>position</strong> — Nama jabatan</li>
              <li><strong>manager</strong> — Nama manajer</li>
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
    </div>
  );
}
