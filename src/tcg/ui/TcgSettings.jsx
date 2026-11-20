// Réglages de Heavy is the Crown, présentés comme dans un jeu vidéo : les catégories dans une colonne à gauche (Compte,
// Partie, Affichage, Son, Testeur, Aide), leurs options à droite, avec de grands interrupteurs, des curseurs et des choix.
// Sur un téléphone, les catégories deviennent une rangée d'onglets en haut. Tout est enregistré sur cet appareil (prefs.js),
// sauf le pseudo et les outils du testeur (sur le compte).
import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { APPAREIL, DESKTOP, TRONE_ONLY, desktop } from "../../lib/device.js";
import { useFullscreen } from "../../lib/orientation.js";
import AccountBadge from "../../ui/AccountBadge.jsx";
import { setTcgPrefs, useTcgPrefs } from "../prefs.js";
import { canTest } from "../../config.js";
import { illustratedIds } from "./artStore.js";
import * as P from "../progress.js";
import { GAME_NAME } from "../rules.js";
import { baseThemes, moreThemes } from "../deck.js";
import "./settings.css";

/** Une ligne de réglage : icône, titre, explication, et le contrôle à droite (ou dessous sur un téléphone). */
function Line({ icon, label, hint, children, wide = false, off = false }) {
  return (
    <div className={"tsx-line" + (wide ? " wide" : "") + (off ? " off" : "")}>
      <span className="tsx-l"><span className="tsx-li"><Icon name={icon} size={19} /></span><span><b>{label}</b>{hint && <small>{hint}</small>}</span></span>
      <div className="tsx-c">{children}</div>
    </div>
  );
}
/** Un grand interrupteur. */
function Switch({ on, onChange, disabled, label, testid }) {
  return (
    <button className={"tsx-sw" + (on ? " on" : "")} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} data-testid={testid}>
      <i aria-hidden="true" /><span>{on ? "Oui" : "Non"}</span>
    </button>
  );
}
/** Un choix entre quelques options (chacune avec une petite explication). */
function Choice({ value, options, onPick, disabled, testid }) {
  return (
    <div className="tsx-choice" role="radiogroup">
      {options.map(([v, label, sub]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onPick(v)} data-testid={testid ? `${testid}-${v}` : undefined}>
          <b>{label}</b>{sub && <small>{sub}</small>}
        </button>
      ))}
    </div>
  );
}
function Pseudo({ name, onName }) {
  const [v, setV] = useState(name || "");
  useEffect(() => setV(name || ""), [name]);
  const n = v.trim().slice(0, 16);
  return (
    <form className="tsx-pseudo" onSubmit={(e) => { e.preventDefault(); if (n && n !== name) { onName(n); sfx.apply(); } }}>
      <input value={v} maxLength={16} onChange={(e) => setV(e.target.value)} aria-label="Pseudo" placeholder="Ton pseudo" data-testid="tsx-pseudo" />
      <button className="btn small primary" type="submit" disabled={!n || n === name}><Icon name="check" size={16} />Changer</button>
    </form>
  );
}

const KEYS = [
  ["Échap", "Revenir en arrière, fermer une fenêtre"],
  ["← →", "Feuilleter l'album et les cartes en grand"],
  ...(DESKTOP ? [["F11", "Plein écran"]] : []),
];

