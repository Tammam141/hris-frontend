import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../../api/auth';
import { registerSchema } from './authSchema';
import { PASSWORD_MAX_LENGTH } from '../../utils/passwordValidation';
import { 
  isPhoneAlreadyRegisteredError, 
  isPhoneFormatValidationError, 
  PHONE_ALREADY_REGISTERED_MSG, 
  PHONE_FORMAT_INVALID_MSG 
} from '../../utils/phoneValidation';
import '../../components/ui/auth.css';

export function RegisterForm() {
  // state untuk menyimpan inputan user
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // state untuk nomor telepon
  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [gender, setGender] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // fungsi saat tombol register ditekan
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNameError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setSuccess('');

    // fungsi untuk menggabungkan kode negara dengan nomor telepon
    const cleanPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
    const fullPhone = `${countryCode}${cleanPhone}`;

    // fungsi validasi dengan zod
    const cek = registerSchema.safeParse({
      full_name: fullName,
      email,
      password,
      confirmPassword,
      phone: fullPhone,
      gender,
      terms_accepted: termsAccepted
    });

    if (!cek.success) {
      const firstIssue = cek.error.issues[0];
      setError(firstIssue.message);
      if (firstIssue.path[0] === 'full_name') {
        setNameError(firstIssue.message);
      } else if (firstIssue.path[0] === 'phone') {
        setPhoneError(firstIssue.message);
      } else if (firstIssue.path[0] === 'password') {
        setPasswordError(firstIssue.message);
      } else if (firstIssue.path[0] === 'confirmPassword') {
        setConfirmPasswordError(firstIssue.message);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await registerApi(fullName, email, password, fullPhone, gender, termsAccepted);

      if (response.data?.verification_required) {
        navigate('/verify-email', {
          state: { email: email }
        });
      } else {
        // Fallback jika tidak perlu verifikasi (seharusnya tidak terjadi berdasar instruksi)
        navigate('/login', {
          state: { message: response.message || 'Registrasi berhasil! Akun Anda sedang menunggu persetujuan HR.' }
        });
      }
    } catch (err: any) {
      if (isPhoneAlreadyRegisteredError(err)) {
        setPhoneError(PHONE_ALREADY_REGISTERED_MSG);
        setError(PHONE_ALREADY_REGISTERED_MSG);
        return;
      }
      if (isPhoneFormatValidationError(err)) {
        setPhoneError(PHONE_FORMAT_INVALID_MSG);
        setError(PHONE_FORMAT_INVALID_MSG);
        return;
      }
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
          <label htmlFor="fullName" className="input-label">Nama Lengkap</label>
          <input
            id="fullName"
            type="text"
            className="input-field"
            style={nameError ? { borderColor: '#ef4444' } : undefined}
            placeholder="Masukkan nama lengkap"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setNameError('');
            }}
            disabled={loading}
            required
          />
          {nameError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{nameError}</span>}

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
            style={passwordError ? { borderColor: '#ef4444' } : undefined}
            placeholder="Min. 8 karakter (huruf besar, kecil & angka)"
            value={password}
            maxLength={PASSWORD_MAX_LENGTH}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            disabled={loading}
            required
          />
          {passwordError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{passwordError}</span>}

          <label htmlFor="confirmPassword" className="input-label">Konfirmasi Password</label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            style={confirmPasswordError ? { borderColor: '#ef4444' } : undefined}
            placeholder="Ulangi password di atas"
            value={confirmPassword}
            maxLength={PASSWORD_MAX_LENGTH}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setConfirmPasswordError('');
            }}
            disabled={loading}
            required
          />
          {confirmPasswordError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{confirmPasswordError}</span>}

          <label className="input-label">Nomor Telepon</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="input-field"
              style={{ width: '110px' }}
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setPhoneError('');
              }}
              disabled={loading}
            >
              <option value="+62">+62 (ID)</option>
              <option value="+1">+1 (US)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+60">+60 (MY)</option>
            </select>
            <input
              id="phone"
              type="tel"
              className="input-field"
              style={phoneError ? { borderColor: '#ef4444' } : undefined}
              placeholder="8123456789"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value.replace(/\D/g, ''));
                setPhoneError('');
              }} // Hanya menerima angka
              disabled={loading}
              required
            />
          </div>
          {phoneError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{phoneError}</span>}

          <label className="input-label">Jenis Kelamin</label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={(e) => setGender(e.target.value)}
                disabled={loading}
              />
              Laki-laki
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={(e) => setGender(e.target.value)}
                disabled={loading}
              />
              Perempuan
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="terms" style={{ fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
              Saya setuju dengan Syarat & Ketentuan
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
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
