import { useState, useEffect } from 'react';
import { getEmployees, getDepartments, createEmployee, updateEmployee, deleteEmployee, getPositions } from '../api/employee';
import { EmployeeListItem, Department, Position } from '../types/employee';
import { EmployeeModal } from '../features/employee/EmployeeModal';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

export function EmployeePage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);

  // muat data departemen saat halaman dibuka
  useEffect(() => {
    async function loadReferences() {
      try {
        const [depRes, posRes] = await Promise.all([
          getDepartments(),
          getPositions()
        ]);
        if (depRes.success) setDepartments(depRes.data);
        if (posRes.success) setPositions(posRes.data);
      } catch (err) {
        console.error('Gagal memuat data referensi', err);
      }
    }
    loadReferences();
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

  function openCreateModal() {
    setModalMode('create');
    setSelectedEmployee(null);
    setIsModalOpen(true);
  }

  function openEditModal(emp: EmployeeListItem) {
    setModalMode('edit');
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  }

  async function handleModalSubmit(data: any) {
    if (modalMode === 'create') {
      await createEmployee(data);
    } else if (modalMode === 'edit' && selectedEmployee) {
      await updateEmployee(selectedEmployee.id, data);
    }
    // Reload data setelah sukses
    loadEmployees();
  }

  async function handleDelete(emp: EmployeeListItem) {
    if (window.confirm(`Yakin ingin menghapus karyawan ${emp.full_name}?`)) {
      try {
        await deleteEmployee(emp.id);
        loadEmployees();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus karyawan');
      }
    }
  }

  return (
    <div className="dashboard-container employee-container">
      <div className="dashboard-card employee-card">
        <h1 className="dashboard-title">Daftar Karyawan</h1>
        <p className="dashboard-subtitle">Kelola data seluruh karyawan perusahaan di sini.</p>

        {error && <div className="alert-error">{error}</div>}

        {/* Form Pencarian & Filter */}
        <div className="employee-header-actions">
          <form onSubmit={handleSearch} className="employee-filter-form">
          <input
            type="text"
            className="input-field employee-search-input"
            placeholder="Cari Nama, Email, atau ID Karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field employee-filter-select"
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
          >
            <option value="">Semua Departemen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className="input-field employee-filter-select"
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
          <button type="submit" className="btn btn-primary employee-search-btn">
            Cari
          </button>
        </form>
          <button 
            type="button" 
            className="btn btn-primary btn-success" 
            onClick={openCreateModal}
          >
            + Tambah Karyawan
          </button>
        </div>

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
                <th className="text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
                    Memuat data...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
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
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(emp)} title="Edit">✏️</button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(emp)} title="Hapus">🗑️</button>
                      </div>
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
      
      <EmployeeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        employeeData={selectedEmployee}
        departments={departments}
        positions={positions}
      />
    </div>
  );
}
