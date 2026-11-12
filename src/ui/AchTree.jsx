import { useMemo, useRef, useState } from "react";
import { ACHIEVEMENTS, rewardsOf } from "../data/profile.js";
import { Icon } from "./Icon.jsx";

/** Branches de l'arbre des succès (une par jeu, + général). */
const BRANCHES = [
  { id: "gen", label: "Général", icon: "star", ids: ["first", "games10", "games50", "allgames", "wins5", "wins25", "streak3", "streak5"] },
  { id: "tu", label: "Time's Up", icon: "hourglass", ids: ["tuCards50", "bonus3"] },
  { id: "bt", label: "Blind test", icon: "music", ids: ["btSongs20", "btFast", "btStreak5", "btPerfect"] },
  { id: "qe", label: "Qui est-ce ?", icon: "eye", ids: ["qeFirst10"] },
  { id: "mg", label: "Mini-jeux", icon: "gamepad", ids: ["mgWins10", "friend15"] },
  { id: "pb", label: "Petit bac", icon: "edit", ids: ["pbUnique25"] },
  { id: "cc", label: "Célébrité", icon: "image", ids: ["ccFound25"] },
];
const KIND = { avatar: "Avatar", border: "Bordure", color: "Couleur", part: "Pièce" };

/**
 * Arbre des succès, zoomable et déplaçable : le joueur au centre, une branche par jeu, une feuille par succès.
 * Les succès obtenus s'allument ; les autres montrent leur progression.
 */
export default function AchTree({ profile }) {
  const svg = useRef(null), drag = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [sel, setSel] = useState(null);
  const nodes = useMemo(() => {
    const out = [], links = [];
    const by = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
    BRANCHES.forEach((b, bi) => {
      const ang = -Math.PI / 2 + (bi / BRANCHES.length) * Math.PI * 2, bx = Math.cos(ang) * 120, by2 = Math.sin(ang) * 120;
      const done = b.ids.filter((id) => profile.ach[id]).length;
      out.push({ id: "b:" + b.id, kind: "branch", x: bx, y: by2, label: b.label, icon: b.icon, done, total: b.ids.length });
      links.push([0, 0, bx, by2, done > 0]);
      b.ids.forEach((id, i) => {
        const a = by[id]; if (!a) return;
        const sa = ang + (i - (b.ids.length - 1) / 2) * (b.ids.length > 4 ? 0.15 : 0.24);
        const r = 205 + (i % 2) * 44, x = Math.cos(sa) * r, y = Math.sin(sa) * r;
        const [cur, target] = a.prog(profile.stats), ok = Boolean(profile.ach[id]);
        out.push({ id, kind: "ach", x, y, a, ok, p: ok ? 1 : Math.min(1, cur / target), cur: Math.min(cur, target), target });
        links.push([bx, by2, x, y, ok]);
      });
    });
    return { out, links };
  }, [profile]);
  const pt = (e) => { const r = svg.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e) => { if (e.target.closest && e.target.closest(".atn")) return; drag.current = { p: pt(e), v: view, pts: new Map([[e.pointerId, pt(e)]]) }; svg.current.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    d.pts.set(e.pointerId, pt(e));
    if (d.pts.size >= 2) {
      const [a, b] = [...d.pts.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!d.d0) d.d0 = dist / d.v.k;
      setView((v) => ({ ...v, k: Math.max(0.5, Math.min(2.6, dist / d.d0)) }));
      return;
    }
    const p = pt(e); setView({ ...d.v, x: d.v.x + (p.x - d.p.x), y: d.v.y + (p.y - d.p.y) });
  };
  const onUp = (e) => { const d = drag.current; if (!d) return; d.pts.delete(e.pointerId); if (!d.pts.size) drag.current = null; };
  const zoom = (f) => setView((v) => ({ ...v, k: Math.max(0.5, Math.min(2.6, v.k * f)) }));
  const done = Object.keys(profile.ach).length;
  return (
    <div className="atree">
      <div className="atree-top">
        <span className="pill ok">{done}/{ACHIEVEMENTS.length} succès</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="iconbtn small" onClick={() => zoom(1 / 1.25)} aria-label="Dézoomer"><Icon name="minus" size={16} /></button>
          <button className="iconbtn small" onClick={() => zoom(1.25)} aria-label="Zoomer"><Icon name="plus" size={16} /></button>
          <button className="iconbtn small" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Recentrer"><Icon name="target" size={16} /></button>
        </div>
      </div>
      <svg ref={svg} className="atree-svg" viewBox="-290 -290 580 580" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12)} role="img" aria-label="Arbre des succès">
        <g transform={`translate(${view.x * 0.8} ${view.y * 0.8}) scale(${view.k})`}>
          {[80, 160, 240].map((r) => <circle key={r} r={r} fill="none" stroke="rgba(94,225,255,.08)" strokeDasharray="3 6" />)}
          {nodes.links.map(([x1, y1, x2, y2, on], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={"atl" + (on ? " on" : "")} />)}
          <g className="atn root"><circle r="34" /><text y="5" textAnchor="middle">TOI</text></g>
          {nodes.out.map((n) => n.kind === "branch" ? (
            <g key={n.id} className={"atn br" + (n.done ? " on" : "")} transform={`translate(${n.x} ${n.y})`}>
              <circle r="24" />
              <Icon name={n.icon} size={22} x={-11} y={-11} />
              <text y="44" textAnchor="middle" className="atlbl">{n.label}</text>
              <text y="58" textAnchor="middle" className="atsub">{n.done}/{n.total}</text>
            </g>
          ) : (
            <g key={n.id} className={"atn leaf" + (n.ok ? " on" : "") + (sel === n.id ? " sel" : "")} transform={`translate(${n.x} ${n.y})`} onClick={() => setSel(n.id === sel ? null : n.id)} role="button" aria-label={n.a.name}>
              <circle r="15" className="bg" />
              <circle r="15" className="pr" style={{ strokeDasharray: `${(n.p * 94.2).toFixed(1)} 94.2` }} transform="rotate(-90)" />
              {n.ok && <circle r="5" className="dot" />}
            </g>
          ))}
        </g>
      </svg>
      {/* étiquettes des branches en icônes (HTML par-dessus pour garder le trait fin) */}
      <div className="atree-info" role="status">
        {sel ? (() => {
          const n = nodes.out.find((q) => q.id === sel), rw = rewardsOf(sel);
          return (
            <div className="atcard">
              <b>{n.a.name}</b><p>{n.a.desc}</p>
              <span className={"bar2" + (n.ok ? "" : " blue")}><i style={{ width: `${Math.round(n.p * 100)}%` }} /></span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}><span className={"pill" + (n.ok ? " ok" : "")}>{n.ok ? "Obtenu" : `${n.cur}/${n.target}`}</span><span className="pill vio">+{n.a.xp} XP</span>{rw.map((r) => <span key={r.kind + r.id} className="pill dim">{KIND[r.kind]} · {r.name}</span>)}</div>
            </div>
          );
        })() : <p className="muted">Glisse pour te déplacer, pince ou utilise + / − pour zoomer. Touche un succès pour le détail.</p>}
      </div>
    </div>
  );
}
