import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import NoticeBanner from '../components/NoticeBanner';
import { useAuth } from '../contexts/AuthContext';
import { NoticeState, toUserErrorMessage } from '../shared/feedback';

type ProfileFormState = {
  displayName: string;
  email: string;
  phone: string;
  iconPath: string | null;
};

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileFormState>({
    displayName: '',
    email: '',
    phone: '',
    iconPath: null
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    if (!user) return;

    setForm({
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      iconPath: user.iconPath ?? null
    });
  }, [user]);

  const displayNamePreview = useMemo(() => {
    if (!user) return '';
    return form.displayName.trim() || user.username;
  }, [form.displayName, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUploadIcon = async () => {
    if (!user) return;

    try {
      const iconDataUrl = await window.electronAPI.uploadProfileIconFromPC(user.id);
      if (!iconDataUrl) return;

      setForm(prev => ({ ...prev, iconPath: iconDataUrl }));
      setNotice({ type: 'success', text: 'Иконка профиля загружена.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось загрузить иконку профиля.')
      });
    }
  };

  const handleRemoveIcon = () => {
    setForm(prev => ({ ...prev, iconPath: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setNotice(null);

    try {
      const updatedUser = await window.electronAPI.updateProfile(user.id, {
        displayName: form.displayName,
        email: form.email,
        phone: form.phone,
        iconPath: form.iconPath
      });

      updateUser(updatedUser);
      setNotice({ type: 'success', text: 'Профиль сохранен.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: toUserErrorMessage(err, 'Не удалось сохранить профиль.')
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout title="Профиль" subtitle="Персональные данные пользователя">
        <div className="panel-card">Пользователь не найден.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Профиль" subtitle="Настройте публичное имя и контактные данные">
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <section className="profile-layout">
        <article className="panel-card profile-summary-card">
          <div className="profile-avatar-wrap">
            {form.iconPath ? (
              <img className="profile-avatar" src={form.iconPath} alt="Иконка профиля" />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder" aria-hidden="true">
                {(displayNamePreview || user.username).slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-summary-text">
            <h3>{displayNamePreview}</h3>
            <p>Логин: {user.username}</p>
            <p>Роль: {user.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
          </div>

          <div className="row-actions">
            <button className="btn btn-light" type="button" onClick={handleUploadIcon}>
              Загрузить иконку с ПК
            </button>
            <button className="btn btn-light" type="button" onClick={handleRemoveIcon}>
              Убрать иконку
            </button>
          </div>
        </article>

        <article className="panel-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <label className="field-wrap" htmlFor="profile-username">
              <span>Логин</span>
              <input className="input" id="profile-username" value={user.username} readOnly />
            </label>

            <label className="field-wrap" htmlFor="displayName">
              <span>Ник</span>
              <input
                className="input"
                id="displayName"
                name="displayName"
                value={form.displayName}
                onChange={handleInputChange}
                maxLength={64}
              />
            </label>

            <label className="field-wrap" htmlFor="email">
              <span>Почта</span>
              <input
                className="input"
                id="email"
                name="email"
                type="text"
                value={form.email}
                onChange={handleInputChange}
                maxLength={254}
                placeholder="user@example.com"
              />
            </label>

            <label className="field-wrap" htmlFor="phone">
              <span>Телефон</span>
              <input
                className="input"
                id="phone"
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleInputChange}
                maxLength={32}
                placeholder="+7 900 000-00-00"
              />
            </label>

            <div className="profile-form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить профиль'}
              </button>
            </div>
          </form>
        </article>
      </section>
    </DashboardLayout>
  );
};

export default ProfilePage;