export default function TcgSettings({ onClose, acc, onAccount, onRules, t, setT, flash, name, onName }) {
  const p = useTcgPrefs();
  const full = useFullscreen();
  const tester = canTest(acc) && t && setT;
  const TABS = [
    { id: "account", icon: "user", label: "Compte", hint: "Connexion, pseudo" },
    { id: "game", icon: "gamepad", label: "Partie", hint: "Boosters, règles" },
    { id: "display", icon: "monitor", label: "Affichage", hint: "Animations, cartes, écran" },
    { id: "sound", icon: "sound", label: "Son", hint: "Effets, volume" },
    ...(tester ? [{ id: "test", icon: "flask", label: "Testeur", hint: "Outils de test" }] : []),
    { id: "help", icon: "help", label: "Aide", hint: "Règles, raccourcis" },
  ];
  const [tab, setTab] = useState("display");
  const [theme, setTheme] = useState("theme-dc");
  const cur = TABS.find((x) => x.id === tab) || TABS[0];
  const set = (patch) => { setTcgPrefs(patch); sfx.select(); };
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const panels = {
    account: (
      <>
        <Line icon="idcard" label="Ta progression" hint={acc && acc.user ? "Cartes, decks, niveau et Éclats sont sauvegardés sur ton compte." : `Sans compte, tout reste sur ${APPAREIL.ce}.`} wide>
          <AccountBadge acc={acc} onClick={onAccount ? () => { onClose(); onAccount(); } : undefined} testId="tset-account" />
        </Line>
        {onName && (
          <Line icon="edit" label="Pseudo" hint="Le nom que voient tes amis et tes adversaires (16 lettres au plus)." wide>
            <Pseudo name={name} onName={onName} />
          </Line>
        )}
      </>
    ),
    game: (
      <>
        <Line icon="gift" label="Ouverture des boosters et des Portails" hint="Animée (le paquet qui saute, l'orbe qui se brise), ou les cartes tout de suite.">
          <Choice value={p.tear} options={[[true, "Animation"], [false, "Directe"]]} onPick={(v) => set({ tear: v })} testid="tsx-tear" />
        </Line>
        {onRules && (
          <Line icon="book" label="Règles du jeu" hint="Le but, un round, les défis, les mots-clés, la construction d'un deck.">
            <button className="btn small" onClick={() => { onClose(); onRules(); }}><Icon name="book" size={16} />Lire les règles</button>
          </Line>
        )}
      </>
    ),
    display: (
      <>
        <Line icon="sparkles" label="Animations" hint="Cartes qui se retournent, vitrine qui flotte, transitions.">
          <Choice value={p.motion} options={[["full", "Complètes"], ["reduced", "Réduites"]]} onPick={(v) => set({ motion: v })} testid="tsx-motion" />
        </Line>
        <Line icon="grid" label="Taille des cartes" hint="Dans la collection, l'album et l'outil de deck, sur grand écran.">
          <Choice value={p.cards} options={[["s", "Petites", "plus de cartes"], ["m", "Moyennes"], ["l", "Grandes", "plus lisibles"]]} onPick={(v) => set({ cards: v })} testid="tsx-cards" />
        </Line>
        {DESKTOP && (
          <Line icon="scan" label="Plein écran" hint="Aussi avec la touche F11.">
            <Switch on={full} label="Plein écran" onChange={(v) => { const d = desktop(); if (d) d.setFullscreen(v); sfx.select(); }} testid="tsx-full" />
          </Line>
        )}
      </>
    ),
    sound: (
      <>
        <Line icon={p.sound ? "sound" : "mute"} label="Sons du jeu" hint="Boutons, boosters, cartes, parties.">
          <Switch on={p.sound} label="Sons du jeu" onChange={(v) => { setTcgPrefs({ sound: v }); if (v) sfx.select(); }} testid="tsx-sound" />
        </Line>
        <Line icon="sound" label="Volume" hint={p.sound ? `${Math.round(p.volume * 100)} %` : "Sons coupés"} off={!p.sound}>
          <div className="tsx-range">
            <Icon name="mute" size={16} />
            <input type="range" min={0} max={100} step={5} value={Math.round(p.volume * 100)} disabled={!p.sound}
              onChange={(e) => setTcgPrefs({ volume: Number(e.target.value) / 100 })} onPointerUp={() => sfx.select()} onKeyUp={() => sfx.select()}
              style={{ "--v": `${Math.round(p.volume * 100)}%` }} aria-label="Volume des sons du jeu" data-testid="tsx-volume" />
            <Icon name="sound" size={16} />
            <b>{Math.round(p.volume * 100)}</b>
          </div>
        </Line>
        <Line icon="hand" label="Son au survol des boutons" hint="Un petit son quand la souris passe sur un bouton." off={!p.sound}>
          <Switch on={p.hover} label="Son au survol" disabled={!p.sound} onChange={(v) => set({ hover: v })} />
        </Line>
      </>
    ),
    test: tester && (
      <div data-testid="tset-tester" className="tsx-test">
        <p className="tsx-note">Compte testeur ({acc && acc.user ? acc.user.email : "profil local"}) : seulement sur cet ordinateur (VITE_TESTEURS dans le fichier .env).{acc && acc.user ? " Sauvegardé sur ton compte." : ""}</p>
        <Line icon="gem" label="Éclats et jetons à volonté" hint={`Jamais moins de ${P.TEST_FLOOR.ec.toLocaleString("fr-FR")} Éclats et ${P.TEST_FLOOR.jet} jetons.`}>
          <Switch on={p.unlimited} label="Éclats et jetons à volonté" onChange={(v) => set({ unlimited: v })} />
        </Line>
        <Line icon="gift" label="Cadeaux" hint="S'ajoutent tout de suite à ta collection." wide>
          <div className="tsx-btns">
            <button className="btn small" onClick={() => { setT(P.testerGift(t, { ec: 10000 })); sfx.coin(); if (flash) flash("+10 000 Éclats"); }}><Icon name="gem" size={16} />+10 000 Éclats</button>
            <button className="btn small" onClick={() => { setT(P.testerGift(t, { jet: 50 })); sfx.coin(); if (flash) flash("+50 jetons de brillance"); }}><Icon name="sparkles" size={16} />+50 jetons</button>
            <button className="btn small" onClick={() => { setT(P.testerGift(t, { packs: { multi: 10 } })); sfx.apply(); if (flash) flash("+10 boosters Multivers"); }}><Icon name="gift" size={16} />+10 Multivers</button>
            <button className="btn small" onClick={() => { setT(P.testerGift(t, { packs: { prestige: 5 } })); sfx.apply(); if (flash) flash("+5 boosters Prestige"); }}><Icon name="gift" size={16} />+5 Prestige</button>
            <button className="btn small" onClick={() => { setT(P.testerGift(t, { tk: 10 })); sfx.coin(); if (flash) flash("+10 tickets de portail"); }}><Icon name="ticket" size={16} />+10 tickets</button>
            <button className="btn small" data-testid="tset-unlock" onClick={() => {
              const ids = illustratedIds();
              const r = P.unlockCards(t, ids);
              setT(r.t); sfx.win();
              if (flash) flash(ids.length ? `${ids.length} cartes illustrées : ${r.added} débloquée${r.added > 1 ? "s" : ""} (2 exemplaires, 1 pour les cartes 7).` : "Aucune carte illustrée trouvée (dossier illustrations vide ?).");
            }}><Icon name="image" size={16} />Débloquer les cartes illustrées</button>
          </div>
        </Line>
        <Line icon="layers" label="Recevoir un deck à thème" hint="Ses cartes, et le deck prêt à jouer dans Mes decks." wide>
          <div className="tsx-btns">
            <select className="tset-select" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Deck à thème" data-testid="tset-theme">
              <optgroup label="Decks de départ">{baseThemes().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
              <optgroup label="Autres decks à thème">{moreThemes().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            </select>
            <button className="btn small" data-testid="tset-theme-go" onClick={() => {
              const r = P.grantTheme(t, theme);
              if (r.error) { if (flash) flash(r.error); return; }
              setT(r.t); sfx.win();
              if (flash) flash(`Deck ${r.deck.name} reçu : ${r.added} carte${r.added > 1 ? "s" : ""} ajoutée${r.added > 1 ? "s" : ""}, il est dans Mes decks.`);
            }}><Icon name="gift" size={16} />Recevoir</button>
            {[[false, "tset-themes-all", `Les ${baseThemes().length} de départ`], [true, "tset-themes-more", `Les ${moreThemes().length} autres`]].map(([extra, tid, label]) => (
              <button key={tid} className="btn small primary" data-testid={tid} onClick={() => {
                const r = P.grantAllThemes(t, { extra });
                setT(r.t); sfx.win();
                if (flash) flash(r.decks ? `${r.decks} deck${r.decks > 1 ? "s" : ""} à thème reçu${r.decks > 1 ? "s" : ""} (${r.added} cartes) : ils sont dans Mes decks.` : `Tu as déjà ces decks à thème${r.added ? ` (${r.added} cartes rajoutées)` : ""}.`);
              }}><Icon name="layers" size={16} />{label}</button>
            ))}
          </div>
        </Line>
      </div>
    ),
    help: (
      <>
        {onRules && (
          <Line icon="book" label="Règles du jeu" hint="Expliquées en quelques pages, avec des exemples.">
            <button className="btn small primary" onClick={() => { onClose(); onRules(); }}><Icon name="book" size={16} />Lire les règles</button>
          </Line>
        )}
        <Line icon="keyboard" label="Raccourcis" hint="Au clavier, sur ordinateur." wide>
          <ul className="tsx-keys">{KEYS.map(([k, s]) => <li key={k}><kbd>{k}</kbd><span>{s}</span></li>)}</ul>
        </Line>
        <Line icon="crown" label={GAME_NAME} hint={`Réglages enregistrés sur ${APPAREIL.ce}${TRONE_ONLY ? "" : ", seulement pour ce jeu"}.`} wide />
      </>
    ),
  };

  return (
    <div className="tsx" role="dialog" aria-label={`Réglages de ${GAME_NAME}`} data-testid="tcg-settings">
      <div className="tsx-frame">
        <header className="tsx-top">
          <button className="iconbtn" onClick={onClose} aria-label="Fermer les réglages"><Icon name="back" /></button>
          <h2><Icon name="settings" size={22} />Réglages</h2>
          <small>{GAME_NAME}</small>
        </header>
        <div className="tsx-body">
          <nav className="tsx-tabs" role="tablist" aria-label="Catégories">
            {TABS.map((x) => (
              <button key={x.id} role="tab" aria-selected={tab === x.id} className={"tsx-tab" + (tab === x.id ? " on" : "")} onClick={() => { setTab(x.id); sfx.select(); }} data-testid={"tsx-tab-" + x.id}>
                <span className="tsx-ti"><Icon name={x.icon} size={20} /></span>
                <span className="tsx-tt"><b>{x.label}</b><small>{x.hint}</small></span>
              </button>
            ))}
          </nav>
          <section className="tsx-panel" role="tabpanel" key={cur.id} aria-label={cur.label}>
            <h3 className="tsx-ph"><Icon name={cur.icon} size={22} />{cur.label}</h3>
            {panels[cur.id]}
          </section>
        </div>
      </div>
    </div>
  );
}
