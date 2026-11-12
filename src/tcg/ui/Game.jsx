// Trône des Mondes : la table de jeu, en paysage et en plein écran.
// Au centre, UNE table à la fois : la tienne par défaut ; les pastilles des joueurs (en haut) servent à changer de point de vue
// pour regarder la table d'un adversaire. À droite : le duel en cours et la question posée (le pupitre). En bas : ta main en éventail.
// Si le téléphone est tenu en portrait sans pouvoir tourner l'écran, toute l'interface de jeu pivote d'elle-même (CSS).
import { useEffect, useMemo, useRef, useState } from "react";
import { CARD, FAMILY, subOf } from "../cards/index.js";
import { PHASES, PHASE_NAME, TYPE_NAME, SETUP_GOLD } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import QuitVote from "../../ui/QuitVote.jsx";
import { sfx } from "../../lib/sfx.js";
import { vibrate } from "../../lib/util.js";
import { lockLandscape, unlockOrientation, canFullscreen, toggleFullscreen, useFullscreen } from "../../lib/orientation.js";
import { CardFace, CardBack, PlotFace, FamilyFace, Token, TYPE_ICON } from "./Card.jsx";
import CardZoom from "./CardZoom.jsx";
import Rules from "./Rules.jsx";
import { cardArt } from "./art.js";

const TYPES = ["combat", "ruse", "influence"];
const PHASE_HELP = {
  setup: "Chacun garde ou change sa main, puis pose jusqu'à 8 or de personnages et de lieux.",
  plot: "Chacun choisit en secret un Scénario : or, initiative, revendication et réserve du round.",
  draw: "Chacun pioche 2 cartes.",
  marshal: "À tour de rôle, chacun dépense l'or de son Scénario pour poser des cartes.",
  challenges: "À tour de rôle, un défi de chaque type (Combat, Ruse, Influence) contre un adversaire.",
  dominance: "Force des personnages debout + or restant : le plus fort gagne 1 Pouvoir.",
  standing: "Tout le monde se relève.",
  taxation: "L'or restant est perdu, chacun garde au plus sa réserve de cartes en main.",
};
const CLAIM = { combat: "le perdant tue des personnages", ruse: "le perdant défausse des cartes au hasard", influence: "le gagnant prend du Pouvoir au perdant" };
const LOSE = { combat: "tu perds des personnages", ruse: "tu défausses des cartes au hasard", influence: "il te prend du Pouvoir" };
const famColor = (p) => (subOf(p.fam, p.pt) ? subOf(p.fam, p.pt).color : (FAMILY[p.fam] || FAMILY.neutre).color);

/** Clés apparues depuis l'affichage précédent (pour animer les cartes qui arrivent). */
function useFresh(keys) {
  const prev = useRef(null);
  const now = new Set(keys);
  const fresh = prev.current ? new Set([...now].filter((k) => !prev.current.has(k))) : new Set();
  useEffect(() => { prev.current = now; });
  return fresh;
}
/** Taille d'un élément (mise à jour quand l'écran change ou tourne). */
function useBox() {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box];
}

/** Rangée de cartes posées sur le tapis : elles se chevauchent quand la place manque, comme sur une vraie table. */
function CardRow({ items, w, gap = 6, render, className = "", empty, align = "flex-start" }) {
  const [ref, box] = useBox();
  const n = items.length;
  const need = n * w + (n - 1) * gap;
  const ml = n > 1 && box.w && need > box.w ? Math.floor((box.w - n * w) / (n - 1)) : gap;
  return (
    <div ref={ref} className={"tb-row " + className} style={{ justifyContent: align }}>
      {n ? items.map((it, i) => <div key={it.u} className="tb-slot" style={{ marginLeft: i ? ml : 0 }}>{render(it)}</div>) : empty}
    </div>
  );
}

/** Pile de cartes (deck : dos empilés ; défausse : la carte du dessus). */
function Pile({ kind, w, count, top, onClick, label }) {
  return (
    <button className={"tb-pile " + kind} style={{ width: w }} onClick={onClick} aria-label={`${label} : ${count} carte${count > 1 ? "s" : ""}`}>
      {count > 0 ? (kind === "deck" ? <CardBack w={w} /> : <CardFace d={CARD[top]} w={w} />) : <span className="tb-empty-slot">{label}</span>}
      <span className="tb-cnt">{count}</span>
    </button>
  );
}

