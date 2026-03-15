import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GameCard from '../components/GameCard';
import RatingModal from '../components/RatingModal';
import { Game } from '../shared/types';
import { useNavigate } from 'react-router-dom';

const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('Все');
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGame, setRatingGame] = useState<Game | null>(null);

  const genres = ['Все', 'Action packed', 'Adventures', 'Strategies', 'Role-playing games', 'Races', 'Simulators'];

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      // @ts-ignore
      const data = await window.electronAPI.getGames();
      setGames(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (gameId: number) => {
    if (!user) return;
    try {
      // @ts-ignore
      await window.electronAPI.launchGame(gameId, user.id);
      const game = games.find(g => g.id === gameId);
      if (game) {
        setRatingGame(game);
        setShowRatingModal(true);
      }
    } catch (err) {
      alert('Ошибка запуска игры');
    }
  };

  const handleRateClick = (gameId: number) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      setRatingGame(game);
      setShowRatingModal(true);
    }
  };

  const handleSaveRating = async (rating: 1|2|3|4|5) => {
    if (!user || !ratingGame) return;
    try {
      // @ts-ignore
      await window.electronAPI.rateGame(user.id, ratingGame.id, rating);
      await fetchGames();
      setShowRatingModal(false);
      setRatingGame(null);
    } catch (err) {
      alert('Ошибка сохранения оценки');
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genreFilter === 'Все' || game.genre === genreFilter;
    return matchesSearch && matchesGenre;
  });

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="page-container">
      <h1>Каталог игр</h1>
      {user?.role === 'admin' && (
        <div className="admin-shortcut">
          <button onClick={() => navigate('/admin')}>Перейти в админ-панель</button>
        </div>
      )}
      <div className="filters-row">
        <input
          type="text"
          placeholder="Поиск по названию"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select aria-label="Фильтр по жанру" value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
          {genres.map(g => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="games-grid">
        {filteredGames.map(game => (
          <GameCard
            key={game.id}
            game={game}
            onLaunch={handleLaunch}
            onRateClick={handleRateClick}
          />
        ))}
      </div>
      {showRatingModal && ratingGame && (
        <RatingModal
          gameTitle={ratingGame.title}
          onSave={handleSaveRating}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
};

export default CatalogPage;