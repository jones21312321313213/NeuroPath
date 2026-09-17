import { LightBulbIcon, CheckIcon, WarningIcon, ErrorIcon } from "./icons";

const variantClasses = {
  info: {
    container: "bg-blue-50/70 border-blue-200 text-blue-900",
    iconColor: "text-blue-600",
    defaultIcon: LightBulbIcon,
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
    iconColor: "text-emerald-600",
    defaultIcon: CheckIcon,
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200 text-amber-900",
    iconColor: "text-amber-600",
    defaultIcon: WarningIcon,
  },
  error: {
    container: "bg-red-50/80 border-red-200 text-red-900",
    iconColor: "text-red-600",
    defaultIcon: ErrorIcon,
  },
};

export function Callout({
  variant = "info",
  icon,
  title,
  action,
  className = "",
  children,
  ...props
}) {
  const config = variantClasses[variant] || variantClasses.info;
  const role = variant === "error" ? "alert" : "region";
  const displayedIcon = icon !== undefined ? icon : config.defaultIcon;

  const renderIcon = () => {
    if (!displayedIcon) return null;
    if (typeof displayedIcon === "function") {
      const IconComponent = displayedIcon;
      return <IconComponent className="w-5 h-5" aria-hidden="true" />;
    }
    return displayedIcon;
  };

  return (
    <aside
      role={role}
      className={`rounded-xl border p-4 flex gap-3 text-sm leading-relaxed transition-colors ${config.container} ${className}`.trim()}
      {...props}
    >
      {displayedIcon && (
        <span className={`shrink-0 flex items-center justify-center select-none mt-0.5 ${config.iconColor}`}>
          {renderIcon()}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold mb-1 text-inherit">{title}</h4>}
        {children && <div className="text-inherit/90">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center ml-2">{action}</div>}
    </aside>
  );
}

export default Callout;
