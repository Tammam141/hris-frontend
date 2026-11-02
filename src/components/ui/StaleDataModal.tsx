import React from 'react';
import '../../features/employee/employee-modal.css';
import { StaleDataDetails } from '../../utils/staleData';

interface StaleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  details: StaleDataDetails | null;
}

export function StaleDataModal({ isOpen, onClose, onReload, details }: StaleDataModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  let message = "Data ini sudah diubah oleh pengguna lain. Perubahan Anda BELUM disimpan.";
  
  if (details.last_changed_by) {
    const { name, email, at } = details.last_changed_by;
    const actor = name ?? email ?? 'pengguna lain';
    message = `Data ini sudah diubah oleh ${actor} pada ${formatDate(at)}. Perubahan Anda BELUM disimpan.`;
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '450px' }} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stale-data-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id="stale-data-title" className="modal-title" style={{ color: '#dc2626' }}>Data Sudah Berubah</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-line' }}>
            {message}
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
          <button type="button" className="btn btn-primary" onClick={onReload}>
            Muat Data Terbaru
          </button>
        </div>
      </div>
    </div>
  );
}
