/* Instant, zero-JS stand-in for the 3D city: a night skyline with twinkling windows,
   a glowing street grid and pulsing pins. Shown immediately (fast first paint) and kept
   on devices where the 3D scene is skipped. Deterministic so server and client match. */

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

type B = { x: number; w: number; h: number };
function skyline(seed: number, count: number, minH: number, maxH: number): B[] {
  const r = rand(seed);
  const out: B[] = [];
  let x = 0;
  for (let i = 0; i < count && x < 1200; i++) {
    const w = 34 + Math.round(r() * 60);
    out.push({ x, w, h: Math.round(minH + r() * (maxH - minH)) });
    x += w + Math.round(r() * 8);
  }
  return out;
}

const BACK = skyline(3, 40, 90, 230);
const FRONT = skyline(11, 40, 60, 170);
const WINDOWS = (() => {
  const r = rand(29);
  const out: { x: number; y: number; d: number; c: string }[] = [];
  for (const b of FRONT)
    for (let wy = 400 - b.h + 14; wy < 392; wy += 16)
      for (let wx = b.x + 7; wx < b.x + b.w - 8; wx += 12) if (r() < 0.22) out.push({ x: wx, y: wy, d: Math.round(r() * 60) / 10, c: r() < 0.8 ? "#ffd27a" : "#7fdcff" });
  return out.slice(0, 260);
})();

// positioned inside the skyline box, hovering over rooftops
const PINS = [
  { l: "16%", t: "34%", c: "#ff7a1a", d: "0s" },
  { l: "37%", t: "18%", c: "#ff2e63", d: "0.7s" },
  { l: "58%", t: "40%", c: "#2ee6a6", d: "1.4s" },
  { l: "77%", t: "14%", c: "#4cc9f0", d: "0.35s" },
  { l: "90%", t: "44%", c: "#ffd23f", d: "1.1s" },
];

export function CityPoster() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_30%,#221d47_0%,#120f24_45%,#0b0b0f_80%)]" />
      <div className="city-stars absolute inset-0 opacity-70" />
      {/* street grid receding into the distance */}
      <div className="absolute inset-x-[-50%] bottom-0 h-[42%] [perspective:420px]">
        <div className="city-grid absolute inset-0 origin-bottom [transform:rotateX(62deg)]" />
      </div>
      {/* on phones the copy sits low, so the skyline rises above it; on wider screens it sits behind */}
      <div className="absolute inset-x-0 bottom-[56%] h-[26%] sm:bottom-[28%] sm:h-[46%]">
      <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cp-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b2752" />
            <stop offset="1" stopColor="#15132a" />
          </linearGradient>
          <linearGradient id="cp-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#35305f" />
            <stop offset="1" stopColor="#1a1830" />
          </linearGradient>
        </defs>
        {BACK.map((b, i) => (
          <rect key={`b${i}`} x={b.x} y={400 - b.h} width={b.w} height={b.h} fill="url(#cp-back)" opacity={0.75} />
        ))}
        {FRONT.map((b, i) => (
          <rect key={`f${i}`} x={b.x} y={400 - b.h} width={b.w} height={b.h} rx={2} fill="url(#cp-front)" />
        ))}
        {WINDOWS.map((w, i) => (
          <rect key={`w${i}`} className="city-window" style={{ animationDelay: `${w.d}s` }} x={w.x} y={w.y} width={5} height={7} rx={1} fill={w.c} />
        ))}
      </svg>
      {PINS.map((p, i) => (
        <span key={i} className="absolute" style={{ left: p.l, top: p.t }}>
          <span className="city-pin" style={{ background: p.c, boxShadow: `0 0 18px 4px ${p.c}`, animationDelay: p.d }} />
        </span>
      ))}
      </div>
      {/* headlights sweeping along the main road */}
      <span className="city-car absolute bottom-[24%] h-[3px] w-16 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
      <span className="city-car city-car-2 absolute bottom-[16%] h-[3px] w-24 rounded-full bg-gradient-to-r from-transparent via-saffron to-transparent" />
    </div>
  );
}
