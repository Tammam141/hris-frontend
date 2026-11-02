import React, { useState, useEffect } from 'react';
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, LeaveType } from '../api/leave';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';

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
  const [defaultQuota, setDefaultQuota] = useState<number | ''>('');
  const [deductsBalance, setDeductsBalance] = useState(true);
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [attachmentRequiredAfter, setAttachmentRequiredAfter] = useState<number | ''>('');
  const [maxDaysPerRequest, setMaxDaysPerRequest] = useState<number | ''>('');
  const [minNoticeDays, setMinNoticeDays] = useState<number | ''>('');
  const [genderRestriction, setGenderRestriction] = useState<'male' | 'female' | ''>('');
  const [exemptFromStaffingLimit, setExemptFromStaffingLimit] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  // Validation Errors per Field
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete & Alert State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LeaveType | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Suggested Deactivation
  const [suggestDeactivateOpen, setSuggestDeactivateOpen] = useState(false);

  // Konfirmasi perubahan kuota & konflik kuota (409 affected)
  const [quotaConfirmOpen, setQuotaConfirmOpen] = useState(false);
  const [quotaConflict, setQuotaConflict] = useState<{ message: string; details: any } | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const [alertTitle, setAlertTitle] = useState('Peringatan');

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
    } catch (e: any) {
      const err = e as ApiError;
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
    setDefaultQuota('');
    setDeductsBalance(true);
    setRequiresAttachment(false);
    setAttachmentRequiredAfter('');
    setMaxDaysPerRequest('');
    setMinNoticeDays('');
    setGenderRestriction('');
    setExemptFromStaffingLimit(false);
    setIsActive(true);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(type: LeaveType) {
    setModalMode('edit');
    setSelectedType(type);
    setCode(type.code);
    setName(type.name);
    setDefaultQuota(type.default_quota ?? '');
    setDeductsBalance(type.deducts_balance);
    setRequiresAttachment(type.requires_attachment);
    setAttachmentRequiredAfter(type.attachment_required_after ?? '');
    setMaxDaysPerRequest(type.max_days_per_request ?? '');
    setMinNoticeDays(type.min_notice_days ?? '');
    setGenderRestriction(type.gender_restriction ?? '');
    setExemptFromStaffingLimit(type.exempt_from_staffing_limit ?? false);
    setIsActive(type.is_active);
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    // 1. Validasi Sisi Klien
    const newErrors: Record<string, string> = {};
    const quotaNum = defaultQuota === '' ? null : Number(defaultQuota);
    const reqAfterNum = attachmentRequiredAfter === '' ? null : Number(attachmentRequiredAfter);
    const maxDaysNum = maxDaysPerRequest === '' ? null : Number(maxDaysPerRequest);
    const noticeDaysNum = minNoticeDays === '' ? null : Number(minNoticeDays);

    if (deductsBalance) {
      if (quotaNum === null || quotaNum < 1 || quotaNum > 365) {
        newErrors.default_quota = 'Kuota wajib diisi 1 sampai 365 hari untuk cuti yang memotong saldo.';
      } else if (maxDaysNum !== null && maxDaysNum > quotaNum) {
        newErrors.max_days_per_request = 'Maksimal hari per pengajuan tidak boleh melebihi kuota.';
      }
    }

    if (reqAfterNum !== null && (reqAfterNum < 0 || reqAfterNum > 365)) {
      newErrors.attachment_required_after = 'Batas durasi wajib lampiran harus antara 0 dan 365 hari.';
    }

    if (maxDaysNum !== null && (maxDaysNum < 1 || maxDaysNum > 365)) {
      newErrors.max_days_per_request = 'Maksimal hari per pengajuan harus antara 1 dan 365 hari.';
    }

    if (noticeDaysNum !== null && (noticeDaysNum < 0 || noticeDaysNum > 90)) {
      newErrors.min_notice_days = 'Minimal notice harus antara 0 dan 90 hari.';
    }

    // Validasi antarkolom:
    // a. Jika requires_attachment aktif dan max_days_per_request diisi, attachment_required_after harus lebih kecil dari max_days_per_request
    if (requiresAttachment && reqAfterNum !== null && maxDaysNum !== null) {
      if (reqAfterNum >= maxDaysNum) {
        newErrors.attachment_required_after = 'Batas durasi wajib lampiran harus lebih kecil dari batas maksimal durasi cuti per pengajuan.';
      }
    }


    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    const quotaChanged =
      modalMode === 'edit' && selectedType &&
      deductsBalance && selectedType.deducts_balance &&
      selectedType.default_quota !== null &&
      quotaNum !== selectedType.default_quota;

    if (quotaChanged) {
      setQuotaConfirmOpen(true);
      return;
    }

    await saveType();
  }

  async function saveType() {
    setQuotaConfirmOpen(false);
    const quotaNum = defaultQuota === '' ? null : Number(defaultQuota);
    try {
      const payload: Partial<LeaveType> = {
        code,
        name,
        default_quota: deductsBalance ? quotaNum : null,
        deducts_balance: deductsBalance,
        requires_attachment: requiresAttachment,
        attachment_required_after: attachmentRequiredAfter === '' ? null : Number(attachmentRequiredAfter),
        max_days_per_request: maxDaysPerRequest === '' ? null : Number(maxDaysPerRequest),
        min_notice_days: minNoticeDays === '' ? null : Number(minNoticeDays),
        gender_restriction: genderRestriction === '' ? null : genderRestriction as 'male' | 'female',
        exempt_from_staffing_limit: exemptFromStaffingLimit
      };
      if (modalMode === 'edit') payload.is_active = isActive;

      let successMsg = '';
      if (modalMode === 'create') {
        await createLeaveType(payload);
      } else if (selectedType) {
        const res = await updateLeaveType(selectedType.id, { ...payload, updated_at: selectedType.updated_at });
        const match = (res?.message || '').match(/applies to (\d+) employee/i);
        if (match) successMsg = `Kuota baru diterapkan ke ${match[1]} karyawan.`;
      }
      setIsModalOpen(false);
      loadTypes();
      if (successMsg) {
        setAlertTitle('Berhasil');
        setAlertType('success');
        setAlertMessage(successMsg);
        setAlertOpen(true);
      }
    } catch (e: any) {
      const err = e as ApiError;
      if (err.status === 409 && Array.isArray(err.details?.affected)) {
        // Kuota diturunkan di bawah pemakaian karyawan (bukan stale data)
        setQuotaConflict({ message: err.message, details: err.details });
      } else if (err.status === 409 && err.details?.pending_requests !== undefined) {
        setAlertTitle('Peringatan');
        setAlertType('error');
        setAlertMessage(`Masih ada ${err.details.pending_requests} pengajuan cuti jenis ini yang menunggu persetujuan. Selesaikan dulu sebelum mengaktifkan potong saldo.`);
        setAlertOpen(true);
      } else if (isStaleData(err)) {
        setStaleDetails(err.details);
        setIsStaleModalOpen(true);
      } else if (err.errors && Array.isArray(err.errors)) {
        const backendErrors: Record<string, string> = {};
        err.errors.forEach((item: any) => {
          if (item.field) {
            backendErrors[item.field] = translateBackendMessage(item.field, item.message);
          }
        });
        if (Object.keys(backendErrors).length > 0) {
          setFormErrors(backendErrors);
          return;
        }
        setAlertTitle('Peringatan');
        setAlertType('error');
        setAlertMessage(err.message || 'Terdapat kesalahan validasi data');
        setAlertOpen(true);
      } else if (err.status === 409) {
        setFormErrors({ code: err.message || 'Kode jenis cuti sudah digunakan.' });
      } else {
        setAlertTitle('Peringatan');
        setAlertType('error');
        setAlertMessage(err.message || 'Gagal menyimpan jenis cuti');
        setAlertOpen(true);
      }
    }
  }

  function translateBackendMessage(field: string, message: string): string {
    const m = (message || '').toLowerCase();
    if (field === 'default_quota') {
      return 'Kuota wajib diisi 1 sampai 365 hari untuk cuti yang memotong saldo.';
    }
    if (field === 'max_days_per_request') {
      if (m.includes('quota')) return 'Maksimal hari per pengajuan tidak boleh melebihi kuota.';
      return 'Maksimal hari per pengajuan harus antara 1 dan 365 hari.';
    }
    if (field === 'attachment_required_after') {
      if (m.includes('less than') || m.includes('smaller') || m.includes('max')) {
        return 'Batas durasi wajib lampiran harus lebih kecil dari maksimal hari per pengajuan.';
      }
      return 'Batas durasi wajib lampiran harus antara 0 dan 365 hari.';
    }
    return message;
  }

  const handleStaleReload = () => {
    if (staleDetails?.current) {
      const current = staleDetails.current as LeaveType;
      setSelectedType(current);
      setCode(current.code);
      setName(current.name);
      setDefaultQuota(current.default_quota ?? '');
      setDeductsBalance(current.deducts_balance);
      setRequiresAttachment(current.requires_attachment);
      setAttachmentRequiredAfter(current.attachment_required_after ?? '');
      setMaxDaysPerRequest(current.max_days_per_request ?? '');
      setMinNoticeDays(current.min_notice_days ?? '');
      setGenderRestriction(current.gender_restriction ?? '');
      setExemptFromStaffingLimit(current.exempt_from_staffing_limit ?? false);
      setIsActive(current.is_active);
    }
    setIsStaleModalOpen(false);
  };

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
      } catch (e: any) {
      const err = e as ApiError;
        setIsDeleteConfirmOpen(false);
        if (err.status === 400 && err.details?.leave_request_count) {
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
        await updateLeaveType(typeToDelete.id, { is_active: false, updated_at: typeToDelete.updated_at });
        setSuggestDeactivateOpen(false);
        setTypeToDelete(null);
        loadTypes();
        setAlertMessage('Jenis cuti berhasil dinonaktifkan.');
        setAlertOpen(true);
      } catch (e: any) {
      const err = e as ApiError;
        if (isStaleData(err)) {
          setStaleDetails(err.details);
          setIsStaleModalOpen(true);
        } else {
          setAlertMessage(err.message || 'Gagal menonaktifkan jenis cuti');
          setAlertOpen(true);
        }
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
                        <span>{type.default_quota ?? '-'} Hari/Tahun</span>
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
                        {type.exempt_from_staffing_limit && (
                          <span style={{ color: '#0369a1', fontSize: '12px', fontWeight: 500 }}>
                            Bebas Batas Departemen
                          </span>
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
                    <input 
                      type="text" 
                      className={`input-field ${formErrors.code ? 'error-border' : ''}`}
                      style={formErrors.code ? { borderColor: '#ef4444' } : undefined}
                      value={code} 
                      onChange={e => { setCode(e.target.value.toUpperCase()); setFormErrors(prev => ({ ...prev, code: '' })); }} 
                      required 
                      placeholder="Contoh: CT-ANNUAL" 
                    />
                    {formErrors.code && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.code}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama <span style={{color: 'red'}}>*</span></label>
                    <input 
                      type="text" 
                      className={`input-field ${formErrors.name ? 'error-border' : ''}`}
                      style={formErrors.name ? { borderColor: '#ef4444' } : undefined}
                      value={name} 
                      onChange={e => { setName(e.target.value); setFormErrors(prev => ({ ...prev, name: '' })); }} 
                      required 
                      placeholder="Contoh: Cuti Tahunan" 
                    />
                    {formErrors.name && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    id="deductsBalance" 
                    checked={deductsBalance} 
                    onChange={e => setDeductsBalance(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} 
                  />
                  <label htmlFor="deductsBalance" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                    Memotong Saldo Cuti
                  </label>
                </div>

                {deductsBalance && (
                  <div className="form-group">
                    <label className="form-label">Kuota Default per Tahun (Hari) <span style={{color: 'red'}}>*</span></label>
                    <input 
                      type="number" 
                      min={1} 
                      max={365} 
                      step={1}
                      className={`input-field ${formErrors.default_quota ? 'error-border' : ''}`}
                      style={formErrors.default_quota ? { borderColor: '#ef4444' } : undefined}
                      value={defaultQuota} 
                      onChange={e => { setDefaultQuota(e.target.value === '' ? '' : Number(e.target.value)); setFormErrors(prev => ({ ...prev, default_quota: '' })); }} 
                      required 
                    />
                    {formErrors.default_quota && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.default_quota}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    id="requiresAttachment" 
                    checked={requiresAttachment} 
                    onChange={e => setRequiresAttachment(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} 
                  />
                  <label htmlFor="requiresAttachment" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                    Wajib Lampirkan Foto/Dokumen
                  </label>
                </div>

                {requiresAttachment && (
                  <div className="form-group" style={{ paddingLeft: '24px' }}>
                    <label className="form-label">Wajib Jika Durasi Lebih Dari (Hari)</label>
                    <input 
                      type="number" 
                      min={0} 
                      max={365} 
                      className={`input-field ${formErrors.attachment_required_after ? 'error-border' : ''}`}
                      style={formErrors.attachment_required_after ? { borderColor: '#ef4444' } : undefined}
                      value={attachmentRequiredAfter} 
                      onChange={e => { setAttachmentRequiredAfter(e.target.value === '' ? '' : Number(e.target.value)); setFormErrors(prev => ({ ...prev, attachment_required_after: '' })); }} 
                      placeholder="Kosongkan jika selalu wajib" 
                    />
                    {formErrors.attachment_required_after && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.attachment_required_after}</span>}
                  </div>
                )}

                <div className="leave-type-form-grid">
                  <div className="form-group">
                    <label className="form-label">Maks. Hari per Pengajuan</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={365} 
                      className={`input-field ${formErrors.max_days_per_request ? 'error-border' : ''}`}
                      style={formErrors.max_days_per_request ? { borderColor: '#ef4444' } : undefined}
                      value={maxDaysPerRequest} 
                      onChange={e => { setMaxDaysPerRequest(e.target.value === '' ? '' : Number(e.target.value)); setFormErrors(prev => ({ ...prev, max_days_per_request: '' })); }} 
                      placeholder="Tidak ada batas" 
                    />
                    {formErrors.max_days_per_request && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.max_days_per_request}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min. Notice (H-x)</label>
                    <input 
                      type="number" 
                      min={0} 
                      max={90} 
                      className={`input-field ${formErrors.min_notice_days ? 'error-border' : ''}`}
                      style={formErrors.min_notice_days ? { borderColor: '#ef4444' } : undefined}
                      value={minNoticeDays} 
                      onChange={e => { setMinNoticeDays(e.target.value === '' ? '' : Number(e.target.value)); setFormErrors(prev => ({ ...prev, min_notice_days: '' })); }} 
                      placeholder="Bisa diajukan kapan saja" 
                    />
                    {formErrors.min_notice_days && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.min_notice_days}</span>}
                  </div>
                </div>

                <div className="leave-type-form-grid">
                  <div className="form-group">
                    <label className="form-label">Batasan Gender</label>
                    <select className="input-field" value={genderRestriction} onChange={e => setGenderRestriction(e.target.value as any)}>
                      <option value="">Semua Gender</option>
                      <option value="male">Hanya Laki-laki</option>
                      <option value="female">Hanya Perempuan</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer', paddingTop: '28px' }}>
                    <input 
                      type="checkbox" 
                      id="isActive" 
                      checked={isActive} 
                      onChange={e => setIsActive(e.target.checked)} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} 
                    />
                    <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                      Aktif (Bisa Dipilih)
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', marginTop: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="checkbox" 
                    id="exemptFromStaffingLimit" 
                    checked={exemptFromStaffingLimit} 
                    onChange={e => setExemptFromStaffingLimit(e.target.checked)} 
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', margin: '2px 0 0 0', flexShrink: 0 }} 
                  />
                  <div>
                    <label htmlFor="exemptFromStaffingLimit" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                      Tidak terkena batas cuti bersamaan departemen
                    </label>
                    <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                      Untuk cuti darurat seperti sakit, duka, melahirkan
                    </span>
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ padding: '20px 28px', gap: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ minWidth: '100px', padding: '10px 20px' }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', padding: '10px 20px' }}>{modalMode === 'create' ? 'Simpan' : 'Perbarui'}</button>
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

      <ConfirmModal
        isOpen={quotaConfirmOpen}
        title="Konfirmasi Perubahan Kuota"
        message={`Kuota akan diubah dari ${selectedType?.default_quota} menjadi ${defaultQuota} hari untuk semua karyawan pada tahun ini. Lanjutkan?`}
        onConfirm={saveType}
        onCancel={() => setQuotaConfirmOpen(false)}
      />

      {quotaConflict && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setQuotaConflict(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Kuota Tidak Dapat Diturunkan</h2>
              <button className="modal-close-btn" onClick={() => setQuotaConflict(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginTop: 0 }}>
                Kuota tidak dapat diturunkan menjadi {quotaConflict.details.new_quota} hari pada tahun {quotaConflict.details.period_year} karena {quotaConflict.details.affected_count} karyawan sudah memakai atau mengajukan lebih dari itu.
              </p>
              <table className="employee-table" style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Jatah</th>
                    <th>Sisa saat ini</th>
                    <th>Sisa jika diubah</th>
                  </tr>
                </thead>
                <tbody>
                  {quotaConflict.details.affected.map((a: any) => (
                    <tr key={a.employee_id}>
                      <td>{a.employee_name}</td>
                      <td>{a.allocated}</td>
                      <td>{a.balance}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>{a.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotaConflict.details.affected_count > quotaConflict.details.affected.length && (
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 0 }}>
                  dan {quotaConflict.details.affected_count - quotaConflict.details.affected.length} karyawan lainnya
                </p>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 28px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setQuotaConflict(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertOpen}
        title={alertTitle}
        type={alertType}
        message={alertMessage}
        onClose={() => { setAlertOpen(false); setAlertTitle('Peringatan'); setAlertType('error'); }}
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
