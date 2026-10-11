import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import { BoltIcon, CloseIcon } from '../components/Icons.jsx';

// תאריך מקומי בפורמט yyyy-mm-dd. לא toISOString, כי הוא ב-UTC ועלול להחזיר את היום הקודם
const toInputDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toInputDate(d);
};
const daysBetween = (start, end) => Math.round((new Date(end) - new Date(start)) / 86_400_000);

// מסך הפעולה על המשאב המוגבל: הזמנת רכב לטווח תאריכים
export default function BookingModal({ car, user, onClose }) {
  const isAdmin = user.role === 'Admin';
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customerId: '', dateStart: addDays(1), dateEnd: addDays(4) });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // רק מנהל בוחר לקוח. לקוח מזמין תמיד לעצמו, והשרת אוכף את זה
  useEffect(() => {
    if (!isAdmin) return;
    api.getCustomers({ pageSize: 100 }).then((page) => {
      setCustomers(page.items);
      if (page.items.length) {
        setForm((f) => ({ ...f, customerId: String(page.items[0].id) }));
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const days = daysBetween(form.dateStart, form.dateEnd);

  const customerName = (id) =>
    isAdmin ? customers.find((c) => String(c.id) === String(id))?.name ?? '' : user.name;

  const book = (customerId) =>
    api.createRental({
      carId: car.id,
      customerId: isAdmin ? Number(customerId) : null,
      dateStart: form.dateStart,
      dateEnd: form.dateEnd,
    });

  const toResult = (customerId, outcome) => ({
    who: customerName(customerId),
    ok: outcome.status === 'fulfilled',
    rental: outcome.value,
    status: outcome.reason?.status,
    message: outcome.reason?.message,
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const [outcome] = await Promise.allSettled([book(form.customerId)]);
    setResult({ single: toResult(form.customerId, outcome) });
    setBusy(false);
  };

  // שתי הזמנות לאותו רכב ולאותם תאריכים, באותו רגע. השרת צריך לאשר רק אחת ולהחזיר 409 לשנייה
  const simulateRace = async () => {
    setBusy(true);
    const ids = isAdmin ? [customers[0]?.id, customers[1]?.id ?? customers[0]?.id] : [null, null];
    const outcomes = await Promise.allSettled(ids.map(book));
    setResult({ race: outcomes.map((o, i) => toResult(ids[i], o)) });
    setBusy(false);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <div className="modal-head">
          <div>
            <h2 id="booking-title">הזמנת {car.model}</h2>
            <span className="plate">{car.licenseNumber}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="סגירה"><CloseIcon /></button>
        </div>

        <form onSubmit={submit} className="stack">
          {isAdmin && (
            <label className="field">
              <span>הזמנה עבור לקוח</span>
              <select value={form.customerId} onChange={(e) => update('customerId', e.target.value)} required>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <div className="row">
            <label className="field">
              <span>איסוף</span>
              <input type="date" min={addDays(0)} value={form.dateStart}
                onChange={(e) => update('dateStart', e.target.value)} required />
            </label>
            <label className="field">
              <span>החזרה</span>
              <input type="date" min={form.dateStart} value={form.dateEnd}
                onChange={(e) => update('dateEnd', e.target.value)} required />
            </label>
          </div>

          <div className="summary">
            <span>{days > 0 ? `${days} ימים × ₪${car.price}` : 'בחר תאריך החזרה אחרי האיסוף'}</span>
            {days > 0 && <strong>₪{days * car.price}</strong>}
          </div>

          <button type="submit" className="primary block" disabled={busy || days <= 0 || (isAdmin && !form.customerId)}>
            {busy ? 'שולח...' : 'אישור הזמנה'}
          </button>
        </form>

        <div className="race-box">
          <div>
            <strong><BoltIcon width={16} height={16} /> הדגמת תחרות על הרכב</strong>
            <p>
              שולח שתי הזמנות זהות באותו רגע
              {isAdmin ? ' (עבור שני לקוחות שונים)' : ''}. רק אחת אמורה להתקבל, והשנייה תקבל 409.
            </p>
          </div>
          <button type="button" className="ghost" disabled={busy || days <= 0 || (isAdmin && customers.length === 0)}
            onClick={simulateRace}>
            הפעל
          </button>
        </div>

        {result?.single && <BookingResult result={result.single} />}
        {result?.race && result.race.map((r, i) => <BookingResult key={i} result={r} label={`בקשה ${i + 1}`} />)}
      </div>
    </div>
  );
}

function BookingResult({ result, label }) {
  const prefix = label ? `${label}: ` : '';
  if (result.ok) {
    return (
      <Alert type="success" title={`${prefix}ההזמנה של ${result.who} אושרה`}>
        השכרה #{result.rental.id} · סה"כ ₪{result.rental.totalPrice}
      </Alert>
    );
  }
  if (result.status === 409) {
    return (
      <Alert type="conflict" title={`${prefix}הרכב תפוס - ההזמנה של ${result.who} נדחתה`}>
        {result.message}
      </Alert>
    );
  }
  return (
    <Alert type="error" title={`${prefix}ההזמנה נכשלה`}>
      {result.message}
    </Alert>
  );
}
