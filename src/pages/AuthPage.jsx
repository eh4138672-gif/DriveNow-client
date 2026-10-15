import { useState } from 'react';
import { api, auth } from '../api.js';
import Alert from '../components/Alert.jsx';
import { CarIcon } from '../components/Icons.jsx';

const EMPTY_REGISTER = { name: '', email: '', phoneNumber: '', driverLicenseId: '', password: '' };

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [register, setRegister] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = mode === 'login' ? await api.login(login) : await api.register(register);
      onLogin(auth.save(response));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="brand brand-large">
          <span className="brand-icon"><CarIcon width={28} height={28} /></span>
          <span>DriveNow</span>
        </div>
        <h1>השכרת רכבים, בלי הפתעות.</h1>
        <p>בוחרים רכב, בוחרים תאריכים, וזהו. אם מישהו אחר הזמין את אותו רכב באותו רגע - המערכת תדע.</p>
      </div>

      <div className="auth-card">
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>התחברות</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>הרשמה</button>
        </div>

        <form onSubmit={submit} className="stack">
          {mode === 'login' ? (
            <>
              <Field label="אימייל" type="email" value={login.email}
                onChange={(v) => setLogin({ ...login, email: v })} autoComplete="email" />
              <Field label="סיסמה" type="password" value={login.password}
                onChange={(v) => setLogin({ ...login, password: v })} autoComplete="current-password" />
            </>
          ) : (
            <>
              <Field label="שם מלא" value={register.name}
                onChange={(v) => setRegister({ ...register, name: v })} autoComplete="name" />
              <Field label="אימייל" type="email" value={register.email}
                onChange={(v) => setRegister({ ...register, email: v })} autoComplete="email" />
              <div className="row">
                <Field label="טלפון" placeholder="050-1234567" value={register.phoneNumber}
                  onChange={(v) => setRegister({ ...register, phoneNumber: v })} autoComplete="tel" />
                <Field label="מספר רישיון נהיגה" placeholder="7-9 ספרות" value={register.driverLicenseId}
                  onChange={(v) => setRegister({ ...register, driverLicenseId: v })} />
              </div>
              <Field label="סיסמה (לפחות 8 תווים)" type="password" value={register.password}
                onChange={(v) => setRegister({ ...register, password: v })} autoComplete="new-password" />
            </>
          )}

          <Alert type="error">{error}</Alert>

          <button type="submit" className="primary block" disabled={busy}>
            {busy ? 'רגע...' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required {...rest} />
    </label>
  );
}
