// Ouverture de boosters (un seul, ou un groupe jusqu'à 5 d'un coup) et révélation des invocations des Portails.
//   - booster : façon Pokémon TCG Pocket, on déchire le haut du paquet d'un glissement de doigt (le paquet suit la souris et
//     brille sous la lumière ; pour un groupe, les autres boosters attendent derrière et s'ouvrent tous ensemble) ;
//   - portail : un vortex qu'on touche ; en s'ouvrant il prend la couleur de la meilleure carte (violet : épique, or : légendaire) ;
//   - les cartes jaillissent face cachée et se retournent une à une, de la moins rare à la plus rare. La carte du dessus brille à
//     travers son dos selon sa rareté ; au retournement : éclat doré (rare), onde violette (épique), rayons, flash et écran qui
//     tremble (légendaire), reflet arc-en-ciel (brillante). Des pastilles comptent les cartes du booster en cours ;
//   - à la fin : toutes les cartes, de la plus rare à la moins rare (touche une carte pour la voir en grand).
import { useEffect, useMemo, useRef, useState } from "react";
import { CARD, FAMILY } from "../cards/index.js";
import { RARITY, GAME_NAME } from "../rules.js";
import { tierOf } from "../progress.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { tcgPrefs } from "../prefs.js";
import { vibrate } from "../../lib/util.js";
import { CardFace, CardBack } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";

export const PACK_COLOR = { multi: "#2f8bff", heros: "#ff5a5f", arsenal: "#1fb57a", prestige: "#d4a537", decouverte: "#2ec4b6" };
export const packColor = (p) => (p.color ? p.color : p.fam ? FAMILY[p.fam].color : PACK_COLOR[p.id] || "#2f8bff");
export const packIcon = (p) => (p.icon ? p.icon : p.fam ? FAMILY[p.fam].icon : p.id === "heros" ? "swords" : p.id === "arsenal" ? "gem" : p.id === "prestige" ? "sparkles" : p.id === "decouverte" ? "compass" : "crown");
const TIERS = ["C", "U", "R", "E", "L"];
const tierRank = (id) => TIERS.indexOf(tierOf(CARD[id]));
const TIER_COLOR = { L: "#ffb347", E: "#c084fc", R: "#ffd166" };
const bestOf = (cards) => cards.reduce((b, c) => Math.max(b, tierRank(c.id)), 0);
const glowOf = (rank) => (rank >= 4 ? "L" : rank >= 3 ? "E" : rank >= 2 ? "R" : null);

