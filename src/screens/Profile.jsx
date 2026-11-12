// Profil : carte d'identité recto/verso (fiche personnage / arbre des succès zoomable), puis les statistiques jeu par jeu.
import { useMemo, useState } from "react";
import { Avatar3DImg } from "../avatar3d/Avatar3D.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { Icon } from "../ui/Icon.jsx";
import AchTree from "../ui/AchTree.jsx";
import { ACHIEVEMENTS, BORDERS, COLORS, isUnlocked, ruleText, progressOf, pct, secs, xOf } from "../data/profile.js";
import { sfx } from "../lib/sfx.js";

const GAMES = { timesup: "Time's Up", quiest: "Qui est-ce ?", blindtest: "Blind test", timeline: "Frise", party: "Mini-jeux", board: "Plateau", petitbac: "Petit bac", celeb: "Célébrité", trone: "Trône des Mondes", loupgarou: "Loup-garou" };
const GICON = { timesup: "hourglass", quiest: "eye", blindtest: "music", timeline: "history", party: "gamepad", board: "dice", petitbac: "edit", celeb: "image", trone: "crown", loupgarou: "moon" };
const RESULT = { win: "Victoire", loss: "Défaite", draw: "Égalité", solo: "Solo" };
const avg = (sum, n) => (n > 0 ? sum / n : null);
const idOf = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 6); };

/** Bloc de statistiques d'un jeu : bilan en pastilles, chiffres clés, barres. */
function GameCard({ id, g, rows, bars = [] }) {
  const rated = g.w + g.l + g.d;
  return (
    <section className="gcard" data-game={id}>
      <header>
        <span className="gico" aria-hidden="true"><Icon name={GICON[id]} size={20} /></span>
        <div><b>{GAMES[id]}</b><small>{g.p} partie{g.p > 1 ? "s" : ""}</small></div>
        <div className="gpills"><span className="pill ok">{g.w} V</span><span className="pill dim">{g.d} N</span><span className="pill pink">{g.l} D</span></div>
      </header>
      {rated > 0 && <span className={"bar2" + (pct(g.w, rated) < 34 ? " low" : "")} title="Taux de victoire"><i style={{ width: `${pct(g.w, rated)}%` }} /></span>}
      <dl className="gnums">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {bars.map(([k, a, b]) => (
        <div className="gbar" key={k}><span>{k}</span><span className={"bar2" + (pct(a, b) != null && pct(a, b) < 34 ? " low" : "")}><i style={{ width: `${pct(a, b) || 0}%` }} /></span><em>{pct(a, b) == null ? "—" : pct(a, b) + " %"}</em></div>
      ))}
    </section>
  );
}

