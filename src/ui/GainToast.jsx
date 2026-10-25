import { useEffect } from "react";
import { ACH_BY } from "../data/profile.js";

const KIND = { avatar: "Avatar", border: "Bordure", color: "Couleur", part: "Pièce" };
const TITLE = { win: "Victoire !", loss: "Partie terminée", draw: "Égalité", solo: "Partie terminée" };

/** Bandeau de fin de partie : XP gagnée, niveau, succès et éléments débloqués. */
export default function GainToast({ gain, onClose, onOpen }) {
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [gain, onClose]);
  const levelUp = gain.lv1 > gain.lv0;
  return (
    <div className={"gaintoast" + (levelUp || gain.items.length ? " big" : "")} role="status">
      <div className="g1">
        <b>{TITLE[gain.result] || "Partie terminée"}</b>
        <span className="xp">+{gain.xp} XP</span>
        {levelUp && <span className="lv">Niveau {gain.lv1} !</span>}
      </div>
      {gain.ach.length > 0 && <div className="g2">{gain.ach.map((id) => <span key={id} className="a">🏆 {ACH_BY[id].name}</span>)}</div>}
      {gain.items.length > 0 && <div className="g2">{gain.items.slice(0, 6).map((i) => <span key={i.kind + i.id} className="n">{KIND[i.kind]} · {i.name}</span>)}{gain.items.length > 6 && <span className="n">+{gain.items.length - 6}</span>}</div>}
      <div className="g3">
        <button className="btn small" onClick={onOpen}>Voir mon profil</button>
        <button className="btn small ghost" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
