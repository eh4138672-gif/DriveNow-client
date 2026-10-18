import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import { CloseIcon } from '../components/Icons.jsx';
import PaymentFields, { emptyCard, toPaymentDto, validateCard } from '../components/PaymentFields.jsx';
import { formatShekels } from '../pricing.js';

// תשלום על השכרה קיימת. הסכום מוצג מההשכרה, אבל השרת מחשב אותו בעצמו ולא מקבל אותו מכאן
export default function PaymentModal({ rental, onClose, onPaid }) {
  const [card, setCard] = useState(emptyCard);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validateCard(card)).length > 0) return;
    setBusy(true);
    setError(null);
    try {
      onPaid(await api.payRental(rental.id, toPaymentDto(card)));
    } catch (err) {
      setError({ status: err.status, message: err.message });
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <div className="modal-head">
          <div>
            <h2 id="payment-title">תשלום על {rental.carModel}</h2>
            <span className="muted">השכרה #{rental.id}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="סגירה"><CloseIcon /></button>
        </div>

        <form onSubmit={submit} className="stack">
          <PaymentFields card={card} onChange={setCard} touched={touched} />
          <button type="submit" className="primary block" disabled={busy}>
            {busy ? 'מעבד תשלום...' : `תשלום ${formatShekels(rental.totalPrice)}`}
          </button>
        </form>

        {error && (
          <Alert type={error.status === 409 ? 'conflict' : 'error'} title={error.status === 402 ? 'התשלום נדחה' : 'התשלום נכשל'}>
            {error.message}
          </Alert>
        )}
      </div>
    </div>
  );
}
