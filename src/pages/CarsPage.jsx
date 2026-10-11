import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import Alert from '../components/Alert.jsx';
import { CarIcon, SearchIcon } from '../components/Icons.jsx';
import BookingModal from './BookingModal.jsx';

const PAGE_SIZE = 6;

export default function CarsPage({ user }) {
  const [filters, setFilters] = useState({ search: '', sortBy: 'model', descending: false, featureId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);

  useEffect(() => {
    api.getFeatures().then(setFeatures).catch(() => {});
  }, []);

  useEffect(() => {
    // השהיה קצרה בחיפוש, כדי לא לשלוח בקשה על כל הקשה
    const timer = setTimeout(() => {
      api
        .getCars({ ...filters, page, pageSize: PAGE_SIZE })
        .then((result) => {
          setData(result);
          setError('');
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, page]);

  const updateFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>הצי שלנו</h2>
          <p className="muted">בחר רכב ותאריכים. הזמינות נבדקת בזמן אמת מול השרת.</p>
        </div>
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
          <option value="price:false">מחיר: מהזול ליקר</option>
          <option value="price:true">מחיר: מהיקר לזול</option>
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

      {!data && !error && <div className="grid">{[1, 2, 3].map((i) => <div key={i} className="car-card skeleton" />)}</div>}

      {data && data.items.length === 0 && (
        <div className="empty-state card">
          <CarIcon width={40} height={40} />
          <p>לא נמצאו רכבים שמתאימים לחיפוש</p>
        </div>
      )}

      <div className="grid">
        {data?.items.map((car) => (
          <article key={car.id} className="car-card">
            <div className="car-visual">
              <CarIcon width={56} height={56} strokeWidth={1.3} />
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
                  <strong>₪{car.price}</strong>
                  <span>ליום</span>
                </div>
                <button className="primary" onClick={() => setSelectedCar(car)}>הזמנה</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {data && <Pagination {...data} onChange={setPage} />}

      {selectedCar && <BookingModal car={selectedCar} user={user} onClose={() => setSelectedCar(null)} />}
    </section>
  );
}
