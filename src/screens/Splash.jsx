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
            <radialGradient id="bg" cx="38%" cy="32%" r="75%"><stop offset="0" stopColor="#4a3470" /><stop offset="1" stopColor="#1d1330" /></radialGradient>
            <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff4c4" /><stop offset=".5" stopColor="#e0b552" /><stop offset="1" stopColor="#a8751f" /></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#bg)" stroke="#fff1d6" strokeWidth="5" />
          <circle cx="100" cy="100" r="78" fill="none" stroke="#433260" strokeWidth="2" strokeDasharray="2 7" />
          <g className="orbit">
            {/* sablier : Time's Up */}
            <g transform="translate(100 34)"><circle r="21" fill="#2a1c42" stroke="#ff7a2f" strokeWidth="3" />
              <path d="M-8 -11h16c0 7-6 8-6 11s6 4 6 11h-16c0-7 6-8 6-11s-6-4-6-11z" fill="#fff1d6" /></g>
            {/* cadre + ? : Qui est-ce ? */}
            <g transform="translate(157 133)"><circle r="21" fill="#2a1c42" stroke="#4aa8ff" strokeWidth="3" />
              <rect x="-11" y="-11" width="22" height="22" rx="4" fill="none" stroke="#fff1d6" strokeWidth="2.5" />
              <text y="7" textAnchor="middle" fontSize="19" fontWeight="900" fill="#fff1d6" fontFamily="Bungee, sans-serif">?</text></g>
            {/* note : Blind test */}
            <g transform="translate(43 133)"><circle r="21" fill="#2a1c42" stroke="#ff5d9e" strokeWidth="3" />
              <path d="M-3 -11v14a5 5 0 1 0 3 4.500V-5h8v-6z" fill="#fff1d6" /></g>
          </g>
          <g className="hubstar">
            <path d="M100 66l8 21 21 8-21 8-8 21-8-21-21-8 21-8z" fill="url(#gd)" />
            <circle cx="100" cy="95" r="4" fill="#fff" />
          </g>
        </svg>
      </div>

      <h1 className="logo" aria-label="Party Hub">
        <span style={{ animationDelay: ".5s" }}>PARTY</span>
        <span className="w2" style={{ animationDelay: ".72s" }}>HUB</span>
      </h1>

      {ready ? <div className="tap">TOUCHEZ L'ÉCRAN</div> : <div className="loadbar" aria-label="Chargement"><i /></div>}
      <p className="muted" style={{ fontSize: ".78rem", fontWeight: 700, opacity: ready ? 1 : 0 }}>Time's Up · Qui est-ce ? · Blind test</p>
      {boom && <i className="boom" />}
    </div>
  );
}
