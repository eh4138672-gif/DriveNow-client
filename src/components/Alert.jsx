const ICONS = { success: '✓', conflict: '!', error: '×', info: 'i' };

// conflict (409) מוצג בנפרד משגיאה רגילה, כדי שיהיה ברור שהמשאב נתפס
export default function Alert({ type, title, children, onClose }) {
  if (!children && !title) return null;

  return (
    <div className={`alert alert-${type}`} role="alert">
      <span className="alert-icon">{ICONS[type]}</span>
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="סגירה">
          ×
        </button>
      )}
    </div>
  );
}
