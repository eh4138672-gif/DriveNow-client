import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import Alert from '../components/Alert.jsx';
import { CarIcon, SearchIcon } from '../components/Icons.jsx';
import BookingModal from './BookingModal.jsx';
import CarFormModal from './CarFormModal.jsx';
import { formatShekels } from '../pricing.js';

const PAGE_SIZE = 6;

export default function CarsPage({ user }) {
  const isAdmin = user.role === 'Admin';
  const [filters, setFilters] = useState({ search: '', sortBy: 'model', descending: false, featureId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busyCarId, setBusyCarId] = useState(null);
  // מעלים אחרי כל שינוי של מנהל, כדי לטעון את הרשימה מחדש מהשרת
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.getFeatures().then(setFeatures).catch(() => {});
  }, []);

  useEffect(() => {
    // השהיה קצרה בחיפוש, כדי לא לשלוח בקשה על כל הקשה
    const timer = setTimeout(() => {
      api
        .getCars({ ...filters, page, pageSize: PAGE_SIZE, includeInactive: isAdmin })
        .then((result) => {
          setData(result);
          setError('');
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, page, isAdmin, reloadKey]);

  const updateFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };

  const runCarAction = async (car, action, successMessage) => {
    setBusyCarId(car.id);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyCarId(null);
    }
  };

  const toggleAvailability = (car) =>
    runCarAction(
      car,
      () => api.setCarAvailability(car.id, !car.isActive),
      car.isActive ? `${car.model} הוצא מההשכרה` : `${car.model} חזר להשכרה`
    );

  const removeCar = (car) => {
    if (!window.confirm(`למחוק את ${car.model} (${car.licenseNumber}) לצמיתות?`)) return;
    runCarAction(car, () => api.deleteCar(car.id), `${car.model} נמחק`);
  };

  const onCarAdded = (car) => {
    setAdding(false);
    setNotice(`${car.model} נוסף להשכרה`);
    setReloadKey((k) => k + 1);
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>הצי שלנו</h2>
          <p className="muted">
            {isAdmin
              ? 'ניהול הצי: הוספת רכבים, הוצאה מהשכרה והחזרה, ומחיקה של רכב שלא הושכר.'
              : 'בחר רכב, תאריכים ושעות. הזמינות נבדקת בזמן אמת מול השרת.'}
          </p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setAdding(true)}>+ הוספת רכב</button>
        )}
      </div>

      <div className="filters card">
        <div className="search">
          <SearchIcon />
          <input
            placeholder="חיפוש לפי דגם או מספר רישוי"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
        <select value={`${filters.sortBy}:${filters.descending}`} onChange={(e) => {
          const [sortBy, descending] = e.target.value.split(':');
          setFilters((f) => ({ ...f, sortBy, descending: descending === 'true' }));
          setPage(1);
        }}>
          <option value="model:false">דגם (א-ת)</option>
          <option value="price:false">מחיר לשעה: מהזול ליקר</option>
          <option value="price:true">מחיר לשעה: מהיקר לזול</option>
          <option value="licenseNumber:false">מספר רישוי</option>
        </select>
        <div className="feature-filter">
          <button className={filters.featureId === '' ? 'chip active' : 'chip'} onClick={() => updateFilter('featureId', '')}>
            הכול
          </button>
          {features.map((f) => (
            <button key={f.id} className={filters.featureId === f.id ? 'chip active' : 'chip'}
              onClick={() => updateFilter('featureId', f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <Alert type="error" onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      {!data && !error && <div className="grid">{[1, 2, 3].map((i) => <div key={i} className="car-card skeleton" />)}</div>}

      {data && data.items.length === 0 && (
        <div className="empty-state card">
          <CarIcon width={40} height={40} />
          <p>לא נמצאו רכבים שמתאימים לחיפוש</p>
        </div>
      )}

      <div className="grid">
        {data?.items.map((car) => (
          <article key={car.id} className={car.isActive ? 'car-card' : 'car-card inactive'}>
            <div className="car-visual">
              <CarIcon width={56} height={56} strokeWidth={1.3} />
              {!car.isActive && <span className="out-badge">הוצא מההשכרה</span>}
            </div>
            <div className="car-body">
              <div className="car-title">
                <h3>{car.model}</h3>
                <span className="plate">{car.licenseNumber}</span>
              </div>
              <div className="tags">
                {car.features.map((f) => <span key={f.id} className="tag">{f.name}</span>)}
                {car.features.length === 0 && <span className="tag tag-muted">ללא תוספות</span>}
              </div>
              <div className="car-footer">
                <div className="price">
                  <strong>{formatShekels(car.pricePerHour)}</strong>
                  <span>לשעה</span>
                  <small>10% הנחה על השכרה של יותר מיומיים</small>
                </div>
                <button className="primary" onClick={() => setSelectedCar(car)} disabled={!car.isActive}>
                  הזמנה
                </button>
              </div>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="ghost small" disabled={busyCarId === car.id} onClick={() => toggleAvailability(car)}>
                    {car.isActive ? 'הוצאה מהשכרה' : 'החזרה להשכרה'}
                  </button>
                  <button className="danger-ghost small" disabled={busyCarId === car.id} onClick={() => removeCar(car)}>
                    מחיקה
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {data && <Pagination {...data} onChange={setPage} />}

      {selectedCar && <BookingModal car={selectedCar} user={user} onClose={() => setSelectedCar(null)} />}
      {adding && <CarFormModal features={features} onClose={() => setAdding(false)} onSaved={onCarAdded} />}
    </section>
  );
}
