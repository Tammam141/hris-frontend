import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginApi } from '../../api/auth';
import { loginSchema } from './authSchema';
import { useAuth } from '../../hooks/useAuth';
import { isRateLimited } from '../../utils/rateLimit';
import { toUserMessage } from '../../utils/apiMessage';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { EyeOffIcon } from '../../components/icons/EyeOffIcon';
import { AppFooter } from '../../components/layout/AppFooter';
import '../../components/ui/auth.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorObj, setErrorObj] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const configuredVersion = import.meta.env.VITE_APP_VERSION || '0.8.0';
  const [appVersion, setAppVersion] = useState(configuredVersion);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  useEffect(() => {
    // Jika VITE_APP_VERSION sudah disetel secara eksplisit, utamakan versi tersebut
    if (import.meta.env.VITE_APP_VERSION) return;

    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    fetch(`${base}/health`)
      .then(res => res.json())
      .then(data => {
        if (data?.version) {
          const backendVer = data.version.replace(/^v/, '');
          // Jangan turunkan ke 0.7.1 jika server backend lokal masih menjalankan build lama
          if (backendVer !== '0.7.1') {
            setAppVersion(data.version);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Tampilkan pesan error ramah jika terjadi auto-logout / 401 dari server
  useEffect(() => {
    const authErr = sessionStorage.getItem('auth_error_message');
    if (authErr) {
      setErrorMsg(authErr);
      sessionStorage.removeItem('auth_error_message');
    }
  }, []);

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
        setErrorMsg(`Terlalu banyak percobaan masuk. Coba lagi dalam ${err.retryAfter} detik.`);
        setErrorObj(err);
      } else {
        setErrorMsg(toUserMessage(err, 'Gagal terhubung ke server. Periksa koneksi internet Anda.'));
        setErrorObj(err);
      }
    } finally {
      setLoading(false);
    }
  }

  const currentErrorMsg = countdown > 0
    ? `Terlalu banyak percobaan masuk. Coba lagi dalam ${countdown} detik.`
    : errorMsg;

  return (
    <div className="auth-page-container has-footer">
      <div className="auth-card-wrapper">
        <div className="ui-card">
        <h2 className="ui-card-title">Masuk ke HRIS</h2>

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

          <label htmlFor="password" className="input-label">Kata Sandi</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              style={{ paddingRight: '40px', width: '100%' }}
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || countdown > 0}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '16px' }}>
            <Link to="/forgot-password" style={{ fontSize: '14px', color: '#1a78d7', textDecoration: 'none' }}>
              Lupa kata sandi?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || countdown > 0}>
            {loading ? 'Memproses...' : countdown > 0 ? `Coba lagi dalam ${countdown} detik` : 'Masuk'}
          </button>
        </form>

        <div className="auth-links">
          <p className="auth-text">
            Belum punya akun?{' '}
            <Link to="/register" className="auth-link">Daftar</Link>
          </p>
          <p className="auth-text" style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
            HRIS v{appVersion.replace(/^v/, '')}
          </p>
        </div>
      </div>
      </div>
      <AppFooter variant="blue" />
    </div>
  );
}
