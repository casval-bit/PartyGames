import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";

/** Écran d'accueil : emblème holographique (anneau de scan, icônes des jeux en orbite) et logo ; on touche pour lancer la virtualisation. */
export default function Splash({ onTap }) {
  const [ready, setReady] = useState(false);
  const [boom, setBoom] = useState(false);
  const [want, setWant] = useState(false); // touché avant la fin du chargement : on lance dès que c'est prêt

  useEffect(() => {
    // « chargement » : polices prêtes, au moins 1,3 s pour laisser jouer l'animation
    const min = new Promise((r) => setTimeout(r, 1300));
    const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
    Promise.all([min, fonts.catch(() => {})]).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !want) return undefined;
    setBoom(true);
    const t = setTimeout(onTap, 380);
    return () => clearTimeout(t);
  }, [ready, want]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = () => setWant(true);
  const orbit = ["hourglass", "help", "music", "gamepad", "dice", "image"];
  return (
    <div className="splash" onClick={tap} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && tap()} aria-label="Toucher l'écran pour commencer">
      <div className="emblem" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs>
            <radialGradient id="emg" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#1d4f9e" /><stop offset="1" stopColor="#070d1c" /></radialGradient>
            <linearGradient id="ems" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5ee1ff" stopOpacity="0" /><stop offset="1" stopColor="#5ee1ff" stopOpacity=".7" /></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="88" fill="url(#emg)" stroke="#1f3a66" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="76" fill="none" stroke="#5ee1ff" strokeOpacity=".45" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="58" fill="none" stroke="#2f8bff" strokeOpacity=".5" strokeWidth="1" />
          <g className="em-grid" stroke="#5ee1ff" strokeOpacity=".1">{[60, 80, 100, 120, 140].map((v) => <g key={v}><line x1={v} y1="30" x2={v} y2="170" /><line x1="30" y1={v} x2="170" y2={v} /></g>)}</g>
          <rect className="em-scan" x="24" y="0" width="152" height="26" fill="url(#ems)" />
          <path d="M100 66l7 20 20 7-20 7-7 20-7-20-20-7 20-7z" fill="#dffcff" stroke="#5ee1ff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <div className="em-orbit">{orbit.map((n, i) => <span key={n} style={{ "--i": i }}><Icon name={n} size={18} stroke={1.6} /></span>)}</div>
      </div>

      <h1 className="logo" aria-label="Party Hub">
        {["PARTY", "HUB"].map((w, wi) => (
          <b key={w} className="word" aria-hidden="true">
            {[...w].map((ch, i) => <span key={i} className={"lt c" + ((i + wi * 5) % 4)} style={{ animationDelay: `${0.35 + (i + wi * 5) * 0.06}s` }}>{ch}</span>)}
          </b>
        ))}
      </h1>
      <div className="eyebrow">Terminal de virtualisation</div>

      {ready ? <div className="tap"><Icon name="scan" size={16} /> Touche pour lancer le transfert</div> : <div className="loadbar" aria-label="Chargement"><i /></div>}
      <p className="muted" style={{ fontSize: ".78rem", opacity: ready ? 1 : 0 }}>Time's Up · Qui est-ce ? · Blind test · Frise · Mini-jeux · Plateau</p>
      {boom && <i className="boom" />}
    </div>
  );
}
