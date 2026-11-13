// Transition entre deux écrans (remplace l'ancien damier de « matérialisation ») :
//   - Party Hub : un voile s'efface pendant qu'un balayage de lumière traverse l'écran ;
//   - Trône des Mondes (collection, partie) : une grande carte au dos doré couvre l'écran, recule puis se retourne pour révéler le jeu.
// Rejouée chaque fois que `k` change, jamais au premier affichage (l'accueil a sa propre animation). Ne bloque jamais les clics.
// Rien si le système demande moins d'animations ; balayage simple si les animations du Trône des Mondes sont réduites.
import { useEffect, useRef, useState } from "react";
import { sfx } from "../lib/sfx.js";
import { Icon } from "./Icon.jsx";
import { tcgCalm } from "../tcg/prefs.js";

const isTcg = (k) => k === "hub" || String(k).startsWith("room:ag");

export default function ScreenFx({ k }) {
  const prev = useRef(null);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = k;
    if (was === null || was === k) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const card = isTcg(k) && !tcgCalm();
    setFx({ card, n: Date.now() });
    if (card) sfx.cardFlip(); else sfx.sweep();
    const t = setTimeout(() => setFx(null), card ? 1000 : 800);
    return () => clearTimeout(t);
  }, [k]);
  if (!fx) return null;
  return fx.card ? (
    <div className="sfx-card" key={fx.n} aria-hidden="true">
      <div className="sfx-cardback"><span className="sfx-crest"><Icon name="crown" size={54} stroke={1.4} /></span><b>Trône des Mondes</b></div>
    </div>
  ) : (
    <div className="sfx-sweep" key={fx.n} aria-hidden="true"><i /></div>
  );
}