/** La table d'un joueur, en grand. Les tailles des cartes s'adaptent à la place disponible. */
function Board({ p, ag, mine, cls, onCard, onZoom, onPile, fresh, onBack, waiting }) {
  const [ref, box] = useBox();
  const color = famColor(p);
  const f = FAMILY[p.fam] || FAMILY.neutre;
  const mat = useMemo(() => cardArt({ id: `tapis:${p.fam}:${p.pt || ""}`, type: "fam", fam: p.fam, r: "U", name: "", noMedal: true, pt: p.pt ? [p.pt] : [] }, 300, 160), [p.fam, p.pt]);
  const avail = Math.max(120, box.h - 44);
  const cw = Math.round(Math.max(48, Math.min((avail * 0.58) / 1.397, (box.w || 600) / 6.4, 108)));
  const backH = Math.max(46, avail * 0.36);
  const bw = Math.round(Math.max(32, Math.min(backH / 1.397, cw * 0.74)));
  const plotW = Math.round(bw * 1.397 * (88 / 63));
  return (
    <section ref={ref} className={"agb" + (mine ? " mine" : " other") + (waiting ? " think" : "")} style={{ "--fc": color, "--mat": `url(${mat})` }}>
      <div className="agb-head">
        <span className="tb-plate">
          <span className="tb-emb"><Icon name={f.icon} size={14} /></span>
          <b>{mine ? "Ta table" : `Table de ${p.name}`}</b>
          {ag.first === p.id && <span className="tb-first" title="Premier joueur">1er</span>}
          <span className="tb-tok pw" title={`Pouvoir (objectif ${ag.goal})`}><Icon name="crown" size={12} stroke={2.2} />{p.power}</span>
          <span className="tb-tok au" title="Or"><Icon name="coins" size={12} stroke={2.2} />{p.gold}</span>
          {!mine && <span className="tb-tok hd" title="Cartes en main"><Icon name="layers" size={12} stroke={2.2} />{p.hand}</span>}
          {waiting && <span className="tb-think" aria-hidden="true"><i /><i /><i /></span>}
        </span>
        <span className="agb-stats">Revenu <b>{p.inc}</b> · Réserve <b>{p.res}</b> · {f.short || f.name}{subOf(p.fam, p.pt) ? ` ${subOf(p.fam, p.pt).name}` : ""}</span>
        {!mine && onBack && <button className="btn small agb-back" onClick={onBack}><Icon name="back" size={15} />Ma table</button>}
      </div>
      <CardRow className="agb-chars" items={p.chars} w={cw} gap={Math.round(cw * 0.1)} align="center"
        render={(v) => <Token v={v} w={cw} cls={cls(v)} onClick={() => onCard(v, p)} enter={fresh.has(v.u)} />}
        empty={<span className="tb-hint">{mine ? "Tes personnages se posent ici" : "Aucun personnage"}</span>} />
      <div className="agb-row">
        <button className="tb-fam" style={{ width: bw }} onClick={() => onZoom({ fam: p.fam, pt: p.pt })} aria-label="Carte de famille">
          <FamilyFace fam={p.fam} pt={p.pt} w={bw} />
          {p.fp > 0 && <span className="tb-coin" title="Pouvoir sur la carte de famille"><Icon name="crown" size={9} stroke={2.6} />{p.fp}</span>}
        </button>
        {p.plot ? <PlotFace d={CARD[p.plot]} w={plotW} onClick={() => onZoom({ id: p.plot })} /> : <span className="tb-empty-slot plot" style={{ width: plotW }}>Scénario</span>}
        <button className="tb-plots" onClick={() => onPile(p.id, "used")} aria-label={`Scénarios : ${p.plotsLeft} restants, ${p.used.length} joués`}><Icon name="scroll" size={13} />{p.plotsLeft}</button>
        <CardRow className="tb-locs" items={p.locs} w={bw} gap={5} render={(v) => <Token v={v} w={bw} cls={cls(v)} onClick={() => onCard(v, p)} enter={fresh.has(v.u)} />} empty={null} />
        <div className="tb-piles">
          <Pile kind="deck" w={bw} count={p.left} label="Deck" onClick={() => onPile(p.id, "used")} />
          <Pile kind="disc" w={bw} count={p.disc.length} top={p.disc[p.disc.length - 1]} label="Défausse" onClick={() => onPile(p.id, "disc")} />
          {p.dead.length > 0 && <button className="tb-dead" onClick={() => onPile(p.id, "dead")} aria-label={`Morts : ${p.dead.length}`}><Icon name="skull" size={11} />{p.dead.length}</button>}
        </div>
      </div>
    </section>
  );
}

/** Le duel en cours (ou la phase et les derniers événements). */
function Arena({ ag, meId, onTap }) {
  const ch = ag.ch;
  if (ch) {
    const A = ag.players.find((p) => p.id === ch.att), D = ag.players.find((p) => p.id === ch.def);
    if (A && D) {
      const pick = (p, l) => l.map((u) => p.chars.find((c) => c.u === u)).filter(Boolean);
      const atk = pick(A, ch.atk), dfd = pick(D, ch.dfd);
      const won = ch.winner ? (ch.winner === A.id ? "a" : "d") : null;
      const stage = won ? `${(won === "a" ? A : D).id === meId ? "Tu gagnes" : (won === "a" ? A : D).name + " gagne"}`
        : ch.stage === "atk" ? "Attaquants déclarés" : ch.stage === "def" ? `${D.id === meId ? "Tu choisis" : D.name + " choisit"} la défense` : ch.stage === "act" ? "Dernières actions" : "Résolution";
      return (
        <div className={"tb-arena duel " + ch.type} aria-live="polite">
          <div className="tb-duel-h"><span className={"tb-seal " + ch.type}><Icon name={TYPE_ICON[ch.type]} size={14} stroke={2.4} /></span><b>{TYPE_NAME[ch.type]}</b><small>{stage}</small></div>
          <div className="tb-duel-n"><span>{A.id === meId ? "Toi" : A.name}</span><span>{D.id === meId ? "Toi" : D.name}</span></div>
          <div className="tb-duel">
            <CardRow className="tb-side" items={atk} w={34} gap={3} align="flex-end" render={(v) => <Token v={{ ...v, k: 0 }} w={34} cls="atk" onClick={() => onTap(v, A)} />} empty={null} />
            <div className="tb-score"><b className={won === "a" ? "w" : ""}>{ch.sa}</b><i>VS</i><b className={won === "d" ? "w" : ""}>{ch.sd}</b></div>
            <CardRow className="tb-side r" items={dfd} w={34} gap={3} render={(v) => <Token v={{ ...v, k: 0 }} w={34} cls="dfd" onClick={() => onTap(v, D)} />} empty={<span className="tb-hint">{ch.stage === "atk" || ch.stage === "def" ? "défense ?" : "aucune défense"}</span>} />
          </div>
        </div>
      );
    }
  }
  return (
    <div className="tb-arena">
      <div className="tb-phase"><i /><b>{ag.phase === "setup" ? "Mise en place" : PHASE_NAME[ag.phase] || ""}</b><i /></div>
      <div className="tb-feed" aria-live="polite">{ag.log.slice(-3).map((l) => <p key={l.n} className={"ty-" + (l.ty || "")}>{l.t}</p>)}</div>
    </div>
  );
}

