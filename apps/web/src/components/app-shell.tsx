import { AlertTriangle, BarChart3, Building2, FileText, History, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useAuth } from '../auth/auth-context';

export function AppShell(): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    await navigate({ to: '/login' });
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}>
        <div className="brand-block">
          <span className="brand-mark"><ShieldCheck size={20} aria-hidden="true" /></span>
          <span>
            <strong>Патруль</strong>
            <small>Контроль обходов</small>
          </span>
          <button className="icon-button sidebar-close" type="button" onClick={() => setMenuOpen(false)} title="Закрыть меню">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Основная навигация">
          <Link to="/" activeOptions={{ exact: false }} activeProps={{ className: 'nav-link nav-link--active' }} className="nav-link" onClick={() => setMenuOpen(false)}>
            <Building2 size={18} aria-hidden="true" />
            Магазины
          </Link>
          <Link to="/incidents" activeOptions={{ exact: false }} activeProps={{ className: 'nav-link nav-link--active' }} className="nav-link" onClick={() => setMenuOpen(false)}>
            <AlertTriangle size={18} aria-hidden="true" />
            Инциденты
          </Link>
          <Link to="/patrols" activeOptions={{ exact: false }} activeProps={{ className: 'nav-link nav-link--active' }} className="nav-link" onClick={() => setMenuOpen(false)}>
            <History size={18} aria-hidden="true" />
            История обходов
          </Link>
          <Link to="/reports" activeOptions={{ exact: false }} activeProps={{ className: 'nav-link nav-link--active' }} className="nav-link" onClick={() => setMenuOpen(false)}>
            <FileText size={18} aria-hidden="true" />
            Отчеты
          </Link>
          {profile?.role === 'admin' ? <Link to="/management" activeOptions={{ exact: false }} activeProps={{ className: 'nav-link nav-link--active' }} className="nav-link" onClick={() => setMenuOpen(false)}>
            <BarChart3 size={18} aria-hidden="true" />
            Руководство
          </Link> : null}
        </nav>

        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{initials(profile?.fullName)}</span>
          <span className="sidebar-user__text">
            <strong>{profile?.fullName}</strong>
            <small>{profile?.role === 'admin' ? 'Администратор' : 'Проверяющий'}</small>
          </span>
          <button className="icon-button icon-button--inverse" type="button" onClick={() => void handleLogout()} title="Выйти">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {menuOpen ? <button className="sidebar-scrim" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} /> : null}

      <div className="app-main">
        <header className="mobile-header">
          <button className="icon-button" type="button" onClick={() => setMenuOpen(true)} title="Открыть меню">
            <Menu size={20} aria-hidden="true" />
          </button>
          <strong>Патруль</strong>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

function initials(name: string | undefined): string {
  if (name === undefined) return 'П';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}
