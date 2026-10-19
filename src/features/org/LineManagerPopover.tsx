import { FC, useEffect, useState, MutableRefObject } from 'react';
import { OrgHolder, LineManagerResponse } from '../../types/org';
import { getLineManager } from '../../api/org';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/ui/Avatar';

interface LineManagerPopoverProps {
  holder: OrgHolder | null;
  onClose: () => void;
  cacheRef: MutableRefObject<Map<string, LineManagerResponse>>;
}

export const LineManagerPopover: FC<LineManagerPopoverProps> = ({
  holder,
  onClose,
  cacheRef,
}) => {
  const { hasFeature } = useAuth();
  const canViewManager = hasFeature('employee.view_all');

  const [loading, setLoading] = useState(false);
  const [managerData, setManagerData] = useState<LineManagerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holder) {
      setManagerData(null);
      setError(null);
      return;
    }

    if (!canViewManager) {
      return;
    }

    const cached = cacheRef.current.get(holder.id);
    if (cached) {
      setManagerData(cached);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getLineManager(holder.id)
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.data) {
          cacheRef.current.set(holder.id, res.data);
          setManagerData(res.data);
        } else {
          setError('Gagal mendapatkan informasi atasan langsung.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat atasan langsung.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [holder, canViewManager, cacheRef]);

  if (!holder) return null;

  const renderManagerInfo = () => {
    if (!canViewManager) {
      return null;
    }

    if (loading) {
      return (
        <div className="org-modal-section">
          <div className="org-modal-section-title">Atasan Langsung</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Memuat atasan langsung...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="org-modal-section">
          <div className="org-modal-section-title">Atasan Langsung</div>
          <div style={{ fontSize: '13px', color: '#dc2626' }}>{error}</div>
        </div>
      );
    }

    if (!managerData) return null;

    const lm = managerData.line_manager;
    if (!lm) {
      return (
        <div className="org-modal-section">
          <div className="org-modal-section-title">Atasan Langsung</div>
          <div className="org-modal-manager-text" style={{ color: '#64748b', fontStyle: 'italic' }}>
            Tidak ada atasan aktif — cuti ditangani HR/Admin
          </div>
        </div>
      );
    }

    const posText = lm.position_name ? ` (${lm.position_name})` : '';

    let extraNote = '';
    if (lm.source === 'override') {
      extraNote = ' — diatur manual';
    } else if (lm.levels_up > 1) {
      extraNote = ` — naik ${lm.levels_up} tingkat karena jabatan di atasnya kosong`;
    }

    return (
      <div className="org-modal-section">
        <div className="org-modal-section-title">Atasan Langsung</div>
        <div className="org-modal-manager-text">
          <strong>{lm.full_name}</strong>
          <span>{posText}</span>
          {extraNote && <span style={{ color: '#d97706', fontSize: '13px' }}>{extraNote}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="org-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="org-modal-content" onClick={e => e.stopPropagation()}>
        <div className="org-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar name={holder.full_name} photoUrl={null} size="44px" fontSize="18px" />
            <div>
              <div className="org-modal-title">{holder.full_name}</div>
              <div className="org-modal-subtitle">NIP: {holder.employee_number}</div>
            </div>
          </div>
          <button
            type="button"
            className="org-modal-close-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {renderManagerInfo()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
