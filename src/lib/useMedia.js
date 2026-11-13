import { useEffect, useState } from "react";

/** Vrai tant que la requête média correspond (suit le redimensionnement de la fenêtre). `on` à false : toujours faux. */
export function useMedia(q, on = true) {
  const get = () => (on && typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (!on || typeof window === "undefined" || !window.matchMedia) { setM(false); return undefined; }
    const mq = window.matchMedia(q), f = () => setM(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [q, on]);
  return m;
}

/** Appli PC en fenêtre large : mises en page en plusieurs colonnes (Trône des Mondes, constructeur de deck). */
export const WIDE_QUERY = "(min-width: 1100px) and (min-height: 560px)";
