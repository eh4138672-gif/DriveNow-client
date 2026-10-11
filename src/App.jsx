import { useEffect, useState } from 'react';
import { auth, setUnauthorizedHandler } from './api.js';
import AuthPage from './pages/AuthPage.jsx';
import CarsPage from './pages/CarsPage.jsx';
import RentalsPage from './pages/RentalsPage.jsx';
import { CarIcon, LogoutIcon } from './components/Icons.jsx';

export default function App() {
  const [user, setUser] = useState(() => auth.getUser());
  const [tab, setTab] = useState('cars');

  useEffect(() => setUnauthorizedHandler(() => setUser(null)), []);

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  const isAdmin = user.role === 'Admin';
  const tabs = [
    { key: 'cars', label: 'רכבים' },
    { key: 'rentals', label: isAdmin ? 'כל ההשכרות' : 'ההשכרות שלי' },
  ];

  const logout = () => {
    auth.clear();
    setUser(null);
  };

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon"><CarIcon /></span>
            <span>DriveNow</span>
          </div>
          <nav className="tabs">
            {tabs.map((t) => (
              <button key={t.key} className={tab === t.key ? 'tab active' : 'tab'} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="user-chip">
            <span className="avatar">{user.name.charAt(0)}</span>
            <span className="user-meta">
              <strong>{user.name}</strong>
              <small>{isAdmin ? 'מנהל' : 'לקוח'}</small>
            </span>
            <button className="icon-button" onClick={logout} title="התנתקות" aria-label="התנתקות">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {tab === 'cars' ? <CarsPage user={user} /> : <RentalsPage user={user} />}
      </main>
    </div>
  );
}
