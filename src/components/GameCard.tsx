import React, { useState, useEffect } from 'react';
import { Game } from '../shared/types';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface GameCardProps {
  game: Game;
  onLaunch: (gameId: number) => void;
  canLaunch: boolean;
  onRateClick: (gameId: number) => void;
  canRate: boolean;
  canChangeIcon: boolean;
  onIconChange: (gameId: number, iconPath: string | null) => Promise<void>;
  onIconError?: (error: unknown) => void;
  canManage?: boolean;
  onEdit?: (game: Game) => void;
  onDelete?: (gameId: number) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  onLaunch,
  canLaunch,
  onRateClick,
  canRate,
  canChangeIcon,
  onIconChange,
  onIconError,
  canManage = false,
  onEdit,
  onDelete
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [savingIcon, setSavingIcon] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    window.electronAPI.getUserRating(game.id)
      .then((rating: number | null) => {
        if (!cancelled) setUserRating(rating);
      })
      .catch(() => {
        if (!cancelled) setUserRating(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, game.id, game.totalRatings, game.averageRating]);

  const stars = (rating: number) => {
    const rounded = Math.round(rating);
    const full = Math.max(0, Math.min(5, rounded));
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
  };

  const handleUploadIcon = async () => {
    if (!user) return;
    setSavingIcon(true);
    try {
      const uploadedIconPath = await window.electronAPI.uploadGameIconFromPC('user');
      if (!uploadedIconPath) return;
      await onIconChange(game.id, uploadedIconPath);
    } catch (err) {
      onIconError?.(err);
    } finally {
      setSavingIcon(false);
    }
  };

  const handleResetIcon = async () => {
    setSavingIcon(true);
    try {
      await onIconChange(game.id, null);
    } finally {
      setSavingIcon(false);
    }
  };

  return (
    <div className="game-card">
      {game.iconPath ? (
        <div className="game-icon-wrap">
          <img src={game.iconPath} alt={t('gameCard.iconAlt', { title: game.title })} className="game-icon" />
        </div>
      ) : (
        <div className="game-icon-wrap game-icon-placeholder" aria-hidden="true">{t('gameCard.noIcon')}</div>
      )}

      <h3>{game.title}</h3>
      <p><strong>{t('gameCard.genres')}</strong> {game.genres.map(genre => genre.name).join(', ') || '-'}</p>
      <p><strong>{t('gameCard.developer')}</strong> {game.developer}</p>
      <p><strong>{t('gameCard.rating')}</strong> {stars(game.averageRating)} ({game.averageRating.toFixed(1)})</p>
      <p><strong>{t('gameCard.ratingsCount')}</strong> {game.totalRatings}</p>

      {canChangeIcon && (
        <div className="field-wrap">
          <span>{t('gameCard.yourIcon')}</span>
          <div className="row-actions">
            <button className="btn btn-light" type="button" onClick={handleUploadIcon} disabled={savingIcon}>{t('common.uploadFromPC')}</button>
            <button className="btn btn-light" type="button" onClick={handleResetIcon} disabled={savingIcon}>{t('gameCard.resetIcon')}</button>
          </div>
        </div>
      )}

      <div className="game-card-actions">
        {canLaunch && (
          <button className="launch-button" type="button" onClick={() => onLaunch(game.id)}>
            <span className="launch-button-text">{t('gameCard.launch')}</span>
          </button>
        )}
        {canRate && (
          <button onClick={() => onRateClick(game.id)} className="rate-button" title={t('gameCard.rate')} aria-label={t('gameCard.rate')}>
            {userRating ? '⭐' : '☆'}
          </button>
        )}
      </div>

      {canManage && (
        <div className="game-manage-actions">
          <button className="btn btn-light btn-manage" type="button" onClick={() => onEdit?.(game)}>{t('common.edit')}</button>
          <button className="btn btn-danger btn-manage" type="button" onClick={() => onDelete?.(game.id)}>{t('common.delete')}</button>
        </div>
      )}
    </div>
  );
};

export default GameCard;
