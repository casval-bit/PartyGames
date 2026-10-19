import { useEffect, useState } from "react";

export default function Splash({ onTap }) {
  const [ready, setReady] = useState(false);
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    // "chargement" : polices + cartes prêtes, au moins 1,3 s pour laisser jouer l'animation
    const min = new Promise((r) => setTimeout(r, 1300));
    const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
    Promise.all([min, fonts.catch(() => {})]).then(() => setReady(true));
  }, []);

  const tap = () => {
    if (!ready || boom) return;
    setBoom(true);
    setTimeout(onTap, 420);
  };

  return (
    <div className="splash" onClick={tap} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && tap()} aria-label="Toucher l'écran pour commencer">
      <div className="bomb">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="bg" cx="38%" cy="32%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfe3ff" /></radialGradient>
            <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff4c4" /><stop offset=".5" stopColor="#e0b552" /><stop offset="1" stopColor="#a8751f" /></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#bg)" stroke="#1d2457" strokeWidth="8" />
          <circle cx="100" cy="100" r="78" fill="none" stroke="#7aa6ee" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
          <g className="orbit">
            {/* sablier : Time's Up */}
            <g transform="translate(100 34)"><circle r="22" fill="#ff9d00" stroke="#1d2457" strokeWidth="5" />
              <path d="M-8 -11h16c0 7-6 8-6 11s6 4 6 11h-16c0-7 6-8 6-11s-6-4-6-11z" fill="#fff" /></g>
            {/* cadre + ? : Qui est-ce ? */}
            <g transform="translate(157 133)"><circle r="22" fill="#2f8bff" stroke="#1d2457" strokeWidth="5" />
              <rect x="-11" y="-11" width="22" height="22" rx="4" fill="none" stroke="#fff" strokeWidth="2.5" />
              <text y="7" textAnchor="middle" fontSize="19" fontWeight="900" fill="#fff" fontFamily="Fredoka, sans-serif">?</text></g>
            {/* note : Blind test */}
            <g transform="translate(43 133)"><circle r="22" fill="#ff3b6b" stroke="#1d2457" strokeWidth="5" />
              <path d="M-3 -11v14a5 5 0 1 0 3 4.500V-5h8v-6z" fill="#fff" /></g>
          </g>
          <g className="hubstar">
            <path d="M100 62l9 22 23 9-23 9-9 23-9-23-23-9 23-9z" fill="#ffd400" stroke="#1d2457" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="100" cy="95" r="4" fill="#fff" />
          </g>
        </svg>
      </div>

      <h1 className="logo" aria-label="Party Hub">
        {["PARTY", "HUB"].map((w, wi) => (
          <b key={w} className="word" aria-hidden="true">
            {[...w].map((ch, i) => <span key={i} className={"lt c" + ((i + wi * 5) % 4)} style={{ animationDelay: `${0.45 + (i + wi * 5) * 0.07}s` }}>{ch}</span>)}
          </b>
        ))}
      </h1>

      {ready ? <div className="tap">TOUCHEZ L'ÉCRAN</div> : <div className="loadbar" aria-label="Chargement"><i /></div>}
      <p className="muted" style={{ fontSize: ".78rem", fontWeight: 700, opacity: ready ? 1 : 0 }}>Time's Up · Qui est-ce ? · Blind test</p>
      {boom && <i className="boom" />}
    </div>
  );
}
