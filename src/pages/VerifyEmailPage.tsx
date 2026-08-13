import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmailApi, resendVerificationApi } from '../api/auth';
import '../components/ui/auth.css';

export function VerifyEmailPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ambil email dari state atau query param
  const emailFromState = location.state?.email || searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email tidak ditemukan. Silakan masukkan email Anda.');
      return;
    }

    if (code.length !== 6) {
      setError('Kode verifikasi harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      await verifyEmailApi(email, code);
      navigate('/login', {
        state: { message: 'Verifikasi berhasil! Silakan login dengan akun Anda.' }
      });
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi email');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Email tidak ditemukan. Silakan masukkan email Anda.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resendVerificationApi(email);
      setSuccess('Kode verifikasi telah dikirim ulang ke email Anda.');
      setCountdown(60);
    } catch (err: any) {
      if (err.code === 'TOO_MANY_REQUESTS') {
        setError(err.message || 'Terlalu banyak permintaan. Silakan tunggu sebentar.');
        // Mengekstrak angka detik dari pesan jika ada, atau gunakan default 60
        const match = err.message?.match(/(\d+)/);
        if (match && match[1]) {
          setCountdown(parseInt(match[1], 10));
        } else {
          setCountdown(60);
        }
      } else {
        setError(err.message || 'Gagal mengirim ulang kode');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Verifikasi Email</h2>
        <p className="auth-text" style={{ marginBottom: '24px', textAlign: 'center' }}>
          Masukkan kode verifikasi 6 angka yang telah dikirim ke email Anda.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !!emailFromState}
            required
            placeholder="email@perusahaan.com"
          />

          <label htmlFor="code" className="input-label">Kode Verifikasi</label>
          <input
            id="code"
            type="text"
            className="input-field"
            placeholder="Contoh: 012345"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            disabled={loading}
            required
            maxLength={6}
          />

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading || code.length !== 6}>
            {loading ? 'Memproses...' : 'Verifikasi'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleResend}
            disabled={loading || countdown > 0}
            style={{ width: '100%' }}
          >
            {countdown > 0 ? `Kirim Ulang (${countdown}s)` : 'Kirim Ulang Kode'}
          </button>
        </div>
      </div>
    </div>
  );
}
