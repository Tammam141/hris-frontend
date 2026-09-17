import '../../features/employee/employee-modal.css';
import { StaleDataDetails } from '../../utils/staleData';

interface StaleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  details: StaleDataDetails | null;
}

export function StaleDataModal({ isOpen, onClose, onReload, details }: StaleDataModalProps) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: '#dc2626' }}>Data Sudah Berubah</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
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
