// Plateau de jeu en 3D, au centre de l'accueil du Trône des Mondes : une partie en cours, vue depuis ta place, sur une table en bois.
//   - de ton côté (devant) : tes personnages (l'un agenouillé, un autre avec un attachement, des jetons de Pouvoir), puis ta rangée :
//     scénarios (l'actif posé sur ceux déjà joués), carte de famille, lieu, pioche, défausse, pile des morts ; ton blason sur le tapis ;
//   - en face : l'adversaire du jour (une autre famille, la même toute la journée) : ses personnages face visible, tournés vers lui,
//     sa rangée (scénario face cachée, pioche, défausse…), sa main en éventail ;
//   - au milieu : le trésor (l'Or), les trois défis (Combat, Ruse, Influence) et la réserve de Pouvoir (15 pour gagner).
// Les cartes face visible s'ouvrent en grand ; les pioches se mélangent, la main adverse se bat, le scénario adverse se révèle un instant,
// les pièces tournent, les défis s'illuminent. Tout est en CSS 3D (aucune scène WebGL) ; le plateau se met à l'échelle de la place.
// Sur la table ronde de la salle 3D (ontable) : un plateau par joueur, donc seulement ton côté (tes personnages, ta rangée, ton Or),
// sans cadre en bois, face à la caméra, en bas (on voit le milieu de la table et les deux autres joueurs au fond) ; il envoie sa
// place à l'écran (événement « tcg-board ») pour que la table se cale dessous.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CARD, FAMILY, PLOTS, subOf } from "../cards/index.js";
import { RARITY_ORDER, TYPES, TYPE_NAME, TYPE_ICON, DEFAULT_GOAL, GAME_NAME } from "../rules.js";
import { starters } from "../deck.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, CardBack, PlotFace, FamilyFace } from "./Card.jsx";
import { cardArt } from "./art.js";

const byStrength = (a, b) => CARD[b].cost - CARD[a].cost || RARITY_ORDER.indexOf(CARD[b].r) - RARITY_ORDER.indexOf(CARD[a].r) || a.localeCompare(b);
const isSeven = (id) => CARD[id] && CARD[id].cost >= 7;

/**
 * Ce que l'on pose sur la table : les n personnages les plus forts (une version par personnage), un lieu, un objet (attaché à un
 * personnage), la défausse (un événement), le plus faible des autres personnages (pile des morts), le scénario actif et deux déjà joués.
 */
function tableOf(deck, n = 4) {
  const ids = Object.keys(deck.cards).filter((id) => CARD[id]);
  const all = ids.filter((x) => CARD[x].type === "char").sort(byStrength);
  const chars = [], keys = new Set();
  for (const id of all) {
    const k = CARD[id].key || id;
    if (keys.has(k)) continue;
    keys.add(k); chars.push(id);
    if (chars.length === n) break;
  }
  const dead = [...all].reverse().find((id) => !keys.has(CARD[id].key || id)) || null;
  const of = (type) => ids.filter((x) => CARD[x].type === type).sort(byStrength);
  const att = of("obj")[0] || null;
  const disc = of("evt")[0] || of("obj")[1] || null;
  const plots = (deck.plots || []).filter((p) => CARD[p]);
  return { chars, dead, loc: of("loc")[0] || null, att, disc, plot: plots[0] || null, used: plots.slice(1, 3) };
}

