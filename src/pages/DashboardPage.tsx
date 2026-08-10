import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMeApi } from '../api/auth';
import '../components/ui/dashboard.css';

export function DashboardPage() {
  const { user, login } = useAuth();
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-card" style={{ padding: '32px' }}>
        <h1 className="dashboard-title">
          Selamat datang, {profile?.employee?.full_name || profile?.full_name || 'Pengguna'}!
        </h1>
        <p className="dashboard-subtitle" style={{ marginBottom: '32px' }}>
          Ini adalah beranda profil Anda. Berikut detail informasi akun dan kepegawaian Anda.
        </p>
        
        {loading ? (
          <p>Memuat profil...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                Informasi Akun
              </h2>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>ID Karyawan</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.employee_number || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Telepon</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.phone || '-'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Departemen</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.department_name || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Jabatan</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{profile.employee.position_name || '-'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Status Kepegawaian</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{profile.employee.employment_status || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Tanggal Bergabung</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>
                        {profile.employee.join_date ? new Date(profile.employee.join_date).toLocaleDateString('id-ID') : '-'}
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
