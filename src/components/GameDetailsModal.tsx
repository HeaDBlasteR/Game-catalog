import React, { useEffect, useState } from 'react';
import { Game } from '../shared/types';
import { useI18n } from '../i18n/I18nContext';

type GameDetailsModalProps = {
  game: Game;
  onClose: () => void;
};

type Distribution = Record<1 | 2 | 3 | 4 | 5, number>;

const EMPTY_DISTRIBUTION: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ game, onClose }) => {
  const { t, language, genreDescription } = useI18n();
  const [distribution, setDistribution] = useState<Distribution>(EMPTY_DISTRIBUTION);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI.getRatingDistribution(game.id)
      .then(data => {
        if (!cancelled) setDistribution(data);
      })
      .catch(() => {
        if (!cancelled) setDistribution(EMPTY_DISTRIBUTION);
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const maxCount = Math.max(1, ...([5, 4, 3, 2, 1] as const).map(value => distribution[value]));

  return (
    <div className="rating-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="rating-modal-content game-details-content"
        role="dialog"
        aria-modal="true"
        aria-label={t('details.title')}
        onClick={event => event.stopPropagation()}
      >
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

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default GameDetailsModal;
