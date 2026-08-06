import { useState, useEffect } from 'react';
import { getEmployees, getDepartments } from '../api/employee';
import { EmployeeListItem, Department, ListEmployeesResponse } from '../types/employee';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

export function EmployeePage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // state filter
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState<string>(''); // '', 'true', 'false'

  // state paginasi
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // muat data departemen saat halaman dibuka
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await getDepartments();
        if (res.success) setDepartments(res.data);
      } catch (err) {
        console.error('Gagal memuat departemen', err);
      }
    }
    loadDepartments();
  }, []);

  // muat ulang data saat parameter berubah
  useEffect(() => {
    loadEmployees();

  }, [page, departmentId, isActive]);

  async function loadEmployees() {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployees({
        search: search || undefined,
        department_id: departmentId || undefined,
        is_active: isActive === '' ? undefined : isActive === 'true',
        page,
        limit,
      });
      if (res.success) {
        setEmployees(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.total_pages);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '1200px' }}>
      <div className="dashboard-card" style={{ padding: '32px' }}>
        <h1 className="dashboard-title">Daftar Karyawan</h1>
        <p className="dashboard-subtitle">Kelola data seluruh karyawan perusahaan di sini.</p>

        {error && <div className="alert-error">{error}</div>}

        {/* Form Pencarian & Filter */}
        <form onSubmit={handleSearch} className="employee-filter-form">
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Cari Nama, Email, atau ID Karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
          >
            <option value="">Semua Departemen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', marginTop: 0, padding: '14px 24px' }}>
            Cari
          </button>
        </form>

        {/* Tabel Karyawan */}
        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID KARYAWAN</th>
                <th>NAMA LENGKAP</th>
                <th>EMAIL</th>
                <th>DEPARTEMEN</th>
                <th>JABATAN</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Memuat data...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Tidak ada data karyawan ditemukan.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.employee_number}</td>
                    <td className="employee-name">{emp.full_name}</td>
                    <td className="employee-subtext">{emp.email || '-'}</td>
                    <td>{emp.department_name || '-'}</td>
                    <td>{emp.position_name || '-'}</td>
                    <td>
                      <span className={`status-badge ${emp.is_active ? 'status-active' : 'status-inactive'}`}>
                        {emp.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Kontrol Paginasi */}
        {!loading && employees.length > 0 && (
          <div className="employee-pagination">
            <div className="pagination-info">
              Menampilkan total <strong>{total}</strong> karyawan
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-page-text">
                Halaman {page} dari {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
