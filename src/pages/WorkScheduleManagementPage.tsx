import { useState, useEffect } from 'react';
import { WorkSchedule } from '../types/schedule';
import { getSchedulesApi, deleteScheduleApi } from '../api/schedule';
import { ScheduleFormModal } from '../features/schedule/ScheduleFormModal';
import { AlertModal } from '../components/ui/AlertModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';

export function WorkScheduleManagementPage() {
  const { hasFeature } = useAuth();
  const canManage = hasFeature('organization.schedule');

  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);

  const [alertInfo, setAlertInfo] = useState({ open: false, title: '', message: '', type: 'success' as 'success' | 'error' });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string } | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await getSchedulesApi();
      if (res.success) {
        setSchedules(res.data);
      }
    } catch (e: any) {
      setAlertInfo({ open: true, title: 'Error', message: e.message || 'Gagal memuat jadwal kerja.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedSchedule(null);
    setIsFormOpen(true);
  };

  const handleEdit = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDelete = (schedule: WorkSchedule) => {
    setConfirmDelete({ open: true, id: schedule.id, name: schedule.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteScheduleApi(confirmDelete.id);
      setAlertInfo({ open: true, title: 'Berhasil', message: `Jadwal "${confirmDelete.name}" telah dihapus.`, type: 'success' });
      loadSchedules();
    } catch (e: any) {
      // Menangani error 409 apabila masih ada yang memakai, atau 400 apabila default.
      let msg = e.message || 'Gagal menghapus jadwal.';
      if (e.details?.employee_count) {
        msg += ` (Masih dipakai ${e.details.employee_count} karyawan)`;
      }
      setAlertInfo({ open: true, title: 'Gagal', message: msg, type: 'error' });
    } finally {
      setConfirmDelete(null);
    }
  };

  const formatDays = (s: WorkSchedule) => {
    const days = [];
    if (s.works_monday) days.push('Senin');
    if (s.works_tuesday) days.push('Selasa');
    if (s.works_wednesday) days.push('Rabu');
    if (s.works_thursday) days.push('Kamis');
    if (s.works_friday) days.push('Jumat');
    if (s.works_saturday) days.push('Sabtu');
    if (s.works_sunday) days.push('Minggu');
    
    if (days.length === 7) return 'Setiap Hari';
    if (days.length === 5 && !s.works_saturday && !s.works_sunday) return 'Senin - Jumat';
    
    return days.join(', ');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Manajemen Jadwal Kerja</h1>
          <p className="dashboard-subtitle">Kelola jam kerja, hari operasional, dan toleransi keterlambatan departemen.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={handleAdd}>
            + Tambah Jadwal Baru
          </button>
        )}
      </div>

      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        {isLoading ? (
          <p style={{ padding: '24px' }}>Memuat data...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table" style={{ minWidth: '1000px' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Nama Jadwal</th>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Departemen</th>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Jam Kerja</th>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Hari Kerja</th>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Toleransi Telat</th>
                  <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Status</th>
                  {canManage && <th style={{ padding: '16px 24px', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => {
                  const isDefault = schedule.department_id === null;
                  return (
                    <tr key={schedule.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }} className="matrix-row">
                      <td style={{ fontWeight: 600, padding: '16px 24px', color: '#0f172a' }}>{schedule.name} {isDefault && <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>Bawaan</span>}</td>
                      <td style={{ padding: '16px 24px' }}>{schedule.department_id ? <span style={{ color: '#0f172a' }}>Spesifik Departemen</span> : <span style={{ color: '#64748b' }}>Semua Departemen</span>}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 500, color: '#334155' }}>{schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)}</td>
                      <td style={{ padding: '16px 24px', color: '#475569' }}>{formatDays(schedule)}</td>
                      <td style={{ padding: '16px 24px', color: '#475569' }}>{schedule.late_tolerance_minutes} Menit</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-block',
                          backgroundColor: schedule.is_active ? '#dcfce7' : '#f1f5f9',
                          color: schedule.is_active ? '#166534' : '#475569'
                        }}>
                          {schedule.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {canManage && (
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn-icon" style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }} title="Edit" onClick={() => handleEdit(schedule)}>
                              <EditIcon />
                            </button>
                            <button 
                              className="btn-icon" 
                              style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px', color: isDefault ? '#cbd5e1' : '#ef4444', cursor: isDefault ? 'not-allowed' : 'pointer' }} 
                              title={isDefault ? "Jadwal bawaan tidak bisa dihapus" : "Hapus"} 
                              onClick={() => !isDefault && handleDelete(schedule)}
                              disabled={isDefault}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Belum ada jadwal kerja terdaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ScheduleFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => { setIsFormOpen(false); loadSchedules(); }} 
        schedule={selectedSchedule} 
      />

      <ConfirmModal
        isOpen={!!confirmDelete?.open}
        title="Hapus Jadwal Kerja"
        message={`Apakah Anda yakin ingin menghapus jadwal "${confirmDelete?.name}"? Jadwal yang masih digunakan oleh karyawan tidak bisa dihapus.`}
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <AlertModal
        isOpen={alertInfo.open}
        title={alertInfo.title}
        type={alertInfo.type}
        message={alertInfo.message}
        onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
