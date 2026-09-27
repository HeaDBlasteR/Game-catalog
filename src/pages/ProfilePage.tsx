import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import NoticeBanner from '../components/NoticeBanner';
import { useAuth } from '../contexts/AuthContext';
import { NoticeState } from '../shared/feedback';
import { formatRussianPhone, hasPhoneNumber } from '../shared/phone';
import { useI18n } from '../i18n/I18nContext';

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  repeatPassword: ''
};

type ProfileFormState = {
  displayName: string;
  email: string;
  phone: string;
  iconPath: string | null;
};

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t, errorText } = useI18n();
  const [form, setForm] = useState<ProfileFormState>({
    displayName: '',
    email: '',
    phone: '',
    iconPath: null
  });
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    if (!user) return;

    setForm({
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      phone: formatRussianPhone(user.phone ?? ''),
      iconPath: user.iconPath ?? null
    });
  }, [user]);

  const displayNamePreview = useMemo(() => {
    if (!user) return '';
    return form.displayName.trim() || user.username;
  }, [form.displayName, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      setForm(prev => ({
        ...prev,
        phone: formatRussianPhone(value)
      }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneFocus = () => {
    setForm(prev => {
      if (prev.phone.trim().length > 0) {
        return prev;
      }

      return {
        ...prev,
        phone: '+7'
      };
    });
  };

  const handleUploadIcon = async () => {
    if (!user) return;

    try {
      const iconDataUrl = await window.electronAPI.uploadProfileIconFromPC();
      if (!iconDataUrl) return;

      setForm(prev => ({ ...prev, iconPath: iconDataUrl }));
      setNotice({ type: 'success', text: t('profile.iconUploaded') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'profile.iconUploadFailed')
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.repeatPassword) {
      setNotice({ type: 'error', text: t('errors.passwordsDoNotMatch') });
      return;
    }

    setChangingPassword(true);
    setNotice(null);

    try {
      await window.electronAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setNotice({ type: 'success', text: t('password.changed') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'password.changeFailed')
      });
    } finally {
      setChangingPassword(false);
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
      const updatedUser = await window.electronAPI.updateProfile({
        displayName: form.displayName,
        email: form.email,
        phone: hasPhoneNumber(form.phone) ? form.phone : '',
        iconPath: form.iconPath
      });

      updateUser(updatedUser);
      setNotice({ type: 'success', text: t('profile.saved') });
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorText(err, 'profile.saveFailed')
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title={t('profile.title')} subtitle={t('profile.subtitle')}>
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <section className="profile-layout">
        <article className="panel-card profile-summary-card">
          <div className="profile-avatar-wrap">
            {form.iconPath ? (
              <img className="profile-avatar" src={form.iconPath} alt={t('profile.avatarAlt')} />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder" aria-hidden="true">
                {(displayNamePreview || user.username).slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-summary-text">
            <h3>{displayNamePreview}</h3>
            <p>{t('profile.loginLine', { username: user.username })}</p>
            <p>{t('profile.roleLine', { role: user.role === 'admin' ? t('roles.admin') : t('roles.user') })}</p>
          </div>

          <div className="row-actions">
            <button className="btn btn-light" type="button" onClick={handleUploadIcon}>
              {t('profile.uploadIcon')}
            </button>
            <button className="btn btn-light" type="button" onClick={handleRemoveIcon}>
              {t('profile.removeIcon')}
            </button>
          </div>
        </article>

        <article className="panel-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <label className="field-wrap" htmlFor="profile-username">
              <span>{t('profile.login')}</span>
              <input className="input" id="profile-username" value={user.username} readOnly />
            </label>

            <label className="field-wrap" htmlFor="displayName">
              <span>{t('profile.displayName')}</span>
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
              <span>{t('profile.email')}</span>
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
              <span>{t('profile.phone')}</span>
              <input
                className="input"
                id="phone"
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleInputChange}
                onFocus={handlePhoneFocus}
                inputMode="numeric"
                maxLength={18}
                placeholder="+7 (900) 000-00-00"
              />
            </label>

            <div className="profile-form-actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        </article>

        <article className="panel-card profile-password-card">
          <h3>{t('password.title')}</h3>
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <label className="field-wrap" htmlFor="currentPassword">
              <span>{t('password.current')}</span>
              <input
                className="input"
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </label>

            <label className="field-wrap" htmlFor="newPassword">
              <span>{t('password.new')}</span>
              <input
                className="input"
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </label>

            <label className="field-wrap" htmlFor="repeatPassword">
              <span>{t('password.repeat')}</span>
              <input
                className="input"
                id="repeatPassword"
                name="repeatPassword"
                type="password"
                value={passwordForm.repeatPassword}
                onChange={handlePasswordChange}
                required
              />
            </label>

            <div className="profile-form-actions">
              <button className="btn" type="submit" disabled={changingPassword}>
                {changingPassword ? t('password.saving') : t('password.submit')}
              </button>
            </div>
          </form>
        </article>
      </section>
    </DashboardLayout>
  );
};

export default ProfilePage;
