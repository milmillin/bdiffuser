import { useEffect, useMemo, useState } from "react";
import { playExplosionBoom } from "../../audio/audio.js";

/** Seeded random so particle layout is stable across renders */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  type: "spark" | "ember" | "debris";
}

const SPARK_COLORS = ["#ff4500", "#ff6b35", "#ffa500", "#ffd700", "#fff176", "#ffffff"];
const EMBER_COLORS = ["#ff4500", "#ff6b35", "#e53e3e", "#dd2c00", "#bf360c"];

export function ExplosionEffect() {
  const [phase, setPhase] = useState<"flash" | "explode" | "settle">("flash");

  useEffect(() => {
    playExplosionBoom();
    const t1 = setTimeout(() => setPhase("explode"), 150);
    const t2 = setTimeout(() => setPhase("settle"), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const particles = useMemo(() => {
    const rand = seededRandom(42);
    const result: Particle[] = [];

    // Sparks — fast, bright, fly far
    for (let i = 0; i < 40; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 80 + rand() * 180,
        size: 2 + rand() * 4,
        duration: 0.6 + rand() * 0.8,
        delay: rand() * 0.15,
        color: SPARK_COLORS[Math.floor(rand() * SPARK_COLORS.length)],
        type: "spark",
      });
    }

    // Embers — slower, drift upward
    for (let i = 40; i < 64; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 40 + rand() * 100,
        size: 3 + rand() * 5,
        duration: 1.5 + rand() * 2,
        delay: 0.3 + rand() * 0.5,
        color: EMBER_COLORS[Math.floor(rand() * EMBER_COLORS.length)],
        type: "ember",
      });
    }

    // Debris — chunky, tumble outward
    for (let i = 64; i < 78; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 60 + rand() * 140,
        size: 4 + rand() * 8,
        duration: 0.8 + rand() * 0.6,
        delay: rand() * 0.1,
        color: "#444",
        type: "debris",
      });
    }

    return result;
  }, []);

  return (
    <div className="explosion-container">
      {/* Full-screen white flash */}
      <div className={`explosion-flash ${phase === "flash" ? "active" : ""}`} />

      {/* Screen shake wrapper */}
      <div className={phase === "explode" ? "screen-shake" : ""}>
        {/* SVG explosion core */}
        <div className="explosion-center">
          <svg viewBox="-200 -200 400 400" className="explosion-svg">
            <defs>
              {/* Fireball gradient */}
              <radialGradient id="fireball-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff">
                  <animate attributeName="stop-color" values="#ffffff;#fff9c4;#ffcc02" dur="1.2s" fill="freeze" />
                </stop>
                <stop offset="30%" stopColor="#ffd700">
                  <animate attributeName="stop-color" values="#ffd700;#ff9800;#ff6b35" dur="1.2s" fill="freeze" />
                </stop>
                <stop offset="60%" stopColor="#ff6b35">
                  <animate attributeName="stop-color" values="#ff6b35;#e53e3e;#b71c1c" dur="1.2s" fill="freeze" />
                </stop>
                <stop offset="100%" stopColor="#e53e3e" stopOpacity="0">
                  <animate attributeName="stop-color" values="#e53e3e;#4a0000;#1a0000" dur="1.2s" fill="freeze" />
                </stop>
              </radialGradient>

              {/* Glow filter */}
              <filter id="explosion-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Turbulence for organic feel */}
              <filter id="turbulence">
                <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" result="turb">
                  <animate attributeName="baseFrequency" values="0.03;0.06;0.03" dur="2s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="turb" scale="15" />
              </filter>

              {/* Text gradient */}
              <linearGradient id="boom-text-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#ffd700" />
                <stop offset="50%" stopColor="#ff6b35" />
                <stop offset="75%" stopColor="#e53e3e" />
                <stop offset="100%" stopColor="#b71c1c" />
              </linearGradient>

              {/* Text outline glow */}
              <filter id="text-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Shockwave rings */}
            <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,200,50,0.6)" strokeWidth="3" className="shockwave-ring" style={{ animationDelay: "0s" }} />
            <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,100,50,0.4)" strokeWidth="2" className="shockwave-ring" style={{ animationDelay: "0.15s" }} />
            <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,50,50,0.3)" strokeWidth="1.5" className="shockwave-ring" style={{ animationDelay: "0.3s" }} />

            {/* Fireball core */}
            <circle cx="0" cy="0" r="5" fill="url(#fireball-grad)" filter="url(#explosion-glow)" className="fireball-core" />

            {/* Inner hot core */}
            <circle cx="0" cy="0" r="3" fill="white" opacity="0.9" className="fireball-inner">
              <animate attributeName="r" values="3;40;15;0" dur="1s" fill="freeze" />
              <animate attributeName="opacity" values="0.9;1;0.5;0" dur="1s" fill="freeze" />
            </circle>

            {/* Organic smoke blobs */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={`smoke-${i}`}
                  cx="0"
                  cy="0"
                  r="20"
                  fill={i % 2 === 0 ? "rgba(80,20,0,0.5)" : "rgba(50,50,50,0.4)"}
                  filter="url(#turbulence)"
                  className="smoke-blob"
                  style={{
                    "--smoke-tx": `${Math.cos(rad) * 80}px`,
                    "--smoke-ty": `${Math.sin(rad) * 80}px`,
                    animationDelay: `${i * 0.08}s`,
                  } as React.CSSProperties}
                />
              );
            })}

            {/* BOOM text */}
            <text
              x="0"
              y="12"
              textAnchor="middle"
              className="boom-text"
              fill="url(#boom-text-grad)"
              stroke="#b71c1c"
              strokeWidth="1.5"
              filter="url(#text-glow)"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="72"
            >
              BOOM!
            </text>
          </svg>
        </div>

        {/* CSS particle system */}
        <div className="particle-field">
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            const driftY = p.type === "ember" ? -60 : 0;

            return (
              <div
                key={p.id}
                className={`particle particle-${p.type}`}
                style={{
                  "--tx": `${tx}px`,
                  "--ty": `${ty + driftY}px`,
                  "--size": `${p.size}px`,
                  "--duration": `${p.duration}s`,
                  "--delay": `${p.delay}s`,
                  "--color": p.color,
                  "--spin": `${p.type === "debris" ? 720 : 0}deg`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>

        {/* Floating embers (persistent) */}
        {phase === "settle" && (
          <div className="rising-embers">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="rising-ember"
                style={{
                  left: `${15 + (i * 70) % 70}%`,
                  animationDelay: `${(i * 0.3) % 2}s`,
                  animationDuration: `${2 + (i % 3)}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
