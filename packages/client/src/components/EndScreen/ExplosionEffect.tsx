import { useEffect, useMemo } from "react";
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

interface Fragment {
  id: number;
  angle: number;
  distance: number;
  rotation: number;
  size: number;
}

const SPARK_COLORS = ["#ff4500", "#ff6b35", "#ffa500", "#ffd700", "#fff176", "#ffffff"];
const EMBER_COLORS = ["#ff4500", "#ff6b35", "#e53e3e", "#dd2c00", "#bf360c"];

export function ExplosionEffect() {
  useEffect(() => {
    playExplosionBoom();
  }, []);

  const particles = useMemo(() => {
    const rand = seededRandom(42);
    const result: Particle[] = [];

    // Sparks — fast, bright, fly ALL over the screen
    for (let i = 0; i < 50; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 300 + rand() * 700,
        size: 3 + rand() * 7,
        duration: 4,
        delay: 0,
        color: SPARK_COLORS[Math.floor(rand() * SPARK_COLORS.length)],
        type: "spark",
      });
    }

    // Embers — drift upward, big and glowy
    for (let i = 50; i < 80; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 200 + rand() * 500,
        size: 5 + rand() * 10,
        duration: 4,
        delay: 0,
        color: EMBER_COLORS[Math.floor(rand() * EMBER_COLORS.length)],
        type: "ember",
      });
    }

    // Debris — chunky shrapnel flying everywhere
    for (let i = 80; i < 100; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 250 + rand() * 600,
        size: 6 + rand() * 14,
        duration: 4,
        delay: 0,
        color: "#444",
        type: "debris",
      });
    }

    return result;
  }, []);

  const fragments = useMemo(() => {
    const rand = seededRandom(99);
    const result: Fragment[] = [];
    for (let i = 0; i < 16; i++) {
      result.push({
        id: i,
        angle: rand() * 360,
        distance: 150 + rand() * 350,
        rotation: rand() * 1080 - 540,
        size: 10 + rand() * 18,
      });
    }
    return result;
  }, []);

  return (
    <div className="explosion-container">
      <div className="explosion-center">
        <svg viewBox="-300 -300 600 600" className="explosion-svg">
          <defs>
            {/* Bomb body gradient */}
            <radialGradient id="bomb-body-grad" cx="40%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#888" />
              <stop offset="40%" stopColor="#444" />
              <stop offset="100%" stopColor="#111" />
            </radialGradient>

            {/* Fuse cap gradient */}
            <linearGradient id="bomb-cap-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#999" />
              <stop offset="50%" stopColor="#666" />
              <stop offset="100%" stopColor="#444" />
            </linearGradient>

            {/* Spark glow gradient */}
            <radialGradient id="spark-glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#ffd700" />
              <stop offset="60%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#ff4500" stopOpacity="0" />
            </radialGradient>

            {/* Fireball gradient */}
            <radialGradient id="fireball-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#ffd700" />
              <stop offset="55%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#e53e3e" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Spark filter */}
            <filter id="spark-filter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bomb shadow */}
            <filter id="bomb-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.6" />
            </filter>

            {/* Turbulence for smoke */}
            <filter id="turbulence">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="turb">
                <animate attributeName="baseFrequency" values="0.03;0.06;0.03" dur="4s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="turb" scale="18" />
            </filter>
          </defs>

          {/* ── Shockwave rings (invisible until detonation) ── */}
          <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,200,50,0.7)" strokeWidth="5"
            className="shockwave-ring" style={{ animationDelay: "0s" }} />
          <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,100,50,0.5)" strokeWidth="4"
            className="shockwave-ring" style={{ animationDelay: "0.12s" }} />
          <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(255,50,50,0.4)" strokeWidth="3"
            className="shockwave-ring" style={{ animationDelay: "0.24s" }} />

          {/* ── Smoke blobs ── */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <circle
                key={`smoke-${i}`}
                cx="0" cy="0" r="35"
                fill={i % 2 === 0 ? "rgba(80,20,0,0.5)" : "rgba(50,50,50,0.4)"}
                filter="url(#turbulence)"
                className="smoke-blob"
                style={{
                  "--smoke-tx": `${Math.cos(rad) * 180}px`,
                  "--smoke-ty": `${Math.sin(rad) * 180}px`,
                  animationDelay: `${i * 0.05}s`,
                } as React.CSSProperties}
              />
            );
          })}

          {/* ── Fireball ── */}
          <circle cx="0" cy="0" r="0" fill="url(#fireball-grad)" filter="url(#glow)" className="fireball-core" />

          {/* ── Fireball inner (white-hot center) ── */}
          <circle cx="0" cy="0" r="0" fill="white" className="fireball-inner" />

          {/* ── Bomb group (rotated 35 degrees) ── */}
          <g className="bomb-group" filter="url(#bomb-shadow)" transform="rotate(35, 0, 20)">
            {/* Bomb body — HUGE */}
            <circle cx="0" cy="20" r="80" fill="url(#bomb-body-grad)" />

            {/* Specular highlight */}
            <ellipse cx="-24" cy="-2" rx="28" ry="18" fill="rgba(255,255,255,0.15)" />

            {/* Fuse cap */}
            <rect x="-18" y="-62" width="36" height="20" rx="4" fill="url(#bomb-cap-grad)" />

            {/* Fuse line */}
            <path
              d="M 0,-62 Q 22,-90 8,-110 Q -8,-125 0,-140"
              fill="none"
              stroke="#8B4513"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray="95"
              className="fuse-line"
            />

            {/* Spark glow at fuse tip */}
            <circle cx="0" cy="-140" r="12" fill="url(#spark-glow-grad)" filter="url(#spark-filter)" className="spark-glow" />

            {/* Mini sparks flying off */}
            {[0, 72, 144, 216, 288].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={`mini-spark-${i}`}
                  cx={Math.cos(rad) * 6}
                  cy={-140 + Math.sin(rad) * 6}
                  r="2.5"
                  fill="#ffd700"
                  className="mini-spark"
                  style={{
                    "--ms-tx": `${Math.cos(rad) * 22}px`,
                    "--ms-ty": `${Math.sin(rad) * 22}px`,
                    animationDelay: `${i * 0.15}s`,
                  } as React.CSSProperties}
                />
              );
            })}
          </g>

          {/* ── Bomb fragments (more + bigger) ── */}
          {fragments.map((f) => {
            const rad = (f.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * f.distance;
            const ty = Math.sin(rad) * f.distance;
            const halfSize = f.size / 2;
            return (
              <path
                key={`frag-${f.id}`}
                d={`M ${-halfSize},${-halfSize} L ${halfSize},${-halfSize * 0.5} L ${halfSize * 0.7},${halfSize} L ${-halfSize * 0.5},${halfSize * 0.8} Z`}
                fill="#333"
                stroke="#555"
                strokeWidth="0.5"
                className="bomb-fragment"
                style={{
                  "--frag-tx": `${tx}px`,
                  "--frag-ty": `${ty}px`,
                  "--frag-rot": `${f.rotation}deg`,
                  animationDelay: `${f.id * 0.03}s`,
                } as React.CSSProperties}
              />
            );
          })}
        </svg>
      </div>

      {/* ── CSS particle field — particles fly ALL over the screen ── */}
      <div className="particle-field">
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.distance;
          const ty = Math.sin(rad) * p.distance;
          const driftY = p.type === "ember" ? -150 : 0;

          return (
            <div
              key={p.id}
              className={`particle particle-${p.type}`}
              style={{
                "--tx": `${tx}px`,
                "--ty": `${ty + driftY}px`,
                "--size": `${p.size}px`,
                "--color": p.color,
                "--spin": `${p.type === "debris" ? 1080 : 0}deg`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
