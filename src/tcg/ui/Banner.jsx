// Bannières de profil (Heavy is the Crown) : un étendard vertical suspendu à une hampe dorée, à deux pointes en bas.
// Les bannières de famille prennent les couleurs et le décor de leur famille (illustration générée, comme le tapis de jeu) ;
// les autres ont leur propre style dans tcg.css (.bnr.b-<id>). La liste et les missions sont dans progress.js (BANNERS).
import { useMemo } from "react";
import { FAMILY } from "../cards/index.js";
import { BANNER_BY } from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { cardArt } from "./art.js";
import Portrait from "./Portrait.jsx";

/** La forme de l'étendard (viewBox 100 × 230) : rectangle, deux pointes en bas. */
const CLOTH = "M0,0 H100 V230 L50,206 L0,230 Z";

/** Étendard seul. w : largeur en px (la hauteur suit : 2,3 × w). children : posés dessus (photo, pseudo…). */
export default function Banner({ id, w = 120, lock = false, children, className = "", title, calm = false }) {
  const b = BANNER_BY[id] || BANNER_BY.heraut;
  const f = b.fam ? FAMILY[b.fam] : null;
  const tex = useMemo(() => (f ? cardArt({ id: "banniere:" + f.id, type: "fam", fam: f.id, r: "R", name: "", noMedal: true, pt: [] }, 120, 276) : null), [f]);
  const style = { "--w": w + "px", ...(f ? { "--bc": f.color, "--bc2": f.color2 } : {}) };
  return (
    <span className={`bnr b-${f ? "fam" : b.id}${lock ? " locked" : ""}${calm ? " calm" : ""} ${className}`} style={style} title={title} aria-hidden={title ? undefined : true}>
      <span className="bnr-cloth">
        {tex && <img className="bnr-tex" src={tex} alt="" draggable={false} />}
        <span className="bnr-shade" />
        <span className="bnr-emb"><Icon name={b.icon} size={Math.round(w * 0.46)} stroke={1.3} /></span>
      </span>
      <svg className="bnr-trim" viewBox="0 0 100 230" preserveAspectRatio="none" aria-hidden="true">
        <path d={CLOTH} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="bnr-rod" aria-hidden="true" />
      {children && <span className="bnr-in">{children}</span>}
      {lock && <span className="bnr-lock" aria-hidden="true"><Icon name="lock" size={Math.max(14, Math.round(w * 0.2))} /></span>}
    </span>
  );
}

/**
 * Un joueur sur sa bannière : photo (carte 7) dans son cadre, pseudo, niveau, et ce qu'on veut dessous (deck, état).
 * look : { av, fr, bn, lv } (progress.js, tcgLook). Sert au lobby et au profil.
 */
export function PlayerBanner({ name, look, w = 150, children, className = "", calm = false }) {
  const l = look || {};
  return (
    <Banner id={l.bn || "heraut"} w={w} className={"pbn " + className} calm={calm}>
      <Portrait id={l.av || null} frame={l.fr || "bronze"} size={Math.round(w * 0.6)} />
      <b className="pbn-name">{name || "Joueur"}</b>
      {l.lv ? <span className="pbn-lv">Niveau {l.lv}</span> : null}
      {children}
    </Banner>
  );
}
