import { useState, useEffect } from 'react';
import { Department, Position, UpdateEmployeePayload, EmployeeListItem, EmployeeDetail } from '../../types/employee';
import { uploadEmployeePhotoApi, deleteEmployeePhotoApi } from '../../api/employee';
import { useAuth } from '../../hooks/useAuth';
import { validateEmployeeDates } from '../../utils/dateValidation';
import { Avatar } from '../../components/ui/Avatar';
import './employee-modal.css';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateEmployeePayload) => Promise<void>;
  employeeData?: EmployeeDetail | null;
  departments: Department[];
  positions: Position[];
  managers: EmployeeListItem[];
}

export function EmployeeModal({ isOpen, onClose, onSubmit, employeeData, departments, positions, managers }: EmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'probation' | 'contract' | 'permanent' | 'intern' | 'resigned' | ''>('');
  const [joinDate, setJoinDate] = useState('');
  const [resignDate, setResignDate] = useState('');

  // Photo state
  const { hasFeature } = useAuth();
  const canUpdatePhoto = hasFeature('employee.update');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (isOpen) {
      if (employeeData) {
        setFullName(employeeData.full_name || '');
        
        let phone = employeeData.phone || '';
        if (phone.startsWith('+62')) {
          setCountryCode('+62');
          setPhoneNumber(phone.substring(3));
        } else if (phone.startsWith('0')) {
          setCountryCode('+62');
          setPhoneNumber(phone.substring(1));
        } else {
          setPhoneNumber(phone);
        }

        setGender(employeeData.gender || ''); 
        
        const matchedDept = departments.find(d => d.name === employeeData.department_name);
        setDepartmentId(employeeData.department_id || (matchedDept ? matchedDept.id : ''));
        
        const matchedPos = positions.find(p => p.name === employeeData.position_name);
        setPositionId(employeeData.position_id || (matchedPos ? matchedPos.id : ''));
        
        const matchedMgr = managers.find(m => m.full_name === employeeData.manager_name);
        setManagerId(employeeData.manager_id || (matchedMgr ? matchedMgr.id : ''));
        
        setBirthDate(employeeData.birth_date ? employeeData.birth_date.split('T')[0] : '');
        setAddress(employeeData.address || '');
        setEmploymentStatus(employeeData.employment_status as any || '');
        setJoinDate(employeeData.join_date ? employeeData.join_date.split('T')[0] : '');
        setResignDate(employeeData.resign_date ? employeeData.resign_date.split('T')[0] : '');
        setCurrentPhotoUrl(employeeData.photo_url || null);
      } else {
        // Fallback jika anehnya employeeData kosong
        setFullName('');
        setCountryCode('+62');
        setPhoneNumber('');
        setGender('');
        setDepartmentId('');
        setPositionId('');
        setManagerId('');
        setBirthDate('');
        setAddress('');
        setEmploymentStatus('');
        setJoinDate('');
        setResignDate('');
        setCurrentPhotoUrl(null);
      }
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoMessage(null);
      setError('');
    }
  }, [isOpen, employeeData, departments, positions, managers]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dateErrors = validateEmployeeDates(birthDate, joinDate);
      if (dateErrors.length > 0) {
        setError(dateErrors[0].message);
        setLoading(false);
        return;
      }

      const cleanPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const fullPhone = phoneNumber ? `${countryCode}${cleanPhone}` : '';

      const payload: any = {
        full_name: fullName,
      };

      if (fullPhone) payload.phone = fullPhone;
      if (gender) payload.gender = gender;
      if (employmentStatus) payload.employment_status = employmentStatus;

      if (birthDate) payload.birth_date = birthDate;
      if (address) payload.address = address;
      if (joinDate) payload.join_date = joinDate;
      if (resignDate) payload.resign_date = resignDate;

      if (departmentId) payload.department_id = departmentId;
      if (positionId) payload.position_id = positionId;
      if (managerId) payload.manager_id = managerId;

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  }

  // Handle Photo specific actions
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setPhotoMessage({ text: 'Foto profil harus berupa gambar JPEG, PNG, atau WebP yang sah', type: 'error' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoMessage({ text: 'Ukuran berkas maksimal 5 MB', type: 'error' });
        return;
      }
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoFile(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !employeeData) return;
    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const res = await uploadEmployeePhotoApi(employeeData.id, formData);
      setCurrentPhotoUrl(res.data.photo_url);
      setPhotoPreview(null);
      setPhotoFile(null);
      setPhotoMessage({ text: 'Foto profil berhasil diperbarui', type: 'success' });
      
      // We don't call onSubmit here because it's a separate endpoint and we just updated the photo.
      // But we might want the parent to refresh list. The parent will refresh when modal closes if needed.
    } catch (err: any) {
      setPhotoMessage({ text: err.message || 'Gagal mengunggah foto', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!employeeData) return;
    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      await deleteEmployeePhotoApi(employeeData.id);
      setCurrentPhotoUrl(null);
      setPhotoMessage({ text: 'Foto profil berhasil dihapus', type: 'success' });
    } catch (err: any) {
      setPhotoMessage({ text: err.message || 'Gagal menghapus foto', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            Ubah Data Karyawan
          </h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert-error">{error}</div>}
          
          {canUpdatePhoto && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 16px 0' }}>Foto Profil</h3>
              
              {photoMessage && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', backgroundColor: photoMessage.type === 'error' ? '#fee2e2' : '#dcfce7', color: photoMessage.type === 'error' ? '#991b1b' : '#166534' }}>
                  {photoMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Avatar 
                  photoUrl={photoPreview || currentPhotoUrl} 
                  name={fullName || '?'} 
                  size="64px" 
                  fontSize="24px"
                />
                <div style={{ flex: 1 }}>
                  {!photoFile ? (
                    <div>
                      <input 
                        type="file" 
                        id="empPhotoUpload"
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label htmlFor="empPhotoUpload" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>
                          Pilih Foto
                        </label>
                        {currentPhotoUrl && (
                          <button type="button" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '13px', color: '#ef4444' }} onClick={handleDeletePhoto} disabled={isUploadingPhoto}>
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-primary" style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '13px' }} onClick={handleUploadPhoto} disabled={isUploadingPhoto}>
                        {isUploadingPhoto ? 'Menyimpan...' : 'Unggah'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '13px' }} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} disabled={isUploadingPhoto}>
                        Batal
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Format: JPG, PNG, WebP. Maks 5MB. Foto langsung tersimpan.</p>
                </div>
              </div>
            </div>
          )}

          <form id="employeeForm" onSubmit={handleSubmit}>
            <div className="form-grid">
              
              <div className="form-group full-width">
                <label className="input-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Nomor Telepon</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="input-field"
                    style={{ width: '110px' }}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+62">+62 (ID)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+60">+60 (MY)</option>
                  </select>
                  <input 
                    type="tel" 
                    className="input-field" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="812345678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Jenis Kelamin</label>
                <select 
                  className="input-field" 
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                >
                  <option value="" disabled>-- Pilih --</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Tanggal Lahir</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="input-label">Alamat Lengkap</label>
                <textarea 
                  className="input-field" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label className="input-label">Departemen</label>
                <select 
                  className="input-field" 
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">- Pilih Departemen -</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Jabatan</label>
                <select 
                  className="input-field" 
                  value={positionId}
                  onChange={e => setPositionId(e.target.value)}
                >
                  <option value="">- Pilih Jabatan -</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Manajer</label>
                <select 
                  className="input-field" 
                  value={managerId}
                  onChange={e => setManagerId(e.target.value)}
                >
                  <option value="">- Pilih Manajer -</option>
                  {managers.filter(m => m.id !== employeeData?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Status Kepegawaian</label>
                <select 
                  className="input-field" 
                  value={employmentStatus}
                  onChange={e => setEmploymentStatus(e.target.value as any)}
                >
                  <option value="" disabled>-- Pilih --</option>
                  <option value="probation">Probation</option>
                  <option value="contract">Contract</option>
                  <option value="permanent">Permanent</option>
                  <option value="intern">Intern</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Tanggal Bergabung</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={joinDate}
                  onChange={e => setJoinDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="input-label">Tanggal Resign</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={resignDate}
                  onChange={e => setResignDate(e.target.value)}
                />
              </div>

            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Batal</button>
          <button type="submit" form="employeeForm" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
            {loading ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
