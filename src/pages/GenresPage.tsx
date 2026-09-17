import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useAuth } from '../contexts/AuthContext';
import { Genre } from '../shared/types';
import NoticeBanner from '../components/NoticeBanner';
import ConfirmModal from '../components/ConfirmModal';
import { NoticeState } from '../shared/feedback';
import { useI18n } from '../i18n/I18nContext';

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
  const { t, errorText, genreDescription } = useI18n();
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
        text: errorText(err, 'genres.loadFailed')
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
      await window.electronAPI.addGenre(createForm);
      handleCreateModalClose();
      setNotice({ type: 'success', text: t('genres.added') });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: errorText(err, 'genres.addFailed')
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingGenre) return;

    try {
      await window.electronAPI.updateGenre(editingGenre.id, editForm);
      handleEditModalClose();
      setNotice({ type: 'success', text: t('genres.updated') });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: errorText(err, 'genres.updateFailed')
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
      await window.electronAPI.deleteGenre(genreToDelete.id);
      setNotice({ type: 'success', text: t('genres.deleted') });
      await fetchGenres();
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: errorText(err, 'genres.deleteFailed')
      });
    } finally {
      setGenreToDelete(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout title={t('genres.title')} subtitle={t('genres.subtitle')}>
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <ConfirmModal
        isOpen={Boolean(genreToDelete)}
        title={t('genres.deleteTitle')}
        message={genreToDelete ? t('genres.deleteMessage', { name: genreToDelete.name }) : ''}
        confirmText={t('common.delete')}
        onConfirm={handleGenreDelete}
        onCancel={() => setGenreToDelete(null)}
      />

      <section className="panel-card">
        <div className="panel-header">
          <h2>{t('genres.manage')}</h2>
          <button className="btn" type="button" onClick={handleCreateModalOpen}>{t('genres.create')}</button>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('genres.colName')}</th>
                <th>{t('genres.colDescription')}</th>
                <th>{t('genres.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {genres.map(genre => (
                <tr key={genre.id}>
                  <td>{genre.name}</td>
                  <td>{genreDescription(genre.name, genre.description) || '-'}</td>
                  <td className="row-actions">
                    <button className="btn btn-light" type="button" onClick={() => handleEditModalOpen(genre)}>{t('common.edit')}</button>
                    <button className="btn btn-danger" type="button" onClick={() => handleGenreDeleteRequest(genre.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="rating-modal-overlay" role="presentation">
          <div className="rating-modal-content genre-modal-content" role="dialog" aria-modal="true" aria-label={t('genres.createLabel')}>
            <h2>{t('genres.create')}</h2>
            <form onSubmit={handleCreateSubmit} className="admin-form compact-form">
              <div className="form-grid">
                <label className="field-wrap" htmlFor="genreCreateName">
                  <span>{t('genres.fieldName')}</span>
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
                  <span>{t('genres.fieldDescription')}</span>
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
                <button className="btn" type="submit">{t('common.save')}</button>
                <button className="btn btn-light" type="button" onClick={handleCreateModalClose}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGenre && (
        <div className="rating-modal-overlay" role="presentation">
          <div className="rating-modal-content genre-modal-content" role="dialog" aria-modal="true" aria-label={t('genres.editLabel')}>
            <h2>{t('genres.editTitle')}</h2>
            <form onSubmit={handleEditSubmit} className="admin-form compact-form">
              <div className="form-grid">
                <label className="field-wrap" htmlFor="genreEditName">
                  <span>{t('genres.fieldName')}</span>
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
                  <span>{t('genres.fieldDescription')}</span>
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
                <button className="btn" type="submit">{t('common.save')}</button>
                <button className="btn btn-light" type="button" onClick={handleEditModalClose}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GenresPage;