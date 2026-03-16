import React, { useState, useEffect } from 'react';
import { Game } from '../shared/types';
import { useAuth } from '../contexts/AuthContext';

interface GameCardProps {
  game: Game;
  onLaunch: (gameId: number) => void;
  onRateClick: (gameId: number) => void;
  canRate: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onLaunch, onRateClick, canRate }) => {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      window.electronAPI.getUserRating(user.id, game.id).then((rating: number | null) => {
        setUserRating(rating);
      });
    }
  }, [user, game.id]);

  const stars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  };

  return (
    <div className="game-card">
      <h3>{game.title}</h3>
      <p><strong>Жанры:</strong> {game.genres.map(genre => genre.name).join(', ') || '-'}</p>
      <p><strong>Разработчик:</strong> {game.developer}</p>
      <p><strong>Рейтинг:</strong> {stars(game.averageRating)} ({game.averageRating.toFixed(1)})</p>
      <p><strong>Оценок:</strong> {game.totalRatings}</p>
      <div className="game-card-actions">
        <button onClick={() => onLaunch(game.id)}>Запустить игру</button>
        {canRate && (
          <button onClick={() => onRateClick(game.id)} className="rate-button">
            {userRating ? '⭐' : '☆'}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameCard;