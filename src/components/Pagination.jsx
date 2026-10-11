// הדפדוף נעשה בשרת: כל מעבר עמוד שולח בקשה חדשה עם page
export default function Pagination({ page, totalPages, totalCount, onChange }) {
  if (!totalPages || totalPages <= 1) {
    return totalCount ? <p className="pagination-summary">{totalCount} תוצאות</p> : null;
  }

  return (
    <div className="pagination">
      <button className="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        → הקודם
      </button>
      <div className="pages">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} className={p === page ? 'page active' : 'page'} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
      </div>
      <button className="ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        הבא ←
      </button>
    </div>
  );
}
