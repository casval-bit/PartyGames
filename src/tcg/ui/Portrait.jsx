// Photo de profil du Trône des Mondes : l'illustration d'une carte 7 possédée (image choisie ou intégrée, sinon l'illustration
// générée), dans un cadre qui se débloque avec des missions (progress.js : FRAMES). Sans carte 7 : le blason du jeu.
import { useMemo } from "react";
import { CARD } from "../cards/index.js";
import { Icon } from "../../ui/Icon.jsx";
import { cardArt } from "./art.js";
import { useArt } from "./artStore.js";

export default function Portrait({ id, frame = "bronze", size = 64, lock = false, className = "", title }) {
  const d = id ? CARD[id] : null;
  const custom = useArt(d ? d.id : null);
  const gen = useMemo(() => (custom || !d ? null : cardArt(d, 220, 220, false)), [d, custom]);
  const art = custom || gen;
  // vraie image : pleine carte pour une légendaire (visage dans le haut), cadre d'illustration sinon
  const pos = custom && d && d.r === "L" ? "50% 22%" : "50% 40%";
  return (
    <span className={`pfr f-${frame}${lock ? " locked" : ""} ${className}`} style={{ "--s": size + "px" }} title={title} aria-hidden={title ? undefined : true}>
      <span className="pfr-in">
        {art ? <img src={art} alt="" draggable={false} style={{ objectPosition: pos }} /> : <span className="pfr-crest"><Icon name="crown" size={Math.round(size * 0.42)} stroke={1.5} /></span>}
      </span>
      {frame === "trone" && <span className="pfr-crown" aria-hidden="true"><Icon name="crown" size={Math.max(12, Math.round(size * 0.26))} stroke={2} /></span>}
      {lock && <span className="pfr-lock" aria-hidden="true"><Icon name="lock" size={Math.max(14, Math.round(size * 0.3))} /></span>}
    </span>
  );
}