/** L'adversaire du jour : un deck de départ d'une autre famille (jamais de vraies personnes), le même toute la journée. */
const NO_RIVAL = new Set(["neutre", "starac"]);
function rivalOf(fam) {
  const d = new Date();
  const key = `${fam || ""}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const list = starters().filter((s) => s.fam !== fam && !NO_RIVAL.has(s.fam) && Object.keys(s.cards).some((id) => CARD[id] && CARD[id].type === "char"));
  let h = 7;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list.length ? list[h % list.length] : null;
}

/** Pile de cartes face cachée (avec de l'épaisseur) ; un clic la mélange. */
function DeckPile({ w, n = 7, shuffling, onClick, label }) {
  return (
    <button className={"ib-pile ib-hit" + (shuffling ? " shuf" : "")} style={{ "--w": w + "px" }} onClick={onClick} aria-label={label} title={label}>
      {Array.from({ length: n }, (_, i) => <span key={i} className="ib-layer" style={{ "--i": i, "--n": n }}><CardBack w={w} /></span>)}
    </button>
  );
}

/** Un emplacement gravé sur le tapis, avec son nom dessous. */
function Slot({ label, wide, children }) {
  return (
    <div className={"ib-slot" + (wide ? " wide" : "") + (label ? "" : " bare")}>
      <span className="ib-slot-c">{children}</span>
      {label && <span className="ib-lab">{label}</span>}
    </div>
  );
}

/** Jetons de Pouvoir posés sur une carte. */
const Power = ({ n }) => <span className="ib-tok" aria-label={`${n} Pouvoir`}>{Array.from({ length: n }, (_, i) => <i key={i}><Icon name="crown" size={13} stroke={2.4} /></i>)}</span>;

/** Une pile de pièces d'Or (épaisseur en 3D). */
const Coins = ({ n, x = 0, y = 0 }) => (
  <span className="ib-cstack" style={{ "--x": x + "px", "--y": y + "px" }}>
    {Array.from({ length: n }, (_, i) => <i key={i} className="ib-coin" style={{ "--i": i }}>{i === n - 1 ? <Icon name="coins" size={14} stroke={2} /> : null}</i>)}
  </span>
);

export default function HubBoard({ deck, foil, onZoom, onFamily, calm, ontable = false }) {
  const wrap = useRef(null), plane = useRef(null);
  const [k, setK] = useState(0.6);
  const [shuf, setShuf] = useState(false);
  const [oshuf, setOshuf] = useState(false);
  const [fan, setFan] = useState(false);
  const [plotUp, setPlotUp] = useState(null);
  const [coin, setCoin] = useState(0);
  const [lit, setLit] = useState(null);
  const tbl = useMemo(() => (deck ? tableOf(deck) : null), [deck]);
  const rv = useMemo(() => rivalOf(deck ? deck.fam : null), [deck]);
  const opp = useMemo(() => (rv ? tableOf(rv, 3) : null), [rv]);
  const f = deck ? FAMILY[deck.fam] || FAMILY.neutre : FAMILY.neutre;
  const of = rv ? FAMILY[rv.fam] || FAMILY.neutre : null;
  const sub = deck ? subOf(deck.fam, deck.pt) : null;
  const crest = deck ? (sub ? sub.name : f.short || f.name) : GAME_NAME;
  const color = sub ? sub.color : f.color;
  const ocolor = rv ? (subOf(rv.fam, rv.pt) ? subOf(rv.fam, rv.pt).color : of.color) : "#8b5cf6";
  const mat = useMemo(() => cardArt({ id: `tapis:${deck ? deck.fam : "neutre"}:${(deck && deck.pt) || ""}`, type: "fam", fam: deck ? deck.fam : "neutre", r: "U", name: "", noMedal: true, pt: deck && deck.pt ? [deck.pt] : [] }, 480, 300), [deck]);

  // mise à l'échelle : le plateau (incliné) remplit la place disponible ; puis il est recentré (son dessin n'est pas symétrique)
  useLayoutEffect(() => {
    const el = wrap.current, pl = plane.current;
    if (!el || !pl) return undefined;
    const fit = () => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const was = [pl.style.getPropertyValue("--k"), pl.style.getPropertyValue("--dx"), pl.style.getPropertyValue("--dy")];
      pl.style.setProperty("--k", "1"); pl.style.setProperty("--dx", "0px"); pl.style.setProperty("--dy", "0px");
      const r = pl.getBoundingClientRect();
      if (!r.width || !r.height) { pl.style.setProperty("--k", was[0]); pl.style.setProperty("--dx", was[1]); pl.style.setProperty("--dy", was[2]); return; }
      // téléphone : le plateau déborde un peu sur les côtés (les coins de la table sont coupés) pour que les cartes restent lisibles ;
      // grand écran : un peu aussi (les coins de la table, en biais, passent au-dessus et au-dessous des boutons des côtés)
      const hub = el.closest(".hubh");
      const hw = hub ? hub.getBoundingClientRect().width : 1000;
      const over = hw < 620 ? (ontable ? 1.3 : 1.45) : hw >= 880 ? 1.04 : 1;
      const next = Math.max(0.25, Math.min(1.4, Math.min((box.width * over) / r.width, box.height / r.height) * (ontable ? 0.88 : 0.98)));
      pl.style.setProperty("--k", String(next));
      // recentrer le dessin du plateau dans sa zone (sur la table : un peu plus bas, pour laisser voir le fond de la table)
      const r2 = pl.getBoundingClientRect();
      const dx = box.left + box.width / 2 - (r2.left + r2.width / 2);
      const dy = box.top + box.height / 2 - (r2.top + r2.height / 2) + (ontable ? Math.max(0, box.height - r2.height) * 0.42 : 0);
      pl.style.setProperty("--dx", `${Math.round(dx)}px`); pl.style.setProperty("--dy", `${Math.round(dy)}px`);
      setK(next);
      send();
    };
    // la place du tapis à l'écran, pour la table 3D dessous (TableScene)
    const send = () => {
      if (!ontable) return;
      const m = pl.querySelector(".ib-mat");
      if (!m) return;
      const q = m.getBoundingClientRect();
      if (q.width > 10) window.dispatchEvent(new CustomEvent("tcg-board", { detail: { x: q.left, y: q.top, w: q.width, h: q.height } }));
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    // encore une fois quand l'accueil a fini d'apparaître (ses animations déplacent un peu le plateau)
    const tms = [setTimeout(send, 700), setTimeout(send, 2300), setTimeout(send, 3200)];
    window.addEventListener("resize", send);
    return () => { if (ro) ro.disconnect(); tms.forEach(clearTimeout); window.removeEventListener("resize", send); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!plotUp) return undefined; const tm = setTimeout(() => { setPlotUp(null); sfx.flip(); }, 2600); return () => clearTimeout(tm); }, [plotUp]);
  useEffect(() => { if (!lit) return undefined; const tm = setTimeout(() => setLit(null), calm ? 400 : 1300); return () => clearTimeout(tm); }, [lit, calm]);

  const doShuffle = () => { if (shuf) return; setShuf(true); sfx.shuffle(); setTimeout(() => setShuf(false), calm ? 300 : 1000); };
  const doOppShuffle = () => { if (oshuf) return; setOshuf(true); sfx.shuffle(); setTimeout(() => setOshuf(false), calm ? 300 : 1000); };
  const doFan = () => { if (fan) return; setFan(true); sfx.shuffle(); setTimeout(() => setFan(false), calm ? 300 : 1100); };
  const doReveal = () => { if (plotUp || !PLOTS.length) return; setPlotUp(PLOTS[Math.floor(Math.random() * PLOTS.length)].id); sfx.flip(); };
  const doCoin = () => { setCoin((c) => c + 1); sfx.coin(); };
  const doChal = (ty) => { setLit(ty); sfx.select(); };

  const CW = 130, OW = 100, SW = 92, OSW = 76, PW = 136, OPW = 112; // largeurs (pixels du plateau) : tes personnages, les siens, les autres cartes, les scénarios
  const zoom = (id) => () => onZoom(id);
  return (
    <div className={"ib" + (calm ? " calm" : "") + (ontable ? " ontable" : "")} ref={wrap}>
      <div className="ib-plane" ref={plane} style={{ "--k": k, "--mat": `url(${mat})`, "--fc": color, "--oc": ocolor }} aria-label="Plateau de jeu">
        <div className="ib-mat">
          <i className="ib-felt" aria-hidden="true" />
          {/* les blasons des deux familles, en grand et en filigrane sous les cartes de chaque camp */}
          {of && !ontable && <i className="ib-emblem opp" style={{ "--cc": ocolor }} aria-hidden="true"><Icon name={of.icon} size={250} stroke={0.9} /><b>{of.short || of.name}</b></i>}
          <i className="ib-emblem me" style={{ "--cc": color }} aria-hidden="true"><Icon name={f.icon} size={300} stroke={0.9} /><b>{crest}</b></i>

          {/* en face : l'adversaire du jour ; sa table est tournée vers lui (pas sur la table ronde : un plateau par joueur, les autres sont en 3D) */}
          {opp && !ontable && (
            <div className="ib-row ib-back opp" aria-label={`Table de l'adversaire : ${rv.name}`}>
              <Slot>
                <button className={"ib-plotx ib-hit" + (plotUp ? " up" : "")} style={{ "--pw": OPW + "px" }} onClick={doReveal} aria-label="Scénario adverse : le révéler" title="Scénario adverse (face cachée)">
                  <span className="ib-flip">
                    <span className="ib-pback"><Icon name="scroll" size={20} stroke={1.6} /><b>Scénario</b></span>
                    <span className="ib-pface">{plotUp && CARD[plotUp] && <PlotFace d={CARD[plotUp]} w={OPW} />}</span>
                  </span>
                </button>
              </Slot>
              <Slot>
                <button className="ib-card" style={{ "--w": OSW + "px" }} onClick={() => onFamily(rv.fam, rv.pt)} aria-label={`Carte de famille adverse : ${of.name}`}><FamilyFace fam={rv.fam} pt={rv.pt} w={OSW} /></button>
              </Slot>
              {opp.loc && <Slot><button className="ib-card" style={{ "--w": OSW + "px" }} onClick={zoom(opp.loc)} aria-label={`${CARD[opp.loc].name} (adversaire) : voir en grand`}><CardFace d={CARD[opp.loc]} w={OSW} foil={isSeven(opp.loc)} /></button></Slot>}
              <Slot><DeckPile w={OSW} n={7} shuffling={oshuf} onClick={doOppShuffle} label="Pioche adverse : la mélanger" /></Slot>
              {opp.disc && <Slot><span className="ib-stack" style={{ "--w": OSW + "px" }}><i /><i /><button className="ib-card" onClick={zoom(opp.disc)} aria-label={`Défausse adverse : ${CARD[opp.disc].name}`}><CardFace d={CARD[opp.disc]} w={OSW} /></button></span></Slot>}
              <Slot wide>
                <button className={"ib-hand ib-hit" + (fan ? " fan" : "")} onClick={doFan} aria-label="Main adverse : la battre" title="Main adverse">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className="ib-hc" style={{ "--i": i }}><CardBack w={OSW} /></span>)}
                </button>
              </Slot>
            </div>
          )}
          {opp && !ontable && (
            <div className="ib-row ib-line opp">
              <span className="ib-side l"><span className="ib-gold"><Coins n={4} /><Coins n={2} x={34} y={12} /></span></span>
              <div className="ib-chars">
                {opp.chars.map((id, i) => (
                  <button key={id} className={"ib-card deal" + (i === 1 ? " knelt" : "")} style={{ "--w": OW + "px", "--d": i + 2 }} onClick={zoom(id)} aria-label={`${CARD[id].name} (adversaire) : voir en grand`}>
                    <CardFace d={CARD[id]} w={OW} foil={isSeven(id)} />
                    {i === 0 && <Power n={3} />}
                  </button>
                ))}
              </div>
              <span className="ib-side r" />
            </div>
          )}

          {/* au milieu : le trésor, les trois défis, la réserve de Pouvoir (sur la table ronde, ils sont au milieu de la table, en 3D) */}
          {!ontable && <div className="ib-mid">
            <button className={"ib-coins ib-hit" + (coin ? " spin" : "")} key={"c" + coin} onClick={doCoin} aria-label="Trésor : lancer une pièce d'Or" title="Trésor (Or)">
              <Coins n={6} /><Coins n={4} x={-40} y={10} /><Coins n={3} x={38} y={12} />
              <span className="ib-lab">Trésor</span>
            </button>
            <div className="ib-chal" role="group" aria-label="Les trois défis">
              {TYPES.map((ty) => (
                <button key={ty} className={"ib-medal ib-hit " + ty + (lit === ty ? " lit" : "")} onClick={() => doChal(ty)} aria-label={`Défi de ${TYPE_NAME[ty]}`} title={`Défi de ${TYPE_NAME[ty]}`}>
                  <span><Icon name={TYPE_ICON[ty]} size={26} stroke={2} /></span>
                </button>
              ))}
              <span className="ib-lab">Combat · Ruse · Influence</span>
            </div>
            <div className="ib-pool" title={`${DEFAULT_GOAL} Pouvoir pour gagner`}>
              <span className="ib-seal"><Icon name="crown" size={24} stroke={1.5} /><b>{DEFAULT_GOAL}</b></span>
              <span className="ib-power" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} style={{ "--i": i }}><Icon name="crown" size={12} stroke={2.4} /></i>)}</span>
              <span className="ib-lab">Pouvoir</span>
            </div>
          </div>}

          {/* ton côté : la table du deck joué */}
          <div className="ib-row ib-line me">
            <span className="ib-side l"><span className="ib-first" title="Premier joueur : c'est toi"><Icon name="flag" size={18} stroke={2} /><b>1er</b></span></span>
            <div className="ib-chars">
              {tbl && tbl.chars.map((id, i) => (
                <button key={id} className={"ib-card deal" + (i === 1 ? " knelt" : "")} style={{ "--w": CW + "px", "--d": i + 5 }} onClick={zoom(id)} aria-label={`${CARD[id].name} : voir en grand`}>
                  {i === 0 && tbl.att && <span className="ib-att" title={CARD[tbl.att].name}><CardFace d={CARD[tbl.att]} w={CW} foil={foil(tbl.att)} /></span>}
                  <CardFace d={CARD[id]} w={CW} foil={foil(id)} />
                  {i === 0 && <Power n={2} />}
                  {i === 2 && <Power n={1} />}
                </button>
              ))}
              {(!tbl || !tbl.chars.length) && <span className="ib-empty">Tes personnages</span>}
            </div>
            <span className="ib-side r"><span className="ib-gold"><Coins n={5} /><Coins n={3} x={32} y={12} /><span className="ib-lab">Ton Or</span></span></span>
          </div>
          <div className="ib-row ib-back me">
            <Slot label="Scénarios">
              {tbl && tbl.plot ? (
                <span className="ib-plots" style={{ "--pw": PW + "px" }}>
                  {tbl.used.map((p, i) => <span key={p} className="ib-used" style={{ "--i": i }}><PlotFace d={CARD[p]} w={PW} /></span>)}
                  <button className="ib-card plot deal" style={{ "--d": 9 }} onClick={zoom(tbl.plot)} aria-label={`Scénario ${CARD[tbl.plot].name} : voir en grand`}><PlotFace d={CARD[tbl.plot]} w={PW} /></button>
                </span>
              ) : <span className="ib-plots" style={{ "--pw": PW + "px" }} />}
            </Slot>
            {deck && <Slot label="Famille"><button className="ib-card ib-fam deal" style={{ "--w": SW + "px", "--d": 10 }} onClick={() => onFamily()} aria-label={`Carte de famille : ${f.name}`}><FamilyFace fam={deck.fam} pt={deck.pt} w={SW} /></button></Slot>}
            {tbl && tbl.loc && <Slot label="Lieu"><button className="ib-card deal" style={{ "--w": SW + "px", "--d": 11 }} onClick={zoom(tbl.loc)} aria-label={`${CARD[tbl.loc].name} : voir en grand`}><CardFace d={CARD[tbl.loc]} w={SW} foil={foil(tbl.loc)} /></button></Slot>}
            <Slot label="Pioche"><DeckPile w={SW} n={9} shuffling={shuf} onClick={doShuffle} label="Ta pioche : la mélanger" /></Slot>
            {tbl && tbl.disc && <Slot label="Défausse"><span className="ib-stack" style={{ "--w": SW + "px" }}><i /><i /><button className="ib-card disc deal" style={{ "--d": 12 }} onClick={zoom(tbl.disc)} aria-label={`Défausse : ${CARD[tbl.disc].name}, voir en grand`}><CardFace d={CARD[tbl.disc]} w={SW} foil={foil(tbl.disc)} /></button></span></Slot>}
            {tbl && tbl.dead && <Slot label="Morts"><button className="ib-card dead deal" style={{ "--w": SW + "px", "--d": 13 }} onClick={zoom(tbl.dead)} aria-label={`Pile des morts : ${CARD[tbl.dead].name}, voir en grand`}><CardFace d={CARD[tbl.dead]} w={SW} foil={foil(tbl.dead)} /><span className="ib-skull" aria-hidden="true"><Icon name="skull" size={16} stroke={2} /></span></button></Slot>}
          </div>
        </div>
      </div>
    </div>
  );
}
