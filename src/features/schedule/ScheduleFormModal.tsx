import React, { useState, useEffect } from 'react';
import { WorkSchedule } from '../../types/schedule';
import { createScheduleApi, updateScheduleApi } from '../../api/schedule';
import { getDepartments } from '../../api/department';
import { XIcon } from '../../components/icons/XIcon';

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
  
  const isDefaultSchedule = schedule?.department_id === null && schedule?.id !== undefined;

  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    start_time: '08:00',
    end_time: '17:00',
    late_tolerance_minutes: 5,
    absent_cutoff_time: '18:00',
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
        setFormData({
          name: schedule.name,
          department_id: schedule.department_id || '',
          start_time: schedule.start_time.substring(0, 5), // "HH:MM:SS" -> "HH:MM"
          end_time: schedule.end_time.substring(0, 5),
          late_tolerance_minutes: schedule.late_tolerance_minutes,
          absent_cutoff_time: schedule.absent_cutoff_time.substring(0, 5),
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
          department_id: '',
          start_time: '08:00',
          end_time: '17:00',
          late_tolerance_minutes: 5,
          absent_cutoff_time: '18:00',
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
    }
  }, [isOpen, schedule]);

  const loadDepartments = async () => {
    try {
      const res = await getDepartments();
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (e) {
      console.error(e);
    }
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

    try {
      const payload: Partial<WorkSchedule> = {
        ...formData,
        department_id: formData.department_id || null, // convert empty string back to null
        late_tolerance_minutes: Number(formData.late_tolerance_minutes),
      };

      if (schedule?.id) {
        await updateScheduleApi(schedule.id, payload);
      } else {
        await createScheduleApi(payload);
      }
      
      onSuccess();
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal menyimpan jadwal kerja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{schedule ? 'Edit Jadwal Kerja' : 'Tambah Jadwal Kerja'}</h2>
          <button className="modal-close" onClick={onClose}><XIcon /></button>
        </div>
        
        {errorMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Nama Jadwal</label>
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
            <label className="form-label">Departemen</label>
            <select 
              name="department_id"
              className="input-field" 
              value={formData.department_id}
              onChange={handleChange}
              disabled={isDefaultSchedule} // Jadwal Bawaan TIDAK BISA dipindah ke departemen
            >
              <option value="">Semua Departemen (Bawaan)</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {isDefaultSchedule && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Jadwal bawaan tidak dapat dipindahkan ke departemen tertentu.</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Jam Masuk (Start Time)</label>
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
              <label className="form-label">Jam Pulang (End Time)</label>
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
              <label className="form-label">Toleransi Terlambat (Menit)</label>
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
              <label className="form-label">Batas Waktu Dianggap Alpa</label>
              <input 
                type="time" 
                name="absent_cutoff_time"
                className="input-field" 
                value={formData.absent_cutoff_time} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hari Kerja</label>
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
  );
}
