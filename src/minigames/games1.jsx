import { useEffect, useMemo, useRef, useState } from "react";
import { rng, ri, rshuffle, useFinish, useScore, useClock, useFrame, TimeBar, vib } from "./kit.jsx";

const stop = (e) => { if (e.cancelable) e.preventDefault(); };

/* 1. Tape-tape */
export function Tap({ seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore" aria-live="off">{sc.val}</div>
      <button className="mgbig" data-testid="mg-tap" onPointerDown={(e) => { stop(e); sc.add(1); vib(6); }}>TAP !</button>
    </div>
  );
}

/* 2. Réflexe */
export function Reflex({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const sum = useRef(0), k = useRef(0), goAt = useRef(0);
  const [st, setSt] = useState({ stage: "wait", msg: "Attends le vert…" });
  const delays = useMemo(() => { const r = rng(seed); return [ri(r, 1200, 3200), ri(r, 1200, 3200), ri(r, 1200, 3200)]; }, [seed]);
  const clock = useClock(seconds, () => finish(sum.current));
  useEffect(() => {
    if (st.stage !== "wait") return;
    const t = setTimeout(() => { goAt.current = performance.now(); setSt({ stage: "go", msg: "TOUCHE !" }); }, delays[k.current]);
    return () => clearTimeout(t);
  }, [st.stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = (msg, add) => {
    sum.current += add;
    setSt({ stage: "show", msg });
    setTimeout(() => { k.current += 1; if (k.current >= 3) finish(sum.current); else setSt({ stage: "wait", msg: "Attends le vert…" }); }, 900);
  };
  const tap = (e) => {
    stop(e);
    if (st.stage === "wait") settle("Trop tôt !", 0);
    else if (st.stage === "go") { const ms = Math.round(performance.now() - goAt.current); settle(`${ms} ms`, Math.max(0, 1000 - ms)); }
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Essai {Math.min(3, k.current + 1)} / 3</div>
      <button className={"mgpad reflex " + st.stage} data-testid="mg-reflex" data-stage={st.stage} onPointerDown={tap}>{st.msg}</button>
    </div>
  );
}

/* 3. Taupes */
export function Moles({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const events = useMemo(() => {
    const r = rng(seed), ev = [];
    let t = 500, id = 0;
    while (t < seconds * 1000 - 800) { ev.push({ id: id++, t, hole: ri(r, 0, 8), bomb: r() < 0.2, life: ri(r, 750, 1100) }); t += ri(r, 320, 620); }
    return ev;
  }, [seed, seconds]);
  const [up, setUp] = useState({});
  useEffect(() => {
    const timers = [];
    events.forEach((e) => {
      timers.push(setTimeout(() => setUp((u) => ({ ...u, [e.hole]: e })), e.t));
      timers.push(setTimeout(() => setUp((u) => { if (!u[e.hole] || u[e.hole].id !== e.id) return u; const n = { ...u }; delete n[e.hole]; return n; }), e.t + e.life));
    });
    return () => timers.forEach(clearTimeout);
  }, [events]);
  const hit = (h) => (e) => {
    stop(e);
    const m = up[h];
    if (!m) return;
    setUp((u) => { const n = { ...u }; delete n[h]; return n; });
    sc.add(m.bomb ? -1 : 1); vib(m.bomb ? [30, 30] : 8);
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{Math.max(0, sc.val)}</div>
      <div className="mggrid g3">
        {Array.from({ length: 9 }, (_, h) => (
          <button key={h} className={"mghole" + (up[h] ? " up" : "")} data-testid={"mg-hole-" + h} data-kind={up[h] ? (up[h].bomb ? "bomb" : "mole") : ""} onPointerDown={hit(h)} aria-label={up[h] ? (up[h].bomb ? "bombe" : "taupe") : "trou vide"}>
            <span>{up[h] ? (up[h].bomb ? "💣" : "🐹") : ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* 4. Simon */
const PADS = ["#ff4d6a", "#4aa8ff", "#ffd23f", "#4fd983"];
export function Simon({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const seq = useMemo(() => { const r = rng(seed); return Array.from({ length: 80 }, () => ri(r, 0, 3)); }, [seed]);
  const done = useRef(0), pos = useRef(0);
  const [len, setLen] = useState(1), [mode, setMode] = useState("show"), [lit, setLit] = useState(-1);
  const clock = useClock(seconds, () => finish(done.current));
  useEffect(() => {
    if (mode !== "show") return;
    const timers = [];
    for (let i = 0; i < len; i++) {
      timers.push(setTimeout(() => setLit(seq[i]), 500 + i * 650));
      timers.push(setTimeout(() => setLit(-1), 500 + i * 650 + 430));
    }
    timers.push(setTimeout(() => { pos.current = 0; setMode("input"); }, 500 + len * 650));
    return () => timers.forEach(clearTimeout);
  }, [mode, len, seq]);
  const press = (p) => (e) => {
    stop(e);
    if (mode !== "input") return;
    setLit(p); setTimeout(() => setLit(-1), 160); vib(8);
    if (seq[pos.current] !== p) return finish(done.current);
    pos.current += 1;
    if (pos.current >= len) { done.current = len; setMode("wait"); setTimeout(() => { setLen(len + 1); setMode("show"); }, 650); }
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">{mode === "show" ? "Regarde…" : mode === "input" ? "À toi !" : "Bien !"} · niveau {len}</div>
      <div className="mggrid g2">
        {PADS.map((c, i) => <button key={i} className={"mgsimon" + (lit === i ? " lit" : "")} style={{ "--c": c }} data-testid={"mg-simon-" + i} onPointerDown={press(i)} aria-label={"case " + (i + 1)} />)}
      </div>
    </div>
  );
}

/* 5. Pile au centre */
export function StopBar({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const sum = useRef(0), k = useRef(0), t0 = useRef(performance.now()), frozen = useRef(false);
  const phases = useMemo(() => { const r = rng(seed); return [r() * 6, r() * 6, r() * 6]; }, [seed]);
  const speeds = [2.4, 3.4, 4.6];
  const [pos, setPos] = useState(0.1), [msg, setMsg] = useState("");
  const clock = useClock(seconds, () => finish(sum.current));
  useFrame(() => { if (!frozen.current) setPos(0.5 + 0.5 * Math.sin(phases[k.current] + speeds[k.current] * ((performance.now() - t0.current) / 1000))); });
  const tap = (e) => {
    stop(e);
    if (frozen.current) return;
    frozen.current = true;
    const p = Math.round(100 * Math.max(0, 1 - 2.2 * Math.abs(pos - 0.5)));
    sum.current += p; vib(10);
    setMsg(p >= 90 ? `Parfait ! +${p}` : `+${p}`);
    setTimeout(() => {
      k.current += 1;
      if (k.current >= 3) return finish(sum.current);
      frozen.current = false; t0.current = performance.now(); setMsg("");
    }, 800);
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Essai {Math.min(3, k.current + 1)} / 3 · total {sum.current}</div>
      <div className="mgtrack" aria-hidden="true"><i className="mid" /><b style={{ left: `${pos * 100}%` }} /></div>
      <div className="mgsay">{msg || " "}</div>
      <button className="mgbig" data-testid="mg-stop" onPointerDown={tap}>STOP</button>
    </div>
  );
}

/* 12. Chrono à l'aveugle */
export function HoldTime({ seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const sum = useRef(0), k = useRef(0), t0 = useRef(0);
  const [stage, setStage] = useState("idle"), [shown, setShown] = useState(0), [msg, setMsg] = useState("");
  const clock = useClock(seconds, () => finish(sum.current));
  useFrame(() => { if (stage === "run") setShown((performance.now() - t0.current) / 1000); });
  const press = (e) => {
    stop(e);
    if (stage === "idle") { t0.current = performance.now(); setStage("run"); return; }
    if (stage !== "run") return;
    const ms = performance.now() - t0.current, p = Math.max(0, Math.round(1000 - Math.abs(ms - 5000) * 0.5));
    sum.current += p; vib(10);
    setStage("show"); setMsg(`${(ms / 1000).toFixed(2).replace(".", ",")} s · +${p}`);
    setTimeout(() => { k.current += 1; if (k.current >= 3) return finish(sum.current); setStage("idle"); setMsg(""); }, 1500);
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Essai {Math.min(3, k.current + 1)} / 3 · cible : 5,00 s</div>
      <div className="mgscore">{stage === "run" ? (shown < 1.5 ? shown.toFixed(1).replace(".", ",") : "?") : stage === "show" ? msg : "0,0"}</div>
      <button className="mgbig" data-testid="mg-hold" onPointerDown={press}>{stage === "idle" ? "LANCER" : stage === "run" ? "STOP" : "…"}</button>
    </div>
  );
}

/* 13. L'intrus */
const LOOK = [["🙂", "🙃"], ["😀", "😃"], ["🍎", "🍅"], ["🌕", "🌝"], ["🐶", "🐕"], ["🔵", "🟦"], ["⭐", "🌟"], ["🍋", "🌽"], ["🐱", "🐈"], ["🍩", "🍪"]];
export function Odd({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const [lock, setLock] = useState(false);
  const lv = sc.val;
  const round = useMemo(() => {
    const r = rng(seed + lv * 977), n = Math.min(6, 3 + Math.floor(lv / 2)), pair = LOOK[ri(r, 0, LOOK.length - 1)], flip = r() < 0.5;
    return { n, odd: ri(r, 0, n * n - 1), base: flip ? pair[1] : pair[0], other: flip ? pair[0] : pair[1] };
  }, [seed, lv]);
  const tap = (i) => (e) => {
    stop(e);
    if (lock) return;
    if (i === round.odd) { sc.add(1); vib(8); } else { vib([40, 30]); setLock(true); setTimeout(() => setLock(false), 700); }
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className={"mgodd" + (lock ? " lock" : "")} style={{ "--n": round.n }}>
        {Array.from({ length: round.n * round.n }, (_, i) => <button key={lv + ":" + i} data-testid="mg-odd" data-odd={i === round.odd ? "1" : "0"} onPointerDown={tap(i)}>{i === round.odd ? round.other : round.base}</button>)}
      </div>
    </div>
  );
}

/* 9. Paires */
const BEASTS = ["🐶", "🐱", "🦊", "🐸", "🐵", "🦄", "🐼", "🐙"];
export function Pairs({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const deck = useMemo(() => rshuffle(rng(seed), [...BEASTS, ...BEASTS]), [seed]);
  const t0 = useRef(performance.now()), matchedRef = useRef(0), busy = useRef(false);
  const [open, setOpen] = useState([]), [matched, setMatched] = useState([]);
  const clock = useClock(seconds, () => finish(matchedRef.current * 100));
  const flip = (i) => (e) => {
    stop(e);
    if (busy.current || open.includes(i) || matched.includes(i)) return;
    vib(6);
    const o = [...open, i];
    setOpen(o);
    if (o.length < 2) return;
    busy.current = true;
    setTimeout(() => {
      const [a, b] = o;
      if (deck[a] === deck[b]) {
        const m = [...matched, a, b];
        setMatched(m); matchedRef.current = m.length / 2;
        if (m.length === 16) return finish(1000 + Math.max(0, 2000 - (performance.now() - t0.current) / 30));
      }
      setOpen([]); busy.current = false;
    }, deck[o[0]] === deck[o[1]] ? 250 : 650);
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">{matched.length / 2} / 8 paires</div>
      <div className="mggrid g4">
        {deck.map((c, i) => {
          const on = open.includes(i) || matched.includes(i);
          return <button key={i} className={"mgcard" + (on ? " on" : "") + (matched.includes(i) ? " ok" : "")} data-testid="mg-card" data-v={c} onPointerDown={flip(i)}><span>{on ? c : "?"}</span></button>;
        })}
      </div>
    </div>
  );
}

/* 14. Dans l'ordre */
export function Order({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const nums = useMemo(() => rshuffle(rng(seed), Array.from({ length: 16 }, (_, i) => i + 1)), [seed]);
  const t0 = useRef(performance.now()), nextRef = useRef(1);
  const [next, setNext] = useState(1), [bad, setBad] = useState(0);
  const clock = useClock(seconds, () => finish((nextRef.current - 1) * 50));
  const tap = (n) => (e) => {
    stop(e);
    if (n !== nextRef.current) { setBad(n); vib([30, 30]); setTimeout(() => setBad(0), 300); return; }
    vib(6);
    nextRef.current += 1; setNext(nextRef.current);
    if (nextRef.current > 16) finish(1000 + Math.max(0, 2000 - (performance.now() - t0.current) / 20));
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">Cherche le {Math.min(16, next)}</div>
      <div className="mggrid g4">
        {nums.map((n) => <button key={n} className={"mgnum" + (n < next ? " gone" : "") + (bad === n ? " bad" : "")} data-testid="mg-num" data-n={n} onPointerDown={tap(n)}>{n}</button>)}
      </div>
    </div>
  );
}

/* 15. Cibles */
export function Target({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish), sc = useScore();
  const clock = useClock(seconds, () => finish(sc.ref.current));
  const DUR = 1500;
  const idx = useRef(0), born = useRef(performance.now());
  const [tg, setTg] = useState(() => { const r = rng(seed); return { x: ri(r, 12, 88), y: ri(r, 12, 88) }; });
  const [p, setP] = useState(0);
  const respawn = () => { idx.current += 1; const r = rng(seed * 31 + idx.current); setTg({ x: ri(r, 12, 88), y: ri(r, 12, 88) }); born.current = performance.now(); };
  useFrame(() => { const q = (performance.now() - born.current) / DUR; if (q >= 1) respawn(); else setP(q); });
  const tap = (e) => {
    stop(e);
    const left = 1 - p;
    sc.add(left > 0.66 ? 3 : left > 0.33 ? 2 : 1); vib(8);
    respawn();
  };
  const size = 22 + 70 * (1 - p);
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgscore">{sc.val}</div>
      <div className="mgarena">
        <button className="mgdot" data-testid="mg-target" style={{ left: `${tg.x}%`, top: `${tg.y}%`, width: size, height: size }} onPointerDown={tap} aria-label="cible" />
      </div>
    </div>
  );
}

/* 18. Mémo-grille */
export function MemGrid({ seed, seconds, onFinish }) {
  const finish = useFinish(onFinish);
  const done = useRef(0);
  const [lv, setLv] = useState(1), [mode, setMode] = useState("show"), [found, setFound] = useState([]), [wrong, setWrong] = useState(-1);
  const clock = useClock(seconds, () => finish(done.current));
  const n = lv >= 5 ? 4 : 3;
  const cells = useMemo(() => rshuffle(rng(seed + lv * 131), Array.from({ length: n * n }, (_, i) => i)).slice(0, Math.min(n * n - 2, lv + 2)), [seed, lv, n]);
  useEffect(() => {
    if (mode !== "show") return;
    const t = setTimeout(() => setMode("input"), 700 + lv * 250);
    return () => clearTimeout(t);
  }, [mode, lv]);
  const tap = (i) => (e) => {
    stop(e);
    if (mode !== "input" || found.includes(i)) return;
    if (!cells.includes(i)) { setWrong(i); vib([40, 30]); return setTimeout(() => finish(done.current), 450); }
    vib(6);
    const f = [...found, i];
    setFound(f);
    if (f.length === cells.length) { done.current = lv; setMode("wait"); setTimeout(() => { setFound([]); setLv(lv + 1); setMode("show"); }, 600); }
  };
  return (
    <div className="mg">
      <TimeBar clock={clock} />
      <div className="mgsub">{mode === "show" ? "Retiens !" : "À toi !"} · niveau {lv}</div>
      <div className={"mggrid g" + n}>
        {Array.from({ length: n * n }, (_, i) => (
          <button key={lv + ":" + i} className={"mgcell" + ((mode === "show" && cells.includes(i)) || found.includes(i) ? " on" : "") + (wrong === i ? " bad" : "")} data-testid="mg-cell" data-t={cells.includes(i) ? "1" : "0"} onPointerDown={tap(i)} aria-label={"case " + (i + 1)} />
        ))}
      </div>
    </div>
  );
}
