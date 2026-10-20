import { useEffect, useMemo, useRef } from "react";
import { rng, ri, rpick, useFinish, useScore, useClock, useFrame, TimeBar, vib } from "./kit.jsx";

const W = 320, H = 480;
const stop = (e) => { if (e.cancelable) e.preventDefault(); };
function Cv({ cref, onDown, onMove, label }) {
  const at = (e) => { const r = cref.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }; };
  return <canvas ref={cref} className="mgcv" width={W} height={H} aria-label={label} data-testid="mg-canvas"
    onPointerDown={(e) => { stop(e); onDown && onDown(at(e)); }} onPointerMove={(e) => onMove && onMove(at(e))} />;
}
const text = (c, s, x, y, size = 28) => { c.font = `${size}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, x, y); };
const sky = (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#7fd0ff"); g.addColorStop(1, "#d6f1ff"); c.fillStyle = g; c.fillRect(0, 0, W, H); };

/* 10. Rattrape-les */
const GOOD = ["🍎", "🍌", "🍇", "🍓", "🍊"];
export function Catch({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const cv = useRef(null), bx = useRef(W / 2), t0 = useRef(performance.now());
  const items = useMemo(() => { const r = rng(seed), it = []; let t = 400; while (t < seconds * 1000 - 600) { it.push({ t, x: ri(r, 24, W - 24), v: ri(r, 150, 230), bomb: r() < 0.22, e: rpick(r, GOOD), gone: false }); t += ri(r, 420, 720); } return it; }, [seed, seconds]);
  useFrame(() => {
    const c = cv.current && cv.current.getContext("2d");
    if (!c) return;
    const now = performance.now() - t0.current;
    sky(c);
    for (const it of items) {
      if (it.gone || now < it.t) continue;
      const y = ((now - it.t) / 1000) * it.v - 20;
      if (y > H + 20) { it.gone = true; continue; }
      if (y > 400 && y < 450 && Math.abs(it.x - bx.current) < 38) { it.gone = true; sc.add(it.bomb ? -3 : 1); vib(it.bomb ? [40, 30] : 6); continue; }
      text(c, it.bomb ? "💣" : it.e, it.x, y);
    }
    text(c, "🧺", bx.current, 436, 44);
  });
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{Math.max(0, sc.val)}</div>
      <Cv cref={cv} label="Zone de jeu : glisse le panier" onDown={(p) => { bx.current = p.x; }} onMove={(p) => { bx.current = Math.max(24, Math.min(W - 24, p.x)); }} />
    </div>
  );
}

/* 11. Esquive */
export function Dodge({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const cv = useRef(null), lane = useRef(1), t0 = useRef(performance.now()), alive = useRef(true);
  const score = useRef(0);
  const clock = useClock(seconds, () => finish(score.current));
  const obs = useMemo(() => {
    const r = rng(seed), out = [];
    let t = 900;
    while (t < seconds * 1000 + 2000) {
      const free = ri(r, 0, 2), two = r() < 0.55;
      const lanes = [0, 1, 2].filter((l) => l !== free && (two || l === ri(r, 0, 2)));
      out.push({ t, lanes: lanes.length ? lanes : [(free + 1) % 3] });
      t += Math.max(520, 1100 - out.length * 18);
    }
    return out;
  }, [seed, seconds]);
  useFrame(() => {
    const c = cv.current && cv.current.getContext("2d");
    if (!c || !alive.current) return;
    const now = performance.now() - t0.current;
    score.current = Math.floor(now / 100);
    sky(c);
    c.fillStyle = "rgba(29,36,87,.18)"; c.fillRect(W / 3 - 1, 0, 2, H); c.fillRect((2 * W) / 3 - 1, 0, 2, H);
    const v = 230 + now * 0.012 * 10;
    for (const o of obs) {
      const y = ((now - o.t) / 1000) * v - 30;
      if (y < -40 || y > H + 40) continue;
      for (const l of o.lanes) {
        text(c, "🚧", (l + 0.5) * (W / 3), y, 40);
        if (y > 392 && y < 452 && l === lane.current) { alive.current = false; vib([60, 40, 60]); return finish(score.current); }
      }
    }
    text(c, "🚗", (lane.current + 0.5) * (W / 3), 424, 42);
  });
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Gauche / droite de l'écran pour changer de voie</div>
      <Cv cref={cv} label="Zone de jeu" onDown={(p) => { lane.current = Math.max(0, Math.min(2, lane.current + (p.x < W / 2 ? -1 : 1))); vib(5); }} />
    </div>
  );
}

/* 16. Envol */
export function Flap({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const cv = useRef(null), st = useRef({ y: 220, vy: 0, t: performance.now(), over: false });
  const pipes = useMemo(() => { const r = rng(seed); return Array.from({ length: 60 }, (_, i) => ({ x: 360 + i * 190, gap: ri(r, 150, 320), passed: false })); }, [seed]);
  useFrame((dt) => {
    const c = cv.current && cv.current.getContext("2d"), s = st.current;
    if (!c || s.over) return;
    const el = (performance.now() - s.t) / 1000;
    s.vy += 900 * dt; s.y += s.vy * dt;
    const off = el * 140;
    sky(c);
    const GAP = 128;
    for (const p of pipes) {
      const x = p.x - off;
      if (x < -60 || x > W + 10) continue;
      c.fillStyle = "#35d06a"; c.strokeStyle = "#1d2457"; c.lineWidth = 3;
      c.fillRect(x, 0, 50, p.gap - GAP / 2); c.strokeRect(x, 0, 50, p.gap - GAP / 2);
      c.fillRect(x, p.gap + GAP / 2, 50, H); c.strokeRect(x, p.gap + GAP / 2, 50, H);
      if (!p.passed && x + 50 < 80) { p.passed = true; sc.add(1); }
      if (80 + 14 > x && 80 - 14 < x + 50 && (s.y - 14 < p.gap - GAP / 2 || s.y + 14 > p.gap + GAP / 2)) { s.over = true; vib([60, 40, 60]); return finish(sc.ref.current); }
    }
    if (s.y < 0 || s.y > H) { s.over = true; return finish(sc.ref.current); }
    text(c, "🐤", 80, s.y, 34);
  });
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Cv cref={cv} label="Zone de jeu : touche pour voler" onDown={() => { st.current.vy = -310; vib(4); }} />
    </div>
  );
}

/* 17. Saute-obstacles */
export function Runner({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const cv = useRef(null), st = useRef({ y: 0, vy: 0, x: 0, over: false });
  const obs = useMemo(() => { const r = rng(seed); let x = 420; return Array.from({ length: 80 }, () => { const o = { x, w: ri(r, 24, 40), h: ri(r, 30, 58), passed: false }; x += ri(r, 220, 360); return o; }); }, [seed]);
  useFrame((dt) => {
    const c = cv.current && cv.current.getContext("2d"), s = st.current;
    if (!c || s.over) return;
    const speed = 230 + sc.ref.current * 7;
    s.x += speed * dt;
    s.vy += 1700 * dt; s.y += s.vy * dt;
    if (s.y > 0) { s.y = 0; s.vy = 0; }
    sky(c);
    c.fillStyle = "#6bd36b"; c.fillRect(0, 400, W, H - 400); c.strokeStyle = "#1d2457"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 400); c.lineTo(W, 400); c.stroke();
    for (const o of obs) {
      const x = o.x - s.x;
      if (x < -60 || x > W + 10) continue;
      c.fillStyle = "#8a5a2b"; c.fillRect(x, 400 - o.h, o.w, o.h); c.strokeRect(x, 400 - o.h, o.w, o.h);
      if (!o.passed && x + o.w < 60) { o.passed = true; sc.add(1); }
      if (60 + 12 > x && 60 - 12 < x + o.w && 400 + s.y > 400 - o.h - 4) { s.over = true; vib([60, 40, 60]); return finish(sc.ref.current); }
    }
    text(c, "🏃", 60, 384 + s.y, 40);
  });
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <Cv cref={cv} label="Zone de jeu : touche pour sauter" onDown={() => { const s = st.current; if (s.y >= -1) { s.vy = -640; vib(5); } }} />
    </div>
  );
}
