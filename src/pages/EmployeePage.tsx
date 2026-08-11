import { useState, useEffect } from 'react';
import { getEmployees, deleteEmployee, getEmployeeDetail, createEmployee, updateEmployee } from '../api/employee';
import { getDepartments } from '../api/department';
import { getPositions } from '../api/position';
import { setUserActive } from '../api/user';
import { EmployeeListItem, Department, Position, EmployeeDetail } from '../types/employee';
import { EmployeeModal } from '../features/employee/EmployeeModal';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);

  // Delete State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeListItem | null>(null);
  const [subordinatesList, setSubordinatesList] = useState<any[]>([]);

  // Status Toggle State
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [empToToggle, setEmpToToggle] = useState<{id: string, currentStatus: boolean, name: string} | null>(null);

  // Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<React.ReactNode>('');

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
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data referensi');
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

  async function openEditModal(emp: EmployeeListItem) {
    try {
      setLoading(true);
      const res = await getEmployeeDetail(emp.id);
      if (res.success) {
        setModalMode('edit');
        setSelectedEmployee(res.data);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail karyawan');
    } finally {
      setLoading(false);
    }
  }

  async function handleModalSubmit(data: any) {
    if (modalMode === 'create') {
      await createEmployee(data);
    } else if (modalMode === 'edit' && selectedEmployee) {
      await updateEmployee(selectedEmployee.id, data);
    }
    setIsModalOpen(false);
    loadEmployees();
  }

  function confirmToggleStatus(id: string, currentStatus: boolean, name: string) {
    setEmpToToggle({ id, currentStatus, name });
    setIsStatusConfirmOpen(true);
  }

  async function handleToggleStatus() {
    if (!empToToggle) return;
    setIsStatusConfirmOpen(false);
    
    try {
      await setUserActive(empToToggle.id, !empToToggle.currentStatus);
      loadEmployees();
    } catch (err: any) {
      setAlertMessage(err.message || 'Gagal mengubah status pengguna');
      setAlertOpen(true);
    } finally {
      setEmpToToggle(null);
    }
  }

  function handleDelete(emp: EmployeeListItem) {
    setEmployeeToDelete(emp);
    setSubordinatesList([]);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (employeeToDelete) {
      try {
        await deleteEmployee(employeeToDelete.id);
        loadEmployees();
        setIsDeleteConfirmOpen(false);
        setEmployeeToDelete(null);
      } catch (err: any) {
        setIsDeleteConfirmOpen(false);
        if (err.details && err.details.subordinates) {
          setSubordinatesList(err.details.subordinates);
          setAlertMessage(
            <>
              <div style={{ marginBottom: '16px' }}>{err.message || 'Karyawan tidak dapat dihapus karena memiliki bawahan.'}</div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: '8px', color: '#0f172a' }}>
                  Daftar Bawahan ({err.details.subordinates.length}):
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: '#334155', maxHeight: '150px', overflowY: 'auto' }}>
                  {err.details.subordinates.map((sub: any) => (
                    <li key={sub.id} style={{ marginBottom: '4px' }}>
                      {sub.full_name} <span style={{ color: '#64748b', fontSize: '13px' }}>({sub.employee_number})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );
        } else {
          setAlertMessage(err.message || 'Gagal menghapus karyawan');
        }
        setAlertOpen(true);
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
                <th>MANAJER</th>
                <th>STATUS</th>
                <th className="text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-table-cell">
                    Memuat data...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table-cell">
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
                    <td>{emp.manager_name || '-'}</td>
                    <td>
                      <button 
                        onClick={() => confirmToggleStatus(emp.user_id || emp.id, emp.is_active, emp.full_name)}
                        className={`status-badge ${emp.is_active ? 'status-active' : 'status-inactive'}`}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        title={emp.is_active ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                      >
                        {emp.is_active ? 'Aktif' : 'Non-aktif'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(emp)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(emp)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
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
        managers={employees}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Konfirmasi Hapus"
        message={
          <>
            <p>Apakah kamu yakin ingin menghapus data karyawan <strong>{employeeToDelete?.full_name}</strong>?</p>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Tindakan ini tidak dapat dibatalkan.</p>
          </>
        }
        confirmText="Ya, Hapus Data"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setEmployeeToDelete(null);
        }}
      />

      {/* Status Toggle Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        title="Konfirmasi Ubah Status"
        message={
          empToToggle ? 
          `Apakah Anda yakin ingin ${empToToggle.currentStatus ? 'menonaktifkan' : 'mengaktifkan'} akun ${empToToggle.name}?` 
          : ''
        }
        confirmText="Ya, Lanjutkan"
        onConfirm={handleToggleStatus}
        onCancel={() => {
          setIsStatusConfirmOpen(false);
          setEmpToToggle(null);
        }}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertOpen}
        title="Informasi"
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}
