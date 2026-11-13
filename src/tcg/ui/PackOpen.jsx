// Ouverture d'un booster, façon Pokémon TCG Pocket : on déchire le haut du paquet d'un glissement de doigt,
// les cartes jaillissent face cachée (le paquet brille de la couleur de sa meilleure carte), puis on les retourne
// une à une, de la moins rare à la plus rare : éclat doré pour les rares, onde violette pour les épiques,
// rotation et rayons pour les légendaires, reflet arc-en-ciel pour les brillantes.
import { useEffect, useMemo, useRef, useState } from "react";
import { CARD, FAMILY } from "../cards/index.js";
import { RARITY, RARITY_ORDER } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { tcgPrefs } from "../prefs.js";
import { vibrate } from "../../lib/util.js";
import { CardFace, CardBack } from "./Card.jsx";

export const PACK_COLOR = { multi: "#2f8bff", heros: "#ff5a5f", arsenal: "#1fb57a", prestige: "#d4a537" };
export const packColor = (p) => (p.fam ? FAMILY[p.fam].color : PACK_COLOR[p.id] || "#2f8bff");
export const packIcon = (p) => (p.fam ? FAMILY[p.fam].icon : p.id === "heros" ? "swords" : p.id === "arsenal" ? "gem" : p.id === "prestige" ? "sparkles" : "crown");

/** Le paquet scellé : glisser le doigt le long des pointillés pour le déchirer. */
function TearPack({ pack, onOpen }) {
  const el = useRef(null);
  const st = useRef({ x0: 0, w: 1, left: 0, dragging: false, done: false, moved: 0 });
  const [phase, setPhase] = useState("sealed");
  const [shake, setShake] = useState(false);
  const setVars = (x) => {
    const s = st.current, node = el.current;
    if (!node) return;
    node.style.setProperty("--sx", Math.min(s.x0, x) - s.left + "px");
    node.style.setProperty("--sw", Math.abs(x - s.x0) + "px");
    node.style.setProperty("--fx", x - s.left + "px");
    node.style.setProperty("--cut", Math.min(1, Math.abs(x - s.x0) / (s.w * 0.72)).toFixed(3));
  };
  const finish = () => {
    const s = st.current;
    s.done = true; s.dragging = false;
    el.current.style.setProperty("--cut", "1");
    vibrate([20, 30, 90]); sfx.open();
    setPhase("open");
    setTimeout(onOpen, 900);
  };
  const down = (e) => {
    if (phase === "open") return;
    const r = el.current.getBoundingClientRect();
    Object.assign(st.current, { x0: e.clientX, w: r.width, left: r.left, dragging: true, moved: 0 });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setVars(e.clientX); setPhase("drag");
  };
  const move = (e) => {
    const s = st.current;
    if (!s.dragging || s.done) return;
    setVars(e.clientX);
    const w = Math.abs(e.clientX - s.x0);
    if (w - s.moved > 28) { s.moved = w; vibrate(8); }
    if (w >= s.w * 0.72) finish();
  };
  const up = () => {
    const s = st.current;
    if (!s.dragging) return;
    const tapped = (parseFloat(el.current.style.getPropertyValue("--sw")) || 0) < 8;
    s.dragging = false;
    el.current.style.setProperty("--cut", "0"); el.current.style.setProperty("--sw", "0px");
    setPhase("sealed");
    if (tapped) { setShake(true); setTimeout(() => setShake(false), 480); }
  };
  return (
    <>
      <div ref={el} className={"pk " + (phase === "drag" ? "drag " : "") + (phase === "open" ? "open " : "") + (shake ? "shake" : "")} style={{ "--pc": packColor(pack) }}>
        <div className="pk-in">
          <div className="pk-body">
            <div className="pk-art">
              <span className="pk-brand">Trône des Mondes</span>
              <div className="pk-medal"><Icon name={packIcon(pack)} size={44} stroke={1.5} /></div>
              <div className="pk-t1">{pack.name.replace(/^Booster /, "")}</div>
              <div className="pk-t2">5 cartes</div>
            </div>
          </div>
          <div className="pk-top" />
          <i className="pk-guide"><i /></i>
        </div>
        <i className="pk-seam" />
        <i className="pk-spark" />
        {phase === "open" && <div className="pk-burst"><i className="beam" /><i className="rays" /><i className="glow" /></div>}
        <div className="pk-zone" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="button" aria-label="Glisse pour déchirer le booster" />
      </div>
      <p className="bo-hint">{phase === "open" ? "" : "Glisse le doigt sur les pointillés pour déchirer"}</p>
      {phase !== "open" && <button className="btn ghost small" onClick={finish}>Ouvrir sans glisser</button>}
    </>
  );
}

function Sparks({ color, n = 18 }) {
  const list = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = 110 + Math.random() * 120;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, d: Math.random() * 0.25 };
  }), [n]);
  return <div className="bo-sparks" aria-hidden="true">{list.map((s, i) => <i key={i} style={{ "--sx2": s.x + "px", "--sy2": s.y + "px", "--sd": s.d + "s", "--sc": color }} />)}</div>;
}

/**
 * Ouverture complète. cards = [{ id, foil, isNew }] (triées de la moins rare à la plus rare).
 * onDone() ferme ; onAgain() ouvre le booster suivant du même type (si `left` > 0).
 */
