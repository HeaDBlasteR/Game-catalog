import React, { useEffect } from 'react';

type ModalProps = {
  label: string;
  onClose: () => void;
  className?: string;
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ label, onClose, className, closeOnOverlayClick = true, children }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="rating-modal-overlay"
      role="presentation"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={className ? `rating-modal-content ${className}` : 'rating-modal-content'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={event => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
