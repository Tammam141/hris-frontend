import React, { useState, useEffect } from 'react';
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, LeaveType } from '../api/leave';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';

export function LeaveTypePage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [defaultQuota, setDefaultQuota] = useState<number>(0);
  const [deductsBalance, setDeductsBalance] = useState(true);
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [attachmentRequiredAfter, setAttachmentRequiredAfter] = useState<number | ''>('');
  const [maxDaysPerRequest, setMaxDaysPerRequest] = useState<number | ''>('');
  const [minNoticeDays, setMinNoticeDays] = useState<number | ''>('');
  const [genderRestriction, setGenderRestriction] = useState<'male' | 'female' | ''>('');
  const [isActive, setIsActive] = useState(true);

  // Delete & Alert State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LeaveType | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Suggested Deactivation
  const [suggestDeactivateOpen, setSuggestDeactivateOpen] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    setLoading(true);
    setError('');
    try {
      const res = await getLeaveTypes();
      if (res.data) {
        setTypes(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data jenis cuti');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedType(null);
    setCode('');
    setName('');
    setDefaultQuota(0);
    setDeductsBalance(true);
    setRequiresAttachment(false);
    setAttachmentRequiredAfter('');
    setMaxDaysPerRequest('');
    setMinNoticeDays('');
    setGenderRestriction('');
    setIsActive(true);
    setIsModalOpen(true);
  }

  function openEditModal(type: LeaveType) {
    setModalMode('edit');
    setSelectedType(type);
    setCode(type.code);
    setName(type.name);
    setDefaultQuota(type.default_quota);
    setDeductsBalance(type.deducts_balance);
    setRequiresAttachment(type.requires_attachment);
    setAttachmentRequiredAfter(type.attachment_required_after ?? '');
    setMaxDaysPerRequest(type.max_days_per_request ?? '');
    setMinNoticeDays(type.min_notice_days ?? '');
    setGenderRestriction(type.gender_restriction ?? '');
    setIsActive(type.is_active);
    setIsModalOpen(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        code,
        name,
        default_quota: defaultQuota,
        deducts_balance: deductsBalance,
        requires_attachment: requiresAttachment,
        attachment_required_after: attachmentRequiredAfter === '' ? null : Number(attachmentRequiredAfter),
        max_days_per_request: maxDaysPerRequest === '' ? null : Number(maxDaysPerRequest),
        min_notice_days: minNoticeDays === '' ? null : Number(minNoticeDays),
        gender_restriction: genderRestriction === '' ? null : genderRestriction as 'male' | 'female',
        is_active: isActive
      };

      if (modalMode === 'create') {
        await createLeaveType(payload);
      } else if (selectedType) {
        await updateLeaveType(selectedType.id, payload);
      }
      setIsModalOpen(false);
      loadTypes();
    } catch (err: any) {
      setAlertMessage(err.message || 'Gagal menyimpan jenis cuti');
      setAlertOpen(true);
    }
  }

  function handleDelete(type: LeaveType) {
    setTypeToDelete(type);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (typeToDelete) {
      try {
        await deleteLeaveType(typeToDelete.id);
        setIsDeleteConfirmOpen(false);
        setTypeToDelete(null);
        loadTypes();
      } catch (err: any) {
        setIsDeleteConfirmOpen(false);
        if (err.code === 400 && err.details?.leave_request_count) {
          setAlertMessage(`Jenis cuti "${typeToDelete.name}" tidak bisa dihapus karena sudah dipakai di ${err.details.leave_request_count} pengajuan cuti. Anda bisa menonaktifkannya agar tidak bisa dipilih lagi.`);
          setSuggestDeactivateOpen(true);
        } else {
          setAlertMessage(err.message || 'Gagal menghapus jenis cuti');
          setAlertOpen(true);
        }
      }
    }
  }

  async function handleDeactivate() {
    if (typeToDelete) {
      try {
        await updateLeaveType(typeToDelete.id, { is_active: false });
        setSuggestDeactivateOpen(false);
        setTypeToDelete(null);
        loadTypes();
        setAlertMessage('Jenis cuti berhasil dinonaktifkan.');
        setAlertOpen(true);
      } catch (err: any) {
        setAlertMessage(err.message || 'Gagal menonaktifkan jenis cuti');
        setAlertOpen(true);
      }
    }
  }

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions">
          <div>
            <h1 className="dashboard-title">Master Jenis Cuti</h1>
            <p className="dashboard-subtitle">Kelola tipe-tipe cuti beserta aturannya.</p>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>+ Tambah Jenis Cuti</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Kuota</th>
                <th>Syarat</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : types.length === 0 ? (
                <tr><td colSpan={6} className="text-center empty-table-cell">Belum ada data jenis cuti.</td></tr>
              ) : (
                types.map(type => (
                  <tr key={type.id}>
                    <td><div style={{ fontWeight: 600 }}>{type.code}</div></td>
                    <td>{type.name}</td>
                    <td>
                      {type.deducts_balance ? (
                        <span>{type.default_quota} Hari/Tahun</span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Tidak Potong Saldo</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                        {type.requires_attachment ? (
                          <span>Lampiran: {type.attachment_required_after ? `> ${type.attachment_required_after} hari` : 'Wajib'}</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Lampiran: Opsional</span>
                        )}
                        {type.gender_restriction && (
                          <span>Khusus: {type.gender_restriction === 'male' ? 'Laki-laki' : 'Perempuan'}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {type.is_active ? (
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>Aktif</span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>Nonaktif</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(type)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(type)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'create' ? 'Tambah Jenis Cuti' : 'Ubah Jenis Cuti'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Kode <span style={{color: 'red'}}>*</span></label>
                    <input type="text" className="input-field" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required placeholder="Contoh: CT-ANNUAL" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama <span style={{color: 'red'}}>*</span></label>
                    <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Cuti Tahunan" />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="deductsBalance" checked={deductsBalance} onChange={e => setDeductsBalance(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="deductsBalance" className="form-label" style={{ margin: 0 }}>Memotong Saldo Cuti</label>
                </div>

                {deductsBalance && (
                  <div className="form-group">
                    <label className="form-label">Kuota Default per Tahun (Hari) <span style={{color: 'red'}}>*</span></label>
                    <input type="number" min={0} className="input-field" value={defaultQuota} onChange={e => setDefaultQuota(Number(e.target.value))} required />
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="requiresAttachment" checked={requiresAttachment} onChange={e => setRequiresAttachment(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="requiresAttachment" className="form-label" style={{ margin: 0 }}>Wajib Lampirkan Foto/Dokumen</label>
                </div>

                {requiresAttachment && (
                  <div className="form-group" style={{ paddingLeft: '24px' }}>
                    <label className="form-label">Wajib Jika Durasi Lebih Dari (Hari)</label>
                    <input type="number" min={0} className="input-field" value={attachmentRequiredAfter} onChange={e => setAttachmentRequiredAfter(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Kosongkan jika selalu wajib" />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Maks. Hari per Pengajuan</label>
                    <input type="number" min={1} className="input-field" value={maxDaysPerRequest} onChange={e => setMaxDaysPerRequest(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Tidak ada batas" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min. Notice (H-x)</label>
                    <input type="number" min={0} className="input-field" value={minNoticeDays} onChange={e => setMinNoticeDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Bisa diajukan kapan saja" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Batasan Gender</label>
                    <select className="input-field" value={genderRestriction} onChange={e => setGenderRestriction(e.target.value as any)}>
                      <option value="">Semua Gender</option>
                      <option value="male">Hanya Laki-laki</option>
                      <option value="female">Hanya Perempuan</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '32px' }}>
                    <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Aktif (Bisa Dipilih)</label>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Simpan' : 'Perbarui'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm & Alert Modals */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Hapus Jenis Cuti"
        message={`Apakah Anda yakin ingin menghapus jenis cuti "${typeToDelete?.name}"?`}
        confirmText="Hapus"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => { setIsDeleteConfirmOpen(false); setTypeToDelete(null); }}
      />

      <ConfirmModal
        isOpen={suggestDeactivateOpen}
        title="Gagal Menghapus"
        message={alertMessage}
        confirmText="Ya, Nonaktifkan"
        isDestructive={false}
        onConfirm={handleDeactivate}
        onCancel={() => { setSuggestDeactivateOpen(false); setTypeToDelete(null); }}
      />

      <AlertModal
        isOpen={alertOpen}
        title="Peringatan"
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}
