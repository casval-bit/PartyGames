import { useEffect, useState } from "react";
import { transport } from "../net/transport.js";

export default function LobbyList({ busy, notice, clearNotice, onBack, onJoin }) {
  const [list, setList] = useState([]);
  useEffect(() => transport.watchLobbies((l) => setList(l.filter((x) => x.status === "lobby").sort((a, b) => b.count - a.count))), []);

  return (
    <div className="screen">
      <div className="row">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <h2 style={{ fontSize: "1.3rem" }}>Lobbys ouverts</h2>
      </div>
      {notice && (
        <div className="toast" role="alert"><span>{notice}</span>
          <button className="iconbtn" onClick={clearNotice} aria-label="Fermer">✕</button></div>
      )}
      <div className="scroll">
        {list.length === 0 && (
          <div className="radar">
            <div className="rings"><i className="dot" /></div>
            <strong>On cherche des lobbys…</strong>
            <p className="muted">Dès qu'un joueur crée une partie, elle apparaît ici toute seule.</p>
          </div>
        )}
        {list.map((l, i) => (
          <div className="lobby-row" key={l.roomId} style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
            <div className="info">
              <strong>{l.name}</strong>
              <span className="muted" style={{ fontSize: ".85rem", fontWeight: 700 }}>{({ quiest: "Qui est-ce ?", blindtest: "Blind test", timeline: "Frise", party: "Mini-jeux", board: "Plateau", petitbac: "Petit bac" })[l.game] || "Time's Up"} · par {l.hostName} · {l.count}/{l.max}</span>
              <div className="meter"><i style={{ width: `${(l.count / l.max) * 100}%` }} /></div>
            </div>
            <button className="btn primary small" disabled={busy || l.count >= l.max} onClick={() => onJoin(l.roomId)}>
              {l.count >= l.max ? "Complet" : "Rejoindre"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
