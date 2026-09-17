import React, { useEffect } from 'react';
import { NoticeState } from '../shared/feedback';
import { useI18n } from '../i18n/I18nContext';

type NoticeBannerProps = {
  notice: NoticeState;
  onClose: () => void;
};

const AUTO_HIDE_MS = 5000;

const NoticeBanner: React.FC<NoticeBannerProps> = ({ notice, onClose }) => {
  const { t } = useI18n();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose();
    }, AUTO_HIDE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice, onClose]);

  const className = `toast toast-${notice.type}`;
  const isError = notice.type === 'error';

  if (isError) {
    return (
      <div className="toast-container" role="region" aria-label={t('notice.region')}>
        <div className={className} role="alert" aria-live="assertive">
          <p>{notice.text}</p>
          <button type="button" className="toast-close" onClick={onClose} aria-label={t('notice.close')}>
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="toast-container" role="region" aria-label={t('notice.region')}>
      <div className={className} role="status" aria-live="polite">
        <p>{notice.text}</p>
        <button type="button" className="toast-close" onClick={onClose} aria-label={t('notice.close')}>
          &times;
        </button>
      </div>
    </div>
  );
};

export default NoticeBanner;
