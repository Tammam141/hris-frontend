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
import { toUserMessage } from '../utils/apiMessage';
import { AlertTriangleIcon } from '../components/icons/AlertTriangleIcon';
import { getFeatureCategoryLabel } from '../utils/labels';
import '../components/ui/access-profiles.css';

interface PositionDetailModalState {
  positionName: string;
  departmentName?: string | null;
  profile?: AccessProfile | null;
  isBasicAccess: boolean;
  hasSensitive: boolean;
}

export function FeatureManagementPage() {
  const { refreshUser } = useAuth();
  const [matrixData, setMatrixData] = useState<FeatureMatrixResponse | null>(null);
  const [positionHolders, setPositionHolders] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Staged changes: positionId -> new access_profile_id (or null for "Akses dasar")
  const [stagedAssignments, setStagedAssignments] = useState<Record<string, string | null>>({});

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterProfileId, setSelectedFilterProfileId] = useState<string>('ALL'); // 'ALL' | 'NONE' | profileId

  // Modals & Alerts
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<PositionDetailModalState | null>(null);

  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailModal) {
          setDetailModal(null);
        } else if (isReviewModalOpen && !isSaving) {
          setIsReviewModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailModal, isReviewModalOpen, isSaving]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [matrixRes, positionsRes] = await Promise.allSettled([
        getFeatureMatrixApi(),
        getPositions(),
      ]);

      const holderMap: Record<string, number> = {};

      if (matrixRes.status === 'fulfilled' && matrixRes.value.success) {
        setMatrixData(matrixRes.value.data);
        matrixRes.value.data.positions?.forEach(p => {
          if (p.holder_count !== undefined) {
            holderMap[p.id] = p.holder_count;
          }
        });
      }

      if (positionsRes.status === 'fulfilled' && positionsRes.value.success) {
        positionsRes.value.data.forEach(p => {
          const count = (p as any).holder_count ?? p.current_holders;
          if (count !== undefined) {
            holderMap[p.id] = count;
          }
        });
      }

      setPositionHolders(holderMap);
    } catch (e: any) {
      setAlertInfo({
        open: true,
        title: 'Gagal',
        message: toUserMessage(e, 'Gagal memuat data akses jabatan.'),
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
          message: toUserMessage(error, 'Gagal menyimpan perubahan akses jabatan.'),
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
          Tentukan hak akses untuk setiap jabatan. Semua karyawan pada jabatan itu langsung mendapat izin dari hak akses yang dipilih.
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
          <span className="access-stat-label">Jabatan dengan hak akses tambahan</span>
          <span className="access-stat-value" style={{ color: '#0369a1' }}>
            {summaryMetrics.withProfileCount}
          </span>
          <span className="access-stat-subtext">Memiliki hak akses khusus</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Hanya akses dasar</span>
          <span className="access-stat-value" style={{ color: '#64748b' }}>
            {summaryMetrics.withoutProfileCount}
          </span>
          <span className="access-stat-subtext">Absen, cuti, dan profil sendiri</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Karyawan dengan izin sensitif</span>
          <span className="access-stat-value" style={{ color: '#b45309' }}>
            {summaryMetrics.sensitiveCount}
          </span>
          <span className="access-stat-subtext">Perlu ditinjau berkala</span>
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
            Akses dasar
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
              <th style={{ width: '25%' }}>Hak akses</th>
              <th style={{ width: '20%' }}>Yang bisa dilakukan</th>
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
                        {(() => {
                          const count = positionHolders[pos.id] ?? pos.holder_count;
                          return count !== undefined ? `${count} orang` : '0 orang';
                        })()}
                      </span>
                    </td>

                    {/* Hak Akses Dropdown */}
                    <td>
                      <div className="access-select-wrapper">
                        <label htmlFor={`select-pos-${pos.id}`} className="sr-only" style={{ display: 'none' }}>
                          Pilih Hak Akses untuk {pos.name}
                        </label>
                        <select
                          id={`select-pos-${pos.id}`}
                          className="access-select"
                          value={pos.effectiveProfileId || ''}
                          onChange={e => handleProfileSelectChange(pos.id, e.target.value)}
                        >
                          <option value="">Akses dasar saja</option>
                          {matrixData?.access_profiles?.map(prof => (
                            <option key={prof.id} value={prof.id}>
                              {prof.name}
                            </option>
                          ))}
                        </select>

                        {pos.isModified && (
                          <span className="access-change-label">
                            Diubah dari: {origProfile?.name || 'Akses dasar'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Yang Bisa Dilakukan */}
                    <td>
                      <button
                        type="button"
                        className="capability-trigger-btn"
                        onClick={() =>
                          setDetailModal({
                            positionName: pos.name,
                            departmentName: pos.department_name,
                            profile: assignedProfile,
                            isBasicAccess: !assignedProfile,
                            hasSensitive,
                          })
                        }
                        title="Klik untuk membuka rincian apa yang bisa dilakukan"
                        aria-label={`Lihat rincian hak akses untuk ${pos.name}`}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="capability-trigger-text">
                            {assignedProfile ? (
                              assignedProfile.description || 'Memiliki hak akses khusus'
                            ) : (
                              'Absen, cuti, dan profil sendiri'
                            )}
                          </div>
                          {hasSensitive && (
                            <div style={{ marginTop: '4px' }}>
                              <span
                                className="badge-sensitive"
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <AlertTriangleIcon size={11} />
                                Izin sensitif
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="capability-trigger-icon" title="Buka rincian">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </span>
                      </button>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-access-title"
          >
            <div className="modal-header">
              <h2 id="review-access-title" className="modal-title">Tinjau Perubahan Akses Jabatan</h2>
              <button
                className="modal-close-btn"
                aria-label="Tutup"
                onClick={() => !isSaving && setIsReviewModalOpen(false)}
                disabled={isSaving}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '12px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '18px' }}>
                Berikut adalah ringkasan perubahan hak akses untuk <strong>{modifiedPositions.length} jabatan</strong>:
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
                  const sensitiveNames = newProf
                    ? newProf.codes
                        .filter(c => sensitiveFeatureCodes.has(c))
                        .map(c => allFeaturesMap.get(c)?.name || c)
                        .join(', ')
                    : '';

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
                        <span style={{ color: '#64748b' }}>{oldProf?.name || 'Akses dasar'}</span>
                        <span style={{ margin: '0 8px', color: '#94a3b8' }}>&rarr;</span>
                        <strong style={{ color: '#2563eb' }}>{newProf?.name || 'Akses dasar'}</strong>
                      </div>

                      {/* Diff lists */}
                      {addedFeatures.length > 0 && (
                        <div className="diff-section" style={{ marginBottom: '8px' }}>
                          <span className="diff-title" style={{ color: '#16a34a' }}>
                            + Izin Ditambah ({addedFeatures.length}):
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
                            - Izin Dicabut ({removedFeatures.length}):
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
                        <div className="warning-callout-box" style={{ marginTop: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          <p className="warning-callout-text" style={{ fontSize: '12px', margin: 0 }}>
                            Hak akses baru memberi izin sensitif: <strong>{sensitiveNames}</strong>
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

      {/* Modal Rincian Hak Akses (Yang Bisa Dilakukan) */}
      {detailModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setDetailModal(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-access-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="detail-access-title" className="modal-title" style={{ fontSize: '18px' }}>
                  {detailModal.profile ? detailModal.profile.name : 'Akses Dasar'}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Jabatan: <strong style={{ color: '#0f172a' }}>{detailModal.positionName}</strong>
                  {detailModal.departmentName && ` · Unit: ${detailModal.departmentName}`}
                </div>
              </div>
              <button
                className="modal-close-btn"
                aria-label="Tutup"
                onClick={() => setDetailModal(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              {/* Badges status */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="badge-standard">
                  {detailModal.profile
                    ? detailModal.profile.is_system
                      ? 'Bawaan sistem'
                      : 'Hak akses kustom'
                    : 'Akses standar'}
                </span>
                {detailModal.hasSensitive && (
                  <span className="badge-sensitive">
                    <AlertTriangleIcon size={12} />
                    Memuat izin sensitif
                  </span>
                )}
              </div>

              {/* Box Deskripsi */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ringkasan Akses
                </div>
                <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
                  {detailModal.profile?.description || (
                    detailModal.isBasicAccess
                      ? 'Akses dasar yang dimiliki oleh seluruh karyawan untuk mencatat kehadiran mandiri, mengajukan cuti, dan mengelola profil sendiri.'
                      : 'Tidak ada deskripsi tertulis untuk hak akses ini.'
                  )}
                </div>
              </div>

              {/* Alert jika sensitif */}
              {detailModal.hasSensitive && (
                <div className="warning-callout-box" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertTriangleIcon size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <p className="warning-callout-text">
                      Jabatan ini memiliki izin sensitif yang dapat mengakses data rahasia atau mengubah konfigurasi penting.
                    </p>
                  </div>
                </div>
              )}

              {/* Rincian Izin / Kemampuan */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Rincian Yang Bisa Dilakukan:
                </div>

                {detailModal.isBasicAccess ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                        Absensi Mandiri
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        Melakukan absensi masuk dan absensi pulang harian sesuai jadwal kerja.
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                        Pengajuan Cuti
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        Mengajukan permohonan cuti, memilih jenis cuti, serta melihat kuota dan riwayat persetujuan cuti pribadi.
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                        Profil Pribadi
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        Melihat data kepegawaian pribadi, memperbarui informasi profil dasar, dan mengatur kata sandi akun.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(() => {
                      const codeSet = new Set(detailModal.profile?.codes || []);
                      const categories = (matrixData?.categories || [])
                        .map(cat => ({
                          category: cat.category,
                          label: cat.label || getFeatureCategoryLabel(cat.category),
                          features: cat.features.filter(f => codeSet.has(f.code)),
                        }))
                        .filter(cat => cat.features.length > 0);

                      if (categories.length === 0) {
                        return (
                          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '12px' }}>
                            Tidak ada izin khusus yang terdaftar di dalam hak akses ini.
                          </div>
                        );
                      }

                      return categories.map(cat => (
                        <div key={cat.category} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              background: '#f1f5f9',
                              padding: '8px 12px',
                              fontWeight: 600,
                              fontSize: '12px',
                              color: '#334155',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>Modul: {cat.label}</span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                              {cat.features.length} izin
                            </span>
                          </div>
                          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff' }}>
                            {cat.features.map(feat => (
                              <div
                                key={feat.code}
                                style={{
                                  padding: '6px 0',
                                  borderBottom: '1px solid #f8fafc',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                                    {feat.name}
                                  </span>
                                  {feat.is_sensitive && (
                                    <span className="badge-sensitive" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                      Sensitif
                                    </span>
                                  )}
                                </div>
                                {feat.description && (
                                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                                    {feat.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}

                    <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                      ℹ️ Semua karyawan pada jabatan ini otomatis juga memiliki hak akses dasar (absen, cuti, dan profil sendiri).
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-access btn-access-secondary"
                onClick={() => setDetailModal(null)}
              >
                Tutup
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
