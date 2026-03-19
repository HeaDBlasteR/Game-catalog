import React, { useEffect } from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  confirmClassName = 'btn btn-danger',
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rating-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="rating-modal-content confirm-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={event => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p className="modal-subtitle confirm-modal-message">{message}</p>
        <div className="modal-actions confirm-modal-actions">
          <button className={confirmClassName} type="button" onClick={onConfirm}>{confirmText}</button>
          <button className="btn btn-light" type="button" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
