import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { DESKTOP } from "../lib/device.js";

const ORBIT = ["hourglass", "help", "music", "history", "gamepad", "dice", "moon", "crown"]; // un jeu par icône (Time's Up… Trône des Mondes)

/**
 * Écran d'accueil : emblème holographique (anneaux qui tournent en sens contraires, rayons, cœur qui pulse en ondes),
 * jeux en orbite qui s'allument chacun leur tour, poussières de lumière, logo qui monte et qu'un reflet traverse.
 * On touche (ou clique, ou Entrée) pour entrer.
 */
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
    const k = (e) => { if (e.key === "Enter" || e.key === " ") setWant(true); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    if (!ready || !want) return undefined;
    setBoom(true);
    const t = setTimeout(onTap, 380);
    return () => clearTimeout(t);
  }, [ready, want]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = () => setWant(true);
  return (
    <div className="splash" onClick={tap} role="button" tabIndex={0} aria-label={DESKTOP ? "Cliquer pour commencer" : "Toucher l'écran pour commencer"}>
      <div className="dust" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--k": i }} />)}</div>
      <div className="emblem" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs>
            <radialGradient id="emg" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#1d4f9e" /><stop offset="1" stopColor="#070d1c" /></radialGradient>
            <radialGradient id="emc" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#dffcff" stopOpacity=".95" /><stop offset=".35" stopColor="#5ee1ff" stopOpacity=".5" /><stop offset="1" stopColor="#5ee1ff" stopOpacity="0" /></radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#emg)" stroke="#1f3a66" strokeWidth="1.5" />
          <g className="em-rays" stroke="#5ee1ff" strokeLinecap="round">
            {Array.from({ length: 12 }, (_, i) => <line key={i} x1="100" y1="44" x2="100" y2={i % 2 ? 30 : 22} strokeOpacity={i % 2 ? 0.25 : 0.45} strokeWidth={i % 2 ? 1 : 1.6} transform={`rotate(${i * 30} 100 100)`} />)}
          </g>
          <circle className="em-ringA" cx="100" cy="100" r="82" fill="none" stroke="#5ee1ff" strokeOpacity=".5" strokeWidth="1.2" strokeDasharray="1.5 7" />
          <circle className="em-ringB" cx="100" cy="100" r="70" fill="none" stroke="#2f8bff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" strokeDasharray="70 40" />
          <circle className="em-ringC" cx="100" cy="100" r="58" fill="none" stroke="#b48cff" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="18 12 4 12" />
          <circle className="em-wave" cx="100" cy="100" r="20" fill="none" stroke="#5ee1ff" strokeWidth="1.5" />
          <circle className="em-wave w2" cx="100" cy="100" r="20" fill="none" stroke="#5ee1ff" strokeWidth="1.5" />
          <circle className="em-glow" cx="100" cy="100" r="34" fill="url(#emc)" />
          <g className="em-core"><path d="M100 70l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="#effdff" stroke="#5ee1ff" strokeWidth="1.5" strokeLinejoin="round" /></g>
        </svg>
        <div className="em-orbit" style={{ "--n": ORBIT.length }}>{ORBIT.map((n, i) => <span key={n} style={{ "--i": i }}><Icon name={n} size={18} stroke={1.6} /></span>)}</div>
      </div>

      <h1 className="logo" aria-label="Party Hub">
        {["PARTY", "HUB"].map((w, wi) => (
          <b key={w} className="word" aria-hidden="true">
            {[...w].map((ch, i) => <span key={i} className={"lt c" + ((i + wi * 5) % 4)} style={{ "--i": i + wi * 5 }}>{ch}</span>)}
          </b>
        ))}
      </h1>
      <div className="eyebrow">Jeux de soirée entre amis</div>

      {ready
        ? <div className="tap"><Icon name="play" size={16} /> {DESKTOP ? "Clique ou appuie sur Entrée" : "Touche l'écran pour commencer"}</div>
        : <div className="loadbar" aria-label="Chargement"><i /></div>}
      <p className="muted splash-games" style={{ opacity: ready ? 1 : 0 }}>Time's Up · Qui est-ce ? · Blind test · Frise · Célébrité · Petit bac · Mini-jeux · Plateau · Loup-garou · Trône des Mondes</p>
      {boom && <i className="boom" />}
    </div>
  );
}
