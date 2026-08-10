import React, { useState, useEffect } from 'react';
import { getPositions, createPosition, updatePosition, deletePosition } from '../api/position';
import { Position } from '../types/employee';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';

export function PositionPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<number | ''>('');

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [posToDelete, setPosToDelete] = useState<Position | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  useEffect(() => {
    loadPositions();
  }, []);

  async function loadPositions() {
    setLoading(true);
    setError('');
    try {
      const res = await getPositions();
      if (res.success) {
        setPositions(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data jabatan');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedPos(null);
    setCode('');
    setName('');
    setLevel('');
    setIsModalOpen(true);
  }

  function openEditModal(pos: Position) {
    setModalMode('edit');
    setSelectedPos(pos);
    setCode(pos.code);
    setName(pos.name);
    setLevel(pos.level);
    setIsModalOpen(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const posData = { code, name, level: Number(level) };
      if (modalMode === 'create') {
        await createPosition(posData);
      } else if (selectedPos) {
        await updatePosition(selectedPos.id, posData);
      }
      setIsModalOpen(false);
      loadPositions();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan jabatan');
    }
  }

  function handleDelete(pos: Position) {
    setPosToDelete(pos);
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (posToDelete) {
      try {
        await deletePosition(posToDelete.id);
        setIsDeleteModalOpen(false);
        setPosToDelete(null);
        loadPositions();
      } catch (err: any) {
        if (err.details && (err.details as any).employee_count) {
          setDeleteErrorMsg(err.message || `Tidak dapat dihapus karena memiliki karyawan.`);
        } else {
          alert(err.message || 'Gagal menghapus jabatan');
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
            <h1 className="dashboard-title">Master Jabatan</h1>
            <p className="dashboard-subtitle">Kelola data jabatan/posisi dalam perusahaan.</p>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>+ Tambah Jabatan</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Jabatan</th>
                <th>Level</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : positions.length === 0 ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Belum ada data jabatan.</td></tr>
              ) : (
                positions.map(pos => (
                  <tr key={pos.id}>
                    <td className="employee-name">{pos.code}</td>
                    <td>{pos.name}</td>
                    <td className="employee-subtext">{pos.level}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(pos)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(pos)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <div className="form-group">
                  <label className="form-label">Kode Jabatan</label>
                  <input type="text" className="input-field" value={code} onChange={e => setCode(e.target.value)} required placeholder="Contoh: MGR" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Jabatan</label>
                  <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Manager" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tingkat Jabatan (Level)</label>
                  <input type="number" className="input-field" value={level} onChange={e => setLevel(Number(e.target.value) || '')} required placeholder="Contoh: 1" min={1} />
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
                  <p>Apakah kamu yakin ingin menghapus jabatan <strong>{posToDelete?.name}</strong>?</p>
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
