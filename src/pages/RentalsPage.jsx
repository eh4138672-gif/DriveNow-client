import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Pagination from '../components/Pagination.jsx';
import Alert from '../components/Alert.jsx';
import { CalendarIcon } from '../components/Icons.jsx';
import { formatShekels } from '../pricing.js';

const PAGE_SIZE = 6;
// למשל: 16 באוק׳ 2026, 09:00
const formatDateTime = (value) =>
  new Date(value).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

function status(rental) {
  const now = new Date();
  if (new Date(rental.dateEnd) <= now) return { key: 'past', label: 'הסתיימה' };
  if (new Date(rental.dateStart) <= now) return { key: 'active', label: 'פעילה' };
  return { key: 'upcoming', label: 'עתידית' };
}

export default function RentalsPage({ user }) {
  const isAdmin = user.role === 'Admin';
  const [page, setPage] = useState(1);
  const [descending, setDescending] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api
      .getRentals({ page, pageSize: PAGE_SIZE, descending })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, descending]);

  useEffect(load, [load]);

  const cancel = async (rental) => {
    if (!window.confirm(`לבטל את ההשכרה של ${rental.carModel}?`)) return;
    try {
      await api.deleteRental(rental.id);
      setNotice(`השכרה #${rental.id} בוטלה`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{isAdmin ? 'כל ההשכרות' : 'ההשכרות שלי'}</h2>
          <p className="muted">{isAdmin ? 'כל ההזמנות במערכת, מכל הלקוחות.' : 'ההזמנות שביצעת.'}</p>
        </div>
        <select value={String(descending)} onChange={(e) => { setDescending(e.target.value === 'true'); setPage(1); }}>
          <option value="true">החדשות קודם</option>
          <option value="false">הישנות קודם</option>
        </select>
      </div>

      <Alert type="error" onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>

      {data && data.items.length === 0 && (
        <div className="empty-state card">
          <CalendarIcon width={40} height={40} />
          <p>אין עדיין השכרות. אפשר להזמין רכב בלשונית "רכבים".</p>
        </div>
      )}

      <div className="rental-list">
        {data?.items.map((r) => {
          const s = status(r);
          return (
            <article key={r.id} className="rental-row card">
              <div className="rental-main">
                <div className="rental-title">
                  <h3>{r.carModel}</h3>
                  <span className="plate small">{r.carLicenseNumber}</span>
                  <span className={`badge badge-${s.key}`}>{s.label}</span>
                </div>
                <div className="rental-meta">
                  <span><CalendarIcon width={15} height={15} /> {formatDateTime(r.dateStart)} - {formatDateTime(r.dateEnd)}</span>
                  {isAdmin && <span>לקוח: {r.customerName}</span>}
                  <span>#{r.id}</span>
                </div>
              </div>
              <div className="rental-side">
                <strong className="rental-price">{formatShekels(r.amountPaid ?? r.totalPrice)}</strong>
                {r.amountPaid != null && (
                  <small className="paid-badge" title={`אסמכתא ${r.paymentReference}`}>
                    שולם · •••• {r.cardLast4}
                  </small>
                )}
                {s.key !== 'past' && (
                  <button className="danger-ghost" onClick={() => cancel(r)}>ביטול</button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  );
}
