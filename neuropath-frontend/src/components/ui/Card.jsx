
export function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs text-slate-800 transition-all ui-card ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ as: Component = "header", className = "", children, ...props }) {
  return (
    <Component
      className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ui-card-header ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardBody({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component className={`p-5 ui-card-body ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function CardFooter({ as: Component = "footer", className = "", children, ...props }) {
  return (
    <Component
      className={`px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-3 ui-card-footer ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}


Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
