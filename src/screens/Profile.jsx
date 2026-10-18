import { useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import {
  ACHIEVEMENTS, AVATARS, BORDERS, COLORS, isUnlocked, ruleText, rewardsOf, progressOf, pct, secs,
} from "../data/profile.js";

const GAMES = { timesup: "Time's Up", quiest: "Qui est-ce ?", blindtest: "Blind test" };
const RESULT = { win: "Victoire", loss: "Défaite", draw: "Égalité", solo: "Solo" };
const KIND = { avatar: "Avatar", border: "Bordure", color: "Couleur" };

const Lock = () => (
  <svg className="lock" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" /></svg>
);

const Tile = ({ label, value, hot }) => (
  <div className={"ptile" + (hot ? " hot" : "")}><b>{value}</b><span>{label}</span></div>
);
const Rows = ({ rows }) => (
  <dl className="prows">{rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>
);
const avg = (sum, n) => (n > 0 ? sum / n : null);

function Stats({ s, history }) {
  const rated = s.wins + s.losses + s.draws;
  const T = s.byGame.timesup, Q = s.byGame.quiest, B = s.byGame.blindtest;
  const rec = (g) => `${g.w} V · ${g.d} N · ${g.l} D`; // victoires · nuls · défaites
  return (
    <>
      <div className="ptiles">
        <Tile label="Parties" value={s.played} />
        <Tile label="Victoires" value={s.wins} />
        <Tile label="Défaites" value={s.losses} />
        <Tile label="Égalités" value={s.draws} />
        <Tile label="% de victoires" value={pct(s.wins, rated) == null ? "—" : pct(s.wins, rated) + " %"} />
        <Tile label="Série en cours" value={s.winStreak} hot={s.winStreak >= 3} />
        <Tile label="Meilleure série" value={s.bestWinStreak} />
      </div>

      <section className="pgame">
        <h3>Time's Up</h3>
        <Rows rows={[
          ["Parties jouées", T.p],
          ["Bilan (victoires · nuls · défaites)", rec(T)],
          ["Meilleur score d'équipe", T.best],
          ["Cartes trouvées", s.tu.cards],
          ["Cartes passées", s.tu.passes],
          ["Précision", pct(s.tu.cards, s.tu.cards + s.tu.passes) == null ? "—" : pct(s.tu.cards, s.tu.cards + s.tu.passes) + " %"],
          ["Tours joués", s.tu.turns],
          ["Parties en mode Bonus", s.tu.bonusGames],
        ]} />
      </section>
      <section className="pgame">
        <h3>Qui est-ce ?</h3>
        <Rows rows={[
          ["Parties jouées", Q.p],
          ["Bilan (victoires · nuls · défaites)", rec(Q)],
          ["Manches jouées", s.qe.rounds],
          ["Images trouvées", `${s.qe.found}${pct(s.qe.found, s.qe.rounds) == null ? "" : ` (${pct(s.qe.found, s.qe.rounds)} %)`}`],
          ["Premier à trouver", `${s.qe.firsts} fois`],
          ["Temps moyen", secs(avg(s.qe.msSum, s.qe.msN))],
          ["Record", secs(s.qe.fastest)],
        ]} />
      </section>
      <section className="pgame">
        <h3>Blind test</h3>
        <Rows rows={[
          ["Parties jouées", B.p],
          ["Bilan (victoires · nuls · défaites)", rec(B)],
          ["Meilleur score", B.best],
          ["Morceaux entendus", s.bt.songs],
          ["Trouvés en entier", `${s.bt.full}${pct(s.bt.full, s.bt.songs) == null ? "" : ` (${pct(s.bt.full, s.bt.songs)} %)`}`],
          ["Titre ou artiste seulement", s.bt.half],
          ["Temps de réponse moyen", secs(avg(s.bt.msSum, s.bt.msN))],
          ["Réponse la plus rapide", secs(s.bt.fastest)],
          ["Meilleure série dans une partie", s.bt.bestStreak],
          ["Parties sans faute", s.bt.perfect],
        ]} />
      </section>

      <section className="pgame">
        <h3>Dernières parties</h3>
        {history.length === 0 && <p className="muted pnote">Aucune partie terminée pour l'instant. Tes stats se remplissent à la fin de chaque partie.</p>}
        <ul className="phist">
          {history.slice(0, 10).map((h, i) => (
            <li key={h.t + ":" + i} className={h.result}>
              <b>{RESULT[h.result] || "—"}</b>
              <span>{GAMES[h.game] || h.game}{h.of > 1 ? ` · ${h.rank}/${h.of}` : ""}</span>
              <em>{h.pts} pts</em>
              <small>{new Date(h.t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Looks({ profile, equip }) {
  const [hint, setHint] = useState("");
  const cur = profile.look;
  const grid = (title, list, key, kind) => (
    <section className="pgame">
      <h3>{title}<small>{list.filter((x) => isUnlocked(profile, x.rule)).length}/{list.length}</small></h3>
      <div className={"pitems k" + kind}>
        {list.map((it) => {
          const open = isUnlocked(profile, it.rule), on = cur[key] === it.id;
          return (
            <button key={it.id} className={"itm" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} aria-label={`${it.name}${open ? "" : " (verrouillé)"}`}
              onClick={() => { if (open) { equip({ [key]: it.id }); setHint(`${it.name} équipé.`); } else setHint(`${it.name} : ${ruleText(it.rule)}`); }}>
              <Avatar look={{ ...cur, [key]: it.id }} size={46} />
              {!open && <Lock />}
              <span>{it.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
  return (
    <>
      <p className="phint" role="status">{hint || "Touche un élément pour l'équiper. Les cadenas se débloquent en montant de niveau ou avec des succès."}</p>
      {grid("Avatars", AVATARS, "a", "av")}
      {grid("Bordures", BORDERS, "b", "bd")}
      {grid("Couleurs", COLORS, "c", "co")}
    </>
  );
}

function Achievements({ profile }) {
  return (
    <ul className="pach">
      {ACHIEVEMENTS.map((a) => {
        const done = Boolean(profile.ach[a.id]);
        const [cur, target] = a.prog(profile.stats);
        const rewards = rewardsOf(a.id);
        return (
          <li key={a.id} className={done ? "done" : ""}>
            <div className="top"><b>{a.name}</b><em>{done ? "✓" : `${Math.min(cur, target)}/${target}`}</em></div>
            <p>{a.desc}</p>
            <div className="bar"><i style={{ width: `${done ? 100 : Math.round(100 * Math.min(1, cur / target))}%` }} /></div>
            <div className="rw"><span>+{a.xp} XP</span>{rewards.map((r) => <span key={r.kind + r.id} className={"r " + r.kind}>{KIND[r.kind]} · {r.name}</span>)}</div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Profile({ name, profile, equip, onBack }) {
  const [tab, setTab] = useState("stats");
  const pr = progressOf(profile.xp);
  return (
    <div className="screen prof">
      <div className="row" style={{ gap: 10 }}>
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <div><div className="eyebrow">Profil</div><h2 style={{ fontSize: "1.25rem" }}>{name || "Joueur"}</h2></div>
      </div>

      <div className="phero">
        <Avatar look={profile.look} size={92} />
        <div className="info">
          <div className="lvl"><b>Niveau {pr.lv}</b><small>{pr.max ? "niveau maximum" : `${pr.into}/${pr.need} XP`}</small></div>
          <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={pr.need} aria-valuenow={pr.into}><i style={{ width: `${Math.round(100 * pr.into / pr.need)}%` }} /></div>
          <small className="muted">{profile.stats.played} partie{profile.stats.played > 1 ? "s" : ""} · {Object.keys(profile.ach).length}/{ACHIEVEMENTS.length} succès</small>
        </div>
      </div>

      <div className="seg ptabs" role="tablist">
        {[["stats", "Stats"], ["look", "Apparence"], ["ach", "Succès"]].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={tab === id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="scroll">
        {tab === "stats" && <Stats s={profile.stats} history={profile.history} />}
        {tab === "look" && <Looks profile={profile} equip={equip} />}
        {tab === "ach" && <Achievements profile={profile} />}
        <p className="muted pnote">Ton profil est enregistré sur ce téléphone uniquement (pas de compte). Il ne suit pas d'un appareil à l'autre.</p>
      </div>
    </div>
  );
}
