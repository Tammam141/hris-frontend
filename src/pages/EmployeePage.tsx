import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, deleteEmployee, getEmployeeDetail, updateEmployee } from '../api/employee';
import { getDepartments } from '../api/department';
import { ShowIf } from '../components/ShowIf';
import { getPositions } from '../api/position';
import { setUserActive } from '../api/user';
import { useAuth } from '../hooks/useAuth';
import { EmployeeListItem, Department, Position, EmployeeDetail } from '../types/employee';
import { EmployeeModal } from '../features/employee/EmployeeModal';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { Avatar } from '../components/ui/Avatar';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';

export function EmployeePage() {
  const { hasFeature } = useAuth();
  const bisaAksi = hasFeature('employee.update') || hasFeature('employee.delete');

  // 1. State dibungkus ke dalam satu objek (data, pagination, total)
  const [employeeResponse, setEmployeeResponse] = useState({
    data: [] as EmployeeListItem[],
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Penanda apakah data berasal dari local cache saat server BE down
  const navigate = useNavigate();

  // state filter
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState<string>(''); // '', 'true', 'false'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  // Status & Delete confirmState
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeListItem | null>(null);

  // Status Toggle State
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [empToToggle, setEmpToToggle] = useState<{id: string, currentStatus: boolean, name: string} | null>(null);

  // Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<React.ReactNode>('');

  // muat data departemen & posisi saat halaman dibuka (dengan fallback cache lokal)
  useEffect(() => {
    async function loadReferences() {
      try {
        const [depRes, posRes] = await Promise.all([
          getDepartments(),
          getPositions()
        ]);
        if (depRes.success) {
          setDepartments(depRes.data);
          try {
            localStorage.setItem('cached_departments', JSON.stringify(depRes.data));
          } catch {}
        }
        if (posRes.success) {
          setPositions(posRes.data);
          try {
            localStorage.setItem('cached_positions', JSON.stringify(posRes.data));
          } catch {}
        }
      } catch (e: any) {
        // Fallback jika BE mati: coba baca data dari localStorage
        try {
          const cachedDep = localStorage.getItem('cached_departments');
          const cachedPos = localStorage.getItem('cached_positions');
          if (cachedDep) setDepartments(JSON.parse(cachedDep));
          if (cachedPos) setPositions(JSON.parse(cachedPos));
        } catch {}
      }
    }
    loadReferences();
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployees({
        search: searchQuery || undefined,
        department_id: departmentId || undefined,
        is_active: isActive === '' ? undefined : isActive === 'true',
        page: employeeResponse.page,
        limit: employeeResponse.limit,
      });

      // 2. Data respon backend/offline dibungkus ke state employeeResponse
      setEmployeeResponse(prev => ({
        ...prev,
        data: res.data || [],
        total: res.meta?.total ?? 0,
        total_pages: res.meta?.total_pages ?? 1
      }));
      setIsOfflineMode(false);

      // 2. Simpan cadangan ke localStorage saat BE sukses
      try {
        localStorage.setItem('cached_employees', JSON.stringify({
          data: res.data || [],
          page: employeeResponse.page,
          limit: employeeResponse.limit,
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        }));
      } catch {}
    } catch (e: any) {
      // 3. JIKA BE MATI / DOWN: Cek apakah ada data cadangan di localStorage
      try {
        const cached = localStorage.getItem('cached_employees');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setEmployeeResponse(prev => ({
              ...prev,
              data: parsed.data,
              total: parsed.total ?? 0,
              total_pages: parsed.total_pages ?? 1
            }));
            setIsOfflineMode(true);
            return;
          }
        }
      } catch {}

      // Jika di local belum ada cache sama sekali
      const err = e as ApiError;
      setError(err.message || 'Gagal memuat data karyawan');
      setIsOfflineMode(false);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, departmentId, isActive, employeeResponse.page, employeeResponse.limit]);

  // muat ulang data saat parameter berubah
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
    setEmployeeResponse(prev => ({ ...prev, page: 1 }));
  }

  async function openEditModal(emp: EmployeeListItem) {
    try {
      setLoading(true);
      const res = await getEmployeeDetail(emp.id);
      if (res.success) {
        setSelectedEmployee(res.data);
        setIsModalOpen(true);
      }
    } catch (e: any) {
      const err = e as ApiError;
      setError(err.message || 'Gagal memuat detail karyawan');
    } finally {
      setLoading(false);
    }
  }

  async function handleModalSubmit(data: any) {
    if (selectedEmployee) {
      try {
        await updateEmployee(selectedEmployee.id, { ...data, updated_at: selectedEmployee.updated_at });
        setIsModalOpen(false);
        loadEmployees();
      } catch (e: any) {
      const err = e as ApiError;
        if (isStaleData(err)) {
          setStaleDetails(err.details);
          setIsStaleModalOpen(true);
        } else {
          // It's possible that EmployeeModal catches general errors, but if STALE_DATA is thrown, we catch it here.
          // Wait, if we throw it from EmployeeModal, we handle it here. 
          // What if we just re-throw general error? Actually, EmployeeModal catches non-stale errors.
          // So if we get here, it must be STALE_DATA, but just in case, we can set an alert.
          setError(err.message || 'Gagal menyimpan data karyawan');
        }
      }
    } else {
      setIsModalOpen(false);
      loadEmployees();
    }
  }

  const handleStaleReload = async () => {
    if (selectedEmployee) {
      try {
        const res = await getEmployeeDetail(selectedEmployee.id);
        if (res.success) {
          setSelectedEmployee(res.data);
        }
      } catch {
        // Handle error
      }
    }
    setIsStaleModalOpen(false);
  };

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
    } catch (e: any) {
      const err = e as ApiError;
      setAlertMessage(err.message || 'Gagal mengubah status pengguna');
      setAlertOpen(true);
    } finally {
      setEmpToToggle(null);
    }
  }

  function handleDelete(emp: EmployeeListItem) {
    setEmployeeToDelete(emp);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (employeeToDelete) {
      try {
        await deleteEmployee(employeeToDelete.id);
        loadEmployees();
        setIsDeleteConfirmOpen(false);
        setEmployeeToDelete(null);
      } catch (e: any) {
      const err = e as ApiError;
        setIsDeleteConfirmOpen(false);
        if (err.details && err.details.subordinates) {
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

        {isOfflineMode && (
          <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span><strong>Mode Offline:</strong> Server backend sedang tidak dapat dihubungi. Menampilkan data karyawan lokal terakhir yang tersimpan di perangkat.</span>
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        {/* Form Pencarian & Filter */}
        <div className="employee-header-actions">
          <form onSubmit={handleSearch} className="employee-filter-form">
          <input
            type="text"
            className="input-field employee-search-input"
            placeholder="Cari Nama, Email, atau ID Karyawan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="input-field employee-filter-select"
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setEmployeeResponse(prev => ({ ...prev, page: 1 })); }}
          >
            <option value="">Semua Departemen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className="input-field employee-filter-select"
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setEmployeeResponse(prev => ({ ...prev, page: 1 })); }}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Tidak Aktif</option>
          </select>
          <button type="submit" className="btn btn-primary employee-search-btn">
            Cari
          </button>
        </form>
        </div>

        {/* Tombol Aksi: Upload CSV & Tambah Karyawan (di bawah form pencarian) */}
        <ShowIf feature="employee.create">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/employee/import-csv')}
            >
              Upload Karyawan by CSV
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-success" 
              onClick={() => navigate('/employee/create')}
            >
              + Tambah Karyawan
            </button>
          </div>
        </ShowIf>

        {/* Tabel Karyawan */}
        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>NO</th>
                <th>FOTO</th>
                <th>ID KARYAWAN</th>
                <th>NAMA LENGKAP</th>
                <th>EMAIL</th>
                <th>DEPARTEMEN</th>
                <th>JABATAN</th>
                <th>MANAJER</th>
                <th>STATUS</th>
                {bisaAksi && <th className="text-center">AKSI</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={bisaAksi ? 10 : 9} className="empty-table-cell">
                    Memuat data...
                  </td>
                </tr>
              // 3. Map dipanggil dari employeeResponse.data untuk memunculkan baris tabel
              ) : employeeResponse.data && employeeResponse.data.length > 0 ? (
                employeeResponse.data.map((emp, index) => (
                  <tr key={emp.id}>
                    {/* Rumus nomor paginasi dari : ((page - 1) * limit) + index + 1 */}
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {((employeeResponse.page - 1) * employeeResponse.limit) + index + 1}.
                    </td>
                    <td>
                      <Avatar 
                        photoUrl={emp.photo_url} 
                        name={emp.full_name} 
                        size="40px" 
                        fontSize="14px"
                      />
                    </td>
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
                    {bisaAksi && (
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon btn-edit" onClick={() => openEditModal(emp)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                          <button className="btn-icon btn-delete" onClick={() => handleDelete(emp)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={bisaAksi ? 10 : 9} className="empty-table-cell">
                    Tidak ada data karyawan ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Kontrol Paginasi */}
        {!loading && employeeResponse.data.length > 0 && (
          <div className="employee-pagination">
            <div className="pagination-info">
              Menampilkan total <strong>{employeeResponse.total}</strong> karyawan
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setEmployeeResponse(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={employeeResponse.page === 1}
              >
                Previous
              </button>
              <span className="pagination-page-text">
                Halaman {employeeResponse.page} dari {employeeResponse.total_pages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setEmployeeResponse(prev => ({ ...prev, page: Math.min(prev.total_pages, prev.page + 1) }))}
                disabled={employeeResponse.page === employeeResponse.total_pages}
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
        employeeData={selectedEmployee}
        departments={departments}
        positions={positions}
        managers={employeeResponse.data}
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

      <StaleDataModal
        isOpen={isStaleModalOpen}
        onClose={() => setIsStaleModalOpen(false)}
        onReload={handleStaleReload}
        details={staleDetails}
      />
    </div>
  );
}