/** Ta main, tenue en éventail en bas de l'écran. */
function HandFan({ hand, state, onTap, fresh }) {
  const [ref, box] = useBox();
  const n = hand.length;
  const cw = Math.round(Math.max(64, Math.min(86, (box.h || 70) * 1.15)));
  const W = box.w || 500;
  const step = n > 1 ? Math.min(cw * 0.86, Math.max(14, (W - cw - 24) / (n - 1))) : 0;
  const mid = (n - 1) / 2;
  const ang = n > 1 ? Math.min(4, 28 / n) : 0;
  return (
    <div ref={ref} className="tb-hand" aria-label={`Ta main : ${n} carte${n > 1 ? "s" : ""}`}>
      {hand.map((h, i) => {
        const st = state(h);
        const k = i - mid;
        return (
          <div key={h.u} className={"tb-hc " + st.cls + (fresh.has(h.u) ? " enter" : "")} style={{ width: cw, marginLeft: -cw / 2, bottom: Math.round((box.h || 64) - cw * 1.397), "--x": `${k * step}px`, "--r": `${k * ang}deg`, "--y": `${k * k * 1.2}px`, zIndex: i + 1 }}>
            {st.badge}
            <CardFace d={CARD[h.d]} w={cw} onClick={() => onTap(h)} />
          </div>
        );
      })}
      {!n && <span className="tb-hint" style={{ position: "absolute", left: 0, right: 0, top: 10, textAlign: "center" }}>Main vide</span>}
    </div>
  );
}

