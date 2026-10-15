// אותה נוסחה כמו בשרת (RentalPricing): לכל רכב מחיר לשעה בשקלים שלמים, כל שעה שהתחילה
// מחויבת כשעה מלאה, והשכרה של יותר מ-48 שעות מקבלת 10% הנחה על המחיר לשעה (מעוגל לשקל שלם).
// השרת הוא שקובע את המחיר הסופי - כאן זה רק להצגה לפני ההזמנה
export const DISCOUNT_AFTER_HOURS = 48;
export const LONG_RENTAL_DISCOUNT = 0.1;

export const billableHours = (hours) => Math.max(1, Math.ceil(hours));

export const hasLongRentalDiscount = (hours) => hours > DISCOUNT_AFTER_HOURS;

export function quote(pricePerHour, hours) {
  const billable = billableHours(hours);
  const discounted = hasLongRentalDiscount(hours);
  const rate = discounted ? Math.round(pricePerHour * (1 - LONG_RENTAL_DISCOUNT)) : pricePerHour;
  return {
    billable,
    discounted,
    rate,
    fullPrice: billable * pricePerHour,
    total: billable * rate,
  };
}

// ₪1,250 - שקלים שלמים עם מפריד אלפים
export const formatShekels = (amount) => `₪${amount.toLocaleString('he-IL')}`;
