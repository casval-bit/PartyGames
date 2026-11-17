// Profil de Heavy is the Crown (séparé du profil Party Hub) : photo (une carte 7 possédée), cadre et bannière à débloquer
// par des missions, pseudo, niveau et statistiques du jeu de cartes. Ce que les autres voient dans un lobby : la bannière
// avec la photo dans son cadre, le pseudo et le niveau.
import { useEffect, useState } from "react";
import { ALL, PLAYABLE } from "../cards/index.js";
import * as P from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import AccountBadge from "../../ui/AccountBadge.jsx";
import Portrait from "./Portrait.jsx";
import Banner, { PlayerBanner } from "./Banner.jsx";
import { GAME_NAME } from "../rules.js";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
const KIND = { base: "Offertes", special: "Missions", fam: "Familles" };

/** Pseudo modifiable (appli du jeu seul : pas de menu Party Hub pour le changer). */
function PseudoEdit({ name, onName }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(name || "");
  if (!edit) {
    return (
      <span className="pf-pseudo">
        <b className="pf-name">{name || "Joueur"}</b>
        {onName && <button className="iconbtn small" onClick={() => { setV(name || ""); setEdit(true); }} aria-label="Changer de pseudo" title="Changer de pseudo" data-testid="pf-pseudo-edit"><Icon name="edit" size={16} /></button>}
      </span>
    );
  }
  const ok = () => { const n = v.trim().slice(0, 16); if (n) { onName(n); sfx.apply(); } setEdit(false); };
  return (
    <form className="pf-pseudo" onSubmit={(e) => { e.preventDefault(); ok(); }}>
      <input className="hub-search pf-pseudo-in" value={v} maxLength={16} autoFocus onChange={(e) => setV(e.target.value)} aria-label="Pseudo" placeholder="Ton pseudo" data-testid="pf-pseudo-input" />
      <button className="btn small primary" type="submit" disabled={!v.trim()}><Icon name="check" size={16} />OK</button>
    </form>
  );
}

export default function TcgProfile({ t, setT, name, onName, acc, onAccount, flash }) {
  const lv = P.levelOf(t.xp);
  const av = P.avatarOf(t), fr = P.frameOf(t), bn = P.bannerOf(t);
  const choices = P.avatarChoices(t);
  const distinct = Object.keys(P.owned(t)).length;
  // gardés tels quels pendant la visite : la visite « voit » les nouveaux cadres et bannières (la pastille de l'accueil s'éteint)
  const [fresh] = useState(() => [...P.newFrames(t).map((f) => f.id), ...P.newBanners(t).map((b) => b.id)]);
  useEffect(() => { if (fresh.length) setT(P.markBannersSeen(P.markFramesSeen(t))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [bnKind, setBnKind] = useState("all");
  const rate = t.st.games ? Math.round((100 * t.st.wins) / t.st.games) : null;
  const unlocked = P.FRAMES.filter((f) => P.frameUnlocked(t, f)).length;
  const bnUnlocked = P.BANNERS.filter((b) => P.bannerUnlocked(t, b)).length;
  const pickAv = (id) => { const r = P.setAvatar(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.apply(); };
  const pickFr = (id) => { const r = P.setFrame(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.apply(); };
  const pickBn = (id) => { const r = P.setBanner(t, id); if (r.error) { flash(r.error); return; } setT(r.t); sfx.apply(); };
  const stats = [
    ["Parties", fmt(t.st.games)], ["Victoires", fmt(t.st.wins)], ["Réussite", rate === null ? "—" : `${rate} %`], ["Défis gagnés", fmt(t.st.chal)],
    ["Éliminations", fmt(t.st.kills)], ["Dominations", fmt(t.st.dom)], ["Boosters ouverts", fmt(t.st.packs)], ["Invocations", fmt(t.st.pulls || 0)], ["Familles jouées", `${t.st.fams.length} / ${PLAYABLE.length}`],
    ["Collection", `${fmt(distinct)} / ${fmt(ALL.length)}`], ["Brillantes", fmt(Object.keys(t.foil).length)], ["Cartes 7", fmt(choices.length)], ["Succès", `${Object.keys(t.ms).length} / ${P.MILESTONES.length}`],
  ];
  // bannières : celles débloquées d'abord, puis les plus avancées
  const banners = P.BANNERS.filter((b) => bnKind === "all" || b.kind === bnKind)
    .map((b) => ({ b, ok: P.bannerUnlocked(t, b), prog: P.bannerProgress(t, b) }))
    .sort((x, y) => (y.ok - x.ok) || (y.prog / y.b.goal - x.prog / x.b.goal));
  return (
    <div className="hub-body pf">
      <section className="pf-hero">
        <PlayerBanner name={name} look={{ av, fr, bn, lv: lv.lvl }} w={132} className="pf-bnr" />
        <div className="pf-id">
          <span className="eyebrow">Profil · {GAME_NAME}</span>
          <PseudoEdit name={name} onName={onName} />
          <span className="pf-title"><Icon name="ribbon" size={14} />Cadre {P.FRAME_BY[fr].name} · Bannière {P.BANNER_BY[bn].name}</span>
          <div className="pf-lv">
            <em>Niveau {lv.lvl}</em>
            <span className="bar2 gold"><i style={{ width: `${(100 * lv.cur) / lv.need}%` }} /></span>
            <small>{lv.cur} / {lv.need} XP</small>
          </div>
          <small className="muted pf-seen">C'est ainsi que les autres joueurs te voient dans un lobby.</small>
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

      <section className="hub-sec" data-testid="pf-banners">
        <h3><Icon name="flag" size={17} />Bannières <small>{bnUnlocked} / {P.BANNERS.length} débloquées : trois offertes, les autres par une mission ou {P.BANNER_FAM_GOAL} cartes d'une famille</small></h3>
        <div className="hub-filters">
          {[["all", "Toutes"], ...Object.entries(KIND)].map(([k, l]) => <button key={k} aria-pressed={bnKind === k} onClick={() => { setBnKind(k); sfx.select(); }}>{l}</button>)}
        </div>
        <div className="pf-banners">
          {banners.map(({ b, ok, prog }) => (
            <button key={b.id} className={"pf-bn" + (b.id === bn ? " on" : "") + (ok ? "" : " lockd") + (fresh.includes(b.id) ? " fresh" : "")} disabled={!ok} aria-pressed={b.id === bn}
              onClick={() => pickBn(b.id)} data-testid={"pf-bn-" + b.id} title={ok ? b.name : `${b.name} : ${b.text}`}>
              <Banner id={b.id} w={70} lock={!ok} />
              <b>{b.name}</b>
              <small>{ok ? (b.id === bn ? "Équipée" : fresh.includes(b.id) ? "Nouvelle !" : "Débloquée") : b.text}</small>
              {!ok && <span className="bar2 gold"><i style={{ width: `${(100 * prog) / b.goal}%` }} /></span>}
              {!ok && <small className="pf-prog">{fmt(prog)} / {fmt(b.goal)}</small>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
