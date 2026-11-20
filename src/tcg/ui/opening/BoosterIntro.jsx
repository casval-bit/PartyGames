// Ouverture d'un booster, ou d'un groupe de boosters (jusqu'à 5, en éventail). Les paquets scellés flottent, brillent et
// s'inclinent vers la souris. On les touche une fois (ou Entrée) : ils tremblent, la soudure du haut s'allume, puis chacun saute
// à son tour (l'opercule s'envole, un rayon de la couleur de sa meilleure carte, des étincelles). Les cartes sortent du paquet,
// l'emballage tombe, et les cartes filent au centre où elles se retournent ensuite une à une (PackOpen.jsx).
// Animations réduites : un simple fondu. Toucher pendant l'animation la passe.
import { useEffect, useMemo, useRef, useState } from "react";
import { GAME_NAME } from "../../rules.js";
import { Icon } from "../../../ui/Icon.jsx";
import { sfx } from "../../../lib/sfx.js";
import { vibrate } from "../../../lib/util.js";
import { CardBack } from "../Card.jsx";
import { TIERS, TIER_HEX, bestTier } from "./tiers.js";

const CHARGE = 0.5; // secondes : les paquets tremblent avant le premier
const STEP = 0.17; // entre deux paquets d'un groupe
const OUT = 0.98; // du dernier paquet ouvert aux cartes
const WOB = 0.11; // une secousse
const rank = (x) => TIERS.indexOf(x);

export default function BoosterIntro({ packs, name, color, icon, calm = false, onOpen }) {
  const n = packs.length;
  const box = useRef(null);
  const timers = useRef([]);
  const done = useRef(false);
  const [phase, setPhase] = useState("idle"); // idle | open | calm
  const tiers = useMemo(() => packs.map((p) => bestTier(p.cards)), [packs]);
  const top = tiers.reduce((b, x) => (rank(x) > rank(b) ? x : b), "C");
  const sparks = useMemo(() => packs.map(() => Array.from({ length: 9 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, r = 0.55 + Math.random() * 0.75;
    return { x: (Math.cos(a) * r).toFixed(2), y: (Math.sin(a) * r).toFixed(2), d: (Math.random() * 0.12).toFixed(2) };
  })), [packs]);
  const sp = n >= 4 ? 0.7 : 0.82; // écart entre deux paquets (fraction de leur largeur)
  const w = n > 1 ? `min(${(80 / (1 + (n - 1) * sp)).toFixed(1)}vw, 150px, 21vh)` : "min(54vw, 260px, 36vh)";
  const last = CHARGE + (n - 1) * STEP;
  const at = (s, f) => { timers.current.push(setTimeout(f, s * 1000)); };
  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    onOpen();
  };
  useEffect(() => { box.current?.focus({ preventScroll: true }); return () => timers.current.forEach(clearTimeout); }, []);

  const open = () => {
    if (phase !== "idle") { finish(); return; } // toucher pendant l'animation : on passe
    if (calm) { setPhase("calm"); sfx.open(); at(0.32, finish); return; }
    setPhase("open");
    sfx.charge(CHARGE + 0.1); vibrate(12);
    tiers.forEach((x, k) => at(CHARGE + k * STEP, () => {
      sfx.burst();
      if (x === "E" || x === "L") { sfx.materialize(); vibrate([25, 30, 60]); } else if (x === "R") { sfx.scan(); vibrate(22); } else vibrate(14);
    }));
    at(last + OUT, finish);
  };
  // le paquet s'incline vers la souris (ou le doigt) et le reflet glisse sur l'emballage
  const tilt = (e) => {
    const el = box.current;
    if (!el || phase !== "idle" || calm) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.style.setProperty("--ry", ((x - 0.5) * 24).toFixed(1) + "deg");
    el.style.setProperty("--rx", ((0.5 - y) * 16).toFixed(1) + "deg");
    el.style.setProperty("--gx", (x * 100).toFixed(0) + "%");
    el.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
  };
  const untilt = () => { const el = box.current; if (el) { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); } };

  return (
    <>
      <div ref={box} className={`bx${n > 1 ? " grp" : ""}${calm ? " still" : ""}${phase !== "idle" ? " " + phase : ""}`} role="button" tabIndex={0} data-testid="pack-open"
        aria-label={phase !== "idle" ? "Passer l'animation" : n > 1 ? `Ouvrir les ${n} boosters` : "Ouvrir le booster"}
        style={{ "--pc": color, "--w": w, "--tc": TIER_HEX[top], "--gd": `${last + 0.52}s` }}
        onClick={open} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }} onPointerMove={tilt} onPointerLeave={untilt}>
        {packs.map((p, k) => {
          const c = k - (n - 1) / 2, bd = CHARGE + k * STEP;
          return (
            <div key={k} className={`bx-p t-${tiers[k]}${p.golden ? " gold" : ""}`}
              style={{ "--i": k, "--x": `calc(var(--w) * ${(c * sp).toFixed(2)})`, "--y": `${(Math.abs(c) * 8).toFixed(0)}px`, "--r": `${(c * 5).toFixed(1)}deg`, "--bd": bd + "s", "--wn": Math.max(1, Math.round(bd / WOB)), "--tc": TIER_HEX[tiers[k]] }}>
              <div className="bx-tilt">
                <div className="bx-cards">
                  {[0, 1, 2].map((j) => <CardBack key={j} className={"bx-c c" + j} glow={j === 1 && rank(tiers[k]) >= 2 ? tiers[k] : null} />)}
                </div>
                <div className="bx-body">
                  <i className="bx-holo" /><i className="bx-glare" />
                  <span className="bx-brand">{GAME_NAME}</span>
                  <span className="bx-medal"><Icon name={icon} size={40} stroke={1.5} /></span>
                  <b className="bx-name">{name}</b>
                  <span className="bx-n">{p.golden ? "Doré · " : ""}{p.cards.length} cartes</span>
                </div>
                <div className="bx-cap" />
                <i className="bx-leak" /><i className="bx-seam" />
              </div>
              <div className="bx-fx">
                <i className="beam" /><i className="flash" />
                {sparks[k].map((s, j) => <i key={j} className="sp" style={{ "--sx": `calc(var(--w) * ${s.x})`, "--sy": `calc(var(--w) * ${s.y})`, "--sd": s.d + "s" }} />)}
              </div>
            </div>
          );
        })}
        <i className="bx-merge" />
      </div>
      <p className={"bo-hint" + (phase === "idle" ? "" : " off")}>{n > 1 ? `Touche les boosters : les ${n} s'ouvrent d'un coup` : "Touche le booster pour l'ouvrir"}</p>
    </>
  );
}
