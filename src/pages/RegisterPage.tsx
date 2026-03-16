import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, password);
      navigate('/catalog');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero" aria-hidden="true">
        <h1>Game Catalog</h1>
        <p>Создайте аккаунт и получите доступ к витрине игр и оценкам.</p>
      </div>

      <div className="auth-card">
        <h2>Регистрация</h2>
        <p className="auth-description">Заполните данные для создания нового профиля.</p>
        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-wrap" htmlFor="register-username">
            <span>Имя пользователя</span>
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
            <span>Пароль</span>
            <input
              className="input"
              id="register-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn auth-submit" type="submit">Зарегистрироваться</button>
        </form>

        <p className="auth-link-row">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;