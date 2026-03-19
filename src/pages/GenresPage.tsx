import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useAuth } from '../contexts/AuthContext';
import { Genre } from '../shared/types';
import NoticeBanner from '../components/NoticeBanner';
import ConfirmModal from '../components/ConfirmModal';
import { NoticeState, toUserErrorMessage } from '../shared/feedback';

type GenreFormState = {
  name: string;
  description: string;
};

const EMPTY_GENRE_FORM: GenreFormState = {
  name: '',
  description: ''
};

const GenresPage: React.FC = () => {
  const { user } = useAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [createForm, setCreateForm] = useState<GenreFormState>(EMPTY_GENRE_FORM);
  const [editForm, setEditForm] = useState<GenreFormState>(EMPTY_GENRE_FORM);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [genreToDelete, setGenreToDelete] = useState<Genre | null>(null);
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

  const handleCreateModalOpen = () => {
    setCreateForm(EMPTY_GENRE_FORM);
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setCreateForm(EMPTY_GENRE_FORM);
  };

  const handleEditModalOpen = (genre: Genre) => {
    setEditingGenre(genre);
    setEditForm({
      name: genre.name,
      description: genre.description ?? ''
    });
  };

  const handleEditModalClose = () => {
    setEditingGenre(null);
    setEditForm(EMPTY_GENRE_FORM);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await window.electronAPI.addGenre(createForm, user.id);
      handleCreateModalClose();
      setNotice({ type: 'success', text: 'Жанр добавлен.' });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось добавить жанр.')
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingGenre) return;

    try {
      await window.electronAPI.updateGenre(editingGenre.id, editForm, user.id);
      handleEditModalClose();
      setNotice({ type: 'success', text: 'Жанр обновлен.' });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось обновить жанр.')
      });
    }
  };

  const handleGenreDeleteRequest = (id: number) => {
    const genre = genres.find(item => item.id === id);
    if (!genre) return;
    setGenreToDelete(genre);
  };

  const handleGenreDelete = async () => {
    if (!user) return;
    if (!genreToDelete) return;

    try {
      await window.electronAPI.deleteGenre(genreToDelete.id, user.id);
      setNotice({ type: 'success', text: 'Жанр удален.' });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось удалить жанр.')
      });
    } finally {
      setGenreToDelete(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout title="Жанры" subtitle="Создание, редактирование и удаление жанров">
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <ConfirmModal
        isOpen={Boolean(genreToDelete)}
        title="Удалить жанр?"
        message={genreToDelete ? `Жанр \"${genreToDelete.name}\" будет удален.` : ''}
        confirmText="Удалить"
        onConfirm={handleGenreDelete}
        onCancel={() => setGenreToDelete(null)}
      />

      <section className="panel-card">
        <div className="panel-header">
          <h2>Управление жанрами</h2>
          <button className="btn" type="button" onClick={handleCreateModalOpen}>Создать жанр</button>
        </div>

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
                    <button className="btn btn-light" type="button" onClick={() => handleEditModalOpen(genre)}>Редактировать</button>
                    <button className="btn btn-danger" type="button" onClick={() => handleGenreDeleteRequest(genre.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="rating-modal-overlay" role="presentation">
          <div className="rating-modal-content genre-modal-content" role="dialog" aria-modal="true" aria-label="Создание жанра">
            <h2>Создать жанр</h2>
            <form onSubmit={handleCreateSubmit} className="admin-form compact-form">
              <div className="form-grid">
                <label className="field-wrap" htmlFor="genreCreateName">
                  <span>Название жанра*</span>
                  <input
                    className="input"
                    id="genreCreateName"
                    name="name"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="field-wrap" htmlFor="genreCreateDescription">
                  <span>Описание</span>
                  <input
                    className="input"
                    id="genreCreateDescription"
                    name="description"
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn" type="submit">Сохранить</button>
                <button className="btn btn-light" type="button" onClick={handleCreateModalClose}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGenre && (
        <div className="rating-modal-overlay" role="presentation">
          <div className="rating-modal-content genre-modal-content" role="dialog" aria-modal="true" aria-label="Редактирование жанра">
            <h2>Редактировать жанр</h2>
            <form onSubmit={handleEditSubmit} className="admin-form compact-form">
              <div className="form-grid">
                <label className="field-wrap" htmlFor="genreEditName">
                  <span>Название жанра*</span>
                  <input
                    className="input"
                    id="genreEditName"
                    name="name"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="field-wrap" htmlFor="genreEditDescription">
                  <span>Описание</span>
                  <input
                    className="input"
                    id="genreEditDescription"
                    name="description"
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn" type="submit">Сохранить</button>
                <button className="btn btn-light" type="button" onClick={handleEditModalClose}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GenresPage;