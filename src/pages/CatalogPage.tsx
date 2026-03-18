import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GameCard from '../components/GameCard';
import RatingModal from '../components/RatingModal';
import { Game, Genre } from '../shared/types';
import DashboardLayout from '../components/DashboardLayout.tsx';
import NoticeBanner from '../components/NoticeBanner';
import { NoticeState, toUserErrorMessage } from '../shared/feedback';

const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('Все');
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGame, setRatingGame] = useState<Game | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    try {
      const [gamesData, genresData] = await Promise.all([
        window.electronAPI.getGames(user?.id),
        window.electronAPI.getGenres()
      ]);
      setGames(gamesData);
      setGenres(genresData);
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить каталог. Попробуйте обновить страницу.')
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const data = await window.electronAPI.getGames(user?.id);
      setGames(data);
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось обновить список игр. Попробуйте еще раз.')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetGameIcon = async (gameId: number, iconPath: string | null) => {
    if (!user) return;
    try {
      await window.electronAPI.setUserGameIcon(user.id, gameId, iconPath);
      await fetchGames();
      setNotice({ type: 'success', text: 'Иконка игры успешно сохранена.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось сохранить иконку игры.')
      });
    }
  };

  const handleLaunch = async (gameId: number) => {
    if (!user) return;
    try {
      await window.electronAPI.launchGame(gameId, user.id);

      if (user.role === 'admin') {
        return;
      }

      const existingRating = await window.electronAPI.getUserRating(user.id, gameId);
      if (existingRating) {
        return;
      }

      const game = games.find(g => g.id === gameId);
      if (!game) {
        return;
      }

      setRatingGame(game);
      setShowRatingModal(true);
      setNotice(null);
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось запустить игру. Проверьте путь к исполняемому файлу.')
      });
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
      setNotice({ type: 'success', text: 'Оценка сохранена.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось сохранить оценку. Попробуйте еще раз.')
      });
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
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

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
              canChangeIcon={user?.role !== 'admin'}
              onIconChange={handleSetGameIcon}
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