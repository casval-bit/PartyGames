// L'orbe d'un Portail (invocation) : on la touche, elle se charge en tournant de plus en plus vite, se fissure et éclate ; son
// cœur a la couleur de la meilleure carte tirée (gris : commune, bleu : peu commune, or : rare, violet : épique, orange et
// rayons : légendaire). La 3D (orbWorld.js, three.js chargé à la demande) est dessinée sur une toile qui couvre tout l'écran
// d'ouverture, pour que les éclats volent partout. En attendant la 3D, ou sans WebGL, une orbe en CSS fait la même chose en
// plus simple. Animations réduites : l'orbe ne tourne pas et s'ouvre tout de suite. Toucher pendant l'animation la passe.
import { useEffect, useMemo, useRef, useState } from "react";
import { RARITY } from "../../rules.js";
import { sfx } from "../../../lib/sfx.js";
import { vibrate } from "../../../lib/util.js";
import { DESKTOP } from "../../../lib/device.js";
import { makeOrbStage } from "./orbWorld.js";
import { TIER_HEX } from "./tiers.js";

const CHARGE = { C: 1.05, U: 1.1, R: 1.2, E: 1.35, L: 1.6 }; // secondes : la coquille se fissure
const HOLD = { C: 0.6, U: 0.65, R: 0.8, E: 1.0, L: 1.3 }; // le cœur révélé reste à l'écran
const EXIT = 0.4; // le cœur remplit l'écran, puis les cartes

