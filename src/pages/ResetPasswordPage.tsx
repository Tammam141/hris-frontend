import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPasswordApi } from '../api/auth';
import '../components/ui/auth.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !token) {
      setError('Tautan reset password tidak valid atau tidak lengkap. Pastikan Anda mengklik tautan dari email.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(email, token, password, confirmPassword);
      navigate('/login', {
        state: { message: 'Password berhasil direset! Silakan login dengan password baru Anda.' }
      });
    } catch (err: any) {
      setError(err.message || 'Gagal me-reset password. Tautan mungkin kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  }

  // Jika parameter kurang, tampilkan peringatan
  if (!email || !token) {
    return (
      <div className="auth-page-container">
        <div className="ui-card">
          <h2 className="ui-card-title">Reset Password</h2>
          <div className="alert-error">
            Tautan tidak valid. Mohon akses halaman ini melalui link yang dikirimkan ke email Anda.
          </div>
          <div className="auth-links" style={{ marginTop: '16px' }}>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Kembali ke Halaman Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Buat Password Baru</h2>
        <p className="auth-text" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Silakan masukkan password baru untuk akun <strong>{email}</strong>.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="password" className="input-label">Password Baru</label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="Min. 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            disabled={loading}
            required
          />

          <label htmlFor="confirmPassword" className="input-label">Konfirmasi Password Baru</label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            placeholder="Ulangi password di atas"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            disabled={loading}
            required
          />

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
