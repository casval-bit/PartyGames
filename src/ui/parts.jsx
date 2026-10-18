import { useEffect, useRef, useState } from "react";
import { BY_ID } from "../data/categories.js";
import { TEAMS, MAX_CELLS } from "../config.js";
import { Avatar } from "./Avatar.jsx";

export const teamStyle = (t) => ({ "--tc": TEAMS[t].color, "--tink": TEAMS[t].ink });

export function useNow(ms = 250) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return n;
}

/** Chrono "mèche de dynamite" : la mèche brûle vers le bâton, l'étincelle avance en continu. */
export function Fuse({ deadline, total }) {
  const ref = useRef(null);
  const [sec, setSec] = useState(total);
  useEffect(() => {
    let raf;
    const loop = () => {
      const left = Math.max(0, (deadline || Date.now()) - Date.now());
      const p = Math.min(1, left / (total * 1000));
      if (ref.current) ref.current.style.setProperty("--p", p.toFixed(4));
      setSec(Math.ceil(left / 1000));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [deadline, total]);
  return (
    <div className="fuse" ref={ref} data-low={sec <= 10} role="timer" aria-label={`${sec} secondes restantes`}>
      <div className="fuse-num">{sec}</div>
      <div className="fuse-line">
        <i className="ash" />
        <i className="rope" />
        <b className="spark" />
      </div>
      <div className="dyn" />
    </div>
  );
}

/** Couleur propre à chaque joueur (angle d'or : toujours bien distinctes, même à 24 joueurs). */
export const playerColor = (ci = 0) => `hsl(${Math.round((ci * 137.508 + 25) % 360)} 88% 62%)`;

/**
 * Batterie d'une catégorie : MAX_CELLS barres de charge au plus.
 * cells = liste de couleurs ("neutral" = vote masqué). Au-delà de MAX_CELLS, on garde la batterie pleine.
 */
export function CatBattery({ cells = [], total = cells.length, delay = 0 }) {
  const shown = cells.slice(0, MAX_CELLS);
  return (
    <div className="cbat" aria-label={`${total} vote${total > 1 ? "s" : ""}`}>
      {Array.from({ length: MAX_CELLS }, (_, i) => {
        const c = shown[i];
        return (
          <i
            key={i + (c || "")}
            className={c ? (c === "neutral" ? "on neutral" : "on") : ""}
            style={c && c !== "neutral" ? { "--c": c, animationDelay: `${delay + i * 55}ms` } : { animationDelay: `${delay + i * 55}ms` }}
          />
        );
      })}
    </div>
  );
}

export function HourglassMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 48" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="4" y="2" width="32" height="5" rx="2" fill="var(--fuse)" />
      <rect x="4" y="41" width="32" height="5" rx="2" fill="var(--fuse)" />
      <path d="M9 7h22c0 10-8 12-8 17s8 7 8 17H9c0-10 8-12 8-17S9 17 9 7z" fill="none" stroke="var(--cream)" strokeWidth="2.5" />
      <path d="M13 12h14c-1 5-7 7-7 10 0-3-6-5-7-10z" fill="var(--fuse)" />
      <path d="M12 40c1-5 5-7 8-7s7 2 8 7z" fill="var(--fuse)" />
    </svg>
  );
}

const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// Teintes des cartes : tirées de l'identifiant de la carte, donc SANS lien avec la catégorie (aucun indice).
const THEMES = [352, 214, 152, 272, 24, 188, 322, 44];

/** Filigrane : double cadre aux angles biseautés, fleurons d'angle, losanges. Purement décoratif. */
function Filigree() {
  const corner = (
    <g>
      <path d="M22 74V38Q22 22 38 22H74" />
      <path d="M31 62V43Q31 31 43 31H62" className="th" />
      <path className="fl" d="M42 42q15-1 22-14q-15 1-22 14zM42 42q-1 15-14 22q1-15 14-22z" />
      <path className="fl" d="M36 36l5 5-5 5-5-5z" />
    </g>
  );
  return (
    <svg className="orn" viewBox="0 0 300 410" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="#f0cf7a" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 10H270L290 30V380L270 400H30L10 380V30Z" strokeWidth="1.8" />
        <path d="M34 15H266L285 34V376L266 395H34L15 376V34Z" strokeWidth=".8" opacity=".7" />
        <g strokeWidth="2.2">
          {corner}
          <g transform="translate(300 0) scale(-1 1)">{corner}</g>
          <g transform="translate(0 410) scale(1 -1)">{corner}</g>
          <g transform="translate(300 410) scale(-1 -1)">{corner}</g>
        </g>
        <g strokeWidth="1.2">
          <path d="M92 24H134M166 24H208M92 386H134M166 386H208" />
          <path d="M12 190V220M288 190V220" strokeWidth="2" />
        </g>
      </g>
      <g fill="#f0cf7a">
        <path d="M150 15l9 9-9 9-9-9zM150 377l9 9-9 9-9-9z" />
        <circle cx="86" cy="24" r="2.4" /><circle cx="214" cy="24" r="2.4" /><circle cx="86" cy="386" r="2.4" /><circle cx="214" cy="386" r="2.4" />
        <path d="M10 197l5 8-5 8-5-8zM290 197l5 8-5 8-5-8z" />
      </g>
    </svg>
  );
}
/** Séparateur en arabesque, au-dessus et en dessous du nom. */
function Swash({ flip }) {
  return (
    <svg className="swash" viewBox="0 0 200 18" aria-hidden="true" style={flip ? { transform: "scaleY(-1)" } : null}>
      <g fill="none" stroke="#f0cf7a" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 9H70C78 9 80 3 87 3C93 3 94 9 90 10" />
        <path d="M194 9H130C122 9 120 3 113 3C107 3 106 9 110 10" />
      </g>
      <path d="M100 2l7 7-7 7-7-7z" fill="#f0cf7a" />
      <circle cx="4" cy="9" r="2" fill="#f0cf7a" /><circle cx="196" cy="9" r="2" fill="#f0cf7a" />
    </svg>
  );
}

