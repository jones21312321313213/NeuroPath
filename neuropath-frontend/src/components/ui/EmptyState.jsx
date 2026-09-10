
export function EmptyState({
  icon = "📭",
  title,
  description,
  action = null,
  className = "",
  ...props
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 my-4 ${className}`.trim()}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-2xl mb-4 select-none">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
