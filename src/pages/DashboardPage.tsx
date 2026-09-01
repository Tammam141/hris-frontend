import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMeApi } from '../api/auth';
import { formatPlainDate } from '../utils/dateFormatter';
import '../components/ui/dashboard.css';

export function DashboardPage() {
  const { user, login } = useAuth();
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
          // Also update context so user info is fresh
          const token = localStorage.getItem('token');
          if (token) {
            login(token, res.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const formatDateIndo = (dateStr: string | undefined | null) => {
    const plain = formatPlainDate(dateStr);
    if (plain === '-') return '-';
    const [y, m, d] = plain.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (!y || !m || !d) return plain;
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ padding: '32px' }}>
        
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
            Edit Profile
          </button>
        </div>
        
        {loading ? (
          <p>Memuat profil...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '24px', color: '#fff' }}>
                    {(profile?.employee?.full_name || profile?.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                    Informasi Akun
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Data login & akses</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Email</div>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile?.email || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Role</div>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{profile?.role || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Status Akun</div>
                  <div style={{ fontSize: '14px', color: profile?.is_active ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                    {profile?.is_active ? 'Aktif' : 'Non-aktif'}
                  </div>
                </div>
              </div>
            </div>

            {profile?.employee && (
              <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  Informasi Kepegawaian
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="info-grid-2">
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>ID Karyawan</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.employee_number || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Telepon</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.phone || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="info-grid-2">
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Jenis Kelamin</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{profile.employee.gender || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Tanggal Lahir</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>
                        {formatDateIndo(profile.employee.birth_date)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Alamat</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.address || '-'}</div>
                  </div>

                  <div className="info-grid-2">
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Departemen</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.department_name || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Jabatan</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.position_name || '-'}</div>
                    </div>
                  </div>

                  <div className="info-grid-2">
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Status Kepegawaian</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{profile.employee.employment_status || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Tanggal Bergabung</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>
                        {formatDateIndo(profile.employee.join_date)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Manajer</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.manager_name || '-'}</div>
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
