// Transitions de Heavy is the Crown (appli du jeu seul), à la place de celles de Party Hub :
//  - « porte » (écran titre → jeu, lobby → partie) : deux battants sombres s'écartent depuis une couronne dorée qui s'illumine ;
//  - « donne » (entre les autres écrans) : un éventail de dos de cartes balaie l'écran, comme une donne rapide.
// Rejouée quand `k` change (jamais au premier affichage). Ne bloque jamais les clics. Rien si le système demande moins d'animations.
import { useEffect, useRef, useState } from "react";
import { sfx } from "../../lib/sfx.js";
import { CrownMark } from "./TitleScreen.jsx";
import { CardBack } from "./Card.jsx";

const GATE = new Set(["title>hub", "title>lobby", "lobby>game", "hub>game", "game>lobby"]);

export default function CrownFx({ k }) {
  const prev = useRef(null);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = k;
    if (was === null || was === k) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const kind = GATE.has(`${was}>${k}`) ? "gate" : "deal";
    setFx({ n: Date.now(), kind });
    if (kind === "gate") sfx.sweep(); else sfx.slide();
    const t = setTimeout(() => setFx(null), kind === "gate" ? 950 : 720);
    return () => clearTimeout(t);
  }, [k]);
  if (!fx) return null;
  if (fx.kind === "gate") {
    return (
      <div className="cfx cfx-gate" key={fx.n} aria-hidden="true">
        <i className="cfx-door l" /><i className="cfx-door r" />
        <span className="cfx-crown"><CrownMark size={120} /></span>
        <i className="cfx-flash" />
      </div>
    );
  }
  return (
    <div className="cfx cfx-deal" key={fx.n} aria-hidden="true">
      <i className="cfx-veil" />
      {Array.from({ length: 7 }, (_, i) => <span key={i} className="cfx-card" style={{ "--i": i }}><CardBack w={110} /></span>)}
    </div>
  );
}