export default function PackOpen({ pack, cards, left = 0, onDone, onAgain }) {
  const [stage, setStage] = useState(() => (tcgPrefs().tear ? "sealed" : "cards")); // sealed | cards | done (paramètres : ouverture directe)
  const [i, setI] = useState(0);
  const [up, setUp] = useState(false);
  const [gone, setGone] = useState(0);
  const [flash, setFlash] = useState(0);
  const drag = useRef({ x0: 0, dx: 0, live: false, node: null });
  const best = cards.reduce((b, c) => Math.max(b, RARITY_ORDER.indexOf(CARD[c.id].r)), 0);
  const glow = best >= 4 ? "L" : best >= 3 ? "E" : best >= 2 ? "R" : null;
  const golden = cards.length > 0 && cards.every((c) => c.foil);
  const cur = cards[i];
  const d = cur ? CARD[cur.id] : null;

  useEffect(() => { if (stage === "cards" && i >= cards.length) { const t = setTimeout(() => setStage("done"), 350); return () => clearTimeout(t); } return undefined; }, [i, stage, cards.length]);

  const reveal = () => {
    if (!cur || up) return;
    setUp(true);
    sfx.flip();
    const r = d.r;
    if (r === "L") { vibrate([40, 60, 120]); setTimeout(() => setFlash((f) => f + 1), 650); sfx.win(); }
    else if (r === "E") { vibrate([30, 40, 60]); sfx.materialize(); }
    else if (r === "R" || cur.foil) { vibrate(30); sfx.scan(); }
    else vibrate(12);
  };
  const next = () => {
    if (!up) return reveal();
    setGone((g) => g + 1);
    setTimeout(() => { setUp(false); setI((x) => x + 1); }, 230);
  };
  const down = (e) => { drag.current = { x0: e.clientX, dx: 0, live: true, node: e.currentTarget }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    const g = drag.current;
    if (!g.live || !up) return;
    g.dx = e.clientX - g.x0;
    if (Math.abs(g.dx) > 6) { g.node.classList.add("drag"); g.node.style.transform = `translateX(${g.dx}px) rotate(${g.dx / 16}deg)`; }
  };
  const release = () => {
    const g = drag.current;
    if (!g.live) return;
    g.live = false;
    if (g.node) { g.node.classList.remove("drag"); g.node.style.transform = ""; }
    if (Math.abs(g.dx) > 70 || Math.abs(g.dx) < 10) next();
  };
  const revealAll = () => { setI(cards.length); setUp(false); };

  return (
    <div className="bo" style={{ "--pc": packColor(pack) }} role="dialog" aria-label={`Ouverture : ${pack.name}`}>
      <div className="bo-top">
        <div><div className="eyebrow">Booster</div><b>{pack.name}</b></div>
        {stage === "cards" && <button className="btn ghost small" onClick={revealAll}>Tout voir</button>}
        {stage !== "cards" && <button className="iconbtn" onClick={onDone} aria-label="Fermer"><Icon name="close" /></button>}
      </div>
      {stage === "sealed" && <TearPack pack={pack} onOpen={() => { setStage("cards"); if (glow) sfx.materialize(); }} />}
      {stage === "cards" && cur && (
        <>
          {golden && <div className="bo-golden">Booster doré : tout est brillant !</div>}
          <div className="bo-stack">
            {cards.map((c, k) => {
              if (k < i) return null;
              const depth = k - i;
              const top = depth === 0;
              const r = CARD[c.id].r;
              return (
                <div key={k} className={"bo-c rise" + (top && up ? ` up r-${r}` : "") + (top && gone > i ? " fly" : "")} style={{ "--d": depth }}
                  onPointerDown={top ? down : undefined} onPointerMove={top ? move : undefined} onPointerUp={top ? release : undefined} onPointerCancel={top ? release : undefined}
                  role={top ? "button" : undefined} aria-label={top ? (up ? "Carte suivante" : "Retourner la carte") : undefined}>
                  <i className="bo-fx" />
                  <div className="bo-flip">
                    <div className="bo-backf"><CardBack glow={top && depth === 0 && k === cards.length - 1 ? glow : null} /></div>
                    <div className="bo-face"><CardFace d={CARD[c.id]} foil={c.foil} big isNew={c.isNew} /></div>
                  </div>
                  {top && up && (r === "R" || r === "E" || r === "L" || c.foil) && <Sparks color={r === "L" ? "#ffd166" : r === "E" ? "#c084fc" : c.foil ? "#5ee1ff" : "#ffd166"} n={r === "L" ? 34 : r === "E" ? 24 : 14} />}
                  {top && up && (r === "E" || r === "L") && <span className={"bo-banner " + r}>{RARITY[r].name}</span>}
                  {top && up && c.foil && <span className="bo-banner F">Brillante</span>}
                </div>
              );
            })}
          </div>
          <p className="bo-hint">{up ? `${d.name} · ${RARITY[d.r].name}${cur.isNew ? " · nouvelle !" : ""}` : "Touche la carte pour la retourner"}</p>
          <p className="muted" style={{ fontSize: ".8rem" }}>{i + 1} / {cards.length}</p>
        </>
      )}
      {(stage === "done" || (stage === "cards" && !cur)) && (
        <>
          <h2 style={{ textAlign: "center" }}>{cards.some((c) => c.isNew) ? `${cards.filter((c) => c.isNew).length} nouvelle${cards.filter((c) => c.isNew).length > 1 ? "s" : ""} carte${cards.filter((c) => c.isNew).length > 1 ? "s" : ""} !` : "Booster ouvert"}</h2>
          <div className="bo-sum">{cards.map((c, k) => <div key={k} className="it" style={{ "--i": k }}><CardFace d={CARD[c.id]} foil={c.foil} isNew={c.isNew} /></div>)}</div>
          <div className="bo-acts">
            {left > 0 && onAgain && <button className="btn primary" onClick={onAgain}><Icon name="gift" size={18} />Ouvrir le suivant ({left})</button>}
            <button className={"btn " + (left > 0 && onAgain ? "ghost" : "primary")} onClick={onDone}>Terminé</button>
          </div>
        </>
      )}
      {flash > 0 && <div key={flash} className="bo-flash" />}
    </div>
  );
}