/** Orbe en CSS : 8 morceaux de coquille autour du centre (bords en zigzag partagés avec les voisins) et leurs fissures. */
function shellCuts() {
  const n = 8, pt = (a, r) => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  const b = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    return { a, mid: pt(a + (Math.random() - 0.5) * 0.5, 22 + Math.random() * 12), edge: pt(a, 50), far: pt(a, 82) };
  });
  const f = ([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  return b.map((s, k) => {
    const e = b[(k + 1) % n], m = (s.a + (k === n - 1 ? e.a + Math.PI * 2 : e.a)) / 2;
    return {
      clip: `polygon(50% 50%, ${f(s.mid)}, ${f(s.far)}, ${f(pt(m, 90))}, ${f(e.far)}, ${f(e.mid)})`,
      crack: `50,50 ${s.mid[0].toFixed(1)},${s.mid[1].toFixed(1)} ${s.edge[0].toFixed(1)},${s.edge[1].toFixed(1)}`,
      dx: `${(Math.cos(m) * 150).toFixed(0)}%`, dy: `${(Math.sin(m) * 150).toFixed(0)}%`, rt: `${((Math.random() - 0.5) * 240).toFixed(0)}deg`,
    };
  });
}

export default function PortalOrb({ color, tier = "C", count = 1, calm = false, onOpen }) {
  const t = TIER_HEX[tier] ? tier : "C";
  const wrap = useRef(null), slot = useRef(null), cvs = useRef(null);
  const st = useRef(null);
  const [mode, setMode] = useState(calm ? "css" : "wait"); // wait : 3D en chargement (orbe CSS en attendant) | gl | css
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [phase, setPhase] = useState("idle"); // idle | charge | burst | exit
  const ph = useRef("idle");
  const timers = useRef([]);
  const done = useRef(false);
  const cuts = useMemo(shellCuts, []);
  const at = (s, f) => { timers.current.push(setTimeout(f, s * 1000)); };
  const setP = (p) => { ph.current = p; setPhase(p); };
  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    onOpen();
  };

  useEffect(() => { slot.current?.focus({ preventScroll: true }); return () => timers.current.forEach(clearTimeout); }, []);

  // la 3D : chargée à la demande ; si on a déjà touché l'orbe CSS entre-temps, on garde l'orbe CSS
  useEffect(() => {
    if (calm) return undefined;
    let dead = false, raf = 0, ro = null, stage = null;
    import("three").then((THREE) => {
      if (dead || !cvs.current || modeRef.current !== "wait") return;
      try { stage = makeOrbStage(THREE, cvs.current, { color, core: TIER_HEX[t], tier: t, hi: DESKTOP || window.innerWidth >= 900 }); } catch { setMode("css"); return; }
      const fit = () => {
        if (!wrap.current || !slot.current) return;
        const r = wrap.current.getBoundingClientRect(), s = slot.current.getBoundingClientRect();
        stage.resize(r.width, r.height, s.left - r.left + s.width / 2, s.top - r.top + s.height / 2, s.width);
      };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(wrap.current); ro.observe(slot.current);
      let last = performance.now();
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!document.hidden) stage.frame(dt);
      };
      raf = requestAnimationFrame(loop);
      st.current = stage;
      setMode((m) => (m === "wait" ? "gl" : m));
    }).catch(() => { if (!dead) setMode("css"); });
    return () => { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (stage) stage.dispose(); st.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => {
    if (ph.current !== "idle") { finish(); return; } // toucher pendant l'animation : on passe
    const orb = modeRef.current === "gl" && st.current ? st.current.orb : null;
    if (!orb && modeRef.current === "wait") { modeRef.current = "css"; setMode("css"); }
    if (calm) { setP("burst"); sfx.materialize(); at(0.75, finish); return; }
    const c = CHARGE[t], h = HOLD[t];
    setP("charge");
    if (orb) orb.charge(c);
    sfx.charge(c); vibrate(15);
    [0.32, 0.56, 0.76, 0.9].forEach((f) => at(c * f, () => { sfx.crack(); vibrate(8); }));
    at(c, () => {
      if (orb) orb.burst();
      setP("burst");
      sfx.shatter();
      if (t === "E" || t === "L") sfx.materialize();
      if (t === "L") at(0.3, () => sfx.win());
      vibrate(t === "L" ? [40, 60, 140] : t === "E" ? [30, 40, 80] : 30);
    });
    at(c + h, () => { if (orb) orb.exit(); setP("exit"); });
    at(c + h + EXIT, finish);
  };

  const shown = phase === "burst" || phase === "exit";
  return (
    <>
      <div ref={wrap} className={"orb-gl" + (mode === "gl" ? " on" : "")} aria-hidden="true"><canvas ref={cvs} /></div>
      <button ref={slot} type="button" className={`orb t-${t} ${phase}${mode === "gl" ? " gl" : ""}${calm ? " calm" : ""}`}
        style={{ "--pc": color, "--tc": TIER_HEX[t], "--cd": CHARGE[t] + "s" }} onClick={go} data-testid="portal-open"
        aria-label={phase === "idle" ? (count > 1 ? `Toucher l'orbe : ${count} invocations` : "Toucher l'orbe pour invoquer") : "Passer l'animation"}>
        <span className="o2" aria-hidden="true">
          <i className="o2-glow" />
          <i className="o2-core" />
          <span className="o2-spin">
            {cuts.map((c, k) => <i key={k} className="o2-pc" style={{ clipPath: c.clip, "--dx": c.dx, "--dy": c.dy, "--rt": c.rt }} />)}
            <svg className="o2-cracks" viewBox="0 0 100 100">
              {cuts.map((c, k) => <polyline key={"g" + k} className="g" points={c.crack} />)}
              {cuts.map((c, k) => <polyline key={"k" + k} className="k" points={c.crack} pathLength="1" />)}
            </svg>
          </span>
          <i className="o2-shade" />
        </span>
        {shown && !calm && <i className="orb-flash" aria-hidden="true" />}
      </button>
      <div className="orb-say">
        {shown
          ? <p className="orb-tier" style={{ "--tc": TIER_HEX[t] }}>{count > 1 && <small>Meilleure carte</small>}<b>{RARITY[t].name}</b></p>
          : <p className={"bo-hint" + (phase === "idle" ? "" : " off")}>{count > 1 ? `Touche l'orbe : ${count} invocations` : "Touche l'orbe pour invoquer"}</p>}
      </div>
    </>
  );
}
