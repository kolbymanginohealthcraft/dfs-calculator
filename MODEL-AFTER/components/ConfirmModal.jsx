import React from 'react';
import '../styles/ConfirmModal.css';

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
