import React, { useState, useEffect } from 'react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, Holiday } from '../api/holiday';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import '../components/ui/dashboard.css';
import '../components/ui/employee.css';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { AlertModal } from '../components/ui/AlertModal';
import { parseISO, format } from 'date-fns';

export function HolidayPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination & Filter
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const limit = 15;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isCollectiveLeave, setIsCollectiveLeave] = useState(false);

  // Delete & Alert State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadHolidays();
  }, [page, yearFilter]);

  async function loadHolidays() {
    setLoading(true);
    setError('');
    try {
      const res = await getHolidays({ page, limit, year: yearFilter });
      if (res.data) {
        setHolidays(res.data);
        if (res.meta) setTotalPages(res.meta.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data hari libur');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedHoliday(null);
    setName('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsCollectiveLeave(false);
    setIsModalOpen(true);
  }

  function openEditModal(holiday: Holiday) {
    setModalMode('edit');
    setSelectedHoliday(holiday);
    setName(holiday.name);
    setDate(holiday.date.substring(0, 10));
    setIsCollectiveLeave(holiday.is_collective_leave);
    setIsModalOpen(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        name,
        date,
        is_collective_leave: isCollectiveLeave
      };

      if (modalMode === 'create') {
        await createHoliday(payload);
      } else if (selectedHoliday) {
        await updateHoliday(selectedHoliday.id, payload);
      }
      setIsModalOpen(false);
      loadHolidays();
    } catch (err: any) {
      setAlertMessage(err.message || 'Gagal menyimpan hari libur');
      setAlertOpen(true);
    }
  }

  function handleDelete(holiday: Holiday) {
    setHolidayToDelete(holiday);
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (holidayToDelete) {
      try {
        await deleteHoliday(holidayToDelete.id);
        setIsDeleteConfirmOpen(false);
        setHolidayToDelete(null);
        loadHolidays();
      } catch (err: any) {
        setIsDeleteConfirmOpen(false);
        setAlertMessage(err.message || 'Gagal menghapus hari libur');
        setAlertOpen(true);
      }
    }
  }

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        <div className="employee-header-actions" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Master Hari Libur</h1>
            <p className="dashboard-subtitle">Kelola hari libur nasional dan cuti bersama.</p>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>+ Tambah Libur</button>
        </div>

        {/* Filter Tahun */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Filter Tahun:</label>
          <select 
            className="input-field" 
            style={{ width: '120px', padding: '6px 12px' }}
            value={yearFilter}
            onChange={(e) => { setYearFilter(Number(e.target.value)); setPage(1); }}
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Hari Libur</th>
                <th>Tipe</th>
                <th style={{ width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Memuat data...</td></tr>
              ) : holidays.length === 0 ? (
                <tr><td colSpan={4} className="text-center empty-table-cell">Belum ada data hari libur pada tahun ini.</td></tr>
              ) : (
                holidays.map(holiday => (
                  <tr key={holiday.id}>
                    <td><div style={{ fontWeight: 600 }}>{format(parseISO(holiday.date), 'dd MMMM yyyy')}</div></td>
                    <td>{holiday.name}</td>
                    <td>
                      {holiday.is_collective_leave ? (
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>Cuti Bersama</span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>Libur Nasional</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(holiday)} title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(holiday)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: '14px' }}>Halaman {page} dari {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: page === totalPages ? '#f1f5f9' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'create' ? 'Tambah Hari Libur' : 'Ubah Hari Libur'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal <span style={{color: 'red'}}>*</span></label>
                  <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Libur <span style={{color: 'red'}}>*</span></label>
                  <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Hari Kemerdekaan RI" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="isCollectiveLeave" checked={isCollectiveLeave} onChange={e => setIsCollectiveLeave(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="isCollectiveLeave" className="form-label" style={{ margin: 0 }}>Termasuk Cuti Bersama</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Simpan' : 'Perbarui'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm & Alert Modals */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Hapus Hari Libur"
        message={`Apakah Anda yakin ingin menghapus "${holidayToDelete?.name}"?`}
        confirmText="Hapus"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => { setIsDeleteConfirmOpen(false); setHolidayToDelete(null); }}
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
