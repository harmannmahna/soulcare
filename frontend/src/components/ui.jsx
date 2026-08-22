export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-moss text-sand hover:bg-pale",
    ghost: "bg-transparent text-sage hover:bg-mist",
    outline: "border border-white/15 text-ink hover:border-sage/50 hover:bg-mist",
    danger: "bg-rose text-sand hover:bg-rose/90",
    amber: "bg-amber text-sand hover:bg-amber/90",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${styles[variant]} disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-foam p-5 shadow-soft ring-1 ring-white/5 ${className}`}>{children}</div>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-sage/80">{label}</span>}
      <input className={`field ${className}`} {...props} />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-sage/80">{label}</span>}
      <textarea className={`field ${className}`} {...props} />
    </label>
  );
}

export function Badge({ children, tone = "sage" }) {
  const map = {
    sage: "bg-mist text-sage",
    green: "bg-leaf/25 text-sage",
    yellow: "bg-amber/15 text-amber",
    red: "bg-rose/15 text-rose",
    sand: "bg-sand text-ink/70",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[tone] || map.sage}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-mist ${className}`} />;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sand/70 p-4 sm:items-center">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-foam p-6 shadow-soft ring-1 ring-white/10">
        <h3 className="font-display text-2xl">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
