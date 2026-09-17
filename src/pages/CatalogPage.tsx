import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GameCard from '../components/GameCard';
import RatingModal from '../components/RatingModal';
import ConfirmModal from '../components/ConfirmModal';
import { Game, Genre, GameInput } from '../shared/types';
import DashboardLayout from '../components/DashboardLayout.tsx';
import NoticeBanner from '../components/NoticeBanner';
import { NoticeState } from '../shared/feedback';
import { useI18n } from '../i18n/I18nContext';

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
  const { t, errorText } = useI18n();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGame, setRatingGame] = useState<Game | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameInput>(emptyGameForm);
  const isAdmin = user?.role === 'admin';
  const pageTitle = isAdmin ? t('catalog.titleAdmin') : t('catalog.title');
  const pageSubtitle = isAdmin
    ? t('catalog.subtitleAdmin')
    : t('catalog.subtitle');

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    try {
      const [gamesData, genresData] = await Promise.all([
        window.electronAPI.getGames(),
        window.electronAPI.getGenres()
      ]);
      setGames(gamesData);
      setGenres(genresData);
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.loadFailed')
      });
    }
  };

  const fetchGames = async () => {
    try {
      const data = await window.electronAPI.getGames();
      setGames(data);
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.refreshFailed')
      });
    }
  };

  const handleSetGameIcon = async (gameId: number, iconPath: string | null) => {
    if (!user) return;
    try {
      await window.electronAPI.setUserGameIcon(gameId, iconPath);
      await fetchGames();
      setNotice({ type: 'success', text: t('catalog.iconSaved') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.iconSaveFailed')
      });
    }
  };

  const handleUploadBaseIcon = async () => {
    if (!isAdmin) return;
    try {
      const uploadedIconPath = await window.electronAPI.uploadGameIconFromPC('admin');
      if (!uploadedIconPath) return;
      setFormData(prev => ({ ...prev, iconPath: uploadedIconPath }));
      setNotice({ type: 'success', text: t('catalog.iconUploaded') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.iconUploadFailed')
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
      await window.electronAPI.deleteGame(gameToDelete.id);
      await fetchGames();
      setNotice({ type: 'success', text: t('catalog.gameDeleted') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.gameDeleteFailed')
      });
    } finally {
      setGameToDelete(null);
    }
  };

  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    if (!formData.genreIds.length) {
      setNotice({ type: 'error', text: t('errors.genreRequired') });
      return;
    }

    try {
      if (editingGame) {
        await window.electronAPI.updateGame(editingGame.id, formData);
        setNotice({ type: 'success', text: t('catalog.gameUpdated') });
      } else {
        await window.electronAPI.addGame(formData);
        setNotice({ type: 'success', text: t('catalog.gameAdded') });
      }

      await fetchGames();
      resetForm();
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.gameSaveFailed')
      });
    }
  };

  const handleLaunch = async (gameId: number) => {
    if (!user) return;
    if (user.role !== 'user') {
      return;
    }

    try {
      await window.electronAPI.launchGame(gameId);

      const existingRating = await window.electronAPI.getUserRating(gameId);
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
        text: errorText(err, 'catalog.launchFailed')
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
      await window.electronAPI.rateGame(ratingGame.id, rating);
      await fetchGames();
      setShowRatingModal(false);
      setRatingGame(null);
      setNotice({ type: 'success', text: t('catalog.ratingSaved') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'catalog.ratingSaveFailed')
      });
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genreFilter === '' || game.genres.some(genre => genre.name === genreFilter);
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
        title={t('catalog.deleteTitle')}
        message={gameToDelete ? t('catalog.deleteMessage', { title: gameToDelete.title }) : ''}
        confirmText={t('common.delete')}
        onConfirm={handleDeleteGame}
        onCancel={() => setGameToDelete(null)}
      />

      {isAdmin && (
        <section className="stats-grid">
          <article className="metric-card">
            <h3>{t('catalog.statGames')}</h3>
            <p>{games.length}</p>
          </article>
          <article className="metric-card">
            <h3>{t('catalog.statGenres')}</h3>
            <p>{genres.length}</p>
          </article>
          <article className="metric-card">
            <h3>{t('catalog.statAvgRating')}</h3>
            <p>{avgAcrossGames}</p>
          </article>
          <article className="metric-card">
            <h3>{t('catalog.statTotalRatings')}</h3>
            <p>{totalRatings}</p>
          </article>
        </section>
      )}

      <div className="toolbar-card">
        <div className={isAdmin ? 'toolbar-grid toolbar-grid-admin' : 'toolbar-grid'}>
          <label className="field-wrap" htmlFor="searchGame">
            <span>{t('catalog.search')}</span>
            <input
              id="searchGame"
              className="input"
              type="text"
              placeholder={t('catalog.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <label className="field-wrap" htmlFor="genreFilter">
            <span>{t('catalog.genre')}</span>
            <select
              id="genreFilter"
              className="input"
              aria-label={t('catalog.genreFilter')}
              value={genreFilter}
              onChange={e => setGenreFilter(e.target.value)}
            >
              <option value="">{t('catalog.allGenres')}</option>
              {genres.map(genre => <option key={genre.id} value={genre.name}>{genre.name}</option>)}
            </select>
          </label>

          {isAdmin && (
            <div className="field-wrap toolbar-action-wrap">
              <span>&nbsp;</span>
              <button className="btn" type="button" onClick={showForm ? resetForm : handleStartCreate}>
                {showForm ? t('common.close') : t('catalog.addGame')}
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
            aria-label={editingGame ? t('catalog.formEditLabel') : t('catalog.formAddLabel')}
            onClick={event => event.stopPropagation()}
          >
            <form onSubmit={handleGameSubmit} className="admin-form compact-form">
              <h3>{editingGame ? t('catalog.formEditTitle') : t('catalog.formAddTitle')}</h3>
              <div className="form-grid">
                <label className="field-wrap" htmlFor="title">
                  <span>{t('catalog.fieldTitle')}</span>
                  <input className="input" id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="developer">
                  <span>{t('catalog.fieldDeveloper')}</span>
                  <input className="input" id="developer" name="developer" value={formData.developer} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="releaseDate">
                  <span>{t('catalog.fieldReleaseDate')}</span>
                  <input className="input" id="releaseDate" type="date" name="releaseDate" value={formData.releaseDate} onChange={handleInputChange} required />
                </label>

                <label className="field-wrap" htmlFor="filePath">
                  <span>{t('catalog.fieldFilePath')}</span>
                  <input className="input" id="filePath" name="filePath" value={formData.filePath} onChange={handleInputChange} required />
                </label>

                <div className="field-wrap">
                  <span>{t('catalog.fieldIcon')}</span>
                  <div className="row-actions">
                    <button className="btn btn-light" type="button" onClick={handleUploadBaseIcon}>{t('common.uploadFromPC')}</button>
                    <button className="btn btn-light" type="button" onClick={handleClearBaseIcon}>{t('catalog.removeIcon')}</button>
                  </div>
                  {formData.iconPath ? (
                    <div className="game-form-icon-preview-wrap">
                      <img
                        className="game-form-icon-preview"
                        src={formData.iconPath}
                        alt={t('catalog.iconPreview')}
                      />
                    </div>
                  ) : null}
                  <p>{formData.iconPath ? t('catalog.iconSelected') : t('catalog.iconNotSelected')}</p>
                </div>

                <label className="field-wrap field-full" htmlFor="description">
                  <span>{t('catalog.fieldDescription')}</span>
                  <textarea className="input" id="description" name="description" value={formData.description} onChange={handleInputChange} />
                </label>

                <div className="field-wrap field-full">
                  <span>{t('catalog.fieldGenres')}</span>
                  <div className="genre-checkboxes" role="group" aria-label={t('nav.genres')}>
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
                <button className="btn" type="submit">{t('common.save')}</button>
                <button className="btn btn-light" type="button" onClick={resetForm}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!filteredGames.length ? (
        <div className="empty-state">
          <h3>{t('catalog.emptyTitle')}</h3>
          <p>{t('catalog.emptyText')}</p>
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
              onIconError={err => setNotice({
                type: 'error',
                text: errorText(err, 'catalog.iconUploadFailed')
              })}
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