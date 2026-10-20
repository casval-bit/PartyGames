import { useState } from "react";
import { GAME_COMPONENTS, MINIGAMES, MG_BY, playSeconds } from "../minigames/index.js";

/** Salle d'essai (adresse « ?minilab ») : jouer seul à chaque mini-jeu, sans lobby. Sert aussi aux tests automatiques. */
export default function MiniLab({ onBack }) {
  const [sel, setSel] = useState(() => { try { return new URLSearchParams(location.search).get("g") || ""; } catch { return ""; } });
  const [res, setRes] = useState(null), [run, setRun] = useState(0);
  const g = MG_BY[sel], Game = g && GAME_COMPONENTS[sel];
  if (g) {
    return (
      <div className={onBack ? "" : "app"}><div className="screen mgplay" data-testid="lab-game">
        <div className="row spread"><button className="iconbtn" onClick={() => { setSel(""); setRes(null); }} aria-label="Retour">←</button><div className="mgtitle">{g.emoji} {g.title}</div><span /></div>
        <p className="muted btnote">{g.rule}</p>
        {res == null ? <div className="mgstage"><Game key={run} seed={12345 + run} seconds={playSeconds(g)} onFinish={setRes} /></div>
          : <div className="mgdone" data-testid="lab-result" data-score={res}><div className="mgemo">✔️</div><h2>{g.fmt(res)}</h2><p className="muted">Score brut : {res} (max {g.max})</p>
            <button className="btn primary" onClick={() => { setRes(null); setRun(run + 1); }}>Rejouer</button></div>}
      </div></div>
    );
  }
  return (
    <div className={onBack ? "" : "app"}><div className="screen" data-testid="lab-list">
      <div className="row" style={{ gap: 10 }}>{onBack && <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>}<div><div className="eyebrow">Salle d'essai</div><h2 style={{ fontSize: "1.3rem" }}>{MINIGAMES.length} mini-jeux</h2></div></div>
      <div className="scroll"><div className="mglist">{MINIGAMES.map((x) => <button key={x.id} className="mgli" onClick={() => setSel(x.id)}><span aria-hidden="true">{x.emoji}</span><b>{x.title}</b><small>{x.tag} · {x.seconds} s</small></button>)}</div></div>
    </div></div>
  );
}
