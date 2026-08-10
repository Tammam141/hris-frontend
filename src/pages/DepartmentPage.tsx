import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api/department';
import { Department } from '../types/employee';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

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
  const [description, setDescription] = useState('');

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

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
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data departemen');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedDept(null);
    setCode('');
    setName('');
    setDescription('');
    setIsModalOpen(true);
  }

  function openEditModal(dept: Department) {
    setModalMode('edit');
    setSelectedDept(dept);
    setCode(dept.code);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsModalOpen(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await createDepartment({ code, name, description });
      } else if (selectedDept) {
        await updateDepartment(selectedDept.id, { code, name, description });
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan departemen');
    }
  }

  function handleDelete(dept: Department) {
    setDeptToDelete(dept);
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (deptToDelete) {
      try {
        await deleteDepartment(deptToDelete.id);
        setIsDeleteModalOpen(false);
        setDeptToDelete(null);
        loadDepartments();
      } catch (err: any) {
        if (err.details && (err.details as any).employee_count) {
          setDeleteErrorMsg(err.message || `Tidak dapat dihapus karena memiliki karyawan.`);
        } else {
          alert(err.message || 'Gagal menghapus departemen');
          setIsDeleteModalOpen(false);
        }
      }
    }
  }

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions">
          <div>
            <h1 className="dashboard-title">Master Departemen</h1>
            <p className="dashboard-subtitle">Kelola data departemen perusahaan.</p>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>+ Tambah Departemen</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Departemen</th>
                <th>Deskripsi</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Belum ada data departemen.</td></tr>
              ) : (
                departments.map(dept => (
                  <tr key={dept.id}>
                    <td className="employee-name">{dept.code}</td>
                    <td>{dept.name}</td>
                    <td className="employee-subtext">{dept.description || '-'}</td>
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

      {/* Modal Form Departemen */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'create' ? 'Tambah Departemen Baru' : 'Ubah Data Departemen'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Kode Departemen</label>
                  <input type="text" className="input-field" value={code} onChange={e => setCode(e.target.value)} required placeholder="Contoh: IT" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Departemen</label>
                  <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Information Technology" />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Deskripsi opsional..." />
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

      {/* Modal Hapus */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#dc2626' }}>
                {deleteErrorMsg ? 'Gagal Menghapus' : 'Konfirmasi Hapus'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsDeleteModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {deleteErrorMsg ? (
                <div className="alert-error" style={{ marginBottom: '16px' }}>{deleteErrorMsg}</div>
              ) : (
                <>
                  <p>Apakah kamu yakin ingin menghapus departemen <strong>{deptToDelete?.name}</strong>?</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Tindakan ini tidak dapat dibatalkan.</p>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)} style={{ width: 'auto' }}>
                {deleteErrorMsg ? 'Tutup' : 'Batal'}
              </button>
              {!deleteErrorMsg && (
                <button type="button" className="btn" style={{ backgroundColor: '#dc2626', color: 'white', width: 'auto', padding: '10px 16px', borderRadius: '6px', fontWeight: 500, border: 'none', cursor: 'pointer' }} onClick={confirmDelete}>
                  Ya, Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
