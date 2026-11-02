import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPasswordApi } from '../api/auth';
import { validatePassword } from '../utils/passwordValidation';
import { PasswordRequirements } from '../components/ui/PasswordRequirements';
import { toUserMessage } from '../utils/apiMessage';
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
      setError('Tautan atur ulang kata sandi tidak valid atau tidak lengkap. Pastikan Anda membuka tautan dari email.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Kata sandi baru dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(email, token, password, confirmPassword);
      navigate('/login', {
        state: { message: 'Kata sandi berhasil diatur ulang! Silakan masuk dengan kata sandi baru Anda.' }
      });
    } catch (err: any) {
      setError(toUserMessage(err, 'Gagal mengatur ulang kata sandi. Tautan mungkin sudah kedaluwarsa.'));
    } finally {
      setLoading(false);
    }
  }

  // Jika parameter kurang, tampilkan peringatan
  if (!email || !token) {
    return (
      <div className="auth-page-container">
        <div className="ui-card">
          <h2 className="ui-card-title">Atur Ulang Kata Sandi</h2>
          <div className="alert-error">
            Tautan tidak valid. Mohon akses halaman ini melalui tautan yang dikirimkan ke email Anda.
          </div>
          <div className="auth-links" style={{ marginTop: '16px' }}>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Kembali ke Halaman Masuk</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Buat Kata Sandi Baru</h2>
        <p className="auth-text" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Silakan masukkan kata sandi baru untuk akun <strong>{email}</strong>.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="password" className="input-label">Kata Sandi Baru</label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="Min. 8 karakter (huruf besar, kecil, angka & simbol)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            disabled={loading}
            required
          />
          <PasswordRequirements password={password} />

          <label htmlFor="confirmPassword" className="input-label">Konfirmasi Kata Sandi Baru</label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            placeholder="Ulangi kata sandi baru di atas"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            disabled={loading}
            required
          />

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
