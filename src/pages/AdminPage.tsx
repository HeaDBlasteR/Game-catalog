import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameInput>(emptyGameForm);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [gameSearch, setGameSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesData, genresData] = await Promise.all([
        window.electronAPI.getGames(),
        window.electronAPI.getGenres()
      ]);
      setGames(gamesData);
      setGenres(genresData);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить данные админ-панели.')
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
        text: toUserErrorMessage(err, 'Не удалось обновить список игр.')
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUploadBaseIcon = async () => {
    try {
      const uploadedIconPath = await window.electronAPI.uploadGameIconFromPC('admin');
      if (!uploadedIconPath) return;
      setFormData(prev => ({ ...prev, iconPath: uploadedIconPath }));
      setNotice({ type: 'success', text: 'Иконка игры загружена.' });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить иконку игры.')
      });
    }
  };

  const handleClearBaseIcon = () => {
    setFormData(prev => ({ ...prev, iconPath: '' }));
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

  const handleEdit = (game: Game) => {
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

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!confirm('Удалить игру?')) return;
    try {
      await window.electronAPI.deleteGame(id, user.id);
      setNotice({ type: 'success', text: 'Игра удалена.' });
      fetchGames();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось удалить игру.')
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      fetchGames();
      resetForm();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось сохранить игру.')
      });
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout title="Админ-панель" subtitle="Управление каталогом и жанрами">
        <div className="panel-card">Доступ запрещен</div>
      </DashboardLayout>
    );
  }

  const totalRatings = games.reduce((acc, game) => acc + game.totalRatings, 0);
  const avgAcrossGames = games.length
    ? (games.reduce((acc, game) => acc + game.averageRating, 0) / games.length).toFixed(2)
    : '0.00';

  const filteredGames = games.filter(game => game.title.toLowerCase().includes(gameSearch.toLowerCase()));

  return (
    <DashboardLayout title="Админ-панель" subtitle="Управление каталогом и жанрами">
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

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

      <section className="panel-card">
        <div className="panel-header">
          <h2>Управление играми</h2>
          <div className="panel-actions">
            <input
              className="input"
              type="text"
              placeholder="Поиск игры"
              value={gameSearch}
              onChange={e => setGameSearch(e.target.value)}
            />
            <button className="btn" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Закрыть форму' : 'Добавить игру'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="admin-form">
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
                <span>Иконка (опционально)</span>
                <div className="row-actions">
                  <button className="btn btn-light" type="button" onClick={handleUploadBaseIcon}>Загрузить с ПК</button>
                  <button className="btn btn-light" type="button" onClick={handleClearBaseIcon}>Убрать</button>
                </div>
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
        )}

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Жанры</th>
                <th>Рейтинг</th>
                <th>Оценок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map(game => (
                <tr key={game.id}>
                  <td>{game.title}</td>
                  <td>{game.genres.map(genre => genre.name).join(', ') || '-'}</td>
                  <td>{game.averageRating.toFixed(1)} ★</td>
                  <td>{game.totalRatings}</td>
                  <td className="row-actions">
                    <button className="btn btn-light" onClick={() => handleEdit(game)}>Редактировать</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(game.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default AdminPage;
