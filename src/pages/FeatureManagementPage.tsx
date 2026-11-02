import { useState, useEffect, useMemo } from 'react';
import {
  getFeatureMatrixApi,
  updatePositionAccessProfileApi,
  FeatureMatrixResponse,
  AccessProfile,
  FeatureItem,
} from '../api/features';
import { getPositions } from '../api/position';
import { getMeApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { AlertModal } from '../components/ui/AlertModal';
import { StaleDataModal } from '../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../utils/staleData';
import { ApiError } from '../api/client';
import '../components/ui/access-profiles.css';

export function FeatureManagementPage() {
  const { refreshUser } = useAuth();
  const [matrixData, setMatrixData] = useState<FeatureMatrixResponse | null>(null);
  const [positionHolders, setPositionHolders] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Staged changes: positionId -> new access_profile_id (or null for "Tanpa paket")
  const [stagedAssignments, setStagedAssignments] = useState<Record<string, string | null>>({});

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterProfileId, setSelectedFilterProfileId] = useState<string>('ALL'); // 'ALL' | 'NONE' | profileId

  // Modals & Alerts
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [matrixRes, positionsRes] = await Promise.allSettled([
        getFeatureMatrixApi(),
        getPositions(),
      ]);

      if (matrixRes.status === 'fulfilled' && matrixRes.value.success) {
        setMatrixData(matrixRes.value.data);
      }

      if (positionsRes.status === 'fulfilled' && positionsRes.value.success) {
        const holderMap: Record<string, number> = {};
        positionsRes.value.data.forEach(p => {
          if (p.current_holders !== undefined) {
            holderMap[p.id] = p.current_holders;
          }
        });
        setPositionHolders(holderMap);
      }
    } catch (e: any) {
      const error = e as ApiError;
      setAlertInfo({
        open: true,
        title: 'Error',
        message: error.message || 'Gagal memuat data akses jabatan',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper maps & sets
  const profilesMap = useMemo(() => {
    const map = new Map<string, AccessProfile>();
    matrixData?.access_profiles?.forEach(ap => {
      map.set(ap.id, ap);
    });
    return map;
  }, [matrixData?.access_profiles]);

  const allFeaturesMap = useMemo(() => {
    const map = new Map<string, FeatureItem>();
    matrixData?.categories?.forEach(cat => {
      cat.features.forEach(f => {
        map.set(f.code, f);
      });
    });
    return map;
  }, [matrixData?.categories]);

  const sensitiveFeatureCodes = useMemo(() => {
    const codes = new Set<string>();
    matrixData?.categories?.forEach(cat => {
      cat.features.forEach(f => {
        if (f.is_sensitive) {
          codes.add(f.code);
        }
      });
    });
    return codes;
  }, [matrixData?.categories]);

  // Check if profile contains sensitive features
  const profileHasSensitive = (profileId: string | null | undefined): boolean => {
    if (!profileId) return false;
    const profile = profilesMap.get(profileId);
    if (!profile) return false;
    return profile.codes.some(c => sensitiveFeatureCodes.has(c));
  };

  // Positions with effective profile id
  const positionsWithEffectiveProfile = useMemo(() => {
    if (!matrixData?.positions) return [];
    return matrixData.positions.map(p => {
      const currentAssignedId = stagedAssignments[p.id] !== undefined
        ? stagedAssignments[p.id]
        : (p.access_profile_id ?? null);
      const isModified = stagedAssignments[p.id] !== undefined && stagedAssignments[p.id] !== (p.access_profile_id ?? null);
      return {
        ...p,
        effectiveProfileId: currentAssignedId,
        isModified,
        originalProfileId: p.access_profile_id ?? null,
      };
    });
  }, [matrixData?.positions, stagedAssignments]);

  // Changed positions list for bottom bar & review modal
  const modifiedPositions = useMemo(() => {
    return positionsWithEffectiveProfile.filter(p => p.isModified);
  }, [positionsWithEffectiveProfile]);

  const totalImpactedEmployees = useMemo(() => {
    return modifiedPositions.reduce((acc, p) => acc + (positionHolders[p.id] || 0), 0);
  }, [modifiedPositions, positionHolders]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalPositions = matrixData?.positions?.length || 0;
    let withProfileCount = 0;
    let withoutProfileCount = 0;
    let sensitiveCount = 0;

    matrixData?.positions?.forEach(p => {
      const profId = p.access_profile_id;
      if (profId) {
        withProfileCount++;
        if (profileHasSensitive(profId)) {
          // Count employees holding sensitive features
          sensitiveCount += (positionHolders[p.id] || 1);
        }
      } else {
        withoutProfileCount++;
      }
    });

    return {
      totalPositions,
      withProfileCount,
      withoutProfileCount,
      sensitiveCount,
    };
  }, [matrixData?.positions, profilesMap, sensitiveFeatureCodes, positionHolders]);

  // Profile counts for filter chips
  const profileFilterCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0, NONE: 0 };
    matrixData?.positions?.forEach(p => {
      counts.ALL++;
      const profId = p.access_profile_id;
      if (!profId) {
        counts.NONE++;
      } else {
        counts[profId] = (counts[profId] || 0) + 1;
      }
    });
    return counts;
  }, [matrixData?.positions]);

  // Filtered positions for table
  const filteredPositions = useMemo(() => {
    return positionsWithEffectiveProfile.filter(pos => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = pos.name.toLowerCase().includes(q);
        const matchDept = (pos.department_name || '').toLowerCase().includes(q);
        if (!matchName && !matchDept) return false;
      }

      // 2. Chip filter (based on original profile or effective profile? based on current status)
      if (selectedFilterProfileId === 'ALL') return true;
      if (selectedFilterProfileId === 'NONE') return pos.originalProfileId === null;
      return pos.originalProfileId === selectedFilterProfileId;
    });
  }, [positionsWithEffectiveProfile, searchQuery, selectedFilterProfileId]);

  const handleProfileSelectChange = (positionId: string, value: string) => {
    const newProfileId = value === '' ? null : value;
    const pos = matrixData?.positions.find(p => p.id === positionId);
    const orig = pos?.access_profile_id ?? null;

    setStagedAssignments(prev => {
      if (newProfileId === orig) {
        const next = { ...prev };
        delete next[positionId];
        return next;
      }
      return { ...prev, [positionId]: newProfileId };
    });
  };

  const handleResetChanges = () => {
    setStagedAssignments({});
  };

  const handleSaveAll = async () => {
    if (modifiedPositions.length === 0) return;
    setIsSaving(true);

    try {
      for (const pos of modifiedPositions) {
        const targetProfileId = stagedAssignments[pos.id];
        await updatePositionAccessProfileApi(pos.id, {
          access_profile_id: targetProfileId,
          updated_at: pos.updated_at,
        });
      }

      // Refresh current user permissions in case their own position was updated
      const meRes = await getMeApi();
      if (meRes.success) {
        refreshUser(meRes.data);
      }

      setAlertInfo({
        open: true,
        title: 'Berhasil Disimpan',
        message: `${modifiedPositions.length} akses jabatan berhasil diperbarui.`,
        type: 'success',
      });

      setStagedAssignments({});
      setIsReviewModalOpen(false);
      await loadData();
    } catch (e: any) {
      const error = e as ApiError;
      if (isStaleData(error)) {
        setIsReviewModalOpen(false);
        setStaleDetails(error.details);
        setIsStaleModalOpen(true);
      } else {
        setAlertInfo({
          open: true,
          title: 'Gagal Menyimpan',
          message: error.message || 'Terjadi kesalahan saat memperbarui akses jabatan.',
          type: 'error',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStaleReload = () => {
    setIsStaleModalOpen(false);
    setStagedAssignments({});
    loadData();
  };

  if (isLoading) {
    return (
      <div className="access-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#64748b' }}>Memuat data akses jabatan...</p>
      </div>
    );
  }

  return (
    <div className="access-page-container">
      {/* Page Header */}
      <div className="access-page-header">
        <h1 className="access-page-title">Akses Jabatan</h1>
        <p className="access-page-subtitle">
          Tentukan paket akses untuk setiap jabatan. Pengaturan ini langsung menentukan hak akses seluruh pemegang jabatan.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="access-summary-grid">
        <div className="access-stat-card">
          <span className="access-stat-label">Jumlah Jabatan</span>
          <span className="access-stat-value">{summaryMetrics.totalPositions}</span>
          <span className="access-stat-subtext">Terdaftar di sistem</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Paket Dipakai</span>
          <span className="access-stat-value" style={{ color: '#0369a1' }}>
            {summaryMetrics.withProfileCount}
          </span>
          <span className="access-stat-subtext">Memiliki hak akses khusus</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Tanpa Paket</span>
          <span className="access-stat-value" style={{ color: '#64748b' }}>
            {summaryMetrics.withoutProfileCount}
          </span>
          <span className="access-stat-subtext">Hanya swalayan mandiri</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Pemegang Fitur Sensitif</span>
          <span className="access-stat-value" style={{ color: '#b45309' }}>
            {summaryMetrics.sensitiveCount}
          </span>
          <span className="access-stat-subtext">Karyawan berwenang tinggi</span>
        </div>
      </div>

      {/* Filter Bar & Chips */}
      <div className="access-filter-bar">
        <input
          type="text"
          className="access-search-input"
          placeholder="Cari nama jabatan atau unit kerja..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Cari jabatan"
        />

        <div className="access-chips-wrapper">
          <button
            type="button"
            className={`access-chip ${selectedFilterProfileId === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedFilterProfileId('ALL')}
          >
            Semua
            <span className="access-chip-count">{profileFilterCounts.ALL || 0}</span>
          </button>

          <button
            type="button"
            className={`access-chip ${selectedFilterProfileId === 'NONE' ? 'active' : ''}`}
            onClick={() => setSelectedFilterProfileId('NONE')}
          >
            Tanpa paket
            <span className="access-chip-count">{profileFilterCounts.NONE || 0}</span>
          </button>

          {matrixData?.access_profiles?.map(prof => (
            <button
              key={prof.id}
              type="button"
              className={`access-chip ${selectedFilterProfileId === prof.id ? 'active' : ''}`}
              onClick={() => setSelectedFilterProfileId(prof.id)}
            >
              {prof.name}
              <span className="access-chip-count">{profileFilterCounts[prof.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="access-table-card">
        <table className="access-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Jabatan</th>
              <th style={{ width: '18%' }}>Unit</th>
              <th style={{ width: '12%' }}>Pemegang</th>
              <th style={{ width: '25%' }}>Paket Akses</th>
              <th style={{ width: '20%' }}>Yang Bisa Dilakukan</th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  Tidak ada jabatan yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredPositions.map(pos => {
                const assignedProfile = pos.effectiveProfileId ? profilesMap.get(pos.effectiveProfileId) : null;
                const origProfile = pos.originalProfileId ? profilesMap.get(pos.originalProfileId) : null;
                const hasSensitive = profileHasSensitive(pos.effectiveProfileId);

                return (
                  <tr key={pos.id} className={pos.isModified ? 'access-row-modified' : ''}>
                    {/* Jabatan */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{pos.name}</div>
                      {pos.is_unit_head && (
                        <span className="badge-unit-head">Kepala unit</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td>
                      <span style={{ color: '#475569' }}>{pos.department_name || '-'}</span>
                    </td>

                    {/* Pemegang */}
                    <td>
                      <span style={{ color: '#334155', fontWeight: 500 }}>
                        {positionHolders[pos.id] !== undefined ? `${positionHolders[pos.id]} orang` : '-'}
                      </span>
                    </td>

                    {/* Paket Akses Dropdown */}
                    <td>
                      <div className="access-select-wrapper">
                        <label htmlFor={`select-pos-${pos.id}`} className="sr-only" style={{ display: 'none' }}>
                          Pilih Paket Akses untuk {pos.name}
                        </label>
                        <select
                          id={`select-pos-${pos.id}`}
                          className="access-select"
                          value={pos.effectiveProfileId || ''}
                          onChange={e => handleProfileSelectChange(pos.id, e.target.value)}
                        >
                          <option value="">Tanpa paket (swalayan)</option>
                          {matrixData?.access_profiles?.map(prof => (
                            <option key={prof.id} value={prof.id}>
                              {prof.name} {prof.is_system ? '(Standar)' : ''}
                            </option>
                          ))}
                        </select>

                        {pos.isModified && (
                          <span className="access-change-label">
                            Diubah dari: {origProfile?.name || 'Tanpa paket'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Yang Bisa Dilakukan */}
                    <td>
                      {assignedProfile ? (
                        <div>
                          {assignedProfile.description && (
                            <span className="capability-chip">
                              {assignedProfile.description.length > 40
                                ? assignedProfile.description.slice(0, 40) + '...'
                                : assignedProfile.description}
                            </span>
                          )}
                          {hasSensitive && (
                            <span className="badge-sensitive">
                              ⚠️ Fitur sensitif
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="capability-chip">
                          Swalayan (absen, cuti, profil)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom Bar when changes exist */}
      {modifiedPositions.length > 0 && (
        <div className="access-sticky-bar">
          <div className="access-sticky-text">
            <span>
              {modifiedPositions.length} jabatan diubah, belum disimpan
            </span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span style={{ color: '#475569', fontWeight: 500 }}>
              Berdampak pada {totalImpactedEmployees} karyawan
            </span>
          </div>

          <div className="access-sticky-actions">
            <button
              type="button"
              className="btn-access btn-access-secondary"
              onClick={handleResetChanges}
              disabled={isSaving}
            >
              Batalkan
            </button>
            <button
              type="button"
              className="btn-access btn-access-primary"
              onClick={() => setIsReviewModalOpen(true)}
              disabled={isSaving}
            >
              Tinjau dan simpan
            </button>
          </div>
        </div>
      )}

      {/* Modal Tinjau dan Simpan */}
      {isReviewModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !isSaving && setIsReviewModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Tinjau Perubahan Akses Jabatan</h2>
              <button
                className="modal-close-btn"
                onClick={() => !isSaving && setIsReviewModalOpen(false)}
                disabled={isSaving}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '12px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '18px' }}>
                Berikut adalah ringkasan perubahan hak akses fitur untuk <strong>{modifiedPositions.length} jabatan</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {modifiedPositions.map(pos => {
                  const oldProf = pos.originalProfileId ? profilesMap.get(pos.originalProfileId) : null;
                  const newProf = stagedAssignments[pos.id] ? profilesMap.get(stagedAssignments[pos.id]!) : null;

                  const oldCodes = new Set(oldProf?.codes || []);
                  const newCodes = new Set(newProf?.codes || []);

                  const addedFeatures: FeatureItem[] = [];
                  const removedFeatures: FeatureItem[] = [];

                  newCodes.forEach(code => {
                    if (!oldCodes.has(code)) {
                      const feat = allFeaturesMap.get(code);
                      if (feat) addedFeatures.push(feat);
                    }
                  });

                  oldCodes.forEach(code => {
                    if (!newCodes.has(code)) {
                      const feat = allFeaturesMap.get(code);
                      if (feat) removedFeatures.push(feat);
                    }
                  });

                  const givesSensitive = newProf ? profileHasSensitive(newProf.id) : false;

                  return (
                    <div
                      key={pos.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{pos.name}</span>
                          {pos.department_name && (
                            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                              ({pos.department_name})
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {positionHolders[pos.id] || 0} karyawan
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
                        <span style={{ color: '#64748b' }}>{oldProf?.name || 'Tanpa paket'}</span>
                        <span style={{ margin: '0 8px', color: '#94a3b8' }}>&rarr;</span>
                        <strong style={{ color: '#2563eb' }}>{newProf?.name || 'Tanpa paket'}</strong>
                      </div>

                      {/* Diff lists */}
                      {addedFeatures.length > 0 && (
                        <div className="diff-section" style={{ marginBottom: '8px' }}>
                          <span className="diff-title" style={{ color: '#16a34a' }}>
                            + Fitur Ditambah ({addedFeatures.length}):
                          </span>
                          <div>
                            {addedFeatures.map(f => (
                              <span key={f.code} className="diff-badge-add">
                                + {f.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {removedFeatures.length > 0 && (
                        <div className="diff-section" style={{ marginBottom: '8px' }}>
                          <span className="diff-title" style={{ color: '#dc2626' }}>
                            - Fitur Dicabut ({removedFeatures.length}):
                          </span>
                          <div>
                            {removedFeatures.map(f => (
                              <span key={f.code} className="diff-badge-remove">
                                - {f.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {givesSensitive && (
                        <div className="warning-callout-box" style={{ marginTop: '10px', padding: '10px' }}>
                          <p className="warning-callout-text" style={{ fontSize: '12px' }}>
                            ⚠️ Paket baru memberikan akses ke fitur berkategori <strong>Sensitif</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stale Data Modal */}
      <StaleDataModal
        isOpen={isStaleModalOpen}
        onClose={() => setIsStaleModalOpen(false)}
        onReload={handleStaleReload}
        details={staleDetails}
      />

      {/* Generic Alert Modal */}
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
