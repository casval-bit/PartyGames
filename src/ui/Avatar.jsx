import { AV_BY, CO_BY, cleanLook } from "../data/profile.js";

/** Avatar de joueur : icône + couleur + bordure (voir data/profile.js). `size` en pixels. */
export function Avatar({ look, size, className = "", title, showLv }) {
  const L = cleanLook(look);
  const av = AV_BY[L.a], co = CO_BY[L.c];
  return (
    <span className={`pav b-${L.b} ${className}`} style={{ "--pbg": co.bg, "--pink": co.ink, ...(size ? { "--s": size + "px" } : null) }} title={title} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd"><path d={av.d} /></svg>
      {showLv && L.lv > 1 ? <b className="plv">{L.lv}</b> : null}
    </span>
  );
}
