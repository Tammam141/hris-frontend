import React from 'react';
import '../../features/employee/employee-modal.css';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onClose: () => void;
  type?: 'error' | 'info' | 'success';
}

export function AlertModal({ isOpen, title, message, onClose, type = 'error' }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: type === 'error' ? '#dc2626' : '#0f172a' }}>
            {title}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
