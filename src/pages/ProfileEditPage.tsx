import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateMeApi, getMeApi, uploadMyPhotoApi, deleteMyPhotoApi } from '../api/auth';
import { AlertModal } from '../components/ui/AlertModal';
import { Avatar } from '../components/ui/Avatar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import '../components/ui/dashboard.css';

export function ProfileEditPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.employee?.full_name || user?.full_name || '');
  const [phone, setPhone] = useState(user?.employee?.phone || '');
  const [address, setAddress] = useState(user?.employee?.address || '');
  
  // Photo preview state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // Handle Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validasi ekstensi/tipe (frontend only initial check)
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setAlertInfo({ open: true, title: 'Gagal', message: 'Foto profil harus berupa gambar JPEG, PNG, atau WebP yang sah', type: 'error' });
        return;
      }

      // Validasi ukuran
      if (file.size > 5 * 1024 * 1024) {
        setAlertInfo({ open: true, title: 'Gagal', message: 'Ukuran berkas maksimal 5 MB', type: 'error' });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setPhotoFile(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      await uploadMyPhotoApi(formData);
      
      // Update context
      const res = await getMeApi();
      if (res.success) {
        const token = localStorage.getItem('token');
        if (token) login(token, res.data);
      }
      
      setPhotoPreview(null);
      setPhotoFile(null);
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Foto profil berhasil diperbarui', type: 'success' });
    } catch (error: any) {
      setAlertInfo({ open: true, title: 'Gagal', message: error.message || 'Gagal mengunggah foto.', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setConfirmDeletePhoto(false);
    setIsUploadingPhoto(true);
    try {
      await deleteMyPhotoApi();
      
      // Update context
      const res = await getMeApi();
      if (res.success) {
        const token = localStorage.getItem('token');
        if (token) login(token, res.data);
      }
      
      setAlertInfo({ open: true, title: 'Berhasil', message: 'Foto profil berhasil dihapus', type: 'success' });
    } catch (error: any) {
      setAlertInfo({ open: true, title: 'Gagal', message: error.message || 'Gagal menghapus foto.', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
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
        address,
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
            <Avatar 
              photoUrl={photoPreview || user?.employee?.photo_url || null}
              name={fullName || '?'}
              size="100px"
              fontSize="32px"
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Foto Profil</h3>
              
              {!photoFile && (
                <div>
                  <input 
                    type="file" 
                    id="photoUpload"
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label htmlFor="photoUpload" className="btn btn-secondary" style={{ width: 'auto', display: 'inline-block', cursor: 'pointer', margin: 0, padding: '8px 16px' }}>
                      Pilih Foto Baru
                    </label>
                    {user?.employee?.photo_url && (
                      <button type="button" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 16px', color: '#ef4444' }} onClick={() => setConfirmDeletePhoto(true)} disabled={isUploadingPhoto}>
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              )}

              {photoFile && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" className="btn btn-primary" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={handleUploadPhoto} disabled={isUploadingPhoto}>
                    {isUploadingPhoto ? 'Mengunggah...' : 'Unggah Sekarang'}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} disabled={isUploadingPhoto}>
                    Batal
                  </button>
                </div>
              )}
              
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Format: JPG, PNG, WebP. Maksimal 5 MB.</p>
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
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
      
      <ConfirmModal
        isOpen={confirmDeletePhoto}
        title="Hapus Foto Profil"
        message="Apakah Anda yakin ingin menghapus foto profil? Foto akan dihapus secara permanen."
        isDestructive={true}
        onConfirm={handleDeletePhoto}
        onCancel={() => setConfirmDeletePhoto(false)}
      />
    </div>
  );
}
