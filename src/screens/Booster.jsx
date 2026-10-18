import { useEffect, useRef, useState } from "react";
import { BY_ID } from "../data/categories.js";
import { Fuse, GameCard, HourglassMark } from "../ui/parts.jsx";
import { BOOSTER_SECONDS } from "../config.js";
import { vibrate } from "../lib/util.js";

const packColor = (cat) => (cat.color.startsWith("hsl") ? cat.color : cat.id === "random" ? "#9b7bff" : "#d8c48f");

/** Booster à déchirer : on fait glisser le doigt le long du haut (pointillés) pour le trancher, comme dans Pokémon TCG Pocket. */
function Pack({ cat, pack, onOpen }) {
  const el = useRef(null);
  const st = useRef({ x0: 0, w: 1, left: 0, dragging: false, done: false });
  const [phase, setPhase] = useState("sealed"); // sealed | drag | open
  const [shake, setShake] = useState(false);

  const setVars = (x) => {
    const s = st.current, node = el.current;
    if (!node) return;
    const from = Math.min(s.x0, x) - s.left;
    const w = Math.abs(x - s.x0);
    node.style.setProperty("--sx", from + "px");
    node.style.setProperty("--sw", w + "px");
    node.style.setProperty("--fx", x - s.left + "px");
    node.style.setProperty("--cut", Math.min(1, w / (s.w * 0.72)).toFixed(3));
  };
  const down = (e) => {
    if (phase === "open") return;
    const r = el.current.getBoundingClientRect();
    Object.assign(st.current, { x0: e.clientX, w: r.width, left: r.left, dragging: true, moved: 0 });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setVars(e.clientX);
    setPhase("drag");
  };
  const move = (e) => {
    const s = st.current;
    if (!s.dragging || s.done) return;
    setVars(e.clientX);
    const w = Math.abs(e.clientX - s.x0);
    if (w - s.moved > 28) { s.moved = w; vibrate(8); }
    if (w >= s.w * 0.72) {
      s.done = true; s.dragging = false;
      el.current.style.setProperty("--cut", "1");
      vibrate([20, 30, 90]);
      setPhase("open");
      setTimeout(onOpen, 1050);
    }
  };
  const up = () => {
    const s = st.current;
    if (!s.dragging) return;
    const tapped = Math.abs(parseFloat(el.current.style.getPropertyValue("--sw")) || 0) < 8;
    s.dragging = false;
    el.current.style.setProperty("--cut", "0");
    el.current.style.setProperty("--sw", "0px");
    setPhase("sealed");
    if (tapped) { setShake(true); setTimeout(() => setShake(false), 480); }
  };

  return (
    <div ref={el} className={"pk " + (phase === "drag" ? "drag " : "") + (phase === "open" ? "open " : "") + (shake ? "shake" : "")} style={{ "--pc": packColor(cat) }}>
      <div className="pk-in">
        <div className="pk-body">
          <div className="pk-art">
            <div className="pk-medal"><HourglassMark size={48} /></div>
            <div className="pk-t1">{cat.label}</div>
            <div className="pk-t2">{pack.cards.length} cartes</div>
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
  );
}

