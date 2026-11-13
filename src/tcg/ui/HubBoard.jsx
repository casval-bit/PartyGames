// Plateau de jeu en 3D isométrique, au centre de l'accueil du Trône des Mondes : la table du deck joué, posée comme en partie.
//   - de ton côté : tes personnages (l'un agenouillé), ta carte de famille, ton scénario, un lieu, ta pioche et ta défausse ;
//   - en face : la table d'un adversaire, cartes face cachée (sa main, sa pioche, son scénario pas encore révélé) ;
//   - au milieu : l'Or et les jetons de Pouvoir.
// Les cartes face visible s'ouvrent en grand ; la pioche se mélange, la main adverse se bat, le scénario adverse se révèle un instant,
// les pièces d'Or tournent. Tout est en CSS 3D (aucune scène WebGL) ; le plateau se met à l'échelle de la place disponible.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CARD, FAMILY, PLOTS, subOf } from "../cards/index.js";
import { RARITY_ORDER } from "../rules.js";
import { Icon } from "../../ui/Icon.jsx";
import { sfx } from "../../lib/sfx.js";
import { CardFace, CardBack, PlotFace, FamilyFace } from "./Card.jsx";
import { cardArt } from "./art.js";

const byStrength = (a, b) => CARD[b].cost - CARD[a].cost || RARITY_ORDER.indexOf(CARD[b].r) - RARITY_ORDER.indexOf(CARD[a].r) || a.localeCompare(b);

/** Ce que l'on pose sur la table : les 4 personnages les plus forts (une version par personnage), un lieu, la défausse, le scénario. */
function tableOf(deck) {
  const ids = Object.keys(deck.cards).filter((id) => CARD[id]);
  const chars = [], keys = new Set();
  for (const id of ids.filter((x) => CARD[x].type === "char").sort(byStrength)) {
    const k = CARD[id].key || id;
    if (keys.has(k)) continue;
    keys.add(k); chars.push(id);
    if (chars.length === 4) break;
  }
  const loc = ids.filter((x) => CARD[x].type === "loc").sort(byStrength)[0] || null;
  const disc = ids.filter((x) => CARD[x].type === "evt" || CARD[x].type === "obj").sort(byStrength)[0] || null;
  const plot = (deck.plots || []).find((p) => CARD[p]) || null;
  return { chars, loc, disc, plot };
}

/** Pile de cartes face cachée (avec de l'épaisseur) ; un clic la mélange. */
function DeckPile({ w, n = 7, shuffling, onClick, label }) {
  return (
    <button className={"ib-pile ib-hit" + (shuffling ? " shuf" : "")} style={{ "--w": w + "px" }} onClick={onClick} aria-label={label} title={label}>
      {Array.from({ length: n }, (_, i) => <span key={i} className="ib-layer" style={{ "--i": i, "--n": n }}><CardBack w={w} /></span>)}
    </button>
  );
}

