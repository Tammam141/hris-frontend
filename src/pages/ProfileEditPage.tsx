import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateMeApi, getMeApi } from '../api/auth';
import { AlertModal } from '../components/ui/AlertModal';
import '../components/ui/dashboard.css';

export function ProfileEditPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.employee?.full_name || user?.full_name || '');
  const [phone, setPhone] = useState(user?.employee?.phone || '');
  const [birthDate, setBirthDate] = useState(user?.employee?.birth_date || '');
  const [address, setAddress] = useState(user?.employee?.address || '');
  
  // Photo preview state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  // Handle Photo Change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Call the real API
      const dataToUpdate = {
        full_name: fullName,
        phone,
        birth_date: birthDate || undefined,
        address,
        // (Photo would be uploaded here using FormData if supported)
      };

      await updateMeApi(dataToUpdate);
      
      // Fetch the updated profile and update context
      const res = await getMeApi();
      if (res.success) {
        const token = localStorage.getItem('token');
        if (token) {
          login(token, res.data);
        }
      }

      // Langsung reload dan kembali ke dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      setAlertInfo({ open: true, title: 'Gagal', message: error.message || 'Gagal memperbarui profil.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Edit Profil</h1>
            <p className="dashboard-subtitle">Perbarui informasi profil Anda.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Batal & Kembali
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section: Foto Profil */}
          <div className="profile-photo-section">
            <div style={{ 
              width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#cbd5e1', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              flexShrink: 0
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px', color: '#fff' }}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Foto Profil</h3>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange}
                style={{ fontSize: '14px' }}
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Format: JPG, PNG. Maksimal 2MB.</p>
            </div>
          </div>

          {/* Section: Editable Fields */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input 
                type="text" 
                className="input-field" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Nomor Telepon</label>
              <input 
                type="text" 
                className="input-field" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label">Tanggal Lahir</label>
              <input 
                type="date" 
                className="input-field" 
                value={birthDate} 
                onChange={e => setBirthDate(e.target.value)} 
              />
            </div>

            <div className="form-group form-group--span2">
              <label className="form-label">Alamat Lengkap</label>
              <textarea 
                className="input-field" 
                rows={3} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Masukkan alamat lengkap Anda..."
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

          {/* Section: Read Only Fields */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>Informasi Pekerjaan (Tidak Bisa Diedit)</h3>
            <div className="form-grid-2">
              
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="text" className="input-field" value={user?.email || ''} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Nomor Induk Karyawan (NIK)</label>
                <input type="text" className="input-field" value={user?.employee?.employee_number || ''} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Departemen</label>
                <input type="text" className="input-field" value={user?.employee?.department_name || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Jabatan (Position)</label>
                <input type="text" className="input-field" value={user?.employee?.position_name || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Atasan (Manager)</label>
                <input type="text" className="input-field" value={user?.employee?.manager_name || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Status Kepegawaian</label>
                <input type="text" className="input-field" value={user?.employee?.employment_status || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', textTransform: 'capitalize' }} />
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '200px' }}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>

      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.title}
        type={alertInfo.type}
        message={alertInfo.message}
        onClose={() => {
          setAlertInfo(prev => ({ ...prev, open: false }));
          if (alertInfo.type === 'success') {
            navigate('/dashboard');
          }
        }}
      />
    </div>
  );
}
