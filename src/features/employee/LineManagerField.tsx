import React, { useState, useEffect } from 'react';
import { EmployeeListItem } from '../../types/employee';
import { useLineManagerPreview } from './useLineManagerPreview';

export interface LineManagerFieldProps {
  positionId: string;
  managerId?: string | null;
  onManagerChange: (id: string) => void;
  managers: EmployeeListItem[];
  excludeEmployeeId?: string;
  onLoadManagers?: () => void;
}

export const LineManagerField: React.FC<LineManagerFieldProps> = ({
  positionId,
  managerId,
  onManagerChange,
  managers,
  excludeEmployeeId,
  onLoadManagers,
}) => {
  const [isManual, setIsManual] = useState<boolean>(Boolean(managerId));

  // Sync jika managerId diisi dari luar (misal saat form edit karyawan dimuat)
  useEffect(() => {
    if (managerId) {
      setIsManual(true);
    }
  }, [managerId]);

  const { status, manager } = useLineManagerPreview(positionId, excludeEmployeeId);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsManual(checked);
    if (checked) {
      onLoadManagers?.();
    } else {
      onManagerChange('');
    }
  };

  const selectedManager = managerId ? managers.find(m => m.id === managerId) : null;
  const filteredManagers = excludeEmployeeId
    ? managers.filter(m => m.id !== excludeEmployeeId)
    : managers;

  const renderInfoBox = () => {
    if (isManual) {
      return (
        <div className="line-manager-info-box state-manual">
          <div className="line-manager-header-row">
            <span className="line-manager-name-text">
              Diatur manual: {selectedManager ? selectedManager.full_name : (managerId ? managerId : 'Pilih dari daftar di bawah')}
            </span>
            <span className="line-manager-badge badge-manual">manual</span>
          </div>
          {manager ? (
            <div className="line-manager-subtext">
              Tanpa pengecualian atasannya: <strong>{manager.full_name}</strong> ({manager.position_name || '-'})
            </div>
          ) : status === 'ready' && !manager ? (
            <div className="line-manager-subtext">
              Tanpa pengecualian: Tidak ada atasan aktif (cuti ditangani HR/Admin)
            </div>
          ) : null}
        </div>
      );
    }

    if (status === 'idle') {
      return (
        <div className="line-manager-info-box state-idle">
          Pilih jabatan untuk melihat atasan
        </div>
      );
    }

    if (status === 'loading') {
      return (
        <div className="line-manager-info-box state-loading">
          Menghitung atasan…
        </div>
      );
    }

    if (status === 'ready') {
      if (manager) {
        return (
          <div className="line-manager-info-box state-ready-active">
            <div className="line-manager-header-row">
              <span className="line-manager-name-text">
                {manager.full_name} — {manager.position_name || '-'}
              </span>
              <span className="line-manager-badge badge-auto">otomatis dari struktur</span>
            </div>
            {manager.levels_up > 1 && (
              <div className="line-manager-subtext subtext-amber">
                jabatan atasan langsung kosong, naik {manager.levels_up} tingkat
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className="line-manager-info-box state-ready-vacant">
            Tidak ada atasan aktif — cuti ditangani HR/Admin
          </div>
        );
      }
    }

    // forbidden atau error
    return (
      <div className="line-manager-info-box state-fallback">
        Atasan dihitung otomatis setelah disimpan
      </div>
    );
  };

  return (
    <div className="line-manager-container">
      <label className="form-label input-label">Atasan</label>
      
      {/* Kotak Info Hasil */}
      {renderInfoBox()}

      {/* Checkbox Override Manual */}
      <label className="line-manager-checkbox-wrapper">
        <input
          type="checkbox"
          checked={isManual}
          onChange={handleCheckboxChange}
        />
        <span>Atur atasan secara manual (pengecualian)</span>
      </label>

      {/* Dropdown Pilihan Karyawan jika Manual */}
      {isManual && (
        <div style={{ marginTop: '4px' }}>
          <select
            className="input-field"
            value={managerId || ''}
            onChange={e => onManagerChange(e.target.value)}
          >
            <option value="">- Pilih Karyawan Pengganti Atasan -</option>
            {filteredManagers.map(m => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {m.department_name ? ` — ${m.department_name}` : ''} ({m.employee_number})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