function Stats({ s, history }) {
  const B = s.byGame;
  return (
    <>
      <GameCard id="timesup" g={B.timesup} rows={[["Meilleur score d'équipe", B.timesup.best], ["Cartes trouvées", s.tu.cards], ["Tours joués", s.tu.turns], ["Parties Bonus", s.tu.bonusGames]]} bars={[["Précision", s.tu.cards, s.tu.cards + s.tu.passes]]} />
      <GameCard id="quiest" g={B.quiest} rows={[["Images trouvées", s.qe.found], ["Premier à trouver", s.qe.firsts], ["Temps moyen", secs(avg(s.qe.msSum, s.qe.msN))], ["Record", secs(s.qe.fastest)]]} bars={[["Réussite", s.qe.found, s.qe.rounds]]} />
      <GameCard id="blindtest" g={B.blindtest} rows={[["Meilleur score", B.blindtest.best], ["Morceaux entendus", s.bt.songs], ["Réponse moyenne", secs(avg(s.bt.msSum, s.bt.msN))], ["Plus rapide", secs(s.bt.fastest)], ["Meilleure série", s.bt.bestStreak], ["Sans faute", s.bt.perfect]]} bars={[["Trouvés en entier", s.bt.full, s.bt.songs]]} />
      <GameCard id="timeline" g={B.timeline} rows={[["Plus longue frise", B.timeline.best], ["Tours joués", s.tl.turns]]} bars={[["Bien placées", s.tl.hits, s.tl.turns]]} />
      <GameCard id="party" g={B.party} rows={[["Meilleur total", B.party.best], ["Manches jouées", s.mg.rounds], ["Manches gagnées", s.mg.wins]]} bars={[["Amis bien devinés", s.mg.fqRight, s.mg.fqTotal], ["Manches gagnées", s.mg.wins, s.mg.rounds]]} />
      <GameCard id="board" g={B.board} rows={[["Record de gemmes", B.board.best]]} />
      <GameCard id="petitbac" g={B.petitbac} rows={[["Meilleur score", B.petitbac.best], ["Manches", s.pb.rounds], ["Réponses valides", s.pb.valid]]} bars={[["Réponses uniques", s.pb.unique, s.pb.valid]]} />
      <GameCard id="celeb" g={B.celeb} rows={[["Trouvées", s.cc.found], ["Coups en moyenne", s.cc.found ? (s.cc.strokes / s.cc.found).toFixed(1).replace(".", ",") : "—"], ["Du premier coup", s.cc.aces]]} bars={[["Réussite", s.cc.found, s.cc.rounds]]} />
      <GameCard id="trone" g={B.trone} rows={[["Record de Pouvoir", B.trone.best]]} />
      <GameCard id="loupgarou" g={B.loupgarou} rows={[["Survies jusqu'à la fin", B.loupgarou.pts]]} />
      <section className="gcard">
        <header><span className="gico" aria-hidden="true"><Icon name="history" size={20} /></span><div><b>Dernières parties</b><small>{history.length ? `${Math.min(10, history.length)} plus récentes` : "aucune pour l'instant"}</small></div></header>
        {history.length === 0 && <p className="muted pnote">Tes stats se remplissent à la fin de chaque partie.</p>}
        <ul className="phist">
          {history.slice(0, 10).map((h, i) => (
            <li key={h.t + ":" + i} className={h.result}>
              <span className="phico" aria-hidden="true"><Icon name={GICON[h.game] || "gamepad"} size={16} /></span>
              <span><b>{GAMES[h.game] || h.game}</b><small>{new Date(h.t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{h.of > 1 ? ` · ${h.rank}/${h.of}` : ""}</small></span>
              <em>{h.pts} pts</em>
              <span className={"pill " + (h.result === "win" ? "ok" : h.result === "loss" ? "pink" : "dim")}>{RESULT[h.result] || "—"}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Pastille (fond + bordure) visible dans les lobbys et classements. */
function Badge({ profile, equip }) {
  const [hint, setHint] = useState("");
  const cur = profile.look;
  const grid = (title, list, key) => (
    <div className="bgrid">
      <h4>{title}<small>{list.filter((x) => isUnlocked(profile, x.rule)).length}/{list.length}</small></h4>
      <div className="pitems">
        {list.map((it) => {
          const open = isUnlocked(profile, it.rule), on = cur[key] === it.id;
          return (
            <button key={it.id} className={"itm" + (on ? " on" : "") + (open ? "" : " locked")} aria-pressed={on} aria-label={`${it.name}${open ? "" : " (verrouillé)"}`}
              onClick={() => { if (open) { equip({ [key]: it.id }); setHint(`${it.name} équipé.`); sfx.select(); } else setHint(`${it.name} : ${ruleText(it.rule)}`); }}>
              <Avatar look={{ ...cur, [key]: it.id }} size={44} />
              {!open && <Icon name="lock" size={12} className="lk" />}
              <span>{it.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <section className="gcard">
      <header><span className="gico" aria-hidden="true"><Icon name="badge" size={20} /></span><div><b>Pastille</b><small>Ta vignette dans les lobbys et les classements</small></div></header>
      <p className="phint" role="status">{hint}</p>
      {grid("Bordures", BORDERS, "b")}
      {grid("Couleurs de fond", COLORS, "c")}
    </section>
  );
}

export default function Profile({ name, profile, equip, onBack, acc, onAccount, onStudio }) {
  const [flip, setFlip] = useState(false);
  const pr = progressOf(profile.xp);
  const s = profile.stats, rated = s.wins + s.losses + s.draws;
  const x = useMemo(() => xOf(profile.look), [profile.look]);
  const toggle = () => { setFlip((f) => !f); sfx.flip(); };
  return (
    <div className="screen prof">
      <div className="row" style={{ gap: 10 }}>
        <button className="iconbtn" onClick={onBack} aria-label="Retour"><Icon name="back" /></button>
        <div style={{ flex: 1 }}><div className="eyebrow">Profil</div><h2 style={{ fontSize: "1.25rem" }}>{name || "Joueur"}</h2></div>
        <Settings />
      </div>

      <div className="scroll">
        {/* carte d'identité recto / verso */}
        <div className={"idcard" + (flip ? " flipped" : "")}>
          <div className="idc-in">
            <div className="idc-face front">
              <div className="idc-head"><span className="eyebrow">Carte d'identité virtuelle</span><span className="idc-num">ID {idOf(name || "Joueur")}</span></div>
              <div className="idc-body">
                <button className="idc-portrait scanv" onClick={onStudio} aria-label="Personnaliser mon personnage" data-testid="prof-customize">
                  <Avatar3DImg x={x} view="bust" size={300} fallback={<span className="stph" />} />
                </button>
                <div className="idc-info">
                  <b className="idc-name">{name || "Joueur"}</b>
                  <div className="idc-lv"><span className="pill">Niveau {pr.lv}</span><small>{pr.max ? "niveau maximum" : `${pr.into}/${pr.need} XP`}</small></div>
                  <span className="bar2 blue" role="progressbar" aria-valuemin={0} aria-valuemax={pr.need} aria-valuenow={pr.into}><i style={{ width: `${Math.round((100 * pr.into) / pr.need)}%` }} /></span>
                  <dl className="idc-stats">
                    <div><dt>Parties</dt><dd>{s.played}</dd></div>
                    <div><dt>Victoires</dt><dd>{s.wins}</dd></div>
                    <div><dt>Réussite</dt><dd>{pct(s.wins, rated) == null ? "—" : pct(s.wins, rated) + "%"}</dd></div>
                    <div><dt>Série</dt><dd className={s.winStreak >= 3 ? "hot" : ""}>{s.winStreak}</dd></div>
                  </dl>
                </div>
              </div>
              <div className="idc-foot">
                <button className="btn small primary" onClick={onStudio}><Icon name="palette" size={18} /> Personnaliser</button>
                <button className="btn small" onClick={toggle} data-testid="id-flip"><Icon name="flow" size={18} /> Succès ({Object.keys(profile.ach).length}/{ACHIEVEMENTS.length})</button>
              </div>
            </div>
            <div className="idc-face back">
              <div className="idc-head"><span className="eyebrow">Arbre des succès</span><button className="iconbtn small" onClick={toggle} aria-label="Retourner la carte"><Icon name="idcard" size={18} /></button></div>
              {flip && <AchTree profile={profile} />}
            </div>
          </div>
        </div>

        <Stats s={s} history={profile.history} />
        <Badge profile={profile} equip={equip} />

        {acc && acc.enabled ? (
          <button className={"profbtn accbtn" + (acc.user ? " in" : "")} onClick={onAccount} data-testid="prof-account">
            <span className="accdot" aria-hidden="true"><Icon name={acc.user ? "check" : "mail"} size={18} /></span>
            <span><strong>{acc.user ? "Sauvegardé sur ton compte" : "Profil enregistré sur ce téléphone"}</strong><small>{acc.user ? acc.user.email : "Connecte-toi par e-mail pour ne pas le perdre"}</small></span>
            <Icon name="next" />
          </button>
        ) : (
          <p className="muted pnote">Ton profil est enregistré sur ce téléphone uniquement. Il ne suit pas d'un appareil à l'autre.</p>
        )}
      </div>
    </div>
  );
}

/** Réglages rapides : sons d'interface, couleur de la coque (grand écran). */
function Settings() {
  const [open, setOpen] = useState(false), [on, setOn] = useState(sfx.on);
  const [red, setRed] = useState(() => { try { return localStorage.getItem("ph-shell") === "red"; } catch { return false; } });
  const shell = (v) => { setRed(v); try { localStorage.setItem("ph-shell", v ? "red" : "dark"); } catch { /* rien */ } window.dispatchEvent(new Event("ph-shell")); };
  return (
    <>
      <button className="iconbtn" onClick={() => { setOpen(true); sfx.open(); }} aria-label="Réglages"><Icon name="settings" /></button>
      {open && (
        <div className="modalwrap" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Réglages">
            <div className="row spread"><h3>Réglages</h3><button className="iconbtn" onClick={() => setOpen(false)} aria-label="Fermer"><Icon name="close" /></button></div>
            <div className="setrow"><span><Icon name={on ? "sound" : "mute"} /> Sons d'interface</span><div className="seg"><button aria-pressed={on} onClick={() => { sfx.set(true); setOn(true); sfx.select(); }}>Oui</button><button aria-pressed={!on} onClick={() => { sfx.set(false); setOn(false); }}>Non</button></div></div>
            <div className="setrow"><span><Icon name="tablet" /> Coque (grand écran)</span><div className="seg"><button aria-pressed={!red} onClick={() => shell(false)}>Noire</button><button aria-pressed={red} onClick={() => shell(true)}>Rouge et blanche</button></div></div>
          </div>
        </div>
      )}
    </>
  );
}
