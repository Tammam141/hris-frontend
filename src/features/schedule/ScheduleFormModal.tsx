import React, { useState, useEffect } from 'react';
import { WorkSchedule } from '../../types/schedule';
import { createScheduleApi, updateScheduleApi, getSchedulesApi } from '../../api/schedule';
import { getDepartments } from '../../api/department';
import { XIcon } from '../../components/icons/XIcon';
import { StaleDataModal } from '../../components/ui/StaleDataModal';
import { isStaleData, StaleDataDetails } from '../../utils/staleData';
import '../employee/employee-modal.css';
import { ApiError } from '../../api/client';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: WorkSchedule | null;
}

export function ScheduleFormModal({ isOpen, onClose, onSuccess, schedule }: ScheduleFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [otherSchedules, setOtherSchedules] = useState<WorkSchedule[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptError, setDeptError] = useState('');
  
  const [staleDetails, setStaleDetails] = useState<StaleDataDetails | null>(null);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | undefined>(undefined);
  
  const isDefaultSchedule = schedule?.is_default === true;

  const [formData, setFormData] = useState({
    name: '',
    department_ids: [] as string[],
    start_time: '08:00',
    end_time: '17:00',
    late_tolerance_minutes: 5,
    absent_cutoff_time: '18:00',
    overtime_min_minutes: 30,
    works_monday: true,
    works_tuesday: true,
    works_wednesday: true,
    works_thursday: true,
    works_friday: true,
    works_saturday: false,
    works_sunday: false,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      if (schedule) {
        setCurrentUpdatedAt(schedule.updated_at);
        setFormData({
          name: schedule.name,
          department_ids: schedule.department_ids || [],
          start_time: schedule.start_time.substring(0, 5), // "HH:MM:SS" -> "HH:MM"
          end_time: schedule.end_time.substring(0, 5),
          late_tolerance_minutes: schedule.late_tolerance_minutes,
          absent_cutoff_time: schedule.absent_cutoff_time.substring(0, 5),
          overtime_min_minutes: schedule.overtime_min_minutes ?? 30,
          works_monday: schedule.works_monday,
          works_tuesday: schedule.works_tuesday,
          works_wednesday: schedule.works_wednesday,
          works_thursday: schedule.works_thursday,
          works_friday: schedule.works_friday,
          works_saturday: schedule.works_saturday,
          works_sunday: schedule.works_sunday,
          is_active: schedule.is_active
        });
      } else {
        setFormData({
          name: '',
          department_ids: [],
          start_time: '08:00',
          end_time: '17:00',
          late_tolerance_minutes: 5,
          absent_cutoff_time: '18:00',
          overtime_min_minutes: 30,
          works_monday: true,
          works_tuesday: true,
          works_wednesday: true,
          works_thursday: true,
          works_friday: true,
          works_saturday: false,
          works_sunday: false,
          is_active: true
        });
      }
      setErrorMsg('');
      setDeptError('');
      setDeptSearch('');
    }
  }, [isOpen, schedule]);

  const loadDepartments = async () => {
    try {
      const [depRes, schRes] = await Promise.all([getDepartments(), getSchedulesApi()]);
      if (depRes.success) {
        setDepartments(depRes.data);
      }
      if (schRes.success) {
        setOtherSchedules(schRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Peta divisi -> nama jadwal lain yang sudah memakainya (jadwal yang sedang diedit dikecualikan)
  const usedByOther = new Map<string, string>();
  otherSchedules.forEach(s => {
    if (s.id === schedule?.id || s.is_default) return;
    (s.department_ids || []).forEach(id => usedByOther.set(id, s.name));
  });

  const toggleDepartment = (id: string) => {
    setDeptError('');
    setFormData(prev => ({
      ...prev,
      department_ids: prev.department_ids.includes(id)
        ? prev.department_ids.filter(x => x !== id)
        : [...prev.department_ids, id]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setDeptError('');

    if (!isDefaultSchedule && formData.department_ids.length === 0) {
      setDeptError('Pilih minimal 1 divisi untuk jadwal ini.');
      setIsSubmitting(false);
      return;
    }

    const otMin = Number(formData.overtime_min_minutes);
    if (isNaN(otMin) || otMin < 0 || otMin > 240) {
      setErrorMsg('Minimal lembur dihitung harus antara 0 dan 240 menit.');
      setIsSubmitting(false);
      return;
    }

    // Frontend Time Validation
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMin = timeToMinutes(formData.start_time);
    const endMin = timeToMinutes(formData.end_time);
    const cutoffMin = timeToMinutes(formData.absent_cutoff_time);
    const tolMin = Number(formData.late_tolerance_minutes);

    if (endMin <= startMin) {
      setErrorMsg(`Jam pulang (${formData.end_time}) harus setelah jam masuk (${formData.start_time})`);
      setIsSubmitting(false);
      return;
    }

    if (cutoffMin <= startMin + tolMin) {
      const minCutoffStr = `${Math.floor((startMin + tolMin) / 60).toString().padStart(2, '0')}:${((startMin + tolMin) % 60).toString().padStart(2, '0')}`;
      setErrorMsg(`Batas absen (${formData.absent_cutoff_time}) harus melewati akhir toleransi keterlambatan, yaitu ${tolMin} menit setelah jam masuk (setelah ${minCutoffStr})`);
      setIsSubmitting(false);
      return;
    }

    if (cutoffMin > endMin) {
      setErrorMsg(`Batas absen (${formData.absent_cutoff_time}) tidak boleh melewati jam pulang (${formData.end_time})`);
      setIsSubmitting(false);
      return;
    }

    try {
      const { department_ids, ...rest } = formData;
      const payload: Partial<WorkSchedule> = {
        ...rest,
        late_tolerance_minutes: tolMin,
        overtime_min_minutes: otMin,
      };
      // Jadwal bawaan tidak memakai pilihan divisi
      if (!isDefaultSchedule) payload.department_ids = department_ids;

      if (schedule?.id) {
        await updateScheduleApi(schedule.id, { ...payload, updated_at: currentUpdatedAt });
      } else {
        await createScheduleApi(payload);
      }
      
      onSuccess();
    } catch (e: any) {
      const error = e as ApiError;
      if (isStaleData(error)) {
        setStaleDetails(error.details);
        setIsStaleModalOpen(true);
      } else if (error.status === 409 && Array.isArray(error.details?.conflicts)) {
        const msgs = error.details.conflicts.map((c: any) =>
          `${c.department_name} sudah memakai ${c.schedule_name}. Lepaskan dulu dari jadwal itu.`
        );
        setDeptError(msgs.join(' '));
      } else if (error.status === 400 && Array.isArray(error.details?.missing_department_ids)) {
        setDeptError('Sebagian divisi yang dipilih tidak ditemukan. Muat ulang halaman lalu coba lagi.');
      } else if (error.status === 400 && /at least one department/i.test(error.message || '')) {
        setDeptError('Pilih minimal 1 divisi untuk jadwal ini.');
      } else {
        setErrorMsg(error.message || 'Gagal menyimpan jadwal kerja.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaleReload = () => {
    if (staleDetails?.current) {
      const current = staleDetails.current as WorkSchedule;
      setFormData({
        name: current.name,
        department_ids: current.department_ids || [],
        start_time: current.start_time.substring(0, 5),
        end_time: current.end_time.substring(0, 5),
        late_tolerance_minutes: current.late_tolerance_minutes,
        absent_cutoff_time: current.absent_cutoff_time.substring(0, 5),
        overtime_min_minutes: current.overtime_min_minutes ?? 30,
        works_monday: current.works_monday,
        works_tuesday: current.works_tuesday,
        works_wednesday: current.works_wednesday,
        works_thursday: current.works_thursday,
        works_friday: current.works_friday,
        works_saturday: current.works_saturday,
        works_sunday: current.works_sunday,
        is_active: current.is_active,
      });
      setCurrentUpdatedAt(current.updated_at);
    }
    setIsStaleModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{schedule ? 'Edit Jadwal Kerja' : 'Tambah Jadwal Kerja'}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}><XIcon /></button>
        </div>
        
        <div className="modal-body">
          {errorMsg && (
            <div className="alert-error" style={{ marginBottom: '24px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="input-label">Nama Jadwal</label>
            <input 
              type="text" 
              name="name"
              className="input-field" 
              value={formData.name} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="input-label">Divisi</label>
            {isDefaultSchedule ? (
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Berlaku untuk semua divisi yang tidak punya jadwal sendiri</p>
            ) : (
              <>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari divisi..."
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: deptError ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#f8fafc' }}>
                  {departments
                    .filter(d => d.name.toLowerCase().includes(deptSearch.trim().toLowerCase()))
                    .map(d => {
                      const usedBy = usedByOther.get(d.id);
                      return (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={formData.department_ids.includes(d.id)}
                            onChange={() => toggleDepartment(d.id)}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                          />
                          <span>{d.name}</span>
                          {usedBy && <span style={{ fontSize: '12px', color: '#94a3b8' }}>dipakai: {usedBy}</span>}
                        </label>
                      );
                    })}
                  {departments.length === 0 && <span style={{ fontSize: '13px', color: '#64748b' }}>Tidak ada divisi.</span>}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{formData.department_ids.length} divisi dipilih</p>
                {deptError && <span style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>{deptError}</span>}
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="input-label">Jam Masuk (Start Time)</label>
              <input 
                type="time" 
                name="start_time"
                className="input-field" 
                value={formData.start_time} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="input-label">Jam Pulang (End Time)</label>
              <input 
                type="time" 
                name="end_time"
                className="input-field" 
                value={formData.end_time} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="input-label">Toleransi Terlambat (Menit)</label>
              <input 
                type="number" 
                name="late_tolerance_minutes"
                className="input-field" 
                value={formData.late_tolerance_minutes} 
                onChange={handleChange} 
                min="0"
                required 
              />
            </div>

            <div className="form-group">
              <label className="input-label">Batas Absen Masuk</label>
              <input 
                type="time" 
                name="absent_cutoff_time"
                className="input-field" 
                value={formData.absent_cutoff_time} 
                onChange={handleChange} 
                required 
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Datang setelah jam ini dihitung tidak hadir.</p>
            </div>

            <div className="form-group">
              <label className="input-label">Minimal lembur dihitung (menit)</label>
              <input 
                type="number" 
                name="overtime_min_minutes"
                className="input-field" 
                value={formData.overtime_min_minutes} 
                onChange={handleChange} 
                min="0"
                max="240"
                required 
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Lembur dihitung penuh sejak jam pulang bila mencapai batas ini.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Hari Kerja</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {[
                { name: 'works_monday', label: 'Senin' },
                { name: 'works_tuesday', label: 'Selasa' },
                { name: 'works_wednesday', label: 'Rabu' },
                { name: 'works_thursday', label: 'Kamis' },
                { name: 'works_friday', label: 'Jumat' },
                { name: 'works_saturday', label: 'Sabtu' },
                { name: 'works_sunday', label: 'Minggu' },
              ].map(day => (
                <label key={day.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input 
                    type="checkbox" 
                    name={day.name} 
                    checked={(formData as any)[day.name]} 
                    onChange={handleChange}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              name="is_active" 
              id="is_active"
              checked={formData.is_active} 
              onChange={handleChange}
              disabled={isDefaultSchedule} // Jadwal Bawaan TIDAK BISA dinonaktifkan
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            <label htmlFor="is_active" style={{ cursor: isDefaultSchedule ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
              Jadwal Aktif
            </label>
            {isDefaultSchedule && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>*Jadwal bawaan selalu aktif</span>}
          </div>

            <div className="modal-footer" style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <StaleDataModal
        isOpen={isStaleModalOpen}
        onClose={() => setIsStaleModalOpen(false)}
        onReload={handleStaleReload}
        details={staleDetails}
      />
    </div>
  );
}