/** Le paquet scellé : glisser le doigt le long des pointillés pour le déchirer. count > 1 : un groupe de boosters. */
function TearPack({ pack, count = 1, onOpen }) {
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
    if (s.done) return;
    s.done = true; s.dragging = false;
    el.current.style.setProperty("--cut", "1");
    vibrate(count > 1 ? [20, 30, 60, 30, 120] : [20, 30, 90]); sfx.open();
    setPhase("open");
    setTimeout(onOpen, count > 1 ? 1100 : 900);
  };
  // le paquet s'incline vers la souris (ou le doigt) et la lumière glisse sur son emballage
  const tilt = (e) => {
    const node = el.current, s = st.current;
    if (!node || s.dragging || s.done) return;
    const r = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    node.style.setProperty("--ry", ((x - 0.5) * 22).toFixed(1) + "deg");
    node.style.setProperty("--rx", ((0.5 - y) * 16).toFixed(1) + "deg");
    node.style.setProperty("--gx", (x * 100).toFixed(0) + "%");
    node.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
  };
  const untilt = () => { const node = el.current; if (!node) return; node.style.setProperty("--ry", "0deg"); node.style.setProperty("--rx", "0deg"); };
  const down = (e) => {
    if (phase === "open") return;
    const r = el.current.getBoundingClientRect();
    Object.assign(st.current, { x0: e.clientX, w: r.width, left: r.left, dragging: true, moved: 0 });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    untilt(); setVars(e.clientX); setPhase("drag");
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
      <div ref={el} className={"pk " + (phase === "drag" ? "drag " : "") + (phase === "open" ? "open " : "") + (shake ? "shake " : "") + (count > 1 ? "group" : "")}
        style={{ "--pc": packColor(pack), "--n": count }} onPointerMove={tilt} onPointerLeave={untilt}>
        {count > 1 && Array.from({ length: Math.min(4, count - 1) }, (_, k) => <i key={k} className="pk-ghost" style={{ "--g": k + 1 }} aria-hidden="true"><i /></i>)}
        <div className="pk-tilt">
          <div className="pk-in">
            <div className="pk-body">
              <div className="pk-art">
                <span className="pk-brand">{GAME_NAME}</span>
                <div className="pk-medal"><Icon name={packIcon(pack)} size={44} stroke={1.5} /></div>
                <div className="pk-t1">{pack.name.replace(/^Booster /, "")}</div>
                <div className="pk-t2">{count * 5} cartes</div>
              </div>
            </div>
            <div className="pk-top" />
            <i className="pk-guide"><i /></i>
          </div>
          <i className="pk-glare" aria-hidden="true" />
        </div>
        {count > 1 && <span className="pk-count">×{count}</span>}
        <i className="pk-seam" />
        <i className="pk-spark" />
        {phase === "open" && <div className="pk-burst"><i className="beam" /><i className="rays" /><i className="glow" /></div>}
        <div className="pk-zone" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="button" aria-label="Glisse pour déchirer le booster" />
      </div>
      <p className="bo-hint">{phase === "open" ? "" : count > 1 ? `Glisse sur les pointillés : les ${count} boosters s'ouvrent ensemble` : "Glisse le doigt sur les pointillés pour déchirer"}</p>
      {phase !== "open" && <button className="btn ghost small" onClick={finish}>Ouvrir sans glisser</button>}
    </>
  );
}

