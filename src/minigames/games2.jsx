import { useMemo, useRef, useState, useEffect } from "react";
import { rng, ri, rpick, rshuffle, useFinish, useScore, useClock, useFrame, TimeBar, vib } from "./kit.jsx";

const stop = (e) => { if (e.cancelable) e.preventDefault(); };
const FRUITS = ["🍎", "⭐", "🐟", "🎈", "🍄", "🐝", "🌸", "🍪"];

/* 6. Compte-les ! */
export function Count({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [stage, setStage] = useState("show"), [fb, setFb] = useState(0);
  const askedAt = useRef(0);
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const Q = useMemo(() => {
    const r = rng(seed + q * 53), n = ri(r, 4, 12), e = rpick(r, FRUITS);
    const dots = Array.from({ length: n }, () => ({ x: ri(r, 8, 86), y: ri(r, 6, 82), s: ri(r, 24, 38) }));
    const opts = new Set([n]);
    while (opts.size < 4) { const o = n + ri(r, -3, 3); if (o > 0) opts.add(o); }
    return { n, e, dots, opts: rshuffle(r, [...opts]) };
  }, [seed, q]);
  useEffect(() => {
    if (stage !== "show") return;
    const t = setTimeout(() => { askedAt.current = performance.now(); setStage("ask"); }, 1500);
    return () => clearTimeout(t);
  }, [stage, q]);
  const pick = (o) => (e) => {
    stop(e);
    if (stage !== "ask") return;
    const ok = o === Q.n;
    if (ok) sc.add(100 + Math.max(0, 50 - Math.floor((performance.now() - askedAt.current) / 100)));
    setFb(ok ? 1 : -1); setStage("fb"); vib(ok ? 8 : [40, 30]);
    setTimeout(() => { if (q >= 5) return finish(sc.ref.current); setFb(0); setQ(q + 1); setStage("show"); }, 600);
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Question {q + 1} / 6 · {sc.val} pts</div>
      <div className="mgarena small">
        {stage === "show" ? Q.dots.map((d, i) => <span key={i} className="mgemoji" style={{ left: `${d.x}%`, top: `${d.y}%`, fontSize: d.s }}>{Q.e}</span>)
          : <div className="mgsay big">{stage === "ask" ? "Combien ?" : fb > 0 ? `Oui : ${Q.n} !` : `C'était ${Q.n}`}</div>}
      </div>
      <div className="mgopts">
        {Q.opts.map((o) => <button key={o} className="mgopt" data-testid="mg-opt" data-ok={o === Q.n ? "1" : "0"} disabled={stage !== "ask"} onPointerDown={pick(o)}>{o}</button>)}
      </div>
    </div>
  );
}

/* 7. Calcul mental */
export function Maths({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [flash, setFlash] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const Q = useMemo(() => {
    const r = rng(seed + q * 41), k = ri(r, 0, 2);
    let a = ri(r, 3, 29), b = ri(r, 2, 19), res, txt;
    if (k === 0) { res = a + b; txt = `${a} + ${b}`; }
    else if (k === 1) { if (b > a) [a, b] = [b, a]; res = a - b; txt = `${a} − ${b}`; }
    else { a = ri(r, 2, 9); b = ri(r, 3, 9); res = a * b; txt = `${a} × ${b}`; }
    const opts = new Set([res]);
    while (opts.size < 4) { const o = res + rpick(r, [-10, -2, -1, 1, 2, 10, 3, -3]); if (o >= 0) opts.add(o); }
    return { txt, res, opts: rshuffle(r, [...opts]) };
  }, [seed, q]);
  const pick = (o) => (e) => {
    stop(e);
    const ok = o === Q.res;
    sc.set(Math.max(0, sc.ref.current + (ok ? 10 : -5)));
    setFlash(ok ? "ok" : "ko"); vib(ok ? 6 : [40, 30]);
    setTimeout(() => setFlash(""), 250);
    setQ(q + 1);
  };
  return (
    <div className={"mg flash-" + flash}>
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgsay big" data-testid="mg-q">{Q.txt} = ?</div>
      <div className="mgopts">{Q.opts.map((o) => <button key={q + ":" + o} className="mgopt" data-testid="mg-opt" data-ok={o === Q.res ? "1" : "0"} onPointerDown={pick(o)}>{o}</button>)}</div>
    </div>
  );
}

/* 8. Couleur ou mot ? */
const INKS = [["ROUGE", "#e0203a"], ["BLEU", "#2f8bff"], ["VERT", "#1fa855"], ["JAUNE", "#e0a800"]];
export function Stroop({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [flash, setFlash] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const Q = useMemo(() => { const r = rng(seed + q * 29), ink = ri(r, 0, 3); let w = ri(r, 0, 3); if (r() < 0.8 && w === ink) w = (w + ri(r, 1, 3)) % 4; return { ink, w }; }, [seed, q]);
  const pick = (i) => (e) => {
    stop(e);
    const ok = i === Q.ink;
    sc.set(Math.max(0, sc.ref.current + (ok ? 1 : -1)));
    setFlash(ok ? "ok" : "ko"); vib(ok ? 6 : [40, 30]); setTimeout(() => setFlash(""), 200);
    setQ(q + 1);
  };
  return (
    <div className={"mg flash-" + flash}>
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgsay big stroop" data-testid="mg-word" style={{ color: INKS[Q.ink][1] }}>{INKS[Q.w][0]}</div>
      <div className="mgopts">{INKS.map(([n], i) => <button key={n} className="mgopt" data-testid="mg-opt" data-ok={i === Q.ink ? "1" : "0"} onPointerDown={pick(i)}>{n}</button>)}</div>
    </div>
  );
}

/* 19. Le plus grand */
export function Bigger({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [flash, setFlash] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const Q = useMemo(() => {
    const r = rng(seed + q * 17), cards = [], seen = new Set();
    while (cards.length < 3) {
      const k = ri(r, 0, 2); let a, b, v, t;
      if (k === 0) { a = ri(r, 4, 9); b = ri(r, 4, 12); v = a * b; t = `${a} × ${b}`; }
      else if (k === 1) { a = ri(r, 20, 60); b = ri(r, 10, 40); v = a + b; t = `${a} + ${b}`; }
      else { a = ri(r, 50, 99); b = ri(r, 5, 40); v = a - b; t = `${a} − ${b}`; }
      if (!seen.has(v)) { seen.add(v); cards.push({ t, v }); }
    }
    return { cards, best: Math.max(...cards.map((c) => c.v)) };
  }, [seed, q]);
  const pick = (c) => (e) => {
    stop(e);
    const ok = c.v === Q.best;
    sc.set(Math.max(0, sc.ref.current + (ok ? 1 : -1)));
    setFlash(ok ? "ok" : "ko"); vib(ok ? 6 : [40, 30]); setTimeout(() => setFlash(""), 200);
    setQ(q + 1);
  };
  return (
    <div className={"mg flash-" + flash}>
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgopts col">{Q.cards.map((c) => <button key={q + c.t} className="mgopt wide" data-testid="mg-opt" data-ok={c.v === Q.best ? "1" : "0"} onPointerDown={pick(c)}>{c.t}</button>)}</div>
    </div>
  );
}

/* 20. Flèches */
const ARR = ["↑", "→", "↓", "←"];
export function Arrows({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [flash, setFlash] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const Q = useMemo(() => { const r = rng(seed + q * 13), d = ri(r, 0, 3), inv = r() < 0.3; return { d, inv, ans: inv ? (d + 2) % 4 : d }; }, [seed, q]);
  const pick = (i) => (e) => {
    stop(e);
    const ok = i === Q.ans;
    sc.set(Math.max(0, sc.ref.current + (ok ? 1 : -1)));
    setFlash(ok ? "ok" : "ko"); vib(ok ? 6 : [40, 30]); setTimeout(() => setFlash(""), 200);
    setQ(q + 1);
  };
  const btn = (i, cls) => <button className={"mgdir " + cls} data-testid="mg-dir" data-ok={i === Q.ans ? "1" : "0"} onPointerDown={pick(i)} aria-label={["haut", "droite", "bas", "gauche"][i]}>{ARR[i]}</button>;
  return (
    <div className={"mg flash-" + flash}>
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgsay big" data-testid="mg-arrow"><span className="mgarr">{ARR[Q.d]}</span>{Q.inv && <small className="mginv">INVERSE</small>}</div>
      <div className="mgdpad">{btn(0, "u")}{btn(3, "l")}{btn(1, "r")}{btn(2, "d")}</div>
    </div>
  );
}

/* 21. Pierre-feuille-ciseaux */
const RPS = ["🪨", "📄", "✂️"];
export function Beat({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const [q, setQ] = useState(0), [flash, setFlash] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const shown = useMemo(() => ri(rng(seed + q * 11), 0, 2), [seed, q]);
  const win = (shown + 1) % 3;
  const pick = (i) => (e) => {
    stop(e);
    const ok = i === win;
    sc.set(Math.max(0, sc.ref.current + (ok ? 1 : -1)));
    setFlash(ok ? "ok" : "ko"); vib(ok ? 6 : [40, 30]); setTimeout(() => setFlash(""), 200);
    setQ(q + 1);
  };
  return (
    <div className={"mg flash-" + flash}>
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgsub">La machine joue…</div>
      <div className="mgsay huge" data-testid="mg-shown">{RPS[shown]}</div>
      <div className="mgopts three">{RPS.map((e, i) => <button key={i} className="mgopt" data-testid="mg-opt" data-ok={i === win ? "1" : "0"} onPointerDown={pick(i)}>{e}</button>)}</div>
    </div>
  );
}

/* 22. Rythme */
export function Rhythm({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const A = 1100;
  const beats = useMemo(() => { const r = rng(seed), out = []; let t = 1500; while (t < seconds * 1000 - 700) { out.push({ id: out.length, t, done: false }); t += ri(r, 850, 1150); } return out; }, [seed, seconds]);
  const t0 = useRef(performance.now()), res = useRef({});
  const [now, setNow] = useState(0), [fb, setFb] = useState("");
  const clock = useClock(seconds, () => finish(sc.ref.current));
  useFrame(() => {
    const n = performance.now() - t0.current;
    setNow(n);
    for (const b of beats) if (!res.current[b.id] && n > b.t + 320) res.current[b.id] = "miss";
  });
  const tap = (e) => {
    stop(e);
    const n = performance.now() - t0.current;
    let best = null;
    for (const b of beats) if (!res.current[b.id] && Math.abs(n - b.t) < 380 && (!best || Math.abs(n - b.t) < Math.abs(n - best.t))) best = b;
    if (!best) return setFb("…");
    const d = Math.abs(n - best.t), p = d < 90 ? 3 : d < 180 ? 2 : d < 300 ? 1 : 0;
    res.current[best.id] = "hit";
    sc.add(p); setFb(p === 3 ? "Parfait !" : p === 2 ? "Bien" : p === 1 ? "Ok" : "Raté"); vib(8);
  };
  const live = beats.filter((b) => !res.current[b.id] && now >= b.t - A && now <= b.t + 320);
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgsay">{fb || " "}</div>
      <button className="mgrhythm" data-testid="mg-rhythm" onPointerDown={tap} aria-label="Touche au bon moment">
        <i className="ring" />
        {live.map((b) => <i key={b.id} className="appr" style={{ transform: `translate(-50%,-50%) scale(${1 + 2.2 * Math.max(0, (b.t - now) / A)})`, opacity: 0.9 - 0.4 * Math.max(0, (b.t - now) / A) }} />)}
      </button>
    </div>
  );
}
