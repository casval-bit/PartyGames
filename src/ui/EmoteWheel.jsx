import { EMOTES } from "../avatar3d/emotes.js";
import { Icon } from "./Icon.jsx";
import { sfx } from "../lib/sfx.js";

/** Icône de chaque émote (trait fin, pas d'emoji). */
export const EMOTE_ICON = { wave: "hand", dance: "music", laugh: "laugh", cry: "drops", angry: "angry", thumbs: "thumbs", clap: "party", heart: "heart", shrug: "meh", facepalm: "annoyed", bow: "person", victory: "trophy" };

/** Roue d'émotes : les émotes en cercle autour d'un bouton central. onPick(id). */
export default function EmoteWheel({ onPick, onClose }) {
  const n = EMOTES.length;
  return (
    <div className="ewrap" role="dialog" aria-label="Émotes" onClick={onClose}>
      <div className="ewheel" onClick={(e) => e.stopPropagation()}>
        <div className="ering" aria-hidden="true" />
        {EMOTES.map((e, i) => {
          const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
          return (
            <button key={e.id} className="ebtn" style={{ "--x": Math.cos(a).toFixed(3), "--y": Math.sin(a).toFixed(3), "--i": i }} onClick={() => { sfx.emote(); onPick(e.id); }} data-testid={"emote-" + e.id} aria-label={e.name}>
              <Icon name={EMOTE_ICON[e.id]} size={22} /><span>{e.name}</span>
            </button>
          );
        })}
        <button className="ecenter" onClick={onClose} aria-label="Fermer"><Icon name="close" size={22} /></button>
      </div>
    </div>
  );
}
