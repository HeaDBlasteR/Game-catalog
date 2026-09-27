import React from 'react';
import Modal from './Modal';
import { useI18n } from '../i18n/I18nContext';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  note?: string;
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
  note,
  confirmText,
  cancelText,
  confirmClassName = 'btn btn-danger',
  onConfirm,
  onCancel
}) => {
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <Modal label={title} onClose={onCancel} className="confirm-modal-content">
      <h2>{title}</h2>
      <p className="modal-subtitle confirm-modal-message">{message}</p>
      {note && <p className="confirm-modal-note">{note}</p>}
      <div className="modal-actions confirm-modal-actions">
        <button className={confirmClassName} type="button" onClick={onConfirm}>{confirmText ?? t('common.delete')}</button>
        <button className="btn btn-light" type="button" onClick={onCancel}>{cancelText ?? t('common.cancel')}</button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
