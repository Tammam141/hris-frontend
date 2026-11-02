import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../api/auth';
import { toUserMessage } from '../utils/apiMessage';
import '../components/ui/auth.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (countdown > 0) return;
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email);
      // Set cooldown 60 detik agar tidak spam request
      setCountdown(60);
      setSuccess('Instruksi untuk atur ulang kata sandi telah dikirim ke email Anda. Cek juga folder spam.');
    } catch (err: any) {
      setError(toUserMessage(err, 'Gagal mengirim instruksi atur ulang kata sandi.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Lupa Kata Sandi</h2>
        <p className="auth-text" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Masukkan email akun Anda, dan kami akan mengirimkan instruksi untuk mengatur ulang kata sandi.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && (
          <div className="alert-success">
            {success}
            {countdown > 0 && (
              <span style={{ display: 'block', marginTop: '6px', fontSize: '13px', fontWeight: 500 }}>
                Kirim ulang dalam {countdown} detik.
              </span>
            )}
          </div>
        )}

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

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '16px' }} 
            disabled={loading || !email || countdown > 0}
          >
            {loading ? 'Memproses...' : countdown > 0 ? `Kirim Ulang (${countdown}s)` : 'Kirim Instruksi'}
          </button>
        </form>

        <div className="auth-links">
          <p className="auth-text">
            Ingat kata sandi Anda?{' '}
            <Link to="/login" className="auth-link">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
