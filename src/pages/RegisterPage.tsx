import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const { register } = useAuth();
  const { t, errorText } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, password);
      navigate('/catalog');
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero" aria-hidden="true">
        <h1>{t('common.appName')}</h1>
        <p>{t('register.heroText')}</p>
      </div>

      <div className="auth-card">
        <LanguageSwitcher className="auth-language-switcher" />
        <h2>{t('register.title')}</h2>
        <p className="auth-description">{t('register.description')}</p>
        {error !== null && <p className="error-text">{errorText(error, 'register.failed')}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-wrap" htmlFor="register-username">
            <span>{t('login.username')}</span>
            <input
              className="input"
              id="register-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="field-wrap" htmlFor="register-password">
            <span>{t('login.password')}</span>
            <input
              className="input"
              id="register-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn auth-submit" type="submit">{t('register.submit')}</button>
        </form>

        <p className="auth-link-row">
          {t('register.haveAccount')} <Link to="/login">{t('register.toLogin')}</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
