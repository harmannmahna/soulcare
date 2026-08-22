export default function DashCard({ icon, title, description, onClick, accent = "from-mist to-leaf/30" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full min-h-[160px] flex-col rounded-3xl bg-foam p-5 text-left shadow-soft ring-1 ring-white/5 transition hover:-translate-y-0.5 hover:ring-sage/30"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-2xl`}>
        {icon}
      </div>
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
    </button>
  );
}
