import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Game, Genre, GameInput } from '../shared/types';

const emptyGameForm: GameInput = {
  title: '',
  description: '',
  genreIds: [],
  releaseDate: '',
  developer: '',
  filePath: ''
};

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameInput>(emptyGameForm);
  const [genreForm, setGenreForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesData, genresData] = await Promise.all([window.electronAPI.getGames(), window.electronAPI.getGenres()]);
      setGames(gamesData);
      setGenres(genresData);
    } catch (err: any) {
      setMessage('Ошибка загрузки данных: ' + err.message);
    }
  };

  const fetchGames = async () => {
    const data = await window.electronAPI.getGames();
    setGames(data);
  };

  const fetchGenres = async () => {
    const data = await window.electronAPI.getGenres();
    setGenres(data);
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

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description || '',
      genreIds: game.genres.map(genre => genre.id),
      releaseDate: game.releaseDate,
      developer: game.developer,
      filePath: game.filePath
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!confirm('Удалить игру?')) return;
    try {
      await window.electronAPI.deleteGame(id, user.id);
      setMessage('Игра удалена');
      fetchGames();
    } catch (err: any) {
      setMessage('Ошибка: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.genreIds.length) {
      setMessage('Выберите хотя бы один жанр');
      return;
    }

    try {
      if (editingGame) {
        await window.electronAPI.updateGame(editingGame.id, formData, user.id);
        setMessage('Игра обновлена');
      } else {
        await window.electronAPI.addGame(formData, user.id);
        setMessage('Игра добавлена');
      }
      fetchGames();
      resetForm();
    } catch (err: any) {
      setMessage('Ошибка: ' + err.message);
    }
  };

  const handleGenreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await window.electronAPI.addGenre(genreForm, user.id);
      setGenreForm({ name: '', description: '' });
      setMessage('Жанр добавлен');
      fetchGenres();
    } catch (err: any) {
      setMessage('Ошибка: ' + err.message);
    }
  };

  const handleGenreDelete = async (id: number) => {
    if (!user) return;
    if (!confirm('Удалить жанр?')) return;

    try {
      await window.electronAPI.deleteGenre(id, user.id);
      setMessage('Жанр удален');

      if (formData.genreIds.includes(id)) {
        setFormData({
          ...formData,
          genreIds: formData.genreIds.filter(genreId => genreId !== id)
        });
      }

      await fetchData();
    } catch (err: any) {
      setMessage('Ошибка: ' + err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div>Доступ запрещен</div>;
  }

  return (
    <div className="page-container">
      <h1>Управление играми</h1>
      {message && <p>{message}</p>}

      <section className="admin-genres-section">
        <h2>Жанры</h2>
        <form onSubmit={handleGenreSubmit} className="admin-form">
          <div>
            <label htmlFor="genreName">Название жанра*:</label>
            <input
              id="genreName"
              name="name"
              value={genreForm.name}
              onChange={e => setGenreForm({ ...genreForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="genreDescription">Описание:</label>
            <textarea
              id="genreDescription"
              name="description"
              value={genreForm.description}
              onChange={e => setGenreForm({ ...genreForm, description: e.target.value })}
            />
          </div>
          <div className="admin-form-actions">
            <button type="submit">Добавить жанр</button>
          </div>
        </form>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {genres.map(genre => (
              <tr key={genre.id}>
                <td>{genre.name}</td>
                <td>{genre.description || '-'}</td>
                <td>
                  <button onClick={() => handleGenreDelete(genre.id)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Закрыть' : 'Добавить игру'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form">
          <h2>{editingGame ? 'Редактировать игру' : 'Добавить игру'}</h2>
          <div>
            <label htmlFor="title">Название*:</label>
            <input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
          </div>
          <div>
            <label htmlFor="description">Описание:</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} />
          </div>
          <div>
            <label>Жанры*:</label>
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
          <div>
            <label htmlFor="releaseDate">Дата релиза*:</label>
            <input id="releaseDate" type="date" name="releaseDate" value={formData.releaseDate} onChange={handleInputChange} required />
          </div>
          <div>
            <label htmlFor="developer">Разработчик*:</label>
            <input id="developer" name="developer" value={formData.developer} onChange={handleInputChange} required />
          </div>
          <div>
            <label htmlFor="filePath">Путь к игре (exe)*:</label>
            <input id="filePath" name="filePath" value={formData.filePath} onChange={handleInputChange} required />
          </div>
          <div className="admin-form-actions">
            <button type="submit">Сохранить</button>
            <button type="button" onClick={resetForm}>Отмена</button>
          </div>
        </form>
      )}

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
          {games.map(game => (
            <tr key={game.id}>
              <td>{game.title}</td>
              <td>{game.genres.map(genre => genre.name).join(', ') || '-'}</td>
              <td>{game.averageRating.toFixed(1)} ★</td>
              <td>{game.totalRatings}</td>
              <td>
                <button onClick={() => handleEdit(game)}>Редактировать</button>
                <button onClick={() => handleDelete(game.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;
