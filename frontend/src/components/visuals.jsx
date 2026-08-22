import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

function PulseOrb({ active, risk }) {
  const mesh = useRef();
  const glow = useRef();
  const color = risk === "red" ? "#B55252" : risk === "yellow" ? "#C4922A" : "#5A9E7E";
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speed = active ? 2.6 : 1.15;
    const pulse = 1 + Math.sin(t * speed) * (active ? 0.14 : 0.055);
    if (mesh.current) mesh.current.scale.setScalar(pulse);
    if (glow.current) glow.current.scale.setScalar(pulse * 1.35);
  });
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[2, 2, 3]} intensity={18} color={color} />
      <mesh ref={glow}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} />
      </mesh>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.28} metalness={0.1} />
      </mesh>
    </>
  );
}

export function BreathingOrb({ active = false, risk = "green", className = "h-56" }) {
  return (
    <div className={`relative ${className}`}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <PulseOrb active={active} risk={risk} />
      </Canvas>
    </div>
  );
}

export function Particles({ count = 28 }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: (i % 7) * 0.6,
        size: 3 + (i % 4),
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-sage/25"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animation: `float ${8 + (d.id % 5)}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: .25; }
          50% { transform: translateY(-18px); opacity: .55; }
        }
      `}</style>
    </div>
  );
}
