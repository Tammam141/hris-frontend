import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginApi } from '../../api/auth';
import { loginSchema } from './authSchema';
import { useAuth } from '../../hooks/useAuth';
import '../../components/ui/ui.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cek = loginSchema.safeParse({ email, password });
    if (!cek.success) {
      setError(cek.error.issues[0].message);
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
      setError(err.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Login</h2>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email" className="input-label">Email</label>
          <input
            id="email"
            type="email"
            className="input-field"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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
            disabled={loading}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
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
