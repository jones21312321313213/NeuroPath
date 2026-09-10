import React from "react";

const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus-visible:ring-blue-500",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 focus-visible:ring-slate-400 border border-slate-200",
  outline: "bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 focus-visible:ring-slate-400",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus-visible:ring-red-500",
};

const sizeClasses = {
  sm: "text-xs px-2.5 py-1.5 rounded-md gap-1.5",
  md: "text-sm px-4 py-2 rounded-lg gap-2",
  lg: "text-base px-5 py-2.5 rounded-xl gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon = null,
  className = "",
  children,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  const variantStyle = variantClasses[variant] || variantClasses.primary;
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantStyle} ${sizeStyle} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
