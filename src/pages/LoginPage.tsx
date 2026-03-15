import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

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
      setError(err.message);
    }
  };

  return (
    <div className="auth-card">
      <h2>Вход</h2>
      {error && <p className="error-text">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-username">Имя пользователя:</label>
          <input id="login-username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="login-password">Пароль:</label>
          <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Войти</button>
      </form>
      <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </div>
  );
};

export default LoginPage;