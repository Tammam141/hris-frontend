import React from 'react';
import '../../features/employee/employee-modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Ya, Lanjutkan', 
  cancelText = 'Batal', 
  isDestructive = false,
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={onCancel}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onConfirm}
            style={isDestructive ? { backgroundColor: '#dc2626', borderColor: '#b91c1c' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
