import { AV_BY, CO_BY, cleanLook, xOf } from "../data/profile.js";
import { useAvatarImg } from "../avatar3d/Avatar3D.jsx";

/**
 * Avatar de joueur : son personnage 3D (miniature) sur sa couleur, dans sa bordure (voir data/profile.js). `size` en pixels.
 * Pendant le calcul de la miniature, ou si la 3D est indisponible, l'ancienne icône s'affiche.
 */
export function Avatar({ look, size, className = "", title, showLv, view }) {
  const L = cleanLook(look);
  const av = AV_BY[L.a], co = CO_BY[L.c];
  const big = (size || 0) >= 64;
  const img = useAvatarImg(xOf(L), view || (big ? "bust" : "head"), big ? 256 : 128);
  return (
    <span className={`pav b-${L.b} ${img ? "has3d" : ""} ${className}`} style={{ "--pbg": co.bg, "--pink": co.ink, ...(size ? { "--s": size + "px" } : null) }} title={title} aria-hidden="true">
      {img ? <span className="pavin"><img src={img} alt="" draggable={false} /></span> : <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd"><path d={av.d} /></svg>}
      {showLv && L.lv > 1 ? <b className="plv">{L.lv}</b> : null}
    </span>
  );
}
