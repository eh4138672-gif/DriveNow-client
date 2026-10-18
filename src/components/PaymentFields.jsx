// פרטי כרטיס אשראי לתשלום על ההזמנה - סימולציה: השרת לא מחייב באמת ולא שומר את מספר הכרטיס.
// הבדיקות כאן נועדו לתת משוב מיידי. השרת בודק הכול שוב (Luhn, תוקף, CVV)

export const emptyCard = { holder: '', number: '', expiry: '', cvv: '' };

// כרטיסי בדיקה, כמו בשרת (FakePaymentGateway)
const TEST_CARDS = [
  { label: 'מאושר', number: '4242 4242 4242 4242' },
  { label: 'נדחה', number: '4000 0000 0000 0002' },
  { label: 'אין יתרה', number: '4000 0000 0000 9995' },
];

const digitsOf = (value) => value.replace(/\D/g, '');

// אלגוריתם Luhn - ספרת הביקורת של כרטיס אשראי
function passesLuhn(digits) {
  let sum = 0;
  let doubleIt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (doubleIt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

function cardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^36/.test(digits)) return 'Diners';
  return '';
}

// "4242424242424242" -> "4242 4242 4242 4242"
const formatNumber = (value) => digitsOf(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

// "1228" -> "12/28"
function formatExpiry(value) {
  const digits = digitsOf(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function parseExpiry(expiry) {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  return month >= 1 && month <= 12 ? { month, year } : null;
}

// מחזיר את השגיאות לפי שדה. אובייקט ריק = הכרטיס תקין
export function validateCard(card) {
  const errors = {};
  const digits = digitsOf(card.number);
  if (card.holder.trim().length < 2) errors.holder = 'יש להזין את שם בעל הכרטיס';
  if (digits.length < 12 || !passesLuhn(digits)) errors.number = 'מספר הכרטיס אינו תקין';
  const expiry = parseExpiry(card.expiry);
  const now = new Date();
  if (!expiry) {
    errors.expiry = 'תוקף בפורמט MM/YY';
  } else if (expiry.year < now.getFullYear() || (expiry.year === now.getFullYear() && expiry.month < now.getMonth() + 1)) {
    errors.expiry = 'פג תוקף הכרטיס';
  }
  if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = '3-4 ספרות';
  return errors;
}

// הפורמט שהשרת מצפה לו (PaymentDto)
export function toPaymentDto(card) {
  const expiry = parseExpiry(card.expiry);
  return {
    cardHolder: card.holder.trim(),
    cardNumber: digitsOf(card.number),
    expiryMonth: expiry?.month ?? 0,
    expiryYear: expiry?.year ?? 0,
    cvv: card.cvv,
  };
}

export default function PaymentFields({ card, onChange, touched }) {
  const errors = validateCard(card);
  const set = (name, value) => onChange({ ...card, [name]: value });
  const brand = cardBrand(digitsOf(card.number));
  // שגיאה מוצגת רק אחרי שהשדה מולא, או אחרי ניסיון שליחה
  const show = (name) => (touched || card[name]) && errors[name];

  return (
    <fieldset className="payment">
      <legend>תשלום בכרטיס אשראי</legend>

      <div className="payment-note">
        <strong>סימולציה בלבד</strong> - לא מתבצע חיוב אמיתי. אין להזין כרטיס אמיתי. כרטיסי בדיקה:
        <div className="test-cards">
          {TEST_CARDS.map((t) => (
            <button key={t.number} type="button" className="chip"
              onClick={() => onChange({ holder: card.holder || 'ישראל ישראלי', number: t.number, expiry: '12/30', cvv: '123' })}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>שם בעל הכרטיס</span>
        <input value={card.holder} onChange={(e) => set('holder', e.target.value)} maxLength={60} autoComplete="off" />
        {show('holder') && <small className="field-error">{errors.holder}</small>}
      </label>

      <label className="field">
        <span>מספר כרטיס {brand && <em className="card-brand">{brand}</em>}</span>
        <input dir="ltr" inputMode="numeric" placeholder="0000 0000 0000 0000" autoComplete="off"
          value={card.number} onChange={(e) => set('number', formatNumber(e.target.value))} />
        {show('number') && <small className="field-error">{errors.number}</small>}
      </label>

      <div className="row">
        <label className="field">
          <span>תוקף</span>
          <input dir="ltr" inputMode="numeric" placeholder="MM/YY" autoComplete="off"
            value={card.expiry} onChange={(e) => set('expiry', formatExpiry(e.target.value))} />
          {show('expiry') && <small className="field-error">{errors.expiry}</small>}
        </label>
        <label className="field">
          <span>CVV</span>
          <input dir="ltr" inputMode="numeric" type="password" placeholder="123" autoComplete="off" maxLength={4}
            value={card.cvv} onChange={(e) => set('cvv', digitsOf(e.target.value))} />
          {show('cvv') && <small className="field-error">{errors.cvv}</small>}
        </label>
      </div>
    </fieldset>
  );
}
