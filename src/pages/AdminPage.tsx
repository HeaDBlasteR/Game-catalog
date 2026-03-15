import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Game, GameGenre } from '../shared/types';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: 'Action packed' as GameGenre,
    releaseDate: '',
    developer: '',
    filePath: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    // @ts-ignore
    const data = await window.electronAPI.getGames();
    setGames(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      genre: 'Action packed',
      releaseDate: '',
      developer: '',
      filePath: '',
    });
    setEditingGame(null);
    setShowForm(false);
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description || '',
      genre: game.genre,
      releaseDate: game.releaseDate,
      developer: game.developer,
      filePath: game.filePath,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!confirm('Удалить игру?')) return;
    try {
      // @ts-ignore
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
    try {
      if (editingGame) {
        // @ts-ignore
        await window.electronAPI.updateGame(editingGame.id, formData, user.id);
        setMessage('Игра обновлена');
      } else {
        // @ts-ignore
        await window.electronAPI.addGame(formData, user.id);
        setMessage('Игра добавлена');
      }
      fetchGames();
      resetForm();
    } catch (err: any) {
      setMessage('Ошибка: ' + err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div>Доступ запрещён</div>;
  }

  return (
    <div className="page-container">
      <h1>Управление играми</h1>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Закрыть' : 'Добавить игру'}
      </button>
      {message && <p>{message}</p>}
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
            <label htmlFor="genre">Жанр*:</label>
            <select id="genre" aria-label="Жанр" name="genre" value={formData.genre} onChange={handleInputChange} required>
              <option value="Action packed">Action packed</option>
              <option value="Adventures">Adventures</option>
              <option value="Strategies">Strategies</option>
              <option value="Role-playing games">Role-playing games</option>
              <option value="Races">Races</option>
              <option value="Simulators">Simulators</option>
            </select>
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
            <th>Жанр</th>
            <th>Рейтинг</th>
            <th>Оценок</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => (
            <tr key={game.id}>
              <td>{game.title}</td>
              <td>{game.genre}</td>
              <td>{game.averageRating.toFixed(1)} ★</td>
              <td>{game.totalRatings}</td>
              <td>
                <button onClick={() => handleEdit(game)}>✏️</button>
                <button onClick={() => handleDelete(game.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;