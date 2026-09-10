import React from "react";

const variantClasses = {
  info: "bg-blue-50 text-blue-700 border-blue-200/60",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 border-amber-200/60",
  purple: "bg-purple-50 text-purple-700 border-purple-200/60",
  danger: "bg-red-50 text-red-700 border-red-200/60",
  neutral: "bg-slate-100 text-slate-700 border-slate-200/60",
};

const sizeClasses = {
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
};

export function Badge({
  variant = "info",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-full border select-none transition-colors";
  const variantStyle = variantClasses[variant] || variantClasses.info;
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`${baseClasses} ${variantStyle} ${sizeStyle} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
