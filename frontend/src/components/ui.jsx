export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-moss text-foam hover:bg-sage",
    ghost: "bg-transparent text-moss hover:bg-mist/60",
    outline: "border border-moss/25 text-moss hover:bg-mist/50",
    danger: "bg-rose text-white hover:bg-rose/90",
    amber: "bg-amber text-white hover:bg-amber/90",
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
    <div className={`rounded-3xl bg-foam/90 p-5 shadow-soft ring-1 ring-moss/5 ${className}`}>{children}</div>
  );
}

export function Input({ label, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">{label}</span>}
      <input
        className="w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5 text-sm outline-none ring-sage/0 transition focus:ring-2 focus:ring-sage/30"
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-moss/70">{label}</span>}
      <textarea
        className="w-full rounded-2xl border border-moss/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage/30"
        {...props}
      />
    </label>
  );
}

export function Badge({ children, tone = "sage" }) {
  const map = {
    sage: "bg-mist text-moss",
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    sand: "bg-sand text-ink/70",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[tone] || map.sage}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-mist/70 ${className}`} />;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-foam p-6 shadow-soft">
        <h3 className="font-display text-2xl">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
