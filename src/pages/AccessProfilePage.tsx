import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getFeatureMatrixApi,
  getAccessProfilesApi,
  createAccessProfileApi,
  updateAccessProfileApi,
  deleteAccessProfileApi,
  FeatureMatrixResponse,
  AccessProfile,
  FeatureItem,
} from '../api/features';
import { AlertModal } from '../components/ui/AlertModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';
import '../components/ui/access-profiles.css';

export function AccessProfilePage() {
  const [matrixData, setMatrixData] = useState<FeatureMatrixResponse | null>(null);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCodes, setFormCodes] = useState<Set<string>>(new Set());

  // Info callout message (e.g. "X ikut dicentang...", "Y ikut dicabut...")
  const [autoDependencyInfo, setAutoDependencyInfo] = useState<string | null>(null);
  const infoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search profile filter in left list
  const [searchProfileQuery, setSearchProfileQuery] = useState('');

  // Modals
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sensitive confirmation in review modal
  const [confirmedSensitive, setConfirmedSensitive] = useState(false);

  // Stale data
  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (keepSelectedId?: string | null) => {
    setIsLoading(true);
    try {
      const [matrixRes, profilesRes] = await Promise.all([
        getFeatureMatrixApi(),
        getAccessProfilesApi(),
      ]);

      if (matrixRes.success) {
        setMatrixData(matrixRes.data);
      }

      if (profilesRes.success) {
        setProfiles(profilesRes.data);

        // Select initial profile
        const targetId = keepSelectedId ?? selectedProfileId ?? profilesRes.data[0]?.id ?? null;
        if (targetId && profilesRes.data.some(p => p.id === targetId)) {
          selectProfile(targetId, profilesRes.data);
        } else if (profilesRes.data.length > 0) {
          selectProfile(profilesRes.data[0].id, profilesRes.data);
        } else {
          startNewProfile();
        }
      }
    } catch (e: any) {
      const error = e as ApiError;
      setAlertInfo({
        open: true,
        title: 'Error',
        message: error.message || 'Gagal memuat data paket akses',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper maps
  const allFeaturesMap = useMemo(() => {
    const map = new Map<string, FeatureItem>();
    matrixData?.categories?.forEach(cat => {
      cat.features.forEach(f => {
        map.set(f.code, f);
      });
    });
    return map;
  }, [matrixData?.categories]);

  const selectedProfile = useMemo(() => {
    if (isCreatingNew || !selectedProfileId) return null;
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId, isCreatingNew]);

  const selectProfile = (id: string, list: AccessProfile[] = profiles) => {
    const prof = list.find(p => p.id === id);
    if (!prof) return;

    setIsCreatingNew(false);
    setSelectedProfileId(id);
    setFormName(prof.name);
    setFormDesc(prof.description || '');
    setFormCodes(new Set(prof.codes || []));
    setAutoDependencyInfo(null);
  };

  const startNewProfile = () => {
    setIsCreatingNew(true);
    setSelectedProfileId(null);
    setFormName('');
    setFormDesc('');
    setFormCodes(new Set());
    setAutoDependencyInfo(null);
  };

  const handleResetForm = () => {
    if (isCreatingNew) {
      startNewProfile();
    } else if (selectedProfile) {
      setFormName(selectedProfile.name);
      setFormDesc(selectedProfile.description || '');
      setFormCodes(new Set(selectedProfile.codes || []));
      setAutoDependencyInfo(null);
    }
  };

  // Check if form is dirty (modified)
  const isDirty = useMemo(() => {
    if (isCreatingNew) {
      return formName.trim().length > 0 || formDesc.trim().length > 0 || formCodes.size > 0;
    }
    if (!selectedProfile) return false;

    if (formName !== selectedProfile.name) return true;
    if (formDesc !== (selectedProfile.description || '')) return true;

    const origCodes = new Set(selectedProfile.codes || []);
    if (formCodes.size !== origCodes.size) return true;
    for (const code of formCodes) {
      if (!origCodes.has(code)) return true;
    }

    return false;
  }, [isCreatingNew, selectedProfile, formName, formDesc, formCodes]);

  // Feature dependency handling
  const showCalloutInfo = (msg: string) => {
    if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
    setAutoDependencyInfo(msg);
    infoTimeoutRef.current = setTimeout(() => {
      setAutoDependencyInfo(null);
    }, 7000);
  };

  const handleToggleFeature = (code: string, isChecked: boolean) => {
    const feat = allFeaturesMap.get(code);
    const targetName = feat?.name || code;

    if (isChecked) {
      // 1. Add feature and all its transitive requirements
      const toAdd = new Set<string>();
      const queue = [code];

      while (queue.length > 0) {
        const curr = queue.shift()!;
        toAdd.add(curr);
        const item = allFeaturesMap.get(curr);
        if (item?.requires) {
          for (const req of item.requires) {
            if (!toAdd.has(req) && !formCodes.has(req)) {
              queue.push(req);
            }
          }
        }
      }

      // Check which additional features were auto-added
      const autoAddedCodes = Array.from(toAdd).filter(c => c !== code && !formCodes.has(c));
      if (autoAddedCodes.length > 0) {
        const autoNames = autoAddedCodes.map(c => allFeaturesMap.get(c)?.name || c).join(', ');
        showCalloutInfo(`"${autoNames}" ikut dicentang karena dibutuhkan oleh "${targetName}".`);
      }

      setFormCodes(prev => {
        const next = new Set(prev);
        toAdd.forEach(c => next.add(c));
        return next;
      });
    } else {
      // 2. Remove feature and any checked feature that requires it
      const toRemove = new Set<string>([code]);
      let changed = true;

      while (changed) {
        changed = false;
        for (const checkedCode of formCodes) {
          if (!toRemove.has(checkedCode)) {
            const item = allFeaturesMap.get(checkedCode);
            if (item?.requires?.some(r => toRemove.has(r))) {
              toRemove.add(checkedCode);
              changed = true;
            }
          }
        }
      }

      const autoRemovedCodes = Array.from(toRemove).filter(c => c !== code);
      if (autoRemovedCodes.length > 0) {
        const autoNames = autoRemovedCodes.map(c => allFeaturesMap.get(c)?.name || c).join(', ');
        showCalloutInfo(`"${autoNames}" ikut dicabut karena membutuhkan "${targetName}".`);
      }

      setFormCodes(prev => {
        const next = new Set(prev);
        toRemove.forEach(c => next.delete(c));
        return next;
      });
    }
  };

  // Diff calculation for review modal
  const diffFeatures = useMemo(() => {
    const origCodes = new Set(selectedProfile?.codes || []);
    const added: FeatureItem[] = [];
    const removed: FeatureItem[] = [];

    formCodes.forEach(code => {
      if (!origCodes.has(code)) {
        const f = allFeaturesMap.get(code);
        if (f) added.push(f);
      }
    });

    origCodes.forEach(code => {
      if (!formCodes.has(code)) {
        const f = allFeaturesMap.get(code);
        if (f) removed.push(f);
      }
    });

    const hasAddedSensitive = added.some(f => f.is_sensitive);
    const addedSensitiveNames = added.filter(f => f.is_sensitive).map(f => f.name);

    return {
      added,
      removed,
      hasAddedSensitive,
      addedSensitiveNames,
    };
  }, [selectedProfile, formCodes, allFeaturesMap]);

  const handleOpenReview = () => {
    setConfirmedSensitive(false);
    setIsReviewModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (formName.trim().length < 3) return;
    setIsSaving(true);

    try {
      const payloadCodes = Array.from(formCodes);

      if (isCreatingNew) {
        const res = await createAccessProfileApi({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          codes: payloadCodes,
        });

        setAlertInfo({
          open: true,
          title: 'Berhasil',
          message: res.message || `Paket akses "${res.data.name}" berhasil dibuat.`,
          type: 'success',
        });

        setIsReviewModalOpen(false);
        await loadAllData(res.data.id);
      } else if (selectedProfile) {
        const res = await updateAccessProfileApi(selectedProfile.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          codes: payloadCodes,
          updated_at: selectedProfile.updated_at,
        });

        setAlertInfo({
          open: true,
          title: 'Berhasil',
          message: res.message || `Paket akses "${res.data.name}" berhasil diperbarui.`,
          type: 'success',
        });

        setIsReviewModalOpen(false);
        await loadAllData(selectedProfile.id);
      }
    } catch (e: any) {
      const error = e as ApiError;
      if (isStaleData(error)) {
        setIsReviewModalOpen(false);
        setStaleDetails(error.details);
        setIsStaleModalOpen(true);
      } else {
        let msg = error.message || 'Gagal menyimpan paket akses';
        if (error.details?.missing_requirements) {
          msg = 'Fitur yang dibutuhkan belum lengkap: ' + JSON.stringify(error.details.missing_requirements);
        } else if (error.details?.unknown_codes) {
          msg = 'Kode fitur tidak dikenal: ' + error.details.unknown_codes.join(', ');
        }
        setAlertInfo({
          open: true,
          title: 'Gagal Menyimpan',
          message: msg,
          type: 'error',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    setIsSaving(true);

    try {
      const res = await deleteAccessProfileApi(selectedProfile.id);
      setAlertInfo({
        open: true,
        title: 'Berhasil Dihapus',
        message: res.message || `Paket "${selectedProfile.name}" telah dihapus.`,
        type: 'success',
      });
      setConfirmDeleteOpen(false);
      await loadAllData();
    } catch (e: any) {
      const error = e as ApiError;
      let msg = error.message || 'Gagal menghapus paket akses';
      if (error.status === 409) {
        msg = `Paket tidak dapat dihapus karena masih digunakan oleh ${selectedProfile.position_count} jabatan.`;
      }
      setAlertInfo({
        open: true,
        title: 'Gagal Menghapus',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfileList = useMemo(() => {
    const q = searchProfileQuery.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter(p =>
      p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }, [profiles, searchProfileQuery]);

  if (isLoading) {
    return (
      <div className="access-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#64748b' }}>Memuat data paket akses...</p>
      </div>
    );
  }

  return (
    <div className="access-page-container">
      {/* Header */}
      <div className="access-page-header">
        <h1 className="access-page-title">Paket Akses</h1>
        <p className="access-page-subtitle">
          Kelola template paket fitur. Perubahan fitur di dalam paket langsung berlaku ke semua jabatan pemakainya.
        </p>
      </div>

      {/* Split view: Left List, Right Editor */}
      <div className="profile-split-view">
        {/* Left Column: Profile Feed */}
        <div className="profile-list-panel">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="access-search-input"
              placeholder="Cari paket akses..."
              value={searchProfileQuery}
              onChange={e => setSearchProfileQuery(e.target.value)}
              style={{ flex: 1 }}
              aria-label="Cari paket akses"
            />
            <button
              type="button"
              className="btn-access btn-access-primary"
              onClick={startNewProfile}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px' }}
            >
              + Paket Baru
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            {filteredProfileList.map(prof => {
              const isActive = !isCreatingNew && selectedProfileId === prof.id;
              return (
                <div
                  key={prof.id}
                  className={`profile-card ${isActive ? 'active' : ''}`}
                  onClick={() => selectProfile(prof.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') selectProfile(prof.id); }}
                >
                  <div className="profile-card-header">
                    <span className="profile-card-title">{prof.name}</span>
                    {prof.is_system ? (
                      <span className="badge-standard">Standar</span>
                    ) : (
                      <span className="badge-custom">Kustom</span>
                    )}
                  </div>

                  <p className="profile-card-desc">
                    {prof.description || 'Tidak ada deskripsi.'}
                  </p>

                  <div className="profile-card-footer">
                    <span>{prof.codes?.length || 0} fitur</span>
                    <span>·</span>
                    <span>{prof.position_count || 0} jabatan</span>
                    <span>·</span>
                    <span>{prof.employee_count || 0} karyawan</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Editor */}
        <div className="profile-editor-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {isCreatingNew ? 'Buat Paket Akses Baru' : `Editor: ${selectedProfile?.name || 'Paket'}`}
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {isCreatingNew
                  ? 'Tentukan nama dan pilih hak akses fitur untuk paket ini.'
                  : selectedProfile?.is_system
                  ? 'Paket standar sistem (dapat disesuaikan).'
                  : 'Paket kustom yang dibuat organisasi.'}
              </span>
            </div>

            {!isCreatingNew && selectedProfile && !selectedProfile.is_system && (
              <button
                type="button"
                className="btn-access btn-access-danger"
                disabled={selectedProfile.position_count > 0}
                title={selectedProfile.position_count > 0 ? `Paket masih digunakan oleh ${selectedProfile.position_count} jabatan.` : 'Hapus paket ini'}
                onClick={() => setConfirmDeleteOpen(true)}
                style={{ padding: '8px 12px', minHeight: '38px', fontSize: '13px' }}
              >
                Hapus Paket
              </button>
            )}
          </div>

          {/* Form fields */}
          <div className="editor-form-group">
            <label htmlFor="input-profile-name" className="editor-label">
              Nama Paket <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="input-profile-name"
              type="text"
              className="editor-input"
              placeholder="Contoh: Staf HR, Tim Payroll, Lead Engineer"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              minLength={3}
              required
            />
          </div>

          <div className="editor-form-group">
            <label htmlFor="input-profile-desc" className="editor-label">
              Deskripsi
            </label>
            <textarea
              id="input-profile-desc"
              className="editor-textarea"
              placeholder="Jelaskan tujuan dan fungsi utama dari paket akses ini..."
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              rows={2}
            />
          </div>

          {/* Auto dependency notification callout */}
          {autoDependencyInfo && (
            <div className="info-callout-toast">
              <span>ℹ️ {autoDependencyInfo}</span>
              <button
                type="button"
                onClick={() => setAutoDependencyInfo(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Feature Categories & Checkboxes */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Daftar Fitur Sistem
            </h3>

            {matrixData?.categories?.map(category => {
              const totalInCat = category.features.length;
              const checkedInCat = category.features.filter(f => formCodes.has(f.code)).length;

              return (
                <div key={category.category} className="feature-area-section">
                  <div className="feature-area-header">
                    <span className="feature-area-title">
                      {category.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                      {checkedInCat} dari {totalInCat}
                    </span>
                  </div>

                  <div className="feature-cards-grid">
                    {category.features.map(feat => {
                      const isChecked = formCodes.has(feat.code);
                      const requiresNames = (feat.requires || [])
                        .map(r => allFeaturesMap.get(r)?.name || r)
                        .filter(Boolean);

                      return (
                        <label
                          key={feat.id}
                          htmlFor={`feat-chk-${feat.code}`}
                          className={`feature-card-label ${isChecked ? 'checked' : ''}`}
                        >
                          <input
                            id={`feat-chk-${feat.code}`}
                            type="checkbox"
                            className="feature-card-checkbox"
                            checked={isChecked}
                            onChange={e => handleToggleFeature(feat.code, e.target.checked)}
                          />

                          <div className="feature-card-content">
                            <div className="feature-card-title-row">
                              <span className="feature-card-name">{feat.name}</span>
                              {feat.is_sensitive && (
                                <span className="badge-sensitive">
                                  Sensitif
                                </span>
                              )}
                            </div>

                            <p className="feature-card-desc">
                              {feat.description || 'Tidak ada keterangan fitur.'}
                            </p>

                            {requiresNames.length > 0 && (
                              <div className="feature-card-requires">
                                Otomatis ikut: {requiresNames.join(', ')}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Editor */}
      {isDirty && (
        <div className="access-sticky-bar">
          <div className="access-sticky-text">
            <span>
              {isCreatingNew ? 'Paket baru belum disimpan' : 'Perubahan paket belum disimpan'}
            </span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span style={{ color: '#475569', fontWeight: 500 }}>
              {isCreatingNew
                ? 'Paket baru akan tersedia untuk semua jabatan'
                : `Berlaku untuk ${selectedProfile?.position_count || 0} jabatan dan ${selectedProfile?.employee_count || 0} karyawan`}
            </span>
          </div>

          <div className="access-sticky-actions">
            <button
              type="button"
              className="btn-access btn-access-secondary"
              onClick={handleResetForm}
              disabled={isSaving}
            >
              Batalkan
            </button>
            <button
              type="button"
              className="btn-access btn-access-primary"
              disabled={!isDirty || formName.trim().length < 3 || isSaving}
              onClick={handleOpenReview}
            >
              Tinjau perubahan
            </button>
          </div>
        </div>
      )}

      {/* Review Changes Modal */}
      {isReviewModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !isSaving && setIsReviewModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Tinjau Perubahan Paket Akses</h2>
              <button
                className="modal-close-btn"
                onClick={() => !isSaving && setIsReviewModalOpen(false)}
                disabled={isSaving}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {formName}
                </div>
                {formDesc && (
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    {formDesc}
                  </p>
                )}
                {!isCreatingNew && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                    Diterapkan ke <strong>{selectedProfile?.position_count || 0} jabatan</strong> dan <strong>{selectedProfile?.employee_count || 0} karyawan</strong>.
                  </div>
                )}
              </div>

              {/* Added Features */}
              {diffFeatures.added.length > 0 && (
                <div className="diff-section">
                  <span className="diff-title" style={{ color: '#16a34a' }}>
                    + Fitur Ditambah ({diffFeatures.added.length}):
                  </span>
                  <div>
                    {diffFeatures.added.map(f => (
                      <span key={f.code} className="diff-badge-add">
                        + {f.name} {f.is_sensitive ? '(Sensitif)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Features */}
              {diffFeatures.removed.length > 0 && (
                <div className="diff-section">
                  <span className="diff-title" style={{ color: '#dc2626' }}>
                    - Fitur Dicabut ({diffFeatures.removed.length}):
                  </span>
                  <div>
                    {diffFeatures.removed.map(f => (
                      <span key={f.code} className="diff-badge-remove">
                        - {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {diffFeatures.added.length === 0 && diffFeatures.removed.length === 0 && (
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Hanya nama atau deskripsi paket yang diubah.
                </p>
              )}

              {/* Sensitive Warning & Mandatory Confirmation */}
              {diffFeatures.hasAddedSensitive && (
                <div className="warning-callout-box" style={{ marginTop: '16px' }}>
                  <p className="warning-callout-text" style={{ fontWeight: 600, marginBottom: '8px' }}>
                    ⚠️ Perhatian: Paket ini menambahkan fitur berstatus Sensitif:
                  </p>
                  <ul style={{ margin: '0 0 12px 18px', fontSize: '13px', color: '#92400e' }}>
                    {diffFeatures.addedSensitiveNames.map(name => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>

                  <label
                    htmlFor="chk-confirm-sensitive"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#78350f',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      id="chk-confirm-sensitive"
                      type="checkbox"
                      checked={confirmedSensitive}
                      onChange={e => setConfirmedSensitive(e.target.checked)}
                      style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#d97706' }}
                    />
                    <span>
                      Saya paham paket ini memberi fitur sensitif ({diffFeatures.addedSensitiveNames.join(', ')}) kepada {selectedProfile?.employee_count || 0} karyawan.
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-access btn-access-secondary"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-access btn-access-primary"
                onClick={handleSaveProfile}
                disabled={isSaving || (diffFeatures.hasAddedSensitive && !confirmedSensitive)}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        title="Hapus Paket Akses"
        message={`Apakah Anda yakin ingin menghapus paket akses "${selectedProfile?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        isDestructive={true}
        onConfirm={handleDeleteProfile}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Stale Data Modal */}
      <StaleDataModal
        isOpen={isStaleModalOpen}
        onClose={() => setIsStaleModalOpen(false)}
        onReload={() => {
          setIsStaleModalOpen(false);
          loadAllData(selectedProfileId);
        }}
        details={staleDetails}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.title}
        message={alertInfo.message}
        type={alertInfo.type}
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
