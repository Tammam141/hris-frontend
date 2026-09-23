import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginApi } from '../../api/auth';
import { loginSchema } from './authSchema';
import { useAuth } from '../../hooks/useAuth';
import { isRateLimited } from '../../utils/rateLimit';
import '../../components/ui/auth.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorObj, setErrorObj] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  // Rate Limit: Hitung mundur setiap 1 detik sampai tombol & form login aktif kembali
  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setErrorMsg('');
            setErrorObj(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setErrorObj(null);

    const cek = loginSchema.safeParse({ email, password });
    if (!cek.success) {
      setErrorMsg(cek.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const response = await loginApi(email, password);

      if (response.data) {
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Rate Limit: Jika kena 429 RATE_LIMIT_EXCEEDED, mulai hitung mundur dari err.retryAfter
      if (isRateLimited(err)) {
        setCountdown(err.retryAfter);
        setErrorMsg(`Terlalu banyak percobaan login. Coba lagi dalam ${err.retryAfter} detik.`);
        setErrorObj(err);
      } else {
        setErrorMsg(err.message || 'Gagal terhubung ke server');
        setErrorObj(err);
      }
    } finally {
      setLoading(false);
    }
  }

  const currentErrorMsg = countdown > 0
    ? `Terlalu banyak percobaan login. Coba lagi dalam ${countdown} detik.`
    : errorMsg;

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Login</h2>

        {successMessage && <div className="alert-success">{successMessage}</div>}

        {currentErrorMsg && (
          <div className="alert-error" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>{currentErrorMsg}</span>
            {(errorObj?.details?.reason === 'email_not_verified' || (errorObj?.status === 401 && currentErrorMsg.toLowerCase().includes('not verified'))) && (
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ padding: '4px 8px', fontSize: '14px', width: 'fit-content' }}
                onClick={() => navigate('/verify-email', { state: { email } })}
              >
                Verifikasi Email Sekarang
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            className="input-field"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || countdown > 0}
            required
          />

          <label htmlFor="password" className="input-label">Password</label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || countdown > 0}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '16px' }}>
            <Link to="/forgot-password" style={{ fontSize: '14px', color: '#1a78d7', textDecoration: 'none' }}>
              Lupa Password?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || countdown > 0}>
            {loading ? 'Memproses...' : countdown > 0 ? `Coba lagi dalam ${countdown} detik` : 'Login'}
          </button>
        </form>

        <div className="auth-links">
          <p className="auth-text">
            Belum punya akun?
            <Link to="/register" className="auth-link">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
