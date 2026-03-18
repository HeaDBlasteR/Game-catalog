import React, { useState, useEffect } from 'react';
import { Game } from '../shared/types';
import { useAuth } from '../contexts/AuthContext';

interface GameCardProps {
  game: Game;
  onLaunch: (gameId: number) => void;
  onRateClick: (gameId: number) => void;
  canRate: boolean;
  canChangeIcon: boolean;
  onIconChange: (gameId: number, iconPath: string | null) => Promise<void>;
  canManage?: boolean;
  onEdit?: (game: Game) => void;
  onDelete?: (gameId: number) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  onLaunch,
  onRateClick,
  canRate,
  canChangeIcon,
  onIconChange,
  canManage = false,
  onEdit,
  onDelete
}) => {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [savingIcon, setSavingIcon] = useState(false);

  useEffect(() => {
    if (user) {
      window.electronAPI.getUserRating(user.id, game.id).then((rating: number | null) => {
        setUserRating(rating);
      });
    }
  }, [user, game.id]);

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
      const uploadedIconPath = await window.electronAPI.uploadGameIconFromPC('user', user.id);
      if (!uploadedIconPath) return;
      await onIconChange(game.id, uploadedIconPath);
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
          <img src={game.iconPath} alt={`Иконка игры ${game.title}`} className="game-icon" />
        </div>
      ) : (
        <div className="game-icon-wrap game-icon-placeholder" aria-hidden="true">Нет иконки</div>
      )}

      <h3>{game.title}</h3>
      <p><strong>Жанры:</strong> {game.genres.map(genre => genre.name).join(', ') || '-'}</p>
      <p><strong>Разработчик:</strong> {game.developer}</p>
      <p><strong>Рейтинг:</strong> {stars(game.averageRating)} ({game.averageRating.toFixed(1)})</p>
      <p><strong>Оценок:</strong> {game.totalRatings}</p>

      {canChangeIcon && (
        <div className="field-wrap">
          <span>Ваша иконка</span>
          <div className="row-actions">
            <button className="btn btn-light" type="button" onClick={handleUploadIcon} disabled={savingIcon}>Загрузить с ПК</button>
            <button className="btn btn-light" type="button" onClick={handleResetIcon} disabled={savingIcon}>Сбросить</button>
          </div>
        </div>
      )}

      <div className="game-card-actions">
        <button className="launch-button" type="button" onClick={() => onLaunch(game.id)}>
          <span className="launch-button-text">Запустить игру</span>
        </button>
        {canRate && (
          <button onClick={() => onRateClick(game.id)} className="rate-button">
            {userRating ? '⭐' : '☆'}
          </button>
        )}
      </div>

      {canManage && (
        <div className="game-manage-actions">
          <button className="btn btn-light btn-manage" type="button" onClick={() => onEdit?.(game)}>Редактировать</button>
          <button className="btn btn-danger btn-manage" type="button" onClick={() => onDelete?.(game.id)}>Удалить</button>
        </div>
      )}
    </div>
  );
};

export default GameCard;