/** Pastille d'une carte spéciale : sablier (+10 s) ou étoile (3 points). */
export function BonusBadge({ kind }) {
  return (
    <span className={"bdg " + kind}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {kind === "time"
          ? <path d="M6 2h12v2c0 4-4 5-4 8s4 4 4 8v2H6v-2c0-4 4-5 4-8S6 8 6 4zM9 5c.4 2 2 3 3 3s2.6-1 3-3z" fill="currentColor" />
          : <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor" />}
      </svg>
      <b>{kind === "time" ? "+10 s" : "× 3"}</b>
    </span>
  );
}

/**
 * Face d'une carte : uniquement le nom, mis en valeur par un décor (filigrane doré, médaillon à rayons, cartouche).
 * Aucune icône ni texte lié à la catégorie, et le tier n'est jamais affiché. `up` = retournée.
 * `bonus` ("time" | "score") : carte spéciale foil, d'une autre couleur. `morph` (nombre) : rejoue la transformation basique ⇄ spéciale.
 */
export function GameCard({ card, up, i = 0, onClick, className = "", bonus, morph }) {
  const h = hash(card.id);
  const hue = THEMES[h % THEMES.length];
  const len = card.name.length;
  const lw = Math.max(...card.name.split(/[\s-]+/).map((w) => w.length)); // mot le plus long : évite de couper un nom en deux
  const size = lw <= 6 && len <= 10 ? "s1" : lw <= 8 && len <= 16 ? "s2" : lw <= 11 && len <= 26 ? "s3" : "s4";
  const sparks = [0, 1, 2, 3, 4].map((k) => {
    const r = hash(card.id + k);
    return { x: 10 + (r % 80), y: k % 2 ? 14 + ((r >>> 8) % 14) : 74 + ((r >>> 8) % 14), s: 0.55 + ((r >>> 16) % 10) / 12, d: ((r >>> 20) % 30) / 10 };
  });
  return (
    <div className={`fc ${up ? "up" : ""} ${bonus ? "bonus " + bonus : ""} ${className}`} style={{ "--i": i, "--h": hue, "--r": `${h % 30}deg` }} onClick={onClick} role="button" aria-label={up ? card.name : "Carte face cachée"}>
      <div className="back">
        <i className="bk-ring" />
        <HourglassMark size={46} />
      </div>
      <div className="face">
        <div className="inner">
          <i className="rays" />
          <i className="ring r1" /><i className="ring r2" />
          {sparks.map((p, k) => <i key={k} className="sp" style={{ left: p.x + "%", top: p.y + "%", "--s": p.s, animationDelay: p.d + "s" }} />)}
          <Filigree />
          <div className="cart">
            <Swash />
            <div className={"nm " + size}><span>{card.name}</span></div>
            <Swash flip />
          </div>
          {bonus && <><i className="foil" /><BonusBadge kind={bonus} /></>}
          <i className="holo" />
          {morph ? <i key={morph} className="morphfx"><u /><u /><u /><u /><u /><u /></i> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Pile de cartes qui se mélange. mode : "gather" (arrive), "riffle" (se mélange), "deal" (repart), "idle".
 * Purement visuel.
 */
export function ShuffleStack({ mode = "idle", count = 9 }) {
  return (
    <div className={"sdeck " + mode} aria-hidden="true">
      {Array.from({ length: count }, (_, k) => (
        <div key={k} className="c" style={{ "--k": k, "--s": k % 2 ? 1 : -1 }}>
          <HourglassMark size={26} />
        </div>
      ))}
    </div>
  );
}

export function PlayerAvatar({ name, look, showLv }) {
  if (look) return <Avatar look={look} showLv={showLv} />;
  return <span className="av">{(name || "?").trim().charAt(0).toUpperCase()}</span>;
}
