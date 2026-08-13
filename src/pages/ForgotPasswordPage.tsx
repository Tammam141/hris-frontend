import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../api/auth';
import '../components/ui/auth.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email);
      // Pesan selalu sama, terdaftar maupun tidak
      setSuccess('Instruksi untuk reset password telah dikirim ke email Anda. Silakan cek inbox (atau folder spam).');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim instruksi reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Lupa Password</h2>
        <p className="auth-text" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Masukkan email akun Anda, dan kami akan mengirimkan instruksi untuk me-reset password.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            className="input-field"
            placeholder="Masukkan email Anda"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading || !email}>
            {loading ? 'Memproses...' : 'Kirim Instruksi'}
          </button>
        </form>

        <div className="auth-links">
          <p className="auth-text">
            Ingat password Anda?
            <Link to="/login" className="auth-link">Login di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
