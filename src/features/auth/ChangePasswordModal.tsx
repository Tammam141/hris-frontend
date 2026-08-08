import { useState } from 'react';
import { changePasswordApi } from '../../api/auth';
import '../employee/employee-modal.css'; // Reusing the same modal CSS

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const response = await changePasswordApi(currentPassword, newPassword);
      setSuccess(response.message || 'Password berhasil diubah');
      setTimeout(() => {
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ganti Password</h2>
          <button className="modal-close-btn" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
          {success && <div className="alert-success" style={{ marginBottom: '16px', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px' }}>{success}</div>}
          
          <form id="changePasswordForm" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="input-label">Password Saat Ini</label>
              <input 
                type="password" 
                className="input-field" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                disabled={loading || !!success}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="input-label">Password Baru</label>
              <input 
                type="password" 
                className="input-field" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 karakter"
                disabled={loading || !!success}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                className="input-field" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Ulangi password baru"
                disabled={loading || !!success}
              />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading} style={{ width: 'auto' }}>Tutup</button>
          <button type="submit" form="changePasswordForm" className="btn btn-primary" disabled={loading || !!success} style={{ width: 'auto' }}>
            {loading ? 'Memproses...' : 'Simpan Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