/** Pile des cartes du booster : toucher = retourner, puis toucher ou glisser = carte suivante. */
function Stack({ cards, onFinish }) {
  const [flipped, setFlipped] = useState(() => new Set());
  const [gone, setGone] = useState([]);
  const [pop, setPop] = useState(null);
  const drag = useRef({ id: null, x0: 0, dx: 0, node: null });

  const current = cards.find((c) => !gone.includes(c.id));
  useEffect(() => { if (!current) { const t = setTimeout(onFinish, 350); return () => clearTimeout(t); } }, [current]); // eslint-disable-line

  const flip = (c) => { setFlipped((s) => new Set(s).add(c.id)); setPop(c.id); vibrate(18); setTimeout(() => setPop((p) => (p === c.id ? null : p)), 650); };
  const fly = (c) => setGone((g) => (g.includes(c.id) ? g : [...g, c.id]));

  const down = (e, c) => {
    if (!current || c.id !== current.id) return;
    drag.current = { id: c.id, x0: e.clientX, dx: 0, node: e.currentTarget, live: true };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e, c) => {
    const d = drag.current;
    if (!d.live || d.id !== c.id) return;
    d.dx = e.clientX - d.x0;
    if (Math.abs(d.dx) > 6) {
      d.node.classList.add("drag");
      d.node.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 18}deg)`;
    }
  };
  const up = (e, c) => {
    const d = drag.current;
    if (!d.live || d.id !== c.id) return;
    d.live = false;
    d.node.classList.remove("drag");
    d.node.style.transform = "";
    const isFlipped = flipped.has(c.id);
    if (Math.abs(d.dx) > 64) { if (!isFlipped) flip(c); setTimeout(() => fly(c), isFlipped ? 0 : 450); }
    else if (Math.abs(d.dx) < 10) { if (!isFlipped) flip(c); else fly(c); }
  };

  const left = cards.filter((c) => !gone.includes(c.id));
  return (
    <>
      <div className="cs">
        {cards.map((c, i) => {
          const d = left.indexOf(c);
          const isGone = gone.includes(c.id);
          if (d < 0 && !isGone) return null;
          const dir = i % 2 ? -1 : 1;
          return (
            <div
              key={c.id}
              className={"cs-card" + (d === 0 ? " live" : "") + (isGone ? " fly" : "") + (pop === c.id ? " pop" : "")}
              style={isGone ? { transform: `translate(${dir * 130}%, -8%) rotate(${dir * 22}deg)`, "--d": 0 } : { "--d": Math.max(0, d) }}
              onPointerDown={(e) => down(e, c)} onPointerMove={(e) => move(e, c)} onPointerUp={(e) => up(e, c)} onPointerCancel={(e) => up(e, c)}
            >
              <GameCard card={c} up={flipped.has(c.id)} />
            </div>
          );
        })}
      </div>
      <p className="hint" key={current ? (flipped.has(current.id) ? "n" : "f") + gone.length : "end"}>
        {!current ? "Booster ouvert !" : flipped.has(current.id) ? "Touche ou glisse pour la carte suivante" : "Touche la carte pour la retourner"}
      </p>
      <div className={"coll" + (cards.length > 6 ? " many" : "")} aria-label="Cartes de ce booster">
        {cards.map((c) => <div className="slot" key={c.id}>{gone.includes(c.id) && <GameCard card={c} up className="static" />}</div>)}
      </div>
      {current && <button className="btn" style={{ padding: "8px 16px", minHeight: 0, fontSize: ".85rem" }} onClick={() => { setFlipped(new Set(cards.map((c) => c.id))); cards.filter((c) => !gone.includes(c.id)).forEach((c, k) => setTimeout(() => fly(c), 120 + k * 160)); }}>Tout révéler</button>}
    </>
  );
}

export default function Booster({ room, me, packs, api }) {
  const TOTAL = packs ? packs.length : 3;
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState("sealed"); // sealed -> cards -> done
  const [recap, setRecap] = useState(false);
  const meP = room.players.find((p) => p.id === me.id);
  const ready = Boolean(meP?.ready);

  const top = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row spread">
        <div>
          <div className="eyebrow">Ouverture des boosters</div>
          <h2 style={{ fontSize: "1.2rem" }}>Booster {Math.min(idx + 1, TOTAL)} sur {TOTAL}</h2>
        </div>
        <div className="progress-dots" aria-hidden="true">{Array.from({ length: TOTAL }, (_, k) => <i key={k} className={k <= idx || recap ? "on" : ""} />)}</div>
      </div>
      <Fuse deadline={room.deadline} total={BOOSTER_SECONDS} />
    </div>
  );

  if (!packs) return <div className="screen">{top}<div className="stage"><div className="wait" role="status">Préparation de tes cartes<i /><i /><i /></div></div></div>;

  if (ready) {
    return (
      <div className="screen">
        {top}
        <div className="stage">
          <strong>Cartes prêtes</strong>
          <div className="waitlist">{room.players.map((p) => <span key={p.id} className={p.ready ? "ok" : ""}>{p.name}{p.ready ? " ✓" : ""}</span>)}</div>
          <div className="wait" role="status">En attente des autres<i /><i /><i /></div>
        </div>
      </div>
    );
  }

  if (recap) {
    const all = packs.flatMap((p) => p.cards);
    return (
      <div className="screen">
        {top}
        <div className="scroll">
          <div className="dk">{all.map((c, i) => <GameCard key={c.id} card={c} up i={i} className="static" />)}</div>
        </div>
        <button className="btn primary" onClick={() => api.ready(true)}>J'ai vu mes {all.length} cartes</button>
      </div>
    );
  }

  const pack = packs[idx];
  const cat = BY_ID[pack.choice];
  const last = idx >= packs.length - 1;
  const next = () => {
    if (last) setRecap(true);
    else { setIdx(idx + 1); setStage("sealed"); }
  };

  return (
    <div className="screen">
      {top}
      <div className="stage" style={{ "--pc": packColor(cat) }}>
        {stage === "sealed" && (
          <>
            <Pack key={idx} cat={cat} pack={pack} onOpen={() => setStage("cards")} />
            <p className="hint">Glisse le doigt sur les pointillés pour déchirer le booster</p>
          </>
        )}
        {stage !== "sealed" && (
          <>
            <Stack key={idx} cards={pack.cards} onFinish={() => setStage("done")} />
            {stage === "done" && <button className="btn primary" style={{ width: "100%" }} onClick={next}>{last ? `Mes ${packs.flatMap((p) => p.cards).length} cartes` : "Booster suivant"}</button>}
          </>
        )}
      </div>
    </div>
  );
}
