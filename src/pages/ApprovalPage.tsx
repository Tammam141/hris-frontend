import { useState, useEffect } from 'react';
import { getPendingUsers, approveUser, PendingUser } from '../api/user';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';

export function ApprovalPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States for Modals
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string, email: string} | null>(null);
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await getPendingUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data persetujuan pengguna');
    } finally {
      setLoading(false);
    }
  }

  function confirmApprove(id: string, email: string) {
    setSelectedUser({ id, email });
    setConfirmOpen(true);
  }

  async function handleApprove() {
    if (!selectedUser) return;
    setConfirmOpen(false);
    
    try {
      const res = await approveUser(selectedUser.id);
      if (res.success) {
        setSuccessMsg(res.message || `Akun ${selectedUser.email} berhasil disetujui.`);
        loadUsers();
      }
    } catch (err: any) {
      setAlertMessage(err.message || 'Gagal menyetujui akun');
      setAlertOpen(true);
    } finally {
      setSelectedUser(null);
    }
  }

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions">
          <div>
            <h1 className="dashboard-title">Persetujuan Akun Baru</h1>
            <p className="dashboard-subtitle">Daftar pengguna yang mendaftar mandiri dan menunggu persetujuan HR.</p>
          </div>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {successMsg && <div className="alert-error" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', marginBottom: '16px' }}>{successMsg}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Tanggal Mendaftar</th>
                <th style={{ width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} className="text-center empty-table-cell">Tidak ada permintaan persetujuan akun saat ini.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td className="employee-name">{u.email}</td>
                    <td className="employee-subtext">{new Date(u.created_at).toLocaleString('id-ID')}</td>
                    <td>
                      <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '13px', margin: 0, width: '100%' }} onClick={() => confirmApprove(u.id, u.email)}>
                        Setujui
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Setujui Akun"
        message={`Apakah Anda yakin ingin menyetujui pendaftaran akun untuk ${selectedUser?.email}?`}
        onConfirm={handleApprove}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedUser(null);
        }}
      />

      <AlertModal
        isOpen={alertOpen}
        title="Peringatan"
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}
