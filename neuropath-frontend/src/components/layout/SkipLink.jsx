export default function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
  className = "",
}) {
  const defaultClasses =
    "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:ring-2 focus:ring-blue-400 focus:outline-none";

  return (
    <a
      href={`#${targetId}`}
      className={`${defaultClasses} ${className}`.trim()}
    >
      {children}
    </a>
  );
}
