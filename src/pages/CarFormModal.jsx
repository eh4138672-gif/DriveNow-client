import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import { CloseIcon } from '../components/Icons.jsx';

const EMPTY = { model: '', licenseNumber: '', pricePerHour: '', featureIds: [] };

// הוספת רכב חדש לצי - מנהל בלבד
export default function CarFormModal({ features, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const toggleFeature = (id) =>
    setForm((f) => ({
      ...f,
      featureIds: f.featureIds.includes(id) ? f.featureIds.filter((x) => x !== id) : [...f.featureIds, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const car = await api.createCar({ ...form, pricePerHour: Number(form.pricePerHour) });
      onSaved(car);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="car-form-title">
        <div className="modal-head">
          <h2 id="car-form-title">הוספת רכב להשכרה</h2>
          <button className="icon-button" onClick={onClose} aria-label="סגירה"><CloseIcon /></button>
        </div>

        <form onSubmit={submit} className="stack">
          <label className="field">
            <span>דגם</span>
            <input value={form.model} onChange={(e) => update('model', e.target.value)}
              placeholder="למשל Toyota Yaris" minLength={2} maxLength={50} required autoFocus />
          </label>
          <div className="row">
            <label className="field">
              <span>מספר רישוי</span>
              <input value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)}
                placeholder="123-45-678" pattern="\d{2,3}-\d{2,3}-\d{2,3}" title="בפורמט 123-45-678" dir="ltr" required />
            </label>
            <label className="field">
              <span>מחיר לשעה (₪, מינימום 30)</span>
              <input type="number" min={30} max={1000} step={1} value={form.pricePerHour}
                onChange={(e) => update('pricePerHour', e.target.value)} required />
            </label>
          </div>

          <div className="field">
            <span>תכונות</span>
            <div className="feature-filter">
              {features.map((f) => (
                <button key={f.id} type="button" className={form.featureIds.includes(f.id) ? 'chip active' : 'chip'}
                  onClick={() => toggleFeature(f.id)} aria-pressed={form.featureIds.includes(f.id)}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <Alert type="error">{error}</Alert>

          <button type="submit" className="primary block" disabled={busy}>
            {busy ? 'שומר...' : 'הוספת הרכב'}
          </button>
        </form>
      </div>
    </div>
  );
}
