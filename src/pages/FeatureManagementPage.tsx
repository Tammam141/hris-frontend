import React, { useState, useEffect } from 'react';
import { getFeatureMatrixApi, updatePositionFeaturesApi, FeatureMatrixResponse } from '../api/features';
import { AlertModal } from '../components/ui/AlertModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import '../components/ui/dashboard.css'; // Reuse table styles

export function FeatureManagementPage() {
  const [matrixData, setMatrixData] = useState<FeatureMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state for checkboxes: positionId -> Set of feature_id (or feature_code)
  // We'll store feature_code since PUT needs codes.
  const [stagedFeatures, setStagedFeatures] = useState<Record<string, Set<string>>>({});
  
  // Modals
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [confirmConfig, setConfirmConfig] = useState<{ open: boolean; positionId: string; positionName: string } | null>(null);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await getFeatureMatrixApi();
      if (res.success) {
        setMatrixData(res.data);
        
        // Initialize staged state from grants
        const featureIdToCodeMap = new Map<string, string>();
        res.data.categories.forEach(cat => {
          cat.features.forEach(f => {
            featureIdToCodeMap.set(f.id, f.code);
          });
        });

        const initialStaged: Record<string, Set<string>> = {};
        res.data.positions.forEach(p => {
          initialStaged[p.id] = new Set();
        });

        res.data.grants.forEach(grant => {
          const code = featureIdToCodeMap.get(grant.feature_id);
          if (code && initialStaged[grant.position_id]) {
            initialStaged[grant.position_id].add(code);
          }
        });

        setStagedFeatures(initialStaged);
      }
    } catch (error: any) {
      setAlertInfo({ open: true, title: 'Error', message: error.message || 'Gagal memuat matriks fitur', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (positionId: string, featureCode: string, isChecked: boolean) => {
    setStagedFeatures(prev => {
      const newSet = new Set(prev[positionId]);
      if (isChecked) {
        newSet.add(featureCode);
      } else {
        newSet.delete(featureCode);
      }
      return { ...prev, [positionId]: newSet };
    });
  };

  const handleSaveClick = (positionId: string, positionName: string) => {
    setConfirmConfig({ open: true, positionId, positionName });
  };

  const executeSave = async () => {
    if (!confirmConfig) return;
    const { positionId } = confirmConfig;
    const codes = Array.from(stagedFeatures[positionId] || []);

    try {
      await updatePositionFeaturesApi(positionId, codes);
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Fitur jabatan berhasil diperbarui.', type: 'success' });
    } catch (error: any) {
      // Handle bad request with details.unknown_codes specifically if they exist
      let msg = error.message || 'Gagal menyimpan fitur.';
      if (error.details && error.details.unknown_codes) {
        msg += ` Kode tidak dikenal: ${error.details.unknown_codes.join(', ')}`;
      }
      setAlertInfo({ open: true, title: 'Gagal', message: msg, type: 'error' });
    } finally {
      setConfirmConfig(null);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Memuat matriks fitur...</div>;
  }

  if (!matrixData) {
    return <div style={{ padding: '24px' }}>Gagal memuat data.</div>;
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '100%' }}>
      <div className="dashboard-header" style={{ marginBottom: '24px' }}>
        <h1 className="dashboard-title">Matriks Fitur (Role & Permissions)</h1>
        <p className="dashboard-subtitle">Kelola akses fitur sistem untuk masing-masing jabatan.</p>
      </div>

      <div className="dashboard-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <table className="employee-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ minWidth: '220px', position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f1f5f9', borderRight: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', boxShadow: '4px 0 8px rgba(0,0,0,0.05)', padding: '16px', color: '#334155' }}>Jabatan</th>
              {matrixData.categories.map(cat => (
                <th key={cat.category} colSpan={cat.features.length} style={{ textAlign: 'center', backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                  {cat.label}
                </th>
              ))}
              <th style={{ minWidth: '120px', position: 'sticky', right: 0, zIndex: 10, backgroundColor: '#f1f5f9', borderLeft: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', boxShadow: '-4px 0 8px rgba(0,0,0,0.05)', padding: '16px', color: '#334155', textAlign: 'center' }}>Aksi</th>
            </tr>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', boxShadow: '4px 0 8px rgba(0,0,0,0.05)' }}></th>
              {matrixData.categories.flatMap(cat => 
                cat.features.map((f, index) => {
                  const isLastInCategory = index === cat.features.length - 1;
                  return (
                    <th key={f.id} style={{ 
                      writingMode: 'vertical-rl', 
                      transform: 'rotate(180deg)', 
                      whiteSpace: 'nowrap', 
                      padding: '16px 8px', 
                      height: '160px', 
                      fontWeight: 500, 
                      fontSize: '13px', 
                      color: '#64748b',
                      backgroundColor: '#fff',
                      borderRight: isLastInCategory ? '1px solid #cbd5e1' : '1px dotted #e2e8f0',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <span title={f.description || f.name} style={{ display: 'inline-block' }}>{f.name}</span>
                    </th>
                  );
                })
              )}
              <th style={{ position: 'sticky', right: 0, zIndex: 10, backgroundColor: '#f8fafc', borderLeft: '2px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', boxShadow: '-4px 0 8px rgba(0,0,0,0.05)' }}></th>
            </tr>
          </thead>
          <tbody>
            {matrixData.positions.map((position, pIndex) => {
              const isLastRow = pIndex === matrixData.positions.length - 1;
              return (
                <tr key={position.id} className="matrix-row" style={{ transition: 'background-color 0.2s' }}>
                  <td style={{ 
                    position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#fff', 
                    borderRight: '2px solid #cbd5e1', borderBottom: isLastRow ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '4px 0 8px rgba(0,0,0,0.05)', fontWeight: 600, color: '#1e293b', padding: '16px' 
                  }}>
                    {position.name}
                  </td>
                  {matrixData.categories.flatMap(cat => 
                    cat.features.map((f, index) => {
                      const isLastInCategory = index === cat.features.length - 1;
                      const isChecked = stagedFeatures[position.id]?.has(f.code) || false;
                      return (
                        <td key={f.id} style={{ 
                          textAlign: 'center', 
                          borderRight: isLastInCategory ? '1px solid #cbd5e1' : '1px dotted #e2e8f0',
                          borderBottom: isLastRow ? 'none' : '1px solid #e2e8f0',
                          padding: '12px 8px',
                          backgroundColor: isChecked ? '#f0f9ff' : 'transparent'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(position.id, f.code, e.target.checked)}
                            style={{ 
                              cursor: 'pointer', width: '18px', height: '18px', 
                              accentColor: '#2563eb'
                            }}
                          />
                        </td>
                      );
                    })
                  )}
                  <td style={{ 
                    position: 'sticky', right: 0, zIndex: 5, backgroundColor: '#fff', 
                    borderLeft: '2px solid #cbd5e1', borderBottom: isLastRow ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.05)', textAlign: 'center', padding: '16px' 
                  }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ 
                        padding: '8px 16px', fontSize: '13px', borderRadius: '20px', 
                        fontWeight: 600, boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' 
                      }}
                      onClick={() => handleSaveClick(position.id, position.name)}
                    >
                      Simpan
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!confirmConfig?.open}
        title="Simpan Perubahan Fitur"
        message={`Apakah Anda yakin ingin menyimpan perubahan fitur untuk jabatan ${confirmConfig?.positionName}? Perubahan hak akses akan langsung berlaku (atau tercabut) untuk semua pegawai dengan jabatan ini.`}
        confirmText="Ya, Simpan"
        isDestructive={false}
        onConfirm={executeSave}
        onCancel={() => setConfirmConfig(null)}
      />

      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.title}
        type={alertInfo.type}
        message={alertInfo.message}
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
