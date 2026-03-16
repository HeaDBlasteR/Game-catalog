import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GameCard from '../components/GameCard';
import RatingModal from '../components/RatingModal';
import { Game, Genre } from '../shared/types';
import DashboardLayout from '../components/DashboardLayout.tsx';

const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('Все');
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGame, setRatingGame] = useState<Game | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesData, genresData] = await Promise.all([window.electronAPI.getGames(), window.electronAPI.getGenres()]);
      setGames(gamesData);
      setGenres(genresData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
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
      await window.electronAPI.launchGame(gameId, user.id);
      const game = games.find(g => g.id === gameId);
      if (game && user.role !== 'admin') {
        setRatingGame(game);
        setShowRatingModal(true);
      }
    } catch (err) {
      alert('Ошибка запуска игры');
    }
  };

  const handleRateClick = (gameId: number) => {
    if (user?.role === 'admin') {
      return;
    }

    const game = games.find(g => g.id === gameId);
    if (game) {
      setRatingGame(game);
      setShowRatingModal(true);
    }
  };

  const handleSaveRating = async (rating: 1|2|3|4|5) => {
    if (!user || !ratingGame) return;
    try {
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
    const matchesGenre = genreFilter === 'Все' || game.genres.some(genre => genre.name === genreFilter);
    return matchesSearch && matchesGenre;
  });

  if (loading) {
    return (
      <DashboardLayout title="Каталог игр" subtitle="Запуск, поиск и оценка игр в едином интерфейсе">
        <div className="panel-card">Загрузка...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Каталог игр" subtitle="Запуск, поиск и оценка игр в едином интерфейсе">
      <div className="toolbar-card">
        <div className="toolbar-grid">
          <label className="field-wrap" htmlFor="searchGame">
            <span>Поиск</span>
            <input
              id="searchGame"
              className="input"
              type="text"
              placeholder="Поиск по названию"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <label className="field-wrap" htmlFor="genreFilter">
            <span>Жанр</span>
            <select
              id="genreFilter"
              className="input"
              aria-label="Фильтр по жанру"
              value={genreFilter}
              onChange={e => setGenreFilter(e.target.value)}
            >
              <option value="Все">Все</option>
              {genres.map(genre => <option key={genre.id} value={genre.name}>{genre.name}</option>)}
            </select>
          </label>

          <div className="field-wrap stats-inline" aria-live="polite">
            <span>Найдено</span>
            <strong>{filteredGames.length}</strong>
          </div>
        </div>
      </div>

      {!filteredGames.length ? (
        <div className="empty-state">
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить поисковый запрос или выбрать другой жанр.</p>
        </div>
      ) : (
        <div className="games-grid">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onLaunch={handleLaunch}
              onRateClick={handleRateClick}
              canRate={user?.role !== 'admin'}
            />
          ))}
        </div>
      )}

      {showRatingModal && ratingGame && user?.role !== 'admin' && (
        <RatingModal
          gameTitle={ratingGame.title}
          onSave={handleSaveRating}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default CatalogPage;