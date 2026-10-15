import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import { CloseIcon } from '../components/Icons.jsx';
import { formatShekels, quote } from '../pricing.js';

// תאריך מקומי בפורמט yyyy-mm-dd. לא toISOString, כי הוא ב-UTC ועלול להחזיר את היום הקודם
const toInputDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toInputDate(d);
};
const LICENSE_PATTERN = /^\d{7,9}$/;

// שעות לבחירה: כל חצי שעה, מ-06:00 עד 23:00
const TIME_OPTIONS = Array.from({ length: 35 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

const hoursBetween = (start, end) => (new Date(end) - new Date(start)) / 3_600_000;

// למשל: "3 ימים", "יום ו-5 שעות", "6 שעות"
function formatDuration(hours) {
  const days = Math.floor(hours / 24);
  const rest = Math.round((hours - days * 24) * 2) / 2;
  const dayText = days === 0 ? '' : days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`;
  const hourText = rest === 0 ? '' : rest === 1 ? 'שעה' : `${rest} שעות`;
  return dayText && hourText ? `${dayText} ו-${hourText}` : dayText || hourText;
}

const hoursText = (count) => (count === 1 ? 'שעה אחת' : `${count} שעות`);

// מסך הפעולה על המשאב המוגבל: הזמנת רכב לטווח של תאריכים ושעות.
// ההזמנה נרשמת על שם המשתמש המחובר. כדי להזמין עבור מישהו אחר מקלידים את מספר רישיון
// הנהיגה שלו - אין רשימת לקוחות, והשרת מאתר את הלקוח לפי התאמה מדויקת
export default function BookingModal({ car, user, onClose }) {
  // למנהל אין פרטי לקוח משלו, ולכן הוא תמיד מזין את רישיון הנהיגה של הלקוח
  const canBookForSelf = user.customerId != null;
  const [forOther, setForOther] = useState(!canBookForSelf);
  const [driverLicenseId, setDriverLicenseId] = useState('');
  const [period, setPeriod] = useState({
    startDate: addDays(1),
    startTime: '09:00',
    endDate: addDays(4),
    endTime: '09:00',
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updatePeriod = (name, value) => setPeriod((p) => ({ ...p, [name]: value }));

  // תאריך ושעה מקומיים, בלי אזור זמן - השרת שומר אותם כפי שהם
  const dateStart = `${period.startDate}T${period.startTime}:00`;
  const dateEnd = `${period.endDate}T${period.endTime}:00`;
  const hours = hoursBetween(dateStart, dateEnd);
  const periodValid = hours >= 1;
  const price = quote(car.pricePerHour, hours);
  const licenseValid = !forOther || LICENSE_PATTERN.test(driverLicenseId);
  const target = forOther ? `בעל רישיון ${driverLicenseId}` : user.name;

  const book = () =>
    api.createRental({
      carId: car.id,
      driverLicenseId: forOther ? driverLicenseId : null,
      dateStart,
      dateEnd,
    });

  // אם מישהו אחר הזמין את הרכב לאותו זמן - גם באותו רגע ממש - השרת מחזיר 409, ומוצגת הודעה
  // שהרכב תפוס. בהצלחה, השם מגיע מהשרת - כך רואים על שם מי ההזמנה נרשמה בפועל
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const rental = await book();
      setResult({ ok: true, rental, who: rental.customerName });
    } catch (err) {
      setResult({ ok: false, who: target, status: err.status, message: err.message });
    }
    setBusy(false);
  };

  const cancelForOther = () => {
    setForOther(false);
    setDriverLicenseId('');
  };

  const ready = !busy && periodValid && licenseValid;

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
          {forOther ? (
            <label className="field">
              <span>מספר רישיון הנהיגה של הלקוח שעל שמו ההזמנה</span>
              <input
                inputMode="numeric"
                placeholder="7-9 ספרות"
                value={driverLicenseId}
                onChange={(e) => setDriverLicenseId(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                required
                autoFocus
              />
              {canBookForSelf && (
                <button type="button" className="link-button" onClick={cancelForOther}>
                  חזרה להזמנה על שמי ({user.name})
                </button>
              )}
            </label>
          ) : (
            <div className="booking-for">
              <div>
                <span>ההזמנה על שם</span>
                <strong>{user.name}</strong>
              </div>
              <button type="button" className="link-button" onClick={() => setForOther(true)}>
                שינוי
              </button>
            </div>
          )}

          <fieldset className="when">
            <legend>איסוף</legend>
            <input type="date" min={addDays(0)} value={period.startDate} aria-label="תאריך איסוף"
              onChange={(e) => updatePeriod('startDate', e.target.value)} required />
            <select value={period.startTime} aria-label="שעת איסוף" onChange={(e) => updatePeriod('startTime', e.target.value)}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </fieldset>
          <fieldset className="when">
            <legend>החזרה</legend>
            <input type="date" min={period.startDate} value={period.endDate} aria-label="תאריך החזרה"
              onChange={(e) => updatePeriod('endDate', e.target.value)} required />
            <select value={period.endTime} aria-label="שעת החזרה" onChange={(e) => updatePeriod('endTime', e.target.value)}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </fieldset>

          <div className="summary">
            {periodValid ? (
              <>
                <span>
                  {formatDuration(hours)}
                  <small>{hoursText(price.billable)} × {formatShekels(price.rate)} לשעה</small>
                  {price.discounted && <small className="discount">10% הנחה על השכרה של יותר מיומיים</small>}
                </span>
                <span className="summary-total">
                  {price.discounted && <s>{formatShekels(price.fullPrice)}</s>}
                  <strong>{formatShekels(price.total)}</strong>
                </span>
              </>
            ) : (
              <span>ההחזרה צריכה להיות לפחות שעה אחרי האיסוף</span>
            )}
          </div>

          <button type="submit" className="primary block" disabled={!ready}>
            {busy ? 'שולח...' : 'אישור הזמנה'}
          </button>
        </form>

        {result && <BookingResult result={result} />}
      </div>
    </div>
  );
}

function BookingResult({ result }) {
  if (result.ok) {
    return (
      <Alert type="success" title={`ההזמנה על שם ${result.who} אושרה`}>
        השכרה #{result.rental.id} · סה"כ ₪{result.rental.totalPrice}
      </Alert>
    );
  }
  if (result.status === 409) {
    return (
      <Alert type="conflict" title="הרכב תפוס - ההזמנה נדחתה">
        {result.message}
      </Alert>
    );
  }
  return (
    <Alert type="error" title="ההזמנה נכשלה">
      {result.message}
    </Alert>
  );
}
