import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api/department';
import { Department, UnitType, UNIT_TYPE_LABELS } from '../types/employee';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';

export function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('department');
  const [parentId, setParentId] = useState<string>('');
  const [maxConcurrentLeave, setMaxConcurrentLeave] = useState<number | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  // Delete & Alert State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    setError('');
    try {
      const res = await getDepartments();
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (e: any) {
      const err = e as ApiError;
      setError(err.message || 'Gagal memuat data unit organisasi');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedDept(null);
    setCode('');
    setName('');
    setUnitType('department');
    setParentId('');
    setMaxConcurrentLeave('');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(dept: Department) {
    setModalMode('edit');
    setSelectedDept(dept);
    setCode(dept.code);
    setName(dept.name);
    setUnitType(dept.unit_type || 'department');
    setParentId(dept.parent_id || '');
    setMaxConcurrentLeave(dept.max_concurrent_leave ?? '');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  }

  // Hitung unit itu sendiri dan seluruh sub-unit turunannya agar tidak bisa dipilih jadi parent
  function getExcludedUnitIds(unitId: string, allUnits: Department[]): Set<string> {
    const excluded = new Set<string>([unitId]);
    let added = true;
    while (added) {
      added = false;
      for (const u of allUnits) {
        if (u.parent_id && excluded.has(u.parent_id) && !excluded.has(u.id)) {
          excluded.add(u.id);
          added = true;
        }
      }
    }
    return excluded;
  }

  const availableParents = selectedDept && modalMode === 'edit'
    ? (() => {
        const excluded = getExcludedUnitIds(selectedDept.id, departments);
        return departments.filter(d => !excluded.has(d.id));
      })()
    : departments;

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');

    try {
      const payload: Partial<Department> = {
        code: code.trim(),
        name: name.trim(),
        unit_type: unitType,
        parent_id: parentId ? parentId : null,
        max_concurrent_leave: maxConcurrentLeave === '' ? null : Number(maxConcurrentLeave)
      };

      if (modalMode === 'create') {
        await createDepartment(payload);
      } else if (selectedDept) {
        await updateDepartment(selectedDept.id, { ...payload, updated_at: selectedDept.updated_at });
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (e: any) {
      const err = e as ApiError;
      if (isStaleData(err)) {
        setStaleDetails(err.details);
        setIsStaleModalOpen(true);
      } else {
        const field = err.details?.field;
        if (field) {
          setFieldErrors({ [field]: err.message });
        } else {
          setFormError(err.message || 'Gagal menyimpan unit organisasi');
        }
      }
    }
  }

  const handleStaleReload = () => {
    if (staleDetails?.current) {
      const current = staleDetails.current as Department;
      setSelectedDept(current);
      setCode(current.code);
      setName(current.name);
      setUnitType(current.unit_type || 'department');
      setParentId(current.parent_id || '');
      setMaxConcurrentLeave(current.max_concurrent_leave ?? '');
      setFieldErrors({});
      setFormError('');
    }
    setIsStaleModalOpen(false);
  };

  function handleDelete(dept: Department) {
    setDeptToDelete(dept);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (deptToDelete) {
      try {
        await deleteDepartment(deptToDelete.id);
        setIsDeleteConfirmOpen(false);
        setDeptToDelete(null);
        loadDepartments();
      } catch (e: any) {
        const err = e as ApiError;
        setIsDeleteConfirmOpen(false);
        setAlertMessage(err.message || 'Gagal menghapus unit organisasi');
        setAlertOpen(true);
      }
    }
  }

  const parentMap = new Map<string, string>();
  departments.forEach(d => {
    parentMap.set(d.id, d.name);
  });

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions">
          <div>
            <h1 className="dashboard-title">Unit Organisasi</h1>
            <p className="dashboard-subtitle">Kelola struktur hierarki unit organisasi perusahaan.</p>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>+ Tambah Unit</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Unit</th>
                <th>Jenis</th>
                <th>Unit Induk</th>
                <th>Maks. Cuti Bersamaan</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={6} className="text-center empty-table-cell">Belum ada data unit organisasi.</td></tr>
              ) : (
                departments.map(dept => (
                  <tr key={dept.id}>
                    <td className="employee-name">{dept.code}</td>
                    <td><strong>{dept.name}</strong></td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: dept.unit_type === 'company' ? '#fef3c7' : dept.unit_type === 'directorate' ? '#e0e7ff' : dept.unit_type === 'division' ? '#dbeafe' : dept.unit_type === 'team' ? '#f1f5f9' : '#ecfdf5',
                        color: dept.unit_type === 'company' ? '#92400e' : dept.unit_type === 'directorate' ? '#3730a3' : dept.unit_type === 'division' ? '#1e40af' : dept.unit_type === 'team' ? '#475569' : '#065f46'
                      }}>
                        {UNIT_TYPE_LABELS[dept.unit_type] || dept.unit_type}
                      </span>
                    </td>
                    <td>{dept.parent_id ? (parentMap.get(dept.parent_id) || dept.parent_id) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>- Puncak (Tanpa Induk) -</span>}</td>
                    <td>{dept.max_concurrent_leave ? `${dept.max_concurrent_leave} orang` : 'Tanpa batas'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(dept)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(dept)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Unit Organisasi */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'create' ? 'Tambah Unit Organisasi Baru' : 'Ubah Data Unit Organisasi'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-error" style={{ marginBottom: '16px' }}>{formError}</div>
                )}

                <div className="form-group">
                  <label className="form-label">Kode Unit</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={fieldErrors.code ? { borderColor: '#ef4444' } : undefined}
                    value={code} 
                    onChange={e => {
                      setCode(e.target.value);
                      if (fieldErrors.code) setFieldErrors(prev => ({ ...prev, code: '' }));
                    }} 
                    required 
                    placeholder="Contoh: DIR-TECH" 
                  />
                  {fieldErrors.code && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.code}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Unit</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={fieldErrors.name ? { borderColor: '#ef4444' } : undefined}
                    value={name} 
                    onChange={e => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }} 
                    required 
                    placeholder="Contoh: Direktorat Teknologi" 
                  />
                  {fieldErrors.name && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Jenis Unit</label>
                  <select 
                    className="input-field"
                    style={fieldErrors.unit_type ? { borderColor: '#ef4444' } : undefined}
                    value={unitType}
                    onChange={e => {
                      setUnitType(e.target.value as UnitType);
                      if (fieldErrors.unit_type) setFieldErrors(prev => ({ ...prev, unit_type: '' }));
                    }}
                    required
                  >
                    <option value="company">Perusahaan</option>
                    <option value="directorate">Direktorat</option>
                    <option value="division">Divisi</option>
                    <option value="department">Departemen</option>
                    <option value="team">Tim</option>
                  </select>
                  {fieldErrors.unit_type && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.unit_type}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Induk</label>
                  <select 
                    className="input-field"
                    style={fieldErrors.parent_id ? { borderColor: '#ef4444' } : undefined}
                    value={parentId}
                    onChange={e => {
                      setParentId(e.target.value);
                      if (fieldErrors.parent_id) setFieldErrors(prev => ({ ...prev, parent_id: '' }));
                    }}
                  >
                    <option value="">- Tanpa induk (unit puncak) -</option>
                    {availableParents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({UNIT_TYPE_LABELS[d.unit_type] || d.unit_type})
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Pilih unit induk di atasnya. Pilih "- Tanpa induk -" jika ini unit tertinggi (perusahaan).
                  </span>
                  {fieldErrors.parent_id && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.parent_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Maksimal Karyawan Cuti Bersamaan</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={1000} 
                    className="input-field" 
                    style={fieldErrors.max_concurrent_leave ? { borderColor: '#ef4444' } : undefined}
                    value={maxConcurrentLeave} 
                    onChange={e => {
                      setMaxConcurrentLeave(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.max_concurrent_leave) setFieldErrors(prev => ({ ...prev, max_concurrent_leave: '' }));
                    }} 
                    placeholder="Kosongkan jika tanpa batas (1–1000)" 
                  />
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Batas jumlah rekan satu unit yang boleh cuti di hari yang sama (1–1000). Kosongkan untuk tanpa batas.
                  </span>
                  {fieldErrors.max_concurrent_leave && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.max_concurrent_leave}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Simpan Data' : 'Perbarui Data'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm & Alert Modals */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Konfirmasi Hapus"
        message={`Apakah kamu yakin ingin menghapus unit organisasi ${deptToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeptToDelete(null);
        }}
      />

      <AlertModal
        isOpen={alertOpen}
        title="Peringatan"
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
