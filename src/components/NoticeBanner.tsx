import React from 'react';
import { NoticeState } from '../shared/feedback';

type NoticeBannerProps = {
  notice: NoticeState;
};

const NoticeBanner: React.FC<NoticeBannerProps> = ({ notice }) => {
  const className = `panel-card notice notice-${notice.type}`;
  const isError = notice.type === 'error';

  if (isError) {
    return (
      <div className={className} role="alert" aria-live="assertive">
        {notice.text}
      </div>
    );
  }

  return (
    <div className={className} role="status" aria-live="polite">
      {notice.text}
    </div>
  );
};

export default NoticeBanner;