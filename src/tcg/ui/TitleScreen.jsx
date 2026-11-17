// Écran titre de Heavy is the Crown (appli du jeu seul) : une couronne dorée qui s'allume, des cartes qui tournent autour,
// des braises qui montent, le nom du jeu gravé. On entre d'un clic (ou Entrée). Sans pseudo, on le choisit ici d'abord.
// En haut : le compte (connexion par e-mail : la progression est sauvegardée et suit le joueur).
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../ui/Icon.jsx";
import AccountBadge from "../../ui/AccountBadge.jsx";
import { DESKTOP } from "../../lib/device.js";
import { GAME_NAME } from "../rules.js";
import { CardBack } from "./Card.jsx";

const TAGLINE = "Toutes les légendes. Une seule couronne.";

/** La couronne de l'écran titre (SVG) : cinq pointes, des gemmes, un reflet qui passe. */
export function CrownMark({ size = 160, className = "" }) {
  return (
    <svg className={"crownmark " + className} viewBox="0 0 200 160" width={size} height={size * 0.8} aria-hidden="true">
      <defs>
        <linearGradient id="cmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c8" /><stop offset=".35" stopColor="#ffd166" /><stop offset=".7" stopColor="#c48a1c" /><stop offset="1" stopColor="#7a4c0e" />
        </linearGradient>
        <linearGradient id="cmBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#9b6514" />
        </linearGradient>
        <radialGradient id="cmRuby" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ffd0d6" /><stop offset=".45" stopColor="#e5304e" /><stop offset="1" stopColor="#6d0718" /></radialGradient>
        <radialGradient id="cmSaph" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#d6ecff" /><stop offset=".45" stopColor="#3b82f6" /><stop offset="1" stopColor="#0c2a66" /></radialGradient>
        <radialGradient id="cmEmer" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#d6ffe9" /><stop offset=".45" stopColor="#1fbf75" /><stop offset="1" stopColor="#064d2c" /></radialGradient>
        <linearGradient id="cmShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="cmClip"><path d="M20 128 L12 46 L52 82 L72 30 L100 70 L128 30 L148 82 L188 46 L180 128 Z" /></clipPath>
      </defs>
      <path className="cm-body" d="M20 128 L12 46 L52 82 L72 30 L100 70 L128 30 L148 82 L188 46 L180 128 Z" fill="url(#cmGold)" stroke="#5a3608" strokeWidth="3" strokeLinejoin="round" />
      <rect x="18" y="114" width="164" height="26" rx="6" fill="url(#cmBand)" stroke="#5a3608" strokeWidth="3" />
      {[[12, 46], [72, 30], [128, 30], [188, 46], [100, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y - (i === 4 ? 0 : 4)} r={i === 4 ? 7 : 8} fill="url(#cmGold)" stroke="#5a3608" strokeWidth="2.5" />)}
      <ellipse cx="100" cy="127" rx="11" ry="8" fill="url(#cmRuby)" stroke="#5a3608" strokeWidth="2" />
      <ellipse cx="58" cy="127" rx="8" ry="6" fill="url(#cmSaph)" stroke="#5a3608" strokeWidth="2" />
      <ellipse cx="142" cy="127" rx="8" ry="6" fill="url(#cmEmer)" stroke="#5a3608" strokeWidth="2" />
      <g clipPath="url(#cmClip)"><rect className="cm-shine" x="-60" y="0" width="50" height="160" fill="url(#cmShine)" transform="skewX(-20)" /></g>
    </svg>
  );
}

export default function TitleScreen({ name, setName, acc, onAccount, onEnter }) {
  const [ready, setReady] = useState(false);
  const [boom, setBoom] = useState(false);
  const [pseudo, setPseudo] = useState(name || "");
  const need = !String(name || "").trim();
  const done = useRef(false);
  useEffect(() => { // polices prêtes, au moins 1,2 s pour laisser la couronne s'allumer
    const min = new Promise((r) => setTimeout(r, 1200));
    const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
    Promise.all([min, fonts.catch(() => {})]).then(() => setReady(true));
  }, []);
  const go = () => {
    if (!ready || done.current) return;
    if (need) { const p = pseudo.trim().slice(0, 16); if (!p) return; setName(p); }
    done.current = true;
    setBoom(true);
    setTimeout(onEnter, 420);
  };
  useEffect(() => {
    const k = (e) => { if ((e.key === "Enter" || e.key === " ") && !need && !e.target.closest("input,button,textarea")) go(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const embers = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ i, x: (i * 37) % 100, d: 6 + ((i * 13) % 9), s: 2 + (i % 3), delay: (i * 0.71) % 8 })), []);
  return (
    <div className={"hts" + (ready ? " on" : "") + (boom ? " boom" : "")} onClick={need ? undefined : go} data-testid="title-screen">
      <div className="hub-bg" aria-hidden="true" />
      <div className="hts-rays" aria-hidden="true" />
      <div className="hts-embers" aria-hidden="true">{embers.map((e) => <i key={e.i} style={{ "--x": e.x + "%", "--d": e.d + "s", "--s": e.s + "px", "--dl": e.delay + "s" }} />)}</div>
      <div className="hts-orbit" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ "--i": i }}><CardBack w={54} /></span>)}</div>

      <header className="hts-top" onClick={(e) => e.stopPropagation()}>
        {acc && <AccountBadge acc={acc} onClick={onAccount} compact testId="ts-account" />}
      </header>

      <div className="hts-center">
        <CrownMark size={170} className="hts-crown" />
        <h1 className="hts-title" aria-label={GAME_NAME}>
          {GAME_NAME.split(" ").map((w, i) => <span key={i} className="hts-w" style={{ "--i": i }}>{w}</span>)}
        </h1>
        <p className="hts-tag">{TAGLINE}</p>
      </div>

      <div className="hts-bottom" onClick={(e) => e.stopPropagation()}>
        {need ? (
          <form className="hts-pseudo" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <label htmlFor="ts-pseudo">Ton pseudo</label>
            <div className="row" style={{ gap: 8 }}>
              <input id="ts-pseudo" className="hub-search" value={pseudo} maxLength={16} autoComplete="nickname" placeholder="Comment t'appelle-t-on ?" onChange={(e) => setPseudo(e.target.value)} data-testid="ts-pseudo" />
              <button className="btn primary" type="submit" disabled={!ready || !pseudo.trim()} data-testid="ts-enter"><Icon name="play" size={18} />Entrer</button>
            </div>
            {acc && acc.enabled && !acc.user && <small className="muted">Déjà un compte ? <button type="button" className="hts-link" onClick={onAccount}>Connecte-toi</button> : ton pseudo et ta collection reviennent.</small>}
          </form>
        ) : ready ? (
          <button className="hts-press" onClick={go} data-testid="ts-enter"><Icon name="play" size={16} />{DESKTOP ? "Clique ou appuie sur Entrée" : "Touche pour entrer"}</button>
        ) : <div className="loadbar" aria-label="Chargement"><i /></div>}
        <small className="hts-save">{acc && acc.user ? "Ta progression est sauvegardée sur ton compte." : acc && acc.enabled ? "Connecte-toi avec ton e-mail pour sauvegarder ta progression." : "Profil local : il reste sur cet appareil."}</small>
      </div>
      {boom && <i className="hts-boom" aria-hidden="true" />}
    </div>
  );
}
