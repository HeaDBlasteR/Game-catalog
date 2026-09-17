import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const { login } = useAuth();
  const { t, errorText } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = await login(username, password);
      navigate(userData.role === 'admin' ? '/admin' : '/catalog');
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero" aria-hidden="true">
        <h1>{t('common.appName')}</h1>
        <p>{t('login.heroText')}</p>
      </div>

      <div className="auth-card">
        <LanguageSwitcher className="auth-language-switcher" />
        <h2>{t('login.title')}</h2>
        <p className="auth-description">{t('login.description')}</p>
        {error !== null && <p className="error-text">{errorText(error, 'login.failed')}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-wrap" htmlFor="login-username">
            <span>{t('login.username')}</span>
            <input
              className="input"
              id="login-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="field-wrap" htmlFor="login-password">
            <span>{t('login.password')}</span>
            <input
              className="input"
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn auth-submit" type="submit">{t('login.submit')}</button>
        </form>

        <p className="auth-link-row">
          {t('login.noAccount')} <Link to="/register">{t('login.toRegister')}</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
