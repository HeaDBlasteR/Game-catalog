import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toUserErrorMessage } from '../shared/feedback';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = await login(username, password);
      navigate(userData.role === 'admin' ? '/admin' : '/catalog');
    } catch (err: any) {
      setError(toUserErrorMessage(err, 'Не удалось войти в систему.'));
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero" aria-hidden="true">
        <h1>Game Catalog</h1>
        <p>Войдите, чтобы получить доступ к каталогу и панели управления.</p>
      </div>

      <div className="auth-card">
        <h2>Вход</h2>
        <p className="auth-description">Используйте учетные данные для доступа к каталогу.</p>
        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-wrap" htmlFor="login-username">
            <span>Имя пользователя</span>
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
            <span>Пароль</span>
            <input
              className="input"
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn auth-submit" type="submit">Войти</button>
        </form>

        <p className="auth-link-row">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;