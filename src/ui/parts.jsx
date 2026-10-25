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
 * Face d'une carte : uniquement le nom (cartouche crème façon enseigne, cerné de noir), sur un panneau saturé à rayons et trame de points,
 * ruban de chantier en bas. Aucune icône ni texte lié à la catégorie, et le tier n'est jamais affiché. `up` = retournée.
 * `bonus` ("time" | "score") : carte spéciale foil, d'une autre couleur. `morph` (nombre) : rejoue la transformation basique ⇄ spéciale.
 */
export function GameCard({ card, up, i = 0, onClick, className = "", bonus, morph }) {
  const h = hash(card.id);
  const hue = THEMES[h % THEMES.length];
  const len = card.name.length;
  // Taille du nom : le mot le plus long doit tenir sur une ligne du cartouche (largeur estimée lettre par lettre, la police est large),
  // et le nom entier sur 3 lignes au plus. `--fs` est en cqw (largeur de la carte).
  const adv = (c) => ("MW".includes(c) ? 0.82 : "IJ1".includes(c) ? 0.4 : 0.66);
  const em = (w) => [...w.toUpperCase()].reduce((t, c) => t + adv(c), 0);
  const lw = Math.max(...card.name.split(/[\s-]+/).map(em));
  const fs = Math.max(5.6, Math.min(17, 64 / lw, 215 / len));
  const size = fs >= 14 ? "s1" : fs >= 10.5 ? "s2" : fs >= 8 ? "s3" : "s4";
  return (
    <div className={`fc ${up ? "up" : ""} ${bonus ? "bonus " + bonus : ""} ${className}`} style={{ "--i": i, "--h": hue, "--r": `${h % 30}deg`, "--t": `${(h % 5) - 2}deg` }} onClick={onClick} role="button" aria-label={up ? card.name : "Carte face cachée"}>
      <div className="back">
        <i className="bk-ring" />
        <HourglassMark size={46} />
      </div>
      <div className="face">
        <div className="inner">
          <i className="rays" />
          <div className="cart">
            <div className={"nm " + size} style={{ "--fs": fs.toFixed(2) }}><span>{card.name}</span></div>
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
