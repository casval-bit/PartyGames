// Profil du Trône des Mondes (séparé du profil Party Hub) : photo (une carte 7 possédée), cadre à débloquer par des missions,
// niveau et statistiques du jeu de cartes.
import { useEffect, useState } from "react";
import { ALL, PLAYABLE } from "../cards/index.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import AccountBadge from "../../ui/AccountBadge.jsx";
import Portrait from "./Portrait.jsx";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

export default function TcgProfile({ t, setT, name, acc, onAccount, flash }) {
  const lv = P.levelOf(t.xp);
  const av = P.avatarOf(t), fr = P.frameOf(t);
  const choices = P.avatarChoices(t);
  const distinct = Object.keys(P.owned(t)).length;
  const [fresh] = useState(() => P.newFrames(t).map((f) => f.id)); // gardés tels quels pendant la visite
  // la visite du profil « voit » les nouveaux cadres (la pastille de l'accueil s'éteint), on les garde surlignés pendant la visite
  useEffect(() => { if (fresh.length) setT(P.markFramesSeen(t)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rate = t.st.games ? Math.round((100 * t.st.wins) / t.st.games) : null;
  const unlocked = P.FRAMES.filter((f) => P.frameUnlocked(t, f)).length;
  const pickAv = (id) => { const r = P.setAvatar(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.apply(); };
  const pickFr = (id) => { const r = P.setFrame(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.apply(); };
  const stats = [
    ["Parties", fmt(t.st.games)], ["Victoires", fmt(t.st.wins)], ["Réussite", rate === null ? "—" : `${rate} %`], ["Défis gagnés", fmt(t.st.chal)],
    ["Éliminations", fmt(t.st.kills)], ["Dominations", fmt(t.st.dom)], ["Boosters ouverts", fmt(t.st.packs)], ["Familles jouées", `${t.st.fams.length} / ${PLAYABLE.length}`],
    ["Collection", `${fmt(distinct)} / ${fmt(ALL.length)}`], ["Brillantes", fmt(Object.keys(t.foil).length)], ["Cartes 7", fmt(choices.length)], ["Succès", `${Object.keys(t.ms).length} / ${P.MILESTONES.length}`],
  ];
  return (
    <div className="hub-body pf">
      <section className="pf-hero">
        <Portrait id={av} frame={fr} size={128} />
        <div className="pf-id">
          <span className="eyebrow">Profil du Trône des Mondes</span>
          <b className="pf-name">{name || "Joueur"}</b>
          <span className="pf-title"><Icon name="ribbon" size={14} />Cadre {P.FRAME_BY[fr].name}</span>
          <div className="pf-lv">
            <em>Niveau {lv.lvl}</em>
            <span className="bar2 gold"><i style={{ width: `${(100 * lv.cur) / lv.need}%` }} /></span>
            <small>{lv.cur} / {lv.need} XP</small>
          </div>
        </div>
        {acc && <AccountBadge acc={acc} onClick={onAccount} compact testId="pf-account" />}
      </section>

      <dl className="pf-stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>

      <section className="hub-sec">
        <h3><Icon name="image" size={17} />Photo de profil <small>une carte 7 de ta collection</small></h3>
        {choices.length ? (
          <div className="pf-picks">
            {choices.map((d) => (
              <button key={d.id} className={"pf-pick" + (d.id === av ? " on" : "")} aria-pressed={d.id === av} onClick={() => pickAv(d.id)} title={`${d.name}, ${d.title}`}>
                <Portrait id={d.id} frame={fr} size={84} />
                <small>{d.name}</small>
              </button>
            ))}
          </div>
        ) : <div className="hub-empty">Pas encore de carte 7 : elles sortent des boosters (surtout Prestige) et passent parfois dans la boutique du jour.</div>}
      </section>

      <section className="hub-sec">
        <h3><Icon name="award" size={17} />Cadres <small>{unlocked} / {P.FRAMES.length} débloqués, chacun par une mission</small></h3>
        <div className="pf-frames">
          {P.FRAMES.map((f) => {
            const ok = P.frameUnlocked(t, f), prog = P.frameProgress(t, f);
            return (
              <button key={f.id} className={"pf-fr" + (f.id === fr ? " on" : "") + (ok ? "" : " lockd") + (fresh.includes(f.id) ? " fresh" : "")} disabled={!ok} aria-pressed={f.id === fr} onClick={() => pickFr(f.id)}>
                <Portrait id={av} frame={f.id} size={76} lock={!ok} />
                <b>{f.name}</b>
                <small>{ok ? (f.id === fr ? "Équipé" : fresh.includes(f.id) ? "Nouveau !" : "Débloqué") : f.text}</small>
                {!ok && <span className="bar2 gold"><i style={{ width: `${(100 * prog) / f.goal}%` }} /></span>}
                {!ok && <small className="pf-prog">{fmt(prog)} / {fmt(f.goal)}</small>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
