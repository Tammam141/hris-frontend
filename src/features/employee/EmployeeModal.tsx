import { useState, useEffect } from 'react';
import { CreateEmployeePayload, UpdateEmployeePayload, Department, Position, EmployeeListItem, EmployeeDetail } from '../../types/employee';
import './employee-modal.css';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeePayload | UpdateEmployeePayload) => Promise<void>;
  mode: 'create' | 'edit';
  employeeData?: EmployeeDetail | null;
  departments: Department[];
  positions: Position[];
  managers: EmployeeListItem[];
}

export function EmployeeModal({ isOpen, onClose, onSubmit, mode, employeeData, departments, positions, managers }: EmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employee' | 'hr' | 'admin'>('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'probation' | 'contract' | 'permanent' | 'intern' | 'resigned'>('probation');
  const [joinDate, setJoinDate] = useState('');
  const [resignDate, setResignDate] = useState('');

  // Reset form when modal opens or employee data changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && employeeData) {
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

        setGender(employeeData.gender || 'male'); 
        setDepartmentId(employeeData.department_id || '');
        setPositionId(employeeData.position_id || '');
        setManagerId(employeeData.manager_id || '');
        setBirthDate(employeeData.birth_date ? employeeData.birth_date.split('T')[0] : '');
        setAddress(employeeData.address || '');
        setEmploymentStatus(employeeData.employment_status as any || 'probation');
        setJoinDate(employeeData.join_date ? employeeData.join_date.split('T')[0] : '');
        setResignDate(employeeData.resign_date ? employeeData.resign_date.split('T')[0] : '');
      } else {
        // Reset for create
        setFullName('');
        setCountryCode('+62');
        setPhoneNumber('');
        setGender('male');
        setEmail('');
        setPassword('');
        setRole('employee');
        setDepartmentId('');
        setPositionId('');
        setManagerId('');
        setBirthDate('');
        setAddress('');
        setEmploymentStatus('probation');
        setJoinDate('');
        setResignDate('');
      }
      setError('');
    }
  }, [isOpen, mode, employeeData, departments, positions, managers]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
      const fullPhone = phoneNumber ? `${countryCode}${cleanPhone}` : '';

      const payload: any = {
        full_name: fullName,
        phone: fullPhone || '+62800000000', // Default if missing
        gender,
        employment_status: employmentStatus,
      };

      if (birthDate) payload.birth_date = birthDate;
      if (address) payload.address = address;
      if (joinDate) payload.join_date = joinDate;

      if (mode === 'create') {
        payload.email = email;
        payload.password = password;
        payload.role = role;
      } else {
        if (resignDate) payload.resign_date = resignDate;
      }

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' ? 'Tambah Karyawan Baru' : 'Ubah Data Karyawan'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert-error">{error}</div>}
          
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

              {mode === 'create' && (
                <>
                  <div className="form-group">
                    <label className="input-label">Email Akun</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@perusahaan.com"
                      required={mode === 'create'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Password Sementara</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      minLength={8}
                      required={mode === 'create'}
                    />
                  </div>
                </>
              )}

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
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Jenis Kelamin</label>
                <select 
                  className="input-field" 
                  value={gender}
                  onChange={e => setGender(e.target.value as 'male' | 'female')}
                >
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

              {mode === 'create' && (
                <div className="form-group">
                  <label className="input-label">Hak Akses (Role)</label>
                  <select 
                    className="input-field" 
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                  >
                    <option value="employee">Karyawan Biasa</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

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
                  {managers.filter(m => mode === 'create' || m.id !== employeeData?.id).map(m => (
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

              {mode === 'edit' && (
                <div className="form-group">
                  <label className="input-label">Tanggal Resign</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={resignDate}
                    onChange={e => setResignDate(e.target.value)}
                  />
                </div>
              )}

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
