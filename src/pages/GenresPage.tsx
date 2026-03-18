import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useAuth } from '../contexts/AuthContext';
import { Genre } from '../shared/types';
import NoticeBanner from '../components/NoticeBanner';
import { NoticeState, toUserErrorMessage } from '../shared/feedback';

const GenresPage: React.FC = () => {
  const { user } = useAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreForm, setGenreForm] = useState({ name: '', description: '' });
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const data = await window.electronAPI.getGenres();
      setGenres(data);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить список жанров.')
      });
    }
  };

  const handleGenreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await window.electronAPI.addGenre(genreForm, user.id);
      setGenreForm({ name: '', description: '' });
      setNotice({ type: 'success', text: 'Жанр добавлен.' });
      fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось добавить жанр.')
      });
    }
  };

  const handleGenreDelete = async (id: number) => {
    if (!user) return;
    if (!confirm('Удалить жанр?')) return;

    try {
      await window.electronAPI.deleteGenre(id, user.id);
      setNotice({ type: 'success', text: 'Жанр удален.' });
      fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось удалить жанр.')
      });
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout title="Жанры" subtitle="Создание и удаление жанров">
        <div className="panel-card">Доступ запрещен</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Жанры" subtitle="Создание и удаление жанров">
      {notice && <NoticeBanner notice={notice} />}

      <section className="panel-card">
        <div className="panel-header">
          <h2>Управление жанрами</h2>
        </div>

        <form onSubmit={handleGenreSubmit} className="admin-form compact-form">
          <div className="form-grid">
            <label className="field-wrap" htmlFor="genreName">
              <span>Название жанра*</span>
              <input
                className="input"
                id="genreName"
                name="name"
                value={genreForm.name}
                onChange={e => setGenreForm({ ...genreForm, name: e.target.value })}
                required
              />
            </label>
            <label className="field-wrap" htmlFor="genreDescription">
              <span>Описание</span>
              <input
                className="input"
                id="genreDescription"
                name="description"
                value={genreForm.description}
                onChange={e => setGenreForm({ ...genreForm, description: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="btn" type="submit">Добавить жанр</button>
          </div>
        </form>

        <div className="table-wrap">
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
                  <td className="row-actions">
                    <button className="btn btn-danger" onClick={() => handleGenreDelete(genre.id)}>Удалить</button>
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

export default GenresPage;