import { useState } from "react";
import { GAME_COMPONENTS, MINIGAMES, MG_BY, playSeconds } from "../minigames/index.js";
import { loadProfile } from "../lib/profileStore.js";
import { beanColor } from "../minigames/three/kit3d.jsx";
import { Icon } from "../ui/Icon.jsx";

const labSecs = () => { try { return Math.max(0, Math.min(300, Number(new URLSearchParams(location.search).get("secs")) || 0)); } catch { return 0; } }; // ?secs=60 : durée imposée (tests)
const TAGS = ["Tous", ...new Set(MINIGAMES.map((g) => g.tag))];

/** Salle d'arcade (et adresse « ?minilab ») : jouer seul, contre des bots, à n'importe quel mini-jeu. Sert aussi aux tests automatiques. */
export default function MiniLab({ onBack }) {
  const [sel, setSel] = useState(() => { try { return new URLSearchParams(location.search).get("g") || ""; } catch { return ""; } });
  const [res, setRes] = useState(null), [run, setRun] = useState(0), [tag, setTag] = useState("Tous");
  const [look] = useState(() => { try { return loadProfile().look; } catch { return null; } });
  const g = MG_BY[sel], Game = g && GAME_COMPONENTS[sel];
  if (g) {
    return (
      <div className={onBack ? "labwrap" : "app"}><div className="screen mgplay" data-testid="lab-game">
        <div className="row spread">
          <button className="iconbtn" onClick={() => { setSel(""); setRes(null); }} aria-label="Retour"><Icon name="back" /></button>
          <div className="mgtitle"><Icon name={g.icon} size={20} /> {g.title}</div>
          <span className="pill">{g.tag}</span>
        </div>
        <p className="muted btnote">{g.rule}</p>
        {res == null ? <div className="mgstage"><Game key={run} seed={12345 + run} seconds={labSecs() || playSeconds(g)} onFinish={setRes} color={look ? beanColor(look) : undefined} look={look || undefined} /></div>
          : <div className="mgdone" data-testid="lab-result" data-score={res}>
              <div className="mgemo" aria-hidden="true"><Icon name="trophy" size={56} stroke={1.4} /></div>
              <h2>{g.fmt(res)}</h2><p className="muted">Score brut : {res} (max {g.max})</p>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn" onClick={() => { setSel(""); setRes(null); }}><Icon name="grid" /> Autres jeux</button>
                <button className="btn primary" onClick={() => { setRes(null); setRun(run + 1); }}><Icon name="reset" /> Rejouer</button>
              </div>
            </div>}
      </div></div>
    );
  }
  const list = MINIGAMES.filter((x) => tag === "Tous" || x.tag === tag);
  return (
    <div className={onBack ? "labwrap" : "app"}><div className="screen" data-testid="lab-list">
      <div className="row" style={{ gap: 10 }}>
        {onBack && <button className="iconbtn" onClick={onBack} aria-label="Retour"><Icon name="back" /></button>}
        <div><div className="eyebrow">Salle d'arcade</div><h2 style={{ fontSize: "1.3rem" }}>{MINIGAMES.length} mini-jeux</h2></div>
      </div>
      <div className="arc-tags" role="tablist">{TAGS.map((t) => <button key={t} role="tab" aria-selected={tag === t} className={tag === t ? "on" : ""} onClick={() => setTag(t)}>{t}</button>)}</div>
      <div className="scroll"><div className="arc-grid">
        {list.map((x) => (
          <button key={x.id} className="arc-card" onClick={() => setSel(x.id)} data-testid={"lab-" + x.id}>
            <span className="arc-ico"><Icon name={x.icon} size={26} /></span>
            <b>{x.title}</b>
            <span className="arc-meta"><span className="pill dim">{x.tag}</span><small>{x.seconds} s</small></span>
          </button>
        ))}
      </div></div>
    </div></div>
  );
}
