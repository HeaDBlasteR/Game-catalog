import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GameCard from '../components/GameCard';
import RatingModal from '../components/RatingModal';
import ConfirmModal from '../components/ConfirmModal';
import { Game, Genre, GameInput } from '../shared/types';
import DashboardLayout from '../components/DashboardLayout.tsx';
import NoticeBanner from '../components/NoticeBanner';
import { NoticeState, toUserErrorMessage } from '../shared/feedback';

const emptyGameForm: GameInput = {
  title: '',
  description: '',
  genreIds: [],
  releaseDate: '',
  developer: '',
  filePath: '',
  iconPath: ''
};

const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('Все');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGame, setRatingGame] = useState<Game | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameInput>(emptyGameForm);
  const isAdmin = user?.role === 'admin';
  const pageTitle = isAdmin ? 'Управление каталогом' : 'Каталог игр';
  const pageSubtitle = isAdmin
    ? 'Управление играми: создание, редактирование и удаление'
    : 'Запуск, поиск и оценка игр в едином интерфейсе';

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

  const handleUploadBaseIcon = async () => {
    if (!isAdmin) return;
    try {
      const uploadedIconPath = await window.electronAPI.uploadGameIconFromPC('admin');
      if (!uploadedIconPath) return;
      setFormData(prev => ({ ...prev, iconPath: uploadedIconPath }));
      setNotice({ type: 'success', text: 'Иконка игры загружена.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить иконку игры.')
      });
    }
  };

  const handleClearBaseIcon = () => {
    setFormData(prev => ({ ...prev, iconPath: '' }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenreToggle = (genreId: number, checked: boolean) => {
    if (checked) {
      if (formData.genreIds.includes(genreId)) return;
      setFormData({ ...formData, genreIds: [...formData.genreIds, genreId] });
      return;
    }

    setFormData({
      ...formData,
      genreIds: formData.genreIds.filter(id => id !== genreId)
    });
  };

  const resetForm = () => {
    setFormData(emptyGameForm);
    setEditingGame(null);
    setShowForm(false);
  };

  const handleStartCreate = () => {
    setEditingGame(null);
    setFormData(emptyGameForm);
    setShowForm(true);
  };

  const handleEditGame = (game: Game) => {
    if (!isAdmin) return;
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description || '',
      genreIds: game.genres.map(genre => genre.id),
      releaseDate: game.releaseDate,
      developer: game.developer,
      filePath: game.filePath,
      iconPath: game.iconPath || ''
    });
    setShowForm(true);
  };

  const handleDeleteGameRequest = (gameId: number) => {
    if (!isAdmin) return;
    const game = games.find(item => item.id === gameId);
    if (!game) return;
    setGameToDelete(game);
  };

  const handleDeleteGame = async () => {
    if (!user || !isAdmin) return;
    if (!gameToDelete) return;

    try {
      await window.electronAPI.deleteGame(gameToDelete.id, user.id);
      await fetchGames();
      setNotice({ type: 'success', text: 'Игра удалена.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось удалить игру.')
      });
    } finally {
      setGameToDelete(null);
    }
  };

  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    if (!formData.genreIds.length) {
      setNotice({ type: 'error', text: 'Выберите хотя бы один жанр.' });
      return;
    }

    try {
      if (editingGame) {
        await window.electronAPI.updateGame(editingGame.id, formData, user.id);
        setNotice({ type: 'success', text: 'Игра обновлена.' });
      } else {
        await window.electronAPI.addGame(formData, user.id);
        setNotice({ type: 'success', text: 'Игра добавлена.' });
      }

      await fetchGames();
      resetForm();
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось сохранить игру.')
      });
    }
  };

  const handleLaunch = async (gameId: number) => {
    if (!user) return;
    if (user.role !== 'user') {
      return;
    }

    try {
      await window.electronAPI.launchGame(gameId, user.id);

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

  const handleSaveRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
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

  const totalRatings = games.reduce((acc, game) => acc + game.totalRatings, 0);
  const avgAcrossGames = games.length
    ? (games.reduce((acc, game) => acc + game.averageRating, 0) / games.length).toFixed(2)
    : '0.00';

  return (
    <DashboardLayout title={pageTitle} subtitle={pageSubtitle}>
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <ConfirmModal
        isOpen={Boolean(gameToDelete)}
        title="Удалить игру?"
        message={gameToDelete ? `Игра \"${gameToDelete.title}\" будет удалена из каталога.` : ''}
        confirmText="Удалить"
        onConfirm={handleDeleteGame}
        onCancel={() => setGameToDelete(null)}
      />

      {isAdmin && (
        <section className="stats-grid">
          <article className="metric-card">
            <h3>Игр в каталоге</h3>
            <p>{games.length}</p>
          </article>
          <article className="metric-card">
            <h3>Жанров</h3>
            <p>{genres.length}</p>
          </article>
          <article className="metric-card">
            <h3>Средний рейтинг</h3>
            <p>{avgAcrossGames}</p>
          </article>
          <article className="metric-card">
            <h3>Всего оценок</h3>
            <p>{totalRatings}</p>
          </article>
        </section>
      )}

      <div className="toolbar-card">
        <div className={isAdmin ? 'toolbar-grid toolbar-grid-admin' : 'toolbar-grid'}>
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

          {isAdmin && (
            <div className="field-wrap toolbar-action-wrap">
              <span>&nbsp;</span>
              <button className="btn" type="button" onClick={showForm ? resetForm : handleStartCreate}>
                {showForm ? 'Закрыть' : 'Добавить игру'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && showForm && (
        <div className="rating-modal-overlay" role="presentation" onClick={resetForm}>
          <div
            className="rating-modal-content game-form-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={editingGame ? 'Редактирование игры' : 'Добавление игры'}
            onClick={event => event.stopPropagation()}
          >
            <form onSubmit={handleGameSubmit} className="admin-form compact-form">
              <h3>{editingGame ? 'Редактировать игру' : 'Добавить игру'}</h3>
              <div className="form-grid">
                <label className="field-wrap" htmlFor="title">
                  <span>Название*</span>
                  <input className="input" id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="developer">
                  <span>Разработчик*</span>
                  <input className="input" id="developer" name="developer" value={formData.developer} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="releaseDate">
                  <span>Дата релиза*</span>
                  <input className="input" id="releaseDate" type="date" name="releaseDate" value={formData.releaseDate} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="filePath">
                  <span>Путь к игре (exe)*</span>
                  <input className="input" id="filePath" name="filePath" value={formData.filePath} onChange={handleInputChange} required />
                </label>

                <div className="field-wrap">
                  <span>Иконка</span>
                  <div className="row-actions">
                    <button className="btn btn-light" type="button" onClick={handleUploadBaseIcon}>Загрузить с ПК</button>
                    <button className="btn btn-light" type="button" onClick={handleClearBaseIcon}>Убрать</button>
                  </div>
                  {formData.iconPath ? (
                    <div className="game-form-icon-preview-wrap">
                      <img
                        className="game-form-icon-preview"
                        src={formData.iconPath}
                        alt="Предпросмотр иконки игры"
                      />
                    </div>
                  ) : null}
                  <p>{formData.iconPath ? 'Иконка выбрана' : 'Иконка не выбрана'}</p>
                </div>

                <label className="field-wrap field-full" htmlFor="description">
                  <span>Описание</span>
                  <textarea className="input" id="description" name="description" value={formData.description} onChange={handleInputChange} />
                </label>

                <div className="field-wrap field-full">
                  <span>Жанры*</span>
                  <div className="genre-checkboxes" role="group" aria-label="Жанры">
                    {genres.map(genre => (
                      <label key={genre.id} className="genre-checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.genreIds.includes(genre.id)}
                          onChange={e => handleGenreToggle(genre.id, e.target.checked)}
                        />
                        <span>{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-form-actions">
                <button className="btn" type="submit">Сохранить</button>
                <button className="btn btn-light" type="button" onClick={resetForm}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              canLaunch={user?.role === 'user'}
              onRateClick={handleRateClick}
              canRate={user?.role !== 'admin'}
              canChangeIcon={user?.role !== 'admin'}
              onIconChange={handleSetGameIcon}
              canManage={isAdmin}
              onEdit={handleEditGame}
              onDelete={handleDeleteGameRequest}
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