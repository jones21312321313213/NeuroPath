export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = "",
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  const from = totalItems !== undefined ? (currentPage - 1) * pageSize + 1 : null;
  const to =
    totalItems !== undefined
      ? Math.min(currentPage * pageSize, totalItems)
      : null;

  const pages = [];
  const maxButtons = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-6 border-t border-slate-100 ${className}`.trim()}
    >
      {totalItems !== undefined && (
        <div data-testid="pagination-summary" className="text-xs sm:text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-800">{from}</span> to{" "}
          <span className="font-semibold text-slate-800">{to}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalItems}</span> results
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              aria-label="Page 1"
              className="w-8 h-8 flex items-center justify-center text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-1 text-slate-400 select-none" aria-hidden="true">
                …
              </span>
            )}
          </>
        )}

        {pages.map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={isActive ? "page" : undefined}
              className={`w-8 h-8 flex items-center justify-center text-xs sm:text-sm font-semibold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isActive
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-1 text-slate-400 select-none" aria-hidden="true">
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              aria-label={`Page ${totalPages}`}
              className="w-8 h-8 flex items-center justify-center text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
