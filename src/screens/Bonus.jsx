import { useState } from "react";
import { Fuse, GameCard, BonusBadge } from "../ui/parts.jsx";
import { BONUS_SECONDS, BONUS_SLOTS, TIME_BONUS_S, SCORE_BONUS_PTS } from "../config.js";
import { vibrate } from "../lib/util.js";

const DEMO = { id: "demo", name: "Carte", cat: "x", tier: "F" };
const KINDS = [
  { id: "time", label: "Temps", note: `+${TIME_BONUS_S} s au chrono` },
  { id: "score", label: "Score", note: `${SCORE_BONUS_PTS} pts au lieu de 1` },
];

/**
 * Variante Bonus : avant chaque manche, chacun voit ses 20 cartes et pose jusqu'à 2 bonus.
 * Une carte bonus se transforme (carte basique → carte spéciale) ; le bonus profite à toute équipe qui la réussit.
 */
export default function Bonus({ room, me, cards, api }) {
  const [picks, setPicks] = useState({});      // { carteId: "time" | "score" }
  const [brush, setBrush] = useState("time");
  const [fx, setFx] = useState({});            // { carteId: n } : relance l'animation de transformation
  const [warn, setWarn] = useState("");
  const meP = room.players.find((p) => p.id === me.id);
  const ready = Boolean(meP && meP.ready);
  const round = room.bonus ? room.bonus.round : 1;
  const total = room.bonus ? room.bonus.total : 3;
  const list = cards || [];
  const used = Object.keys(picks).length;
  const count = (k) => Object.values(picks).filter((x) => x === k).length;

  const push = (next, confirm = false) => { setPicks(next); api.bonus(next, confirm); };
  const bump = (id) => setFx((f) => ({ ...f, [id]: (f[id] || 0) + 1 }));

  const tap = (c) => {
    if (ready) return;
    if (picks[c.id]) {
      const next = { ...picks }; delete next[c.id];
      bump(c.id); vibrate(14); setWarn("");
      return push(next);
    }
    if (used >= BONUS_SLOTS) { vibrate(40); return setWarn(`Déjà ${BONUS_SLOTS} bonus posés : retire-en un (touche une carte spéciale).`); }
    const next = { ...picks, [c.id]: brush };
    bump(c.id); vibrate([20, 30, 60]); setWarn("");
    // pratique : après un bonus « temps », on passe sur « score » (et inversement) pour le classique 1 + 1
    const other = brush === "time" ? "score" : "time";
    if (!Object.values(next).includes(other)) setBrush(other);
    push(next);
  };

  const label = used === 0 ? "Valider : aucun bonus" : used === 1 ? "Valider mon bonus" : "Valider mes 2 bonus";

  return (
    <div className="screen bn">
      <div>
        <div className="eyebrow">Manche {round} sur {total} · bonus</div>
        <h2 style={{ fontSize: "1.25rem" }}>Transforme jusqu'à {BONUS_SLOTS} cartes</h2>
        <p className="muted" style={{ fontSize: ".78rem", fontWeight: 700, marginTop: 2 }}>
          Ces {list.length} cartes sont à toi pour choisir. Un bonus profite à <b>l'équipe qui réussit la carte</b>, même l'adverse : tu peux n'en poser aucun. Valable pour cette manche seulement.
        </p>
      </div>
      <Fuse deadline={room.deadline} total={BONUS_SECONDS} />

      <div className="bn-tools" role="group" aria-label="Type de bonus">
        {KINDS.map((k) => (
          <button key={k.id} className={"bn-tool " + k.id + (brush === k.id ? " on" : "")} disabled={ready} onClick={() => setBrush(k.id)} aria-pressed={brush === k.id}>
            <span className="mini"><GameCard card={DEMO} up bonus={k.id} className="static" /></span>
            <span className="t"><BonusBadge kind={k.id} /><b>{k.label}</b><small>{k.note}</small></span>
            <em>{count(k.id)}</em>
          </button>
        ))}
      </div>
      <div className="bn-slots" aria-label={`${used} bonus sur ${BONUS_SLOTS}`}>
        {Array.from({ length: BONUS_SLOTS }, (_, k) => <i key={k} className={k < used ? "on" : ""} />)}
        <span>{used}/{BONUS_SLOTS} bonus posés</span>
      </div>
      {warn && <p className="bn-warn" role="status">{warn}</p>}

      <div className="scroll">
        <div className="dk bn-grid">
          {list.map((c, i) => (
            <GameCard key={c.id} card={c} up i={i} bonus={picks[c.id]} morph={fx[c.id]} className={"static" + (ready ? " dim" : "")} onClick={() => tap(c)} />
          ))}
        </div>
      </div>

      {ready ? (
        <>
          <div className="waitlist">{room.players.map((p) => <span key={p.id} className={p.ready ? "ok" : ""}>{p.name}{p.ready ? " ✓" : ""}</span>)}</div>
          <button className="btn" onClick={() => push(picks, false)}>Modifier mes bonus</button>
        </>
      ) : (
        <button className="btn good" onClick={() => { vibrate(60); push(picks, true); }}>{label}</button>
      )}
    </div>
  );
}
