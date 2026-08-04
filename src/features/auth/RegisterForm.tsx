import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerApi } from '../../api/auth';
import { registerSchema } from './authSchema';
import '../../components/ui/ui.css';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cek = registerSchema.safeParse({ name, email, password });
    if (!cek.success) {
      setError(cek.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      await registerApi(name, email, password);

      setSuccess('Registrasi berhasil! Silakan login.');
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="ui-card">
        <h2 className="ui-card-title">Register</h2>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="name" className="input-label">Nama Lengkap</label>
          <input
            id="name"
            type="text"
            className="input-field"
            placeholder="Masukkan nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />

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
            placeholder="Masukkan password (min. 8 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            disabled={loading}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Register'}
          </button>
        </form>

        <div className="auth-links">
          <p className="auth-text">
            Sudah punya akun?
            <Link to="/login" className="auth-link">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
