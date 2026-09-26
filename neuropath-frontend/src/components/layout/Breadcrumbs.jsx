import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  if (!items) return null;

  if (typeof items === "string") {
    return <span className="topbar-breadcrumb">{items}</span>;
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="topbar-breadcrumbs">
      <ol className="flex items-center flex-wrap gap-1.5 text-xs sm:text-sm font-medium tracking-wide">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.to || item.label || index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-slate-300 font-normal select-none" aria-hidden="true">
                  /
                </span>
              )}
              {isLast || !item.to ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-sky-900 font-semibold uppercase text-xs tracking-wider" : "text-slate-500"}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="text-slate-500 hover:text-sky-700 uppercase text-xs tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded px-0.5"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