export default function HubBoard({ deck, foil, onZoom, onFamily, calm }) {
  const wrap = useRef(null), plane = useRef(null);
  const [k, setK] = useState(0.6);
  const [shuf, setShuf] = useState(false);
  const [oshuf, setOshuf] = useState(false);
  const [fan, setFan] = useState(false);
  const [plotUp, setPlotUp] = useState(null);
  const [coin, setCoin] = useState(0);
  const tbl = useMemo(() => (deck ? tableOf(deck) : null), [deck]);
  const f = deck ? FAMILY[deck.fam] || FAMILY.neutre : FAMILY.neutre;
  const color = deck && subOf(deck.fam, deck.pt) ? subOf(deck.fam, deck.pt).color : f.color;
  const mat = useMemo(() => cardArt({ id: `tapis:${deck ? deck.fam : "neutre"}:${(deck && deck.pt) || ""}`, type: "fam", fam: deck ? deck.fam : "neutre", r: "U", name: "", noMedal: true, pt: deck && deck.pt ? [deck.pt] : [] }, 420, 280), [deck]);

  // mise à l'échelle : le plateau (incliné) remplit la place disponible sans déborder
  useLayoutEffect(() => {
    const el = wrap.current, pl = plane.current;
    if (!el || !pl) return undefined;
    const fit = () => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const was = pl.style.getPropertyValue("--k");
      pl.style.setProperty("--k", "1"); // taille du plateau incliné à l'échelle 1
      const r = pl.getBoundingClientRect();
      if (!r.width || !r.height) { pl.style.setProperty("--k", was); return; }
      // téléphone : le plateau déborde un peu sur les côtés (les coins du tapis sont coupés) pour que les cartes restent lisibles
      const hub = el.closest(".hubh");
      const over = hub && hub.getBoundingClientRect().width < 620 ? 1.3 : 1; // téléphone seulement (pas de menus sur les côtés)
      const next = Math.max(0.25, Math.min(1.35, Math.min((box.width * over) / r.width, box.height / r.height) * 0.97));
      pl.style.setProperty("--k", String(next)); // posé tout de suite (React garde la même valeur ensuite)
      setK(next);
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    return () => { if (ro) ro.disconnect(); };
  }, []);

  useEffect(() => { if (!plotUp) return undefined; const tm = setTimeout(() => { setPlotUp(null); sfx.flip(); }, 2600); return () => clearTimeout(tm); }, [plotUp]);

  const doShuffle = () => { if (shuf) return; setShuf(true); sfx.shuffle(); setTimeout(() => setShuf(false), calm ? 300 : 1000); };
  const doOppShuffle = () => { if (oshuf) return; setOshuf(true); sfx.shuffle(); setTimeout(() => setOshuf(false), calm ? 300 : 1000); };
  const doFan = () => { if (fan) return; setFan(true); sfx.shuffle(); setTimeout(() => setFan(false), calm ? 300 : 1100); };
  const doReveal = () => { if (plotUp || !PLOTS.length) return; setPlotUp(PLOTS[Math.floor(Math.random() * PLOTS.length)].id); sfx.flip(); };
  const doCoin = () => { setCoin((c) => c + 1); sfx.coin(); };

  const CW = 112, SW = 90, PW = 140; // largeur des personnages, des autres cartes, des scénarios (pixels du plateau)
  return (
    <div className={"ib" + (calm ? " calm" : "")} ref={wrap}>
      <div className="ib-plane" ref={plane} style={{ "--k": k, "--mat": `url(${mat})`, "--fc": color }} aria-label="Plateau de jeu">
        <i className="ib-felt" aria-hidden="true" />
        {/* en face : un adversaire, tout est face cachée */}
        <div className="ib-far">
          <DeckPile w={SW} n={6} shuffling={oshuf} onClick={doOppShuffle} label="Pioche adverse : la mélanger" />
          <button className={"ib-hand ib-hit" + (fan ? " fan" : "")} onClick={doFan} aria-label="Main adverse : la battre" title="Main adverse">
            {[0, 1, 2, 3, 4].map((i) => <span key={i} className="ib-hc" style={{ "--i": i }}><CardBack w={SW} /></span>)}
          </button>
          <button className={"ib-plotx ib-hit" + (plotUp ? " up" : "")} onClick={doReveal} aria-label="Scénario adverse : le révéler" title="Scénario adverse (face cachée)">
            <span className="ib-flip">
              <span className="ib-pback"><Icon name="scroll" size={22} stroke={1.6} /><b>Scénario</b></span>
              <span className="ib-pface">{plotUp && CARD[plotUp] && <PlotFace d={CARD[plotUp]} w={PW} />}</span>
            </span>
          </button>
        </div>

        {/* au milieu : l'Or et le Pouvoir */}
        <div className="ib-mid" aria-hidden="false">
          <button className={"ib-coins ib-hit" + (coin ? " spin" : "")} key={"c" + coin} onClick={doCoin} aria-label="Pièces d'Or : en lancer une" title="Or">
            {[0, 1, 2, 3].map((i) => <i key={i} className="ib-coin" style={{ "--i": i }}><Icon name="coins" size={14} stroke={2} /></i>)}
          </button>
          <span className="ib-seal" aria-hidden="true"><Icon name="crown" size={30} stroke={1.5} /></span>
          <span className="ib-power" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} style={{ "--i": i }}><Icon name="crown" size={12} stroke={2.4} /></i>)}</span>
        </div>

        {/* ton côté : la table du deck joué */}
        <div className="ib-near">
          <div className="ib-chars">
            {tbl && tbl.chars.map((id, i) => (
              <button key={id} className={"ib-card deal" + (i === 1 ? " knelt" : "")} style={{ "--w": CW + "px", "--d": i }} onClick={() => onZoom(id)} aria-label={`${CARD[id].name} : voir en grand`}>
                <CardFace d={CARD[id]} w={CW} foil={foil(id)} />
              </button>
            ))}
            {(!tbl || !tbl.chars.length) && <span className="ib-empty">Tes personnages</span>}
          </div>
          <div className="ib-row">
            {deck && <button className="ib-card ib-fam deal" style={{ "--w": SW + "px", "--d": 4 }} onClick={onFamily} aria-label={`Carte de famille : ${f.name}`}><FamilyFace fam={deck.fam} pt={deck.pt} w={SW} /></button>}
            {tbl && tbl.plot && <button className="ib-card plot deal" style={{ "--d": 5 }} onClick={() => onZoom(tbl.plot)} aria-label={`Scénario ${CARD[tbl.plot].name} : voir en grand`}><PlotFace d={CARD[tbl.plot]} w={PW} /></button>}
            {tbl && tbl.loc && <button className="ib-card deal" style={{ "--w": SW + "px", "--d": 6 }} onClick={() => onZoom(tbl.loc)} aria-label={`${CARD[tbl.loc].name} : voir en grand`}><CardFace d={CARD[tbl.loc]} w={SW} foil={foil(tbl.loc)} /></button>}
            <DeckPile w={SW} n={8} shuffling={shuf} onClick={doShuffle} label="Ta pioche : la mélanger" />
            {tbl && tbl.disc && <button className="ib-card disc deal" style={{ "--w": SW + "px", "--d": 7 }} onClick={() => onZoom(tbl.disc)} aria-label={`Défausse : ${CARD[tbl.disc].name}, voir en grand`}><CardFace d={CARD[tbl.disc]} w={SW} foil={foil(tbl.disc)} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
