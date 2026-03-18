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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <div className="brand-badge">GC</div>
          <div>
            <div className="brand-title">Game Catalog</div>
            <div className="brand-subtitle">Control center</div>
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
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="topbar-actions">
            <div className="user-chip">
              <span className="status-dot" aria-hidden="true" />
              {user?.username} ({user?.role})
            </div>
            <button className="btn btn-light" onClick={handleLogout}>Выйти</button>
          </div>
        </header>

        <section className="dashboard-content">{children}</section>
      </main>
    </div>
  );
};

export default DashboardLayout;
