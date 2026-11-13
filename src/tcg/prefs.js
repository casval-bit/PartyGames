// Paramètres propres au Trône des Mondes, enregistrés sur cet appareil : sons du jeu, volume, son au survol des boutons,
// animations (complètes ou réduites) et ouverture des boosters (déchirer le paquet en glissant, ou directe).
// Les autres jeux gardent les réglages du profil (sons d'interface, son au survol).
import { useSyncExternalStore } from "react";
import { sfx } from "../lib/sfx.js";

const KEY = "ph-tcg-prefs";
// unlimited : compte testeur seulement (VITE_TESTEURS) — Éclats et jetons rechargés automatiquement
export const TCG_PREFS_DEFAULT = { sound: true, volume: 0.8, hover: true, motion: "full", tear: true, unlimited: true };
const subs = new Set();

function clean(o) {
  const d = TCG_PREFS_DEFAULT, v = o && typeof o === "object" ? o : {};
  return {
    sound: typeof v.sound === "boolean" ? v.sound : d.sound,
    volume: Number.isFinite(v.volume) ? Math.max(0, Math.min(1, v.volume)) : d.volume,
    hover: typeof v.hover === "boolean" ? v.hover : d.hover,
    motion: v.motion === "reduced" ? "reduced" : "full",
    tear: typeof v.tear === "boolean" ? v.tear : d.tear,
    unlimited: typeof v.unlimited === "boolean" ? v.unlimited : d.unlimited,
  };
}
let cur = clean((() => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } })());
sfx.configure("tcg", cur);

export const tcgPrefs = () => cur;
export function setTcgPrefs(patch) {
  cur = clean({ ...cur, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* stockage indisponible */ }
  sfx.configure("tcg", cur);
  subs.forEach((f) => f());
}
export function useTcgPrefs() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cur, () => cur);
}
/** Animations réduites : demandées dans les paramètres du jeu, ou par le système (prefers-reduced-motion). */
export const tcgCalm = () => cur.motion === "reduced" || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
