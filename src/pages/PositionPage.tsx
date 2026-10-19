import React, { useState, useEffect } from 'react';
import { getPositions, createPosition, updatePosition, deletePosition } from '../api/position';
import { getDepartments } from '../api/department';
import { Position, Department, positionLabel } from '../types/employee';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';

export function PositionPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  
  // Form State
  const [departmentId, setDepartmentId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [reportsToPositionId, setReportsToPositionId] = useState('');
  const [isUnitHead, setIsUnitHead] = useState(false);
  const [maxHolders, setMaxHolders] = useState<number | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  // Delete & Alert State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [posToDelete, setPosToDelete] = useState<Position | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [posRes, depRes] = await Promise.all([
        getPositions(),
        getDepartments()
      ]);
      if (posRes.success) setPositions(posRes.data);
      if (depRes.success) setDepartments(depRes.data);
    } catch (e: any) {
      const err = e as ApiError;
      setError(err.message || 'Gagal memuat data jabatan');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(defaultDeptId?: string) {
    setModalMode('create');
    setSelectedPos(null);
    setDepartmentId(defaultDeptId || (departments.length > 0 ? departments[0].id : ''));
    setName('');
    setCode('');
    setReportsToPositionId('');
    setIsUnitHead(false);
    setMaxHolders('');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(pos: Position) {
    setModalMode('edit');
    setSelectedPos(pos);
    setDepartmentId(pos.department_id || '');
    setName(pos.name);
    setCode(pos.code);
    setReportsToPositionId(pos.reports_to_position_id || '');
    setIsUnitHead(pos.is_unit_head || false);
    setMaxHolders(pos.max_holders ?? '');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  }

  // Hitung bawahan (langsung maupun bertingkat) dari suatu posisi agar tidak bisa dipilih jadi atasan saat edit
  function getSubordinatePositionIds(posId: string, allPositions: Position[]): Set<string> {
    const subordinates = new Set<string>([posId]);
    let added = true;
    while (added) {
      added = false;
      for (const p of allPositions) {
        if (p.reports_to_position_id && subordinates.has(p.reports_to_position_id) && !subordinates.has(p.id)) {
          subordinates.add(p.id);
          added = true;
        }
      }
    }
    return subordinates;
  }

  // Hitung unit-unit induk (naik lewat parent_id)
  function getAncestorUnitIds(startDeptId: string, allDepts: Department[]): Set<string> {
    const ancestorIds = new Set<string>();
    let current = allDepts.find(d => d.id === startDeptId);
    while (current && current.parent_id) {
      ancestorIds.add(current.parent_id);
      current = allDepts.find(d => d.id === current?.parent_id);
    }
    return ancestorIds;
  }

  // Cek apakah ada posisi puncak di sistem
  const topPosition = positions.find(p => p.reports_to_position_id === null);
  const canBeTopPosition = !topPosition || (modalMode === 'edit' && selectedPos?.id === topPosition.id);

  // Filter calon atasan jabatan
  const excludedPosIds = selectedPos ? getSubordinatePositionIds(selectedPos.id, positions) : new Set<string>();
  
  let candidateReportsToPositions: Position[] = [];
  if (departmentId) {
    if (!isUnitHead) {
      // Bukan kepala unit -> jabatan di unit yang sama (kecuali dirinya & bawahannya)
      candidateReportsToPositions = positions.filter(
        p => p.department_id === departmentId && !excludedPosIds.has(p.id)
      );
    } else {
      // Kepala unit -> jabatan di unit-unit induknya (naik lewat parent_id)
      const ancestorUnitIds = getAncestorUnitIds(departmentId, departments);
      candidateReportsToPositions = positions.filter(
        p => p.department_id && ancestorUnitIds.has(p.department_id) && !excludedPosIds.has(p.id)
      );
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');

    if (!departmentId) {
      setFieldErrors({ department_id: 'Unit organisasi wajib dipilih' });
      return;
    }

    try {
      const posData: Partial<Position> = {
        department_id: departmentId,
        code: code.trim(),
        name: name.trim(),
        reports_to_position_id: reportsToPositionId ? reportsToPositionId : null,
        is_unit_head: isUnitHead,
        max_holders: maxHolders === '' ? null : Number(maxHolders),
      };

      if (modalMode === 'create') {
        await createPosition(posData);
      } else if (selectedPos) {
        await updatePosition(selectedPos.id, { ...posData, updated_at: selectedPos.updated_at });
      }
      setIsModalOpen(false);
      loadData();
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
          setFormError(err.message || 'Gagal menyimpan jabatan');
        }
      }
    }
  }

  const handleStaleReload = () => {
    if (staleDetails?.current) {
      const current = staleDetails.current as Position;
      setSelectedPos(current);
      setDepartmentId(current.department_id || '');
      setCode(current.code);
      setName(current.name);
      setReportsToPositionId(current.reports_to_position_id || '');
      setIsUnitHead(current.is_unit_head || false);
      setMaxHolders(current.max_holders ?? '');
      setFieldErrors({});
      setFormError('');
    }
    setIsStaleModalOpen(false);
  };

  function handleDelete(pos: Position) {
    setPosToDelete(pos);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (posToDelete) {
      try {
        await deletePosition(posToDelete.id);
        setIsDeleteConfirmOpen(false);
        setPosToDelete(null);
        loadData();
      } catch (e: any) {
        const err = e as ApiError;
        setIsDeleteConfirmOpen(false);
        setAlertMessage(err.message || 'Gagal menghapus jabatan');
        setAlertOpen(true);
      }
    }
  }

  // Pengelompokan posisi per unit
  const departmentNameMap = new Map<string, string>();
  departments.forEach(d => {
    departmentNameMap.set(d.id, d.name);
  });

  const groupedPositions = new Map<string, { unitName: string; positions: Position[] }>();
  const unassignedPositions: Position[] = [];

  positions.forEach(pos => {
    if (!pos.department_id) {
      unassignedPositions.push(pos);
    } else {
      const unitName = pos.department_name || departmentNameMap.get(pos.department_id) || 'Unit Tidak Dikenal';
      if (!groupedPositions.has(pos.department_id)) {
        groupedPositions.set(pos.department_id, { unitName, positions: [] });
      }
      groupedPositions.get(pos.department_id)!.positions.push(pos);
    }
  });

  // Sort per group: kepala unit di atas
  groupedPositions.forEach(group => {
    group.positions.sort((a, b) => (b.is_unit_head ? 1 : 0) - (a.is_unit_head ? 1 : 0));
  });

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions">
          <div>
            <h1 className="dashboard-title">Master Jabatan</h1>
            <p className="dashboard-subtitle">Kelola struktur jabatan, kepala unit, dan atasan per unit organisasi.</p>
          </div>
          <button className="btn btn-success" onClick={() => openCreateModal()}>+ Tambah Jabatan</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* Jabatan Belum Masuk Struktur */}
        {unassignedPositions.length > 0 && (
          <div style={{ marginBottom: '28px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <strong style={{ color: '#92400e', fontSize: '15px' }}>Belum masuk struktur ({unassignedPositions.length} jabatan)</strong>
              </div>
              <span style={{ fontSize: '12px', color: '#b45309' }}>Jabatan lama ini belum memiliki unit organisasi. Klik edit untuk menentukan unitnya.</span>
            </div>
            <div className="employee-table-wrapper" style={{ backgroundColor: '#ffffff', borderRadius: '8px' }}>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Nama Jabatan</th>
                    <th>Kode</th>
                    <th>Atasan</th>
                    <th>Kepala Unit</th>
                    <th>Kuota Kursi</th>
                    <th style={{ width: '100px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedPositions.map(pos => (
                    <tr key={pos.id}>
                      <td className="employee-name">{pos.name}</td>
                      <td>{pos.code}</td>
                      <td>{pos.reports_to_position_name || '-'}</td>
                      <td>{pos.is_unit_head ? <span style={{ color: '#2563eb', fontWeight: 600 }}>Kepala Unit</span> : '-'}</td>
                      <td>{pos.max_holders !== null && pos.max_holders !== undefined ? `${pos.max_holders} kursi` : 'Bebas'}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon btn-edit" onClick={() => openEditModal(pos)} title="Pilih Unit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                          <button className="btn-icon btn-delete" onClick={() => handleDelete(pos)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daftar Jabatan Terkelompok per Unit */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat data jabatan...</div>
        ) : positions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Belum ada data jabatan.</div>
        ) : (
          Array.from(groupedPositions.entries()).map(([unitId, group]) => (
            <div key={unitId} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏢</span> {group.unitName}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>({group.positions.length} jabatan)</span>
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => openCreateModal(unitId)}
                >
                  + Tambah di Unit Ini
                </button>
              </div>

              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Nama Jabatan</th>
                      <th>Kode</th>
                      <th>Atasan Jabatan</th>
                      <th>Status Kepala</th>
                      <th>Kuota Kursi</th>
                      <th style={{ width: '100px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.positions.map(pos => (
                      <tr key={pos.id} style={pos.is_unit_head ? { backgroundColor: '#f8fafc' } : undefined}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#0f172a' }}>{pos.name}</strong>
                            {pos.is_unit_head && (
                              <span style={{
                                padding: '2px 8px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                Kepala Unit
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="employee-subtext">{pos.code}</td>
                        <td>
                          {pos.reports_to_position_name ? (
                            <span>{pos.reports_to_position_name}</span>
                          ) : pos.reports_to_position_id === null ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>⭐ Jabatan Puncak (CEO)</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td>
                          {pos.is_unit_head ? (
                            <span style={{ color: '#1e40af', fontWeight: 600 }}>Kepala Unit</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Bukan</span>
                          )}
                        </td>
                        <td>
                          {pos.max_holders !== null && pos.max_holders !== undefined ? (
                            <span>{pos.max_holders} kursi</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>Bebas (Tanpa Batas)</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon btn-edit" onClick={() => openEditModal(pos)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                            <button className="btn-icon btn-delete" onClick={() => handleDelete(pos)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form Jabatan */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'create' ? 'Tambah Jabatan Baru' : 'Ubah Data Jabatan'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-error" style={{ marginBottom: '16px' }}>{formError}</div>
                )}

                <div className="form-group">
                  <label className="form-label">Unit Organisasi *</label>
                  <select 
                    className="input-field"
                    style={fieldErrors.department_id ? { borderColor: '#ef4444' } : undefined}
                    value={departmentId}
                    onChange={e => {
                      setDepartmentId(e.target.value);
                      setReportsToPositionId('');
                      if (fieldErrors.department_id) setFieldErrors(prev => ({ ...prev, department_id: '' }));
                    }}
                    required
                  >
                    <option value="">-- Pilih Unit Organisasi --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {fieldErrors.department_id && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.department_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Jabatan *</label>
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
                    placeholder="Contoh: Senior Software Engineer" 
                  />
                  {fieldErrors.name && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Kode Jabatan *</label>
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
                    placeholder="Contoh: SWE-SR" 
                  />
                  {fieldErrors.code && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.code}</span>}
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                    <input 
                      type="checkbox" 
                      checked={isUnitHead} 
                      onChange={e => {
                        setIsUnitHead(e.target.checked);
                        setReportsToPositionId('');
                        if (fieldErrors.is_unit_head) setFieldErrors(prev => ({ ...prev, is_unit_head: '' }));
                      }} 
                      style={{ width: '16px', height: '16px' }}
                    />
                    Kepala Unit Organisasi ini
                  </label>
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Maksimal 1 kepala per unit. Kepala unit melapor ke jabatan di unit induk di atasnya.
                  </span>
                  {fieldErrors.is_unit_head && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.is_unit_head}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Atasan Jabatan</label>
                  <select 
                    className="input-field"
                    style={fieldErrors.reports_to_position_id ? { borderColor: '#ef4444' } : undefined}
                    value={reportsToPositionId}
                    onChange={e => {
                      setReportsToPositionId(e.target.value);
                      if (fieldErrors.reports_to_position_id) setFieldErrors(prev => ({ ...prev, reports_to_position_id: '' }));
                    }}
                  >
                    {canBeTopPosition && (
                      <option value="">- Tidak ada (jabatan puncak / CEO) -</option>
                    )}
                    {!canBeTopPosition && (
                      <option value="">-- Pilih Atasan Jabatan --</option>
                    )}
                    {candidateReportsToPositions.map(p => (
                      <option key={p.id} value={p.id}>
                        {positionLabel(p)}{p.is_unit_head ? ' (Kepala Unit)' : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {isUnitHead 
                      ? 'Sebagai kepala unit, pilih jabatan di unit induknya.'
                      : 'Bukan kepala unit, pilih jabatan dalam unit yang sama.'}
                  </span>
                  {fieldErrors.reports_to_position_id && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.reports_to_position_id}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Kuota Kursi (Maksimal Pemegang)</label>
                  <input 
                    type="number" 
                    min={1} 
                    className="input-field" 
                    style={fieldErrors.max_holders ? { borderColor: '#ef4444' } : undefined}
                    value={maxHolders} 
                    onChange={e => {
                      setMaxHolders(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.max_holders) setFieldErrors(prev => ({ ...prev, max_holders: '' }));
                    }} 
                    placeholder="Kosongkan jika bebas / tanpa batas" 
                  />
                  <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Jumlah maksimal karyawan yang dapat memegang jabatan ini bersamaan.
                  </span>
                  {fieldErrors.max_holders && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.max_holders}</span>}
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
        message={`Apakah kamu yakin ingin menghapus jabatan ${posToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setPosToDelete(null);
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
