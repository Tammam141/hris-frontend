import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMeApi } from '../api/auth';
import { formatPlainDate, getRoleLabel, getGenderLabel, getEmploymentStatusLabel } from '../utils/labels';
import '../components/ui/dashboard.css';

export function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await getMeApi();
        if (res.success) {
          setProfile(res.data);
          refreshUser(res.data);
        }
      } catch (err) {
        console.error('Gagal memuat profil.', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [refreshUser]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        
        <div className="dashboard-header-row">
          <div>
            <h1 className="dashboard-title">
              Selamat datang, {profile?.employee?.full_name || profile?.full_name || 'Pengguna'}!
            </h1>
            <p className="dashboard-subtitle">
              Ini adalah beranda profil Anda. Berikut detail informasi akun dan kepegawaian Anda.
            </p>
          </div>
          <button className="btn btn-primary" style={{ width: 'auto', marginTop: 0 }} onClick={() => navigate('/profile')}>
            Ubah profil
          </button>
        </div>
        
        {loading ? (
          <p>Memuat profil...</p>
        ) : (
          <div className="dashboard-grid">
            
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-avatar-circle">
                  {profile?.employee?.photo_url ? (
                    <img 
                      src={profile.employee.photo_url} 
                      alt="Profile" 
                      className="profile-avatar-img"
                    />
                  ) : (
                    <span className="profile-avatar-fallback">
                      {(profile?.employee?.full_name || profile?.full_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="profile-card-title">
                    Informasi akun
                  </h2>
                  <div className="profile-card-subtitle">Data masuk & akses</div>
                </div>
              </div>

              <div className="profile-info-list">
                <div>
                  <div className="profile-info-label">Email</div>
                  <div className="profile-info-value">{profile?.email || '-'}</div>
                </div>
                <div>
                  <div className="profile-info-label">Peran</div>
                  <div className="profile-info-value">{getRoleLabel(profile?.role)}</div>
                </div>
                <div>
                  <div className="profile-info-label">Status akun</div>
                  <div className={`profile-info-value ${profile?.is_active ? 'active' : 'inactive'}`}>
                    {profile?.is_active ? 'Aktif' : 'Non-aktif'}
                  </div>
                </div>
              </div>
            </div>

            {profile?.employee && (
              <div className="profile-card">
                <h2 className="profile-card-title profile-card-header">
                  Informasi kepegawaian
                </h2>
                <div className="profile-info-list">
                  <div className="info-grid-2">
                    <div>
                      <div className="profile-info-label">Nomor karyawan</div>
                      <div className="profile-info-value">{profile.employee.employee_number || '-'}</div>
                    </div>
                    <div>
                      <div className="profile-info-label">Telepon</div>
                      <div className="profile-info-value">{profile.employee.phone || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="info-grid-2">
                    <div>
                      <div className="profile-info-label">Jenis kelamin</div>
                      <div className="profile-info-value">{getGenderLabel(profile.employee.gender)}</div>
                    </div>
                    <div>
                      <div className="profile-info-label">Tanggal lahir</div>
                      <div className="profile-info-value">
                        {formatPlainDate(profile.employee.birth_date)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="profile-info-label">Alamat</div>
                    <div className="profile-info-value">{profile.employee.address || '-'}</div>
                  </div>

                  <div className="info-grid-2">
                    <div>
                      <div className="profile-info-label">Unit</div>
                      <div className="profile-info-value">{profile.employee.department_name || '-'}</div>
                    </div>
                    <div>
                      <div className="profile-info-label">Jabatan</div>
                      <div className="profile-info-value">{profile.employee.position_name || '-'}</div>
                    </div>
                  </div>

                  <div className="info-grid-2">
                    <div>
                      <div className="profile-info-label">Status kepegawaian</div>
                      <div className="profile-info-value">{getEmploymentStatusLabel(profile.employee.employment_status)}</div>
                    </div>
                    <div>
                      <div className="profile-info-label">Tanggal bergabung</div>
                      <div className="profile-info-value">
                        {formatPlainDate(profile.employee.join_date)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="profile-info-label">Atasan</div>
                    <div className="profile-info-value">{profile.employee.manager_name || '-'}</div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
