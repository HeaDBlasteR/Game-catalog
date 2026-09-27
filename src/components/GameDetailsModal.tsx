import React, { useEffect, useState } from 'react';
import { Game, GameReview } from '../shared/types';
import Modal from './Modal';
import { useI18n } from '../i18n/I18nContext';

type GameDetailsModalProps = {
  game: Game;
  onClose: () => void;
};

type Distribution = Record<1 | 2 | 3 | 4 | 5, number>;

const EMPTY_DISTRIBUTION: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ game, onClose }) => {
  const { t, genreDescription, formatDate, formatDateTime, formatDuration } = useI18n();
  const [distribution, setDistribution] = useState<Distribution>(EMPTY_DISTRIBUTION);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<GameReview[]>([]);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI.getRatingDistribution(game.id)
      .then(data => {
        if (!cancelled) setDistribution(data);
      })
      .catch(() => {
        if (!cancelled) setDistribution(EMPTY_DISTRIBUTION);
      });

    window.electronAPI.getGameReviews(game.id)
      .then(data => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });

    window.electronAPI.getUserRating(game.id)
      .then(rating => {
        if (!cancelled) setUserRating(rating);
      })
      .catch(() => {
        if (!cancelled) setUserRating(null);
      });

    return () => {
      cancelled = true;
    };
  }, [game.id, game.totalRatings]);

  const maxCount = Math.max(1, ...([5, 4, 3, 2, 1] as const).map(value => distribution[value]));

  return (
    <Modal label={t('details.title')} onClose={onClose} className="game-details-content">
      <div className="game-details-header">
        {game.iconPath ? (
          <img className="game-details-icon" src={game.iconPath} alt={t('gameCard.iconAlt', { title: game.title })} />
        ) : (
          <div className="game-details-icon game-icon-placeholder" aria-hidden="true">{t('gameCard.noIcon')}</div>
        )}
        <div>
          <h2>{game.title}</h2>
          <p className="modal-subtitle">
            {t('details.developer')}: {game.developer}
          </p>
          <p className="modal-subtitle">
            {t('details.releaseDate')}: {formatDate(game.releaseDate)}
          </p>
        </div>
      </div>

      <div className="game-details-section">
        <h3>{t('details.yourStats')}</h3>
        {game.launchCount ? (
          <ul className="game-details-stats">
            <li><span>{t('details.playtime')}</span><strong>{formatDuration(game.playtimeSeconds)}</strong></li>
            <li><span>{t('details.launchCount')}</span><strong>{game.launchCount}</strong></li>
            <li><span>{t('details.lastPlayed')}</span><strong>{formatDateTime(game.lastPlayedAt)}</strong></li>
          </ul>
        ) : (
          <p className="game-details-description">{t('details.neverPlayed')}</p>
        )}
      </div>

      <div className="game-details-section">
        <h3>{t('details.genres')}</h3>
        <div className="game-details-genres">
          {game.genres.length
            ? game.genres.map(genre => (
              <span key={genre.id} className="genre-chip" title={genreDescription(genre.name, genre.description)}>
                {genre.name}
              </span>
            ))
            : '-'}
        </div>
      </div>

      <div className="game-details-section">
        <h3>{t('details.description')}</h3>
        <p className="game-details-description">{game.description?.trim() || t('details.noDescription')}</p>
      </div>

      <div className="game-details-section">
        <h3>{t('details.ratingSummary')}</h3>
        {game.totalRatings ? (
          <>
            <p className="game-details-rating-line">
              {'★'.repeat(Math.round(game.averageRating))}{'☆'.repeat(5 - Math.round(game.averageRating))} {game.averageRating.toFixed(1)}
              {' · '}
              {t('details.ratingsTotal', { count: game.totalRatings })}
            </p>
            <div className="rating-bars">
              {([5, 4, 3, 2, 1] as const).map(value => (
                <div className="rating-bar-row" key={value}>
                  <span className="rating-bar-label">{value} ★</span>
                  <span className="rating-bar-track">
                    <span className="rating-bar-fill" style={{ width: `${(distribution[value] / maxCount) * 100}%` }} />
                  </span>
                  <span className="rating-bar-count">{distribution[value]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="game-details-description">{t('details.noRatings')}</p>
        )}
        {userRating && <p className="game-details-rating-line">{t('details.yourRating', { rating: userRating })}</p>}
      </div>

      <div className="game-details-section">
        <h3>{t('details.reviews')}</h3>
        {reviews.length ? (
          <ul className="review-list">
            {reviews.map(review => (
              <li className="review-item" key={review.id}>
                <div className="review-head">
                  <span className="review-author">{review.author}</span>
                  <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  <span className="review-date">{formatDateTime(review.createdAt)}</span>
                </div>
                <p className={review.comment ? 'review-text' : 'review-text review-text-empty'}>
                  {review.comment || t('details.reviewWithoutText')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="game-details-description">{t('details.noReviews')}</p>
        )}
      </div>

      <div className="modal-actions">
        <button className="btn" type="button" onClick={onClose}>{t('common.close')}</button>
      </div>
    </Modal>
  );
};

export default GameDetailsModal;