/** Le vortex d'un portail : on le touche, il prend la couleur de la meilleure carte, puis s'ouvre. */
function PortalIntro({ color, best, count, onOpen }) {
  const [open, setOpen] = useState(false);
  const go = () => {
    if (open) return;
    setOpen(true);
    vibrate(best === "L" ? [30, 50, 30, 50, 140] : [20, 40, 90]);
    sfx.materialize();
    setTimeout(() => sfx.open(), 650);
    setTimeout(onOpen, best === "L" ? 1700 : 1250);
  };
  return (
    <>
      <button className={"pv" + (open ? " open" : "") + (best ? " best-" + best : "")} style={{ "--pc": open && best ? TIER_COLOR[best] : color }} onClick={go}
        aria-label="Touche le portail pour invoquer" data-testid="portal-open">
        <i className="pv-halo" /><i className="pv-ring a" /><i className="pv-ring b" /><i className="pv-ring c" /><i className="pv-core" />
        <i className="pv-stars" />
        {open && <span className="pv-burst"><i className="rays" /><i className="glow" /></span>}
      </button>
      <p className="bo-hint">{open ? "" : count > 1 ? `Touche le portail : ${count} invocations` : "Touche le portail"}</p>
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

/** Bandeau d'une carte retournée : rareté, brillante, et pour un portail : cible ou vedette. */
function Banners({ c, r }) {
  return (
    <>
      {c.target ? <span className="bo-banner T">Ta cible !</span>
        : c.star && r === "L" ? <span className="bo-banner L">Vedette</span>
        : (r === "E" || r === "L") ? <span className={"bo-banner " + r}>{c.star ? "À l'honneur" : RARITY[r].name}</span> : null}
      {c.foil && <span className="bo-banner F">Brillante</span>}
    </>
  );
}

/**
 * Ouverture complète.
 *   pack : { id, name, color?, icon?, fam? } ; packs : [{ cards: [{ id, foil, isNew, star?, target? }], jet, golden }]
 *   (cartes triées de la moins rare à la plus rare) ; label : « Booster » ou « Portail » ; intro : "tear" (booster) ou "portal".
 *   onDone() ferme ; onAgain() recommence (« Ouvrir les suivants », « Invoquer encore ») ; again : texte de ce bouton.
 */
export default function PackOpen({ pack, packs, label = "Booster", intro = "tear", again = "", onDone, onAgain }) {
  const [stage, setStage] = useState(() => (tcgPrefs().tear ? "sealed" : "cards")); // sealed | cards | done (paramètres : ouverture directe)
  const [pi, setPi] = useState(0);
  const [i, setI] = useState(0);
  const [up, setUp] = useState(false);
  const [gone, setGone] = useState(0);
  const [flash, setFlash] = useState(0);
  const [shk, setShk] = useState(false);
  const [tint, setTint] = useState(null);
  const [zoom, setZoom] = useState(null);
  const drag = useRef({ x0: 0, dx: 0, live: false, node: null });
  const all = useMemo(() => packs.flatMap((p) => p.cards), [packs]);
  const best = glowOf(bestOf(all));
  const cards = (packs[pi] || packs[0]).cards;
  const cur = cards[i];
  const d = cur ? CARD[cur.id] : null;
  const many = packs.length > 1;

  // fin d'un booster : le suivant du groupe, ou le résumé
  useEffect(() => {
    if (stage !== "cards" || i < cards.length) return undefined;
    const t = setTimeout(() => {
      if (pi < packs.length - 1) { setPi(pi + 1); setI(0); setGone(0); setUp(false); setTint(null); sfx.slide(); }
      else setStage("done");
    }, 350);
    return () => clearTimeout(t);
  }, [i, stage, cards.length, pi, packs.length]);

  const reveal = () => {
    if (!cur || up) return;
    setUp(true);
    sfx.flip();
    const r = tierOf(d);
    setTint(r === "L" || r === "E" || r === "R" ? r : null);
    if (r === "L") { vibrate([40, 60, 120]); setTimeout(() => { setFlash((f) => f + 1); setShk(true); setTimeout(() => setShk(false), 560); }, 600); sfx.win(); }
    else if (r === "E") { vibrate([30, 40, 60]); sfx.materialize(); }
    else if (r === "R" || cur.foil) { vibrate(30); sfx.scan(); }
    else vibrate(12);
  };
  const next = () => {
    if (!up) return reveal();
    setGone((g) => g + 1);
    setTimeout(() => { setUp(false); setTint(null); setI((x) => x + 1); }, 230);
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
  const revealAll = () => { setStage("done"); setUp(false); setTint(null); };

  const sorted = useMemo(() => all.map((c, k) => ({ ...c, k })).sort((a, b) => tierRank(b.id) - tierRank(a.id) || (b.target ? 1 : 0) - (a.target ? 1 : 0) || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.k - b.k), [all]);
  const nNew = all.filter((c) => c.isNew).length;
  const jet = packs.reduce((s, p) => s + (p.jet || 0), 0);
  const golden = packs.filter((p) => p.golden).length;
  const curGolden = Boolean((packs[pi] || {}).golden);

  return (
    <div className={"bo" + (tint ? " t-" + tint : "") + (stage === "done" ? " sum" : "") + (intro === "portal" ? " portal" : "")} style={{ "--pc": packColor(pack) }} role="dialog" aria-label={`Ouverture : ${pack.name}`}>
      <i className="bo-tint" aria-hidden="true" />
      <div className="bo-top">
        <div><div className="eyebrow">{label}{many && stage === "cards" ? ` · ${pi + 1} / ${packs.length}` : many ? ` · ${packs.length} boosters` : ""}</div><b>{pack.name}</b></div>
        {stage === "cards" && <button className="btn ghost small" onClick={revealAll} data-testid="bo-all">Tout voir</button>}
        {stage !== "cards" && <button className="iconbtn" onClick={onDone} aria-label="Fermer"><Icon name="close" /></button>}
      </div>
      {stage === "sealed" && (intro === "portal"
        ? <PortalIntro color={packColor(pack)} best={best === "R" ? null : best} count={all.length} onOpen={() => setStage("cards")} />
        : <TearPack pack={pack} count={packs.length} onOpen={() => { setStage("cards"); if (best) sfx.materialize(); }} />)}
      {stage === "cards" && cur && (
        <>
          {curGolden && <div className="bo-golden">Booster doré : que des rares ou mieux, et 10 jetons de brillance !</div>}
          <div className={"bo-stack" + (shk ? " shk" : "")}>
            {cards.map((c, k) => {
              if (k < i) return null;
              const depth = k - i;
              const top = depth === 0;
              const r = tierOf(CARD[c.id]);
              return (
                <div key={`${pi}-${k}`} className={"bo-c rise" + (top && up ? ` up r-${r}` : "") + (top && gone > i ? " fly" : "")} style={{ "--d": depth }}
                  onPointerDown={top ? down : undefined} onPointerMove={top ? move : undefined} onPointerUp={top ? release : undefined} onPointerCancel={top ? release : undefined}
                  role={top ? "button" : undefined} aria-label={top ? (up ? "Carte suivante" : "Retourner la carte") : undefined}>
                  <i className="bo-fx" />
                  <div className="bo-flip">
                    <div className="bo-backf"><CardBack glow={top && !up ? glowOf(TIERS.indexOf(r)) : null} /></div>
                    <div className="bo-face"><CardFace d={CARD[c.id]} foil={c.foil} big isNew={c.isNew} />{top && up && r !== "C" && r !== "U" && <i className="bo-glint" />}</div>
                  </div>
                  {top && up && (r === "R" || r === "E" || r === "L" || c.foil) && <Sparks color={r === "L" ? "#ffd166" : r === "E" ? "#c084fc" : c.foil ? "#5ee1ff" : "#ffd166"} n={r === "L" ? 40 : r === "E" ? 26 : 14} />}
                  {top && up && <Banners c={c} r={r} />}
                </div>
              );
            })}
          </div>
          <div className="bo-pips" aria-hidden="true">
            {cards.map((c, k) => <i key={k} className={k < i || (k === i && up) ? "on r-" + tierOf(CARD[c.id]) : k === i ? "cur" : ""} />)}
          </div>
          <p className="bo-hint">{up ? `${d.name} · ${RARITY[d.r].name}${cur.isNew ? " · nouvelle !" : ""}` : "Touche la carte pour la retourner"}</p>
        </>
      )}
      {(stage === "done" || (stage === "cards" && !cur && pi >= packs.length - 1)) && (
        <>
          <h2 className="bo-sum-h">{nNew ? `${nNew} nouvelle${nNew > 1 ? "s" : ""} carte${nNew > 1 ? "s" : ""} !` : intro === "portal" ? "Invocation terminée" : many ? "Boosters ouverts" : "Booster ouvert"}</h2>
          <div className={"bo-sum" + (all.length > 5 ? " big" : "") + (all.length > 10 ? " huge" : "")}>
            {sorted.map((c, k) => (
              <div key={k} className={"it" + (c.isNew ? " new" : "") + " r-" + tierOf(CARD[c.id])} style={{ "--i": Math.min(k, 24) }}>
                <CardFace d={CARD[c.id]} foil={c.foil} isNew={c.isNew} onClick={() => setZoom(c)} />
                {c.target ? <span className="bo-tag T">Cible</span> : c.star && tierOf(CARD[c.id]) === "L" ? <span className="bo-tag">Vedette</span> : null}
              </div>
            ))}
          </div>
          {(jet > 0 || golden > 0) && <div className="bo-jet" data-testid="bo-jet"><Icon name="sparkles" size={18} />+{jet} jeton{jet > 1 ? "s" : ""} de brillance{golden ? ` (booster${golden > 1 ? "s" : ""} doré${golden > 1 ? "s" : ""})` : ""}</div>}
          <div className="bo-acts">
            {again && onAgain && <button className="btn primary" onClick={onAgain} data-testid="bo-again"><Icon name={intro === "portal" ? "orbit" : "gift"} size={18} />{again}</button>}
            <button className={"btn " + (again && onAgain ? "ghost" : "primary")} onClick={onDone}>Terminé</button>
          </div>
        </>
      )}
      {flash > 0 && <div key={flash} className="bo-flash" />}
      {zoom && <div className="bo-zoom"><CardZoom id={zoom.id} foil={zoom.foil} onClose={() => setZoom(null)} /></div>}
    </div>
  );
}
