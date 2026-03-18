import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.displayName?.trim() ? user.displayName : user?.username;
  const roleLabel = user?.role === 'admin' ? 'Администратор' : 'Пользователь';
  const userInitial = (displayName?.[0] ?? '?').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar-wrap" aria-hidden="true">
            {user?.iconPath ? (
              <img src={user.iconPath} alt="" className="sidebar-user-avatar" />
            ) : (
              <div className="sidebar-user-avatar sidebar-user-avatar-placeholder">{userInitial}</div>
            )}
          </div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Основная навигация">
          <Link
            to="/catalog"
            className={location.pathname === '/catalog' ? 'nav-link active' : 'nav-link'}
          >
            Каталог
          </Link>
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin"
                className={location.pathname === '/admin' ? 'nav-link active' : 'nav-link'}
              >
                Админ-панель
              </Link>
              <Link
                to="/genres"
                className={location.pathname === '/genres' ? 'nav-link active' : 'nav-link'}
              >
                Жанры
              </Link>
            </>
          )}
          <Link
            to="/profile"
            className={location.pathname === '/profile' ? 'nav-link active' : 'nav-link'}
          >
            Профиль
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-light sidebar-logout-btn" type="button" onClick={handleLogout}>Выйти</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>

        <section className="dashboard-content">{children}</section>
      </main>
    </div>
  );
};

export default DashboardLayout;
