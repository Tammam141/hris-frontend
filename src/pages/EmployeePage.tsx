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
import { Pagination } from '../components/ui/Pagination';

export function EmployeePage() {
  const { hasFeature, user } = useAuth();
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
  const [managerOptions, setManagerOptions] = useState<EmployeeListItem[]>([]);

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
  const loadReferences = useCallback(async () => {
    try {
      const [depRes, posRes, empRes] = await Promise.allSettled([
        getDepartments(),
        getPositions(),
        getEmployees({ limit: 100, page: 1 })
      ]);
      if (depRes.status === 'fulfilled' && depRes.value.success) {
        setDepartments(depRes.value.data);
        try {
          localStorage.setItem('cached_departments', JSON.stringify({ owner: user?.id, data: depRes.value.data }));
        } catch {}
      } else if (depRes.status === 'rejected' && (depRes.reason as ApiError)?.isNetworkError) {
        try {
          const cachedDep = localStorage.getItem('cached_departments');
          if (cachedDep) {
            const parsed = JSON.parse(cachedDep);
            if (parsed?.owner === user?.id && Array.isArray(parsed.data)) {
              setDepartments(parsed.data);
            }
          }
        } catch {}
      }

      if (posRes.status === 'fulfilled' && posRes.value.success) {
        setPositions(posRes.value.data);
        try {
          localStorage.setItem('cached_positions', JSON.stringify({ owner: user?.id, data: posRes.value.data }));
        } catch {}
      } else if (posRes.status === 'rejected' && (posRes.reason as ApiError)?.isNetworkError) {
        try {
          const cachedPos = localStorage.getItem('cached_positions');
          if (cachedPos) {
            const parsed = JSON.parse(cachedPos);
            if (parsed?.owner === user?.id && Array.isArray(parsed.data)) {
              setPositions(parsed.data);
            }
          }
        } catch {}
      }

      if (empRes.status === 'fulfilled' && empRes.value.data) {
        let allEmps = [...empRes.value.data];
        const totalPages = empRes.value.meta?.total_pages || 1;
        if (totalPages > 1) {
          const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
            getEmployees({ limit: 100, page: i + 2 })
          );
          const otherPagesRes = await Promise.allSettled(pagePromises);
          otherPagesRes.forEach((res) => {
            if (res.status === 'fulfilled' && res.value.data) {
              allEmps = [...allEmps, ...res.value.data];
            }
          });
        }
        setManagerOptions(allEmps);
        try {
          // Menimpa (overwrite), bukan merge
          localStorage.setItem('cached_employees_all', JSON.stringify({ owner: user?.id, data: allEmps }));
        } catch {}
      } else if (empRes.status === 'rejected' && (empRes.reason as ApiError)?.isNetworkError) {
        try {
          const cachedAllRaw = localStorage.getItem('cached_employees_all');
          if (cachedAllRaw) {
            const parsed = JSON.parse(cachedAllRaw);
            if (parsed?.owner === user?.id && Array.isArray(parsed.data)) {
              setManagerOptions(parsed.data);
            }
          }
        } catch {}
      }
    } catch {
      // Fallback jika BE mati: coba baca data dari localStorage
      try {
        const cachedDep = localStorage.getItem('cached_departments');
        const cachedPos = localStorage.getItem('cached_positions');
        if (cachedDep) {
          const parsed = JSON.parse(cachedDep);
          if (parsed?.owner === user?.id && Array.isArray(parsed.data)) setDepartments(parsed.data);
        }
        if (cachedPos) {
          const parsed = JSON.parse(cachedPos);
          if (parsed?.owner === user?.id && Array.isArray(parsed.data)) setPositions(parsed.data);
        }
      } catch {}
    }
  }, [user?.id]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const loadEmployees = useCallback(async (isCancelled?: () => boolean) => {
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

      if (isCancelled?.()) return;

      // 2. Data respon backend dibungkus ke state employeeResponse
      setEmployeeResponse(prev => ({
        ...prev,
        data: res.data || [],
        total: res.meta?.total ?? 0,
        total_pages: res.meta?.total_pages ?? 1
      }));
      setIsOfflineMode(false);

      // Simpan cadangan per-halaman di localStorage saat BE sukses
      try {
        localStorage.setItem('cached_employees', JSON.stringify({
          owner: user?.id,
          data: res.data || [],
          page: employeeResponse.page,
          limit: employeeResponse.limit,
          total: res.meta?.total ?? 0,
          total_pages: res.meta?.total_pages ?? 1
        }));
      } catch {}
    } catch (e: any) {
      if (isCancelled?.()) return;
      const err = e as ApiError;
      // 3. Fallback cache HANYA dipakai bila isNetworkError === true
      if (err?.isNetworkError) {
        try {
          const cachedAllRaw = localStorage.getItem('cached_employees_all');
          let allEmployees: EmployeeListItem[] = [];
          if (cachedAllRaw) {
            try {
              const parsed = JSON.parse(cachedAllRaw);
              if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data) && parsed.data.length > 0) {
                allEmployees = parsed.data;
              }
            } catch {}
          }

          // Fallback jika belum ada di master pool, ambil dari cached_employees lama milik user ini
          if (allEmployees.length === 0) {
            const cached = localStorage.getItem('cached_employees');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.owner === user?.id && Array.isArray(parsed.data) && parsed.data.length > 0) {
                  allEmployees = parsed.data;
                }
              } catch {}
            }
          }

          if (allEmployees.length > 0) {
            // Filter data lokal offline berdasarkan search query, department, dan status aktif
            let filtered = allEmployees;
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              filtered = filtered.filter(emp =>
                emp.full_name?.toLowerCase().includes(q) ||
                emp.email?.toLowerCase().includes(q) ||
                emp.employee_number?.toLowerCase().includes(q)
              );
            }
            if (departmentId) {
              const selectedDept = departments.find(d => d.id === departmentId);
              if (selectedDept) {
                filtered = filtered.filter(emp => emp.department_name === selectedDept.name);
              }
            }
            if (isActive !== '') {
              const activeBool = isActive === 'true';
              filtered = filtered.filter(emp => emp.is_active === activeBool);
            }

            const total = filtered.length;
            const limit = employeeResponse.limit || 10;
            const totalPages = Math.max(1, Math.ceil(total / limit));
            const currentPage = Math.min(Math.max(1, employeeResponse.page), totalPages);
            const startIndex = (currentPage - 1) * limit;
            const pageData = filtered.slice(startIndex, startIndex + limit);

            setEmployeeResponse(prev => ({
              ...prev,
              page: currentPage,
              data: pageData,
              total,
              total_pages: totalPages
            }));
            setIsOfflineMode(true);
            return;
          }
        } catch {}
      }

      setError(err.message || 'Gagal memuat data karyawan');
      setIsOfflineMode(false);
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  }, [searchQuery, departmentId, isActive, employeeResponse.page, employeeResponse.limit, departments, user?.id]);

  // muat ulang data saat parameter berubah
  useEffect(() => {
    let ignore = false;
    loadEmployees(() => ignore);
    return () => {
      ignore = true;
    };
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
        loadReferences();
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
      loadReferences();
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
        loadReferences();
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
          <Pagination
            currentPage={employeeResponse.page}
            totalPages={employeeResponse.total_pages}
            totalItems={employeeResponse.total}
            itemLabel="karyawan"
            prevLabel="Previous"
            nextLabel="Next"
            onPageChange={(p) => setEmployeeResponse(prev => ({ ...prev, page: p }))}
          />
        )}

      </div>
      
      <EmployeeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        employeeData={selectedEmployee}
        departments={departments}
        positions={positions}
        managers={managerOptions}
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
