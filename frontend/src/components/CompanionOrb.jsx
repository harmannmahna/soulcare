export default function CompanionOrb({ mode = "idle", amplitude = 0 }) {
  const speakScale = 1 + Math.min(0.18, Math.max(0, amplitude) * 0.28);
  const glow = 28 + Math.min(50, Math.max(0, amplitude) * 70);
  return (
    <div className={`companion-orb companion-orb--${mode}`} aria-hidden="true">
      <div
        className="companion-orb__core"
        style={
          mode === "speaking"
            ? {
                transform: `scale(${speakScale})`,
                boxShadow: `0 0 ${glow}px 14px rgba(135, 237, 168, ${0.28 + amplitude * 0.35})`,
              }
            : undefined
        }
      />
    </div>
  );
}
