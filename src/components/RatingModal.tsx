import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface RatingModalProps {
  gameId: number;
  gameTitle: string;
  onSave: (rating: 1|2|3|4|5, comment: string) => void;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ gameId, gameTitle, onSave, onClose }) => {
  const { t } = useI18n();
  const [rating, setRating] = useState<1|2|3|4|5>(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.getUserReview(gameId)
      .then(review => {
        if (cancelled || !review) return;
        setRating(review.rating);
        setComment(review.comment ?? '');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal-content">
        <h2>{t('rating.title')}</h2>
        <p className="modal-subtitle">{gameTitle}</p>
        <div className="rating-stars">
          {[1,2,3,4,5].map((value) => (
            <span
              key={value}
              onClick={() => setRating(value as 1|2|3|4|5)}
              className={value <= rating ? 'rating-star active' : 'rating-star inactive'}
            >
              ★
            </span>
          ))}
        </div>
        <label className="field-wrap rating-comment-field" htmlFor="ratingComment">
          <span>{t('rating.comment')}</span>
          <textarea
            className="input"
            id="ratingComment"
            value={comment}
            maxLength={1000}
            placeholder={t('rating.commentPlaceholder')}
            onChange={event => setComment(event.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button className="btn" onClick={() => onSave(rating, comment)}>{t('rating.save')}</button>
          <button className="btn btn-light" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