/** Minuteur de la décision en cours (fine barre qui se vide). */
function TimeLine({ deadline, total }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const loop = () => {
      const left = Math.max(0, (deadline || Date.now()) - Date.now());
      const el = ref.current;
      if (el) { el.style.setProperty("--p", Math.min(1, left / (total * 1000)).toFixed(4)); el.dataset.low = left < 10000 ? "1" : ""; const s = el.querySelector("b"); if (s) s.textContent = Math.ceil(left / 1000); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [deadline, total]);
  return <div className="tb-time" ref={ref} role="timer"><i /><b /></div>;
}

function Sheet({ title, sub, onClose, children, foot }) {
  return (
    <div className="ag-sheet" onClick={onClose || undefined}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row spread" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}><h3>{title}</h3>{sub && <p className="muted" style={{ fontSize: ".82rem", margin: "2px 0 0" }}>{sub}</p>}</div>
          {onClose && <button className="iconbtn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>}
        </div>
        {children}
        {foot}
      </div>
    </div>
  );
}

function EndScreen({ me, api, ag, gain, onHub, onLeave, isHost, setZoom }) {
  const rank = ag.rank || ag.players.map((p) => p.id);
  const st = (ag.st || {})[me.id];
  const meP = ag.players.find((p) => p.id === me.id);
  const won = ag.winner === me.id;
  useEffect(() => { if (won) sfx.win(); }, [won]);
  return (
    <div className="screen agx">
      <div className="ag-top">
        <div className="ag-round"><small>Trône des Mondes</small><b>{won ? "Victoire !" : meP ? "Partie terminée" : "Fin de partie"}</b></div>
      </div>
      <div className="ag-mid ag-end">
        <ol className="ag-podium" style={{ margin: 0, padding: 0 }}>
          {rank.map((id, i) => {
            const p = ag.players.find((x) => x.id === id);
            if (!p) return null;
            const f = FAMILY[p.fam] || FAMILY.neutre;
            return (
              <li key={id} className={"ag-rank" + (i === 0 ? " win" : "")}>
                <span className="rk">{i + 1}</span>
                <span className="ag-fam" style={{ "--fc": f.color }}><Icon name={f.icon} size={17} /></span>
                <span className="ag-who"><b>{p.id === me.id ? "Toi" : p.name}</b><small>{p.deck}</small></span>
                <span className="ag-stat pw"><Icon name="crown" size={14} />{p.power}</span>
              </li>
            );
          })}
        </ol>
        {st && (
          <div className="hub-card">
            <h3 style={{ fontSize: ".95rem" }}>Ta partie</h3>
            <div className="tz-line">
              <span className="pill">Défis gagnés : {st.won.combat + st.won.ruse + st.won.influence}</span>
              <span className="pill dim">Combat {st.won.combat} · Ruse {st.won.ruse} · Influence {st.won.influence}</span>
              <span className="pill vio">Dominations : {st.dom}</span>
              <span className="pill warn">Éliminations : {st.kills}</span>
              <span className="pill dim">Cartes jouées : {st.played}</span>
            </div>
          </div>
        )}
        {gain && (
          <div className="ag-gain">
            <div><small>Expérience</small><b>+{gain.xp} XP</b></div>
            <div><small>Éclats</small><b>+{gain.ec + (gain.lvlEc || 0)}</b></div>
            {gain.lvlTo > gain.lvlFrom && <div className="lv"><small>Niveau supérieur !</small><b>Niv. {gain.lvlTo}</b><small>{Object.values(gain.lvlPacks || {}).reduce((s, n) => s + n, 0)} booster(s) gagné(s)</small></div>}
          </div>
        )}
        {gain && <button className="btn good" onClick={() => onHub("packs")}><Icon name="gift" size={18} />Ma collection et mes boosters</button>}
        <div className="hub-card">
          <h3 style={{ fontSize: ".95rem" }}>Derniers moments</h3>
          <div className="ag-log" style={{ maxHeight: 220 }}>{ag.log.slice(-12).map((l) => <p key={l.n} className={"ty-" + (l.ty || "") + (l.p === me.id ? " own" : "")} onClick={l.c ? () => setZoom({ id: l.c }) : undefined}>{l.t}</p>)}</div>
        </div>
      </div>
      {isHost ? <button className="btn primary" onClick={api.backToLobby}>Retour au lobby</button> : <div className="wait" role="status">Le créateur ramène tout le monde au lobby<i /><i /><i /></div>}
      <button className="btn ghost small" onClick={onLeave}>Quitter le salon</button>
    </div>
  );
}

export default function TroneGame({ room, me, api, priv, onLeave, gain, onHub, isHost }) {
  const ag = room.ag;
  const playing = room.phase === "ag_play" && ag && !ag.over;
  const [zoom, setZoom] = useState(null);
  const [sheet, setSheet] = useState(null); // "log" | "rules" | { pile: id, kind }
  const [sel, setSel] = useState([]);
  const [chType, setChType] = useState(null);
  const [chDef, setChDef] = useState(null);
  const [sent, setSent] = useState(null);
  const [hideQ, setHideQ] = useState(false);
  const [toast, setToast] = useState("");
  const [pov, setPov] = useState(null); // joueur dont on regarde la table (null = la sienne)
  const fs = useFullscreen();
  const q = priv && priv.prompt && ag && ag.prompt && priv.prompt.id === ag.prompt.id ? priv.prompt : null;
  const qid = q ? q.id : 0;
  useEffect(() => { setSel([]); setChType(null); setChDef(null); setHideQ(false); if (qid) { vibrate(15); sfx.select(); } }, [qid]);
  useEffect(() => { setSent(null); }, [priv]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);
  // paysage pendant la partie (l'appli Android tourne l'écran ; sinon l'interface pivote en CSS)
  useEffect(() => {
    if (!playing) return undefined;
    lockLandscape();
    return () => { unlockOrientation(); };
  }, [playing]);
  // quand il faut toucher SES cartes (attaquer, défendre, recruter…), on revient sur sa table
  const qk = q ? q.kind : null;
  useEffect(() => { if (qk && ["defend", "challenge", "setup", "marshal", "mulligan"].includes(qk)) setPov(null); }, [qid, qk]);

  const players = ag ? ag.players : [];
  const meP = players.find((p) => p.id === me.id) || null;
  const hand = (priv && priv.hand) || [];
  const handFresh = useFresh(hand.map((h) => h.u));
  const boardFresh = useFresh(players.flatMap((p) => [...p.chars, ...p.locs].map((v) => v.u)));
  const insts = useMemo(() => {
    const m = {};
    for (const p of players) for (const v of [...p.chars, ...p.locs]) { m[v.u] = { v, p }; for (const a of v.att || []) m[a.u] = { v: { u: a.u, d: a.d }, p, host: v }; }
    return m;
  }, [players]);

  if (!ag) return <div className="screen"><div className="stage"><div className="wait" role="status">Préparation de la partie<i /><i /><i /></div></div></div>;
  if (room.phase === "ag_end" || ag.over) return <><EndScreen me={me} api={api} ag={ag} gain={gain} onHub={onHub} onLeave={onLeave} isHost={isHost} setZoom={setZoom} />{zoom && <CardZoom {...zoom} onClose={() => setZoom(null)} />}</>;

  const order = meP ? [meP, ...players.slice(players.indexOf(meP) + 1), ...players.slice(0, players.indexOf(meP))] : players;
  const viewed = (pov && players.find((p) => p.id === pov)) || meP || players[0];
  const mineView = Boolean(meP && viewed.id === meP.id);
  const waitingIds = (ag.prompt && ag.prompt.who) || [];
  const waitNames = waitingIds.filter((id) => id !== me.id).map((id) => (players.find((p) => p.id === id) || {}).name).filter(Boolean);
  const busy = Boolean(q && sent === q.id);
  const answer = (a) => { if (!q || busy) return; setSent(q.id); api.agAnswer(q.id, a); sfx.apply(); setZoom(null); };
  const handMap = Object.fromEntries(hand.map((h) => [h.u, h.d]));
  const nameOf = (u) => { const id = (q && q.cmap && q.cmap[u]) || handMap[u] || (insts[u] && insts[u].v.d); return id && CARD[id] ? CARD[id].name : "?"; };
  const toggle = (u, max = 99) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : s.length >= max ? (max === 1 ? [u] : s) : [...s, u]));

  /* ---------- quelles cartes de la table se touchent pour répondre ---------- */
  const kind = q && !busy ? q.kind : null;
  const opps2 = kind === "challenge" ? q.opps || [] : [];
  const chDefEff = chDef || (opps2.length === 1 ? opps2[0] : null);
  const atkCands = kind === "challenge" && chType && chDefEff ? (q.cands[chType] || []) : [];
  const dfdCands = kind === "defend" ? q.cands || [] : [];
  const selectable = new Set([...atkCands, ...dfdCands]);
  const pickingDef = kind === "challenge" && chType && !chDefEff;
  const tokenCls = (v) => {
    const c = [];
    if (selectable.has(v.u)) c.push(sel.includes(v.u) ? "pick" : "can");
    else if (selectable.size && insts[v.u] && meP && insts[v.u].p.id === meP.id) c.push("mute");
    if (ag.ch && ag.ch.atk.includes(v.u)) c.push("atk");
    if (ag.ch && ag.ch.dfd.includes(v.u)) c.push("dfd");
    if (ag.ch && ag.ch.bypass && ag.ch.bypass.includes(v.u)) c.push("byp");
    return c.join(" ");
  };
  const tapToken = (v, p) => {
    if (selectable.has(v.u)) { toggle(v.u, kind === "defend" ? q.max : 99); vibrate(8); return; }
    const acts = q && !busy && (kind === "marshal" || kind === "action") ? (q.opts || []).filter((o) => o.k === "act" && o.u === v.u) : [];
    setZoom({ id: v.d, inst: v, who: p ? (p.id === me.id ? "à toi" : p.name) : null, onOpen: (id) => setZoom({ id }), acts: acts.map((o) => ({ label: `Utiliser : ${o.name}`, icon: "bolt", onClick: () => answer({ k: "act", u: o.u, i: o.i }) })) });
  };

  /* ---------- main : quelles cartes sont jouables maintenant ---------- */
  const setupInfo = (us) => { let gold = 0, lim = 0; const keys = new Set(); for (const u of us) { const d = CARD[handMap[u]]; if (!d) continue; if (d.uni && keys.has(d.key)) continue; keys.add(d.key); gold += d.cost; if (d.kw.limite !== undefined) lim++; } return { gold, lim }; };
  const handOpt = (u) => (q && !busy && (kind === "marshal" || kind === "action") ? (q.opts || []).find((o) => o.u === u && o.k !== "act") : kind === "react" && !q.save ? (q.opts || []).find((o) => o.u === u) : null);
  const tapHand = (h) => {
    const d = CARD[h.d];
    if (kind === "setup" && (d.type === "char" || d.type === "loc")) {
      if (sel.includes(h.u)) { setSel(sel.filter((x) => x !== h.u)); return; }
      const inf = setupInfo([...sel, h.u]);
      if (inf.gold > SETUP_GOLD) { setToast(`Budget dépassé : ${inf.gold} or sur ${SETUP_GOLD}.`); sfx.error(); return; }
      if (inf.lim > 1) { setToast("Une seule carte Limitée pendant la mise en place."); sfx.error(); return; }
      setSel([...sel, h.u]); vibrate(8); return;
    }
    const o = handOpt(h.u);
    const acts = [];
    if (o) {
      const label = o.k === "dup" ? "Poser en doublon (gratuit)" : o.k === "evt" ? `Jouer l'événement (${o.cost} or)` : o.k === "amb" ? `Embuscade : le mettre en jeu (${o.cost} or)` : kind === "react" ? `Jouer en réaction (${o.cost} or)` : d.type === "obj" ? `Attacher (${o.cost} or)` : `Recruter (${o.cost} or)`;
      acts.push({ label, icon: "play", onClick: () => answer(kind === "react" ? { u: o.u } : { k: o.k, u: o.u }) });
    }
    setZoom({ id: h.d, acts, note: o ? null : kind === "marshal" ? "Pas jouable maintenant (pas assez d'or, carte Limitée déjà jouée, ou pas de cible)." : null });
  };
  const handState = (h) => {
    const d = CARD[h.d];
    const o = handOpt(h.u);
    if (kind === "setup") return { cls: sel.includes(h.u) ? "pick" : d && (d.type === "char" || d.type === "loc") ? "play" : "off" };
    if (o) return { cls: "play", badge: <span className={"tb-cost" + (o.k === "dup" ? " free" : "")}>{o.k === "dup" ? "Doublon" : `${o.cost} or`}</span> };
    return { cls: kind === "marshal" || kind === "action" ? "off" : "" };
  };

  /* ---------- le pupitre : la question en cours et ses boutons ---------- */
  let dock = { idle: true, title: "", sub: "", acts: [], extra: null };
  const pass = (label = "Passer") => ({ label, kind: "ghost", onClick: () => answer({ pass: true }) });
  if (!meP) dock = { idle: true, title: "Tu regardes la partie", sub: PHASE_HELP[ag.phase] || "", acts: [] };
  else if (!q || busy) {
    dock = { idle: true, title: busy ? "Envoyé…" : waitNames.length ? `${waitNames.join(", ")} réfléchi${waitNames.length > 1 ? "ssent" : "t"}` : PHASE_NAME[ag.phase] || "…", sub: PHASE_HELP[ag.phase] || "", acts: [] };
  } else if (kind === "mulligan" || kind === "plot" || kind === "choose") {
    dock = { title: q.title, sub: kind === "choose" && q.src && CARD[q.src] ? `Effet de ${CARD[q.src].name}` : "", acts: [{ label: kind === "plot" ? "Choisir mon scénario" : kind === "mulligan" ? "Voir ma main" : "Faire mon choix", icon: "layers", kind: "primary", onClick: () => setHideQ(false) }] };
  } else if (kind === "setup") {
    const inf = setupInfo(sel);
    dock = { title: "Mise en place", sub: `Touche dans ta main les cartes à poser · ${inf.gold}/${SETUP_GOLD} or`, acts: [{ label: sel.length ? `Poser (${sel.length})` : "Ne rien poser", icon: "check", kind: "primary", onClick: () => answer({ pick: sel }) }] };
  } else if (kind === "first") {
    dock = { title: "Tu as l'initiative", sub: "Qui joue en premier ce round ?", acts: q.cands.map((id) => ({ label: id === me.id ? "Moi" : (players.find((p) => p.id === id) || {}).name, kind: id === me.id ? "primary" : "", onClick: () => answer({ pick: id }) })) };
  } else if (kind === "marshal") {
    const abil = (q.opts || []).filter((o) => o.k === "act");
    const n = (q.opts || []).filter((o) => o.k !== "act").length;
    dock = { title: `Recrutement · ${q.gold} or`, sub: n ? "Touche une carte qui brille dans ta main" : "Plus rien de jouable",
      extra: abil.length ? <div className="ag-chips">{abil.map((o, i) => <button key={i} className="ag-chip" onClick={() => answer({ k: "act", u: o.u, i: o.i })}><Icon name="bolt" size={14} />{o.name}</button>)}</div> : null,
      acts: [{ ...pass("Fin du recrutement"), kind: n ? "ghost" : "primary" }] };
  } else if (kind === "challenge") {
    if (!chType) {
      dock = { title: "Lancer un défi ?", sub: "Choisis le type de défi",
        extra: <div className="tb-seals">{TYPES.map((t) => { const ok = q.types.includes(t) && (q.cands[t] || []).length > 0; return <button key={t} className={"tb-sealbtn " + t} disabled={!ok} onClick={() => { setChType(t); setSel([]); }}><span><Icon name={TYPE_ICON[t]} size={20} stroke={2.2} /></span>{TYPE_NAME[t]}<small>{!q.types.includes(t) ? "déjà fait" : !(q.cands[t] || []).length ? "personne" : "prêt"}</small></button>; })}</div>,
        acts: [pass("Fin des défis")] };
    } else if (!chDefEff) {
      dock = { title: `${TYPE_NAME[chType]} : contre qui ?`, sub: "Touche un adversaire (en haut) ou un bouton", acts: [{ label: "Retour", kind: "ghost", onClick: () => setChType(null) }, ...opps2.map((id) => ({ label: (players.find((x) => x.id === id) || {}).name, onClick: () => setChDef(id) }))] };
    } else {
      const sum = sel.reduce((s, u) => s + ((insts[u] && insts[u].v.s) || 0), 0);
      const defP = players.find((x) => x.id === chDefEff);
      const facing = defP ? defP.chars.filter((c) => !c.k && (c.ic || "").includes(chType[0].toUpperCase())).reduce((a, c) => a + c.s, 0) : 0;
      dock = { title: `${TYPE_NAME[chType]} contre ${defP ? defP.name : "?"}`, sub: `Touche tes attaquants sur ta table · en face : ${facing} de force debout. Si tu gagnes : ${CLAIM[chType]}.`,
        extra: <div className="tb-sum"><span className={"tb-seal " + chType}><Icon name={TYPE_ICON[chType]} size={13} stroke={2.4} /></span>Attaque <b>{sum}</b></div>,
        acts: [{ label: "Retour", kind: "ghost", onClick: () => { setSel([]); if (opps2.length > 1) setChDef(null); else setChType(null); } }, { label: "Attaquer", icon: TYPE_ICON[chType], kind: "primary", disabled: !sel.length, onClick: () => answer({ type: chType, def: chDefEff, atk: sel }) }] };
    }
  } else if (kind === "defend") {
    const sum = sel.reduce((s, u) => s + ((insts[u] && insts[u].v.s) || 0), 0);
    const sa = ag.ch ? ag.ch.sa : 0;
    dock = { title: q.title, sub: `${q.duel ? "Duel : un seul défenseur. " : "Touche tes défenseurs sur ta table. "}Si tu perds : ${LOSE[ag.ch ? ag.ch.type : "combat"]}.`,
      extra: <div className="tb-sum">Attaque <b>{sa}</b> · défense <b className={sel.length && sum <= sa ? "bad" : sel.length ? "good" : ""}>{sum}</b>{sel.length > 0 && <small>{sum > sa ? "tu gagnes" : sum === sa ? "égalité : l'attaquant gagne" : "pas assez"}</small>}</div>,
      acts: [{ label: "Ne pas défendre", kind: "ghost", onClick: () => answer({ dfd: [] }) }, { label: `Défendre (${sel.length})`, icon: "shield", kind: "primary", disabled: !sel.length, onClick: () => answer({ dfd: sel }) }] };
  } else if (kind === "action" || kind === "react") {
    const opts = q.opts || [];
    const label = (o) => {
      if (q.save) return o.label + (o.cost ? ` (${o.cost} or)` : "");
      if (o.k === "act") return o.name;
      const nm = nameOf(o.u);
      return o.k === "amb" ? `Embuscade : ${nm} (${o.cost} or)` : `${nm} (${o.cost} or)`;
    };
    const pick = (o) => {
      if (q.save) return answer({ j: o.j });
      if (o.k === "act") { const src = insts[o.u]; if (src) setZoom({ id: src.v.d, inst: src.v, who: "à toi", acts: [{ label: `Utiliser : ${o.name}`, icon: "bolt", onClick: () => answer({ k: "act", u: o.u, i: o.i }) }] }); else answer({ k: "act", u: o.u, i: o.i }); return; }
      tapHand({ u: o.u, d: handMap[o.u] || (q.cmap || {})[o.u] });
    };
    dock = { title: q.title, sub: kind === "react" ? "Une carte peut réagir" : "Tu peux jouer une action",
      extra: <div className="ag-chips">{opts.map((o, i) => <button key={i} className="ag-chip" onClick={() => pick(o)}><Icon name={q.save ? "shield" : o.k === "act" ? "bolt" : "play"} size={14} />{label(o)}</button>)}</div>,
      acts: [pass()] };
  } else if (kind === "option") {
    dock = { title: q.title, acts: (q.opts || []).map((o) => ({ label: o.label, onClick: () => answer({ pick: o.id }) })) };
  } else dock = { title: q.title || "À toi", acts: [] };

  /* ---------- feuilles (choix plein écran) ---------- */
  let qSheet = null;
  if (q && !busy && !hideQ) {
    const hideBtn = <button className="btn ghost small" onClick={() => setHideQ(true)}><Icon name="eye" size={16} />Voir la table</button>;
    if (kind === "mulligan") {
      qSheet = (
        <Sheet title="Ta main de départ" sub="Garde-la, ou change-la une fois (mulligan) : tu reprends 7 nouvelles cartes.">
          <div className="ag-grid">{hand.map((h) => <div key={h.u} className="gi"><CardFace d={CARD[h.d]} onClick={() => setZoom({ id: h.d })} /></div>)}</div>
          <div className="ag-btns">{hideBtn}<button className="btn ghost" onClick={() => answer({ keep: false })}><Icon name="shuffle" size={18} />Changer de main</button><button className="btn primary" onClick={() => answer({ keep: true })}><Icon name="check" size={18} />Garder</button></div>
        </Sheet>
      );
    } else if (kind === "plot") {
      const mine = (priv && priv.plots) || [];
      const pk = sel[0];
      qSheet = (
        <Sheet title="Choisis ton Scénario" sub="Tous les joueurs révèlent le leur en même temps. Initiative la plus haute : choisit le premier joueur.">
          <div className="ag-grid plots">{mine.map((h) => <div key={h.u} className={"gi" + (pk === h.u ? " pick" : "")}><PlotFace d={CARD[h.d]} onClick={() => setSel([h.u])} />{pk === h.u && <i className="ck"><Icon name="check" size={16} /></i>}</div>)}</div>
          {meP && meP.used.length > 0 && <small className="muted">Déjà joués : {meP.used.map((id) => CARD[id].name).join(", ")} (ils reviennent quand les 7 sont joués).</small>}
          <div className="ag-btns">{hideBtn}<button className="btn ghost" disabled={!pk} onClick={() => setZoom({ id: (mine.find((x) => x.u === pk) || {}).d })}><Icon name="search" size={18} />Lire</button><button className="btn primary" disabled={!pk} onClick={() => answer({ pick: pk })}><Icon name="check" size={18} />Révéler</button></div>
        </Sheet>
      );
    } else if (kind === "choose") {
      const cands = q.cands || [];
      const src = q.src && CARD[q.src] ? CARD[q.src].name : null;
      const where = (u) => { const it = insts[u]; return it ? (it.p.id === me.id ? "ta table" : it.p.name) : q.zone === "hand" ? "ta main" : q.zone === "deck" ? "ton deck" : q.zone === "disc" ? "ta défausse" : ""; };
      qSheet = (
        <Sheet title={q.title} sub={`${src ? `Effet : ${src}. ` : ""}${q.min === q.max ? `Choisis ${q.max} carte${q.max > 1 ? "s" : ""}.` : `Choisis de ${q.min} à ${q.max} cartes.`}`}>
          <div className="ag-grid">{cands.map((u) => { const id = (q.cmap || {})[u] || handMap[u] || (insts[u] && insts[u].v.d); const on = sel.includes(u); const it = insts[u]; return (
            <div key={u} className={"gi" + (on ? " pick" : "")}>
              <CardFace d={CARD[id]} str={it && it.v.s !== undefined ? it.v.s : undefined} onClick={() => toggle(u, q.max)} />
              {on && <i className="ck"><Icon name="check" size={16} /></i>}
              <small>{where(u)}{it && it.v.k ? " · à genoux" : ""}</small>
            </div>); })}</div>
          <div className="ag-btns">{hideBtn}{q.min === 0 && <button className="btn ghost" onClick={() => answer({ pick: [] })}>Aucune</button>}<button className={"btn " + (q.harm ? "primary" : "good")} disabled={sel.length < q.min || sel.length > q.max} onClick={() => answer({ pick: sel })}><Icon name="check" size={18} />Valider ({sel.length})</button></div>
        </Sheet>
      );
    }
  }

  /* ---------- piles et journal ---------- */
  let infoSheet = null;
  if (sheet === "log") {
    infoSheet = <Sheet title="Journal de la partie" onClose={() => setSheet(null)}><div className="ag-log">{[...ag.log].reverse().map((l) => <p key={l.n} className={"ty-" + (l.ty || "") + (l.p === me.id ? " own" : "")} onClick={l.c && CARD[l.c] ? () => setZoom({ id: l.c }) : undefined}>{l.t}</p>)}</div></Sheet>;
  } else if (sheet && sheet.pile) {
    const p = players.find((x) => x.id === sheet.pile);
    const list = p ? p[sheet.kind] || [] : [];
    const t = { used: "Scénarios déjà joués", disc: "Défausse", dead: "Pile des morts" }[sheet.kind];
    infoSheet = (
      <Sheet title={`${t}${p && p.id !== me.id ? ` · ${p.name}` : ""}`} sub={sheet.kind === "dead" ? "Un personnage unique mort ne peut plus revenir en jeu." : sheet.kind === "used" ? `${p ? p.plotsLeft : 0} scénario(s) encore en réserve ; ils reviennent tous quand les 7 ont été joués.` : null} onClose={() => setSheet(null)}>
        <div className={"ag-grid" + (sheet.kind === "used" ? " plots" : "")}>{list.length ? [...list].reverse().map((id, i) => <div key={i} className="gi">{CARD[id].type === "plot" ? <PlotFace d={CARD[id]} onClick={() => setZoom({ id })} /> : <CardFace d={CARD[id]} onClick={() => setZoom({ id })} />}</div>) : <span className="hub-empty">Vide</span>}</div>
      </Sheet>
    );
  }

  /* ---------- la table ---------- */
  const phaseI = PHASES.findIndex((x) => x.id === ag.phase);
  const timer = q && !busy && room.deadline && room.settings.agTimer > 0;
  return (
    <div className="agl">
      <div className="agl-in">
        <div className={"agl-hud" + (players.length >= 4 ? " many" : "")}>
          <QuitVote room={room} me={me} api={api} />
          <div className="tb-round"><small>Round {Math.max(1, ag.round)}</small><b>{ag.phase === "setup" ? "Mise en place" : PHASE_NAME[ag.phase] || "…"}</b></div>
          <div className="tb-pips" aria-hidden="true">{PHASES.map((x, i) => <i key={x.id} className={i < phaseI ? "done" : i === phaseI ? "on" : ""} title={x.name} />)}</div>
          <div className="agl-povs" role="tablist" aria-label="Voir la table de…">
            {order.map((p) => {
              const target = pickingDef && opps2.includes(p.id);
              const on = viewed.id === p.id;
              const think = waitingIds.includes(p.id) && p.id !== me.id;
              return (
                <button key={p.id} role="tab" aria-selected={on} className={"agl-pov" + (on ? " on" : "") + (target ? " target" : "") + (think ? " think" : "") + (ag.ch && (ag.ch.att === p.id || ag.ch.def === p.id) ? " duel" : "")}
                  style={{ "--fc": famColor(p) }} onClick={() => { if (target) { setChDef(p.id); sfx.select(); } else { setPov(meP && p.id === meP.id ? null : p.id); sfx.select(); } }}
                  aria-label={target ? `Défier ${p.name}` : `Voir la table de ${p.id === me.id ? "moi" : p.name}`}>
                  <span className="tb-emb"><Icon name={(FAMILY[p.fam] || FAMILY.neutre).icon} size={12} /></span>
                  <b>{p.id === me.id ? "Moi" : p.name}</b>
                  <span className="agl-pw"><Icon name="crown" size={10} stroke={2.4} />{p.power}</span>
                  {think && <span className="tb-think" aria-hidden="true"><i /><i /><i /></span>}
                </button>
              );
            })}
          </div>
          <span className="tb-goal" title="Objectif de Pouvoir"><Icon name="crown" size={13} />{ag.goal}</span>
          <button className="iconbtn tb-ib" onClick={() => setSheet("rules")} aria-label="Règles"><Icon name="book" size={16} /></button>
          <button className="iconbtn tb-ib" onClick={() => setSheet("log")} aria-label="Journal de la partie"><Icon name="history" size={16} /></button>
          {canFullscreen() && <button className="iconbtn tb-ib" onClick={() => toggleFullscreen()} aria-label={fs ? "Quitter le plein écran" : "Plein écran"}><Icon name={fs ? "minus" : "scan"} size={16} /></button>}
        </div>

        <div className="agl-main">
          <div className="agl-left">
            <div className="agl-table">
              <div className="agl-surface">
                <Board key={viewed.id} p={viewed} ag={ag} mine={mineView} cls={tokenCls} onCard={tapToken} onZoom={setZoom}
                  onPile={(id, k) => setSheet({ pile: id, kind: k })} fresh={boardFresh} onBack={meP ? () => setPov(null) : null}
                  waiting={waitingIds.includes(viewed.id) && viewed.id !== me.id} />
              </div>
            </div>
            {meP && <HandFan hand={hand} state={handState} onTap={tapHand} fresh={handFresh} />}
          </div>
          <aside className="agl-side">
            <Arena ag={ag} meId={me.id} onTap={tapToken} />
            <div className={"tb-dock" + (dock.idle ? " idle" : "")}>
              {timer && <TimeLine deadline={room.deadline} total={room.settings.agTimer} />}
              <div className="tb-dq">
                <b>{dock.title}{dock.idle && waitNames.length > 0 && !busy ? <span className="ag-dots"><i /><i /><i /></span> : null}</b>
                {dock.sub && <small>{dock.sub}</small>}
              </div>
              {dock.extra}
              {dock.acts.length > 0 && <div className="tb-dacts">{dock.acts.map((a, i) => <button key={i} className={"btn " + (a.kind || "")} disabled={a.disabled} onClick={a.onClick}>{a.icon && <Icon name={a.icon} size={16} />}{a.label}</button>)}</div>}
            </div>
          </aside>
        </div>
      </div>
      {toast && <div className="toast agl-toast" role="alert">{toast}</div>}
      {qSheet}
      {infoSheet}
      {sheet === "rules" && <Rules onClose={() => setSheet(null)} />}
      {zoom && <CardZoom {...zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
