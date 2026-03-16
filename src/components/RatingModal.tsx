import React, { useState } from 'react';

interface RatingModalProps {
  gameTitle: string;
  onSave: (rating: 1|2|3|4|5) => void;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ gameTitle, onSave, onClose }) => {
  const [rating, setRating] = useState<1|2|3|4|5>(5);

  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal-content">
        <h2>Оцените игру</h2>
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
        <div className="modal-actions">
          <button className="btn" onClick={() => onSave(rating)}>Сохранить оценку</button>
          <button className="btn btn-light" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;