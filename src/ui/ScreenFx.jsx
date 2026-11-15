// Transition entre deux écrans (remplace l'ancien damier de « matérialisation ») : un voile s'efface pendant qu'un balayage
// de lumière traverse l'écran. Jamais vers le Trône des Mondes (collection, partie) : il s'ouvre directement, sans animation.
// Rejouée chaque fois que `k` change, jamais au premier affichage (l'accueil a sa propre animation). Ne bloque jamais les clics.
// Rien si le système demande moins d'animations.
import { useEffect, useRef, useState } from "react";
import { sfx } from "../lib/sfx.js";

const isTcg = (k) => k === "hub" || String(k).startsWith("room:ag");

export default function ScreenFx({ k }) {
  const prev = useRef(null);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = k;
    if (was === null || was === k || isTcg(k)) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    setFx({ n: Date.now() });
    sfx.sweep();
    const t = setTimeout(() => setFx(null), 800);
    return () => clearTimeout(t);
  }, [k]);
  if (!fx) return null;
  return <div className="sfx-sweep" key={fx.n} aria-hidden="true"><i /></div>;
}
