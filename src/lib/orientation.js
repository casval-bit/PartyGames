// Orientation de l'écran : la partie du Trône des Mondes se joue en paysage.
// Dans l'appli Android, le plugin Capacitor tourne vraiment l'écran. Dans un navigateur, on essaie l'API standard
// (souvent refusée hors plein écran) ; à défaut, l'interface de jeu se tourne d'elle-même en CSS (voir .agl dans tcg.css).
import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { DESKTOP, desktop } from "./device.js";

let locked = false;
const native = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export async function lockLandscape() {
  try {
    if (native()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "landscape" });
      locked = true;
      return true;
    }
    if (typeof screen !== "undefined" && screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
      locked = true;
      return true;
    }
  } catch { /* refusé (navigateur hors plein écran) : l'interface se tourne en CSS */ }
  return false;
}

export async function unlockOrientation() {
  if (!locked) return;
  locked = false;
  try {
    if (native()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.unlock();
      return;
    }
    if (typeof screen !== "undefined" && screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
  } catch { /* rien à faire */ }
}

/** Plein écran du navigateur (le site de test) ou de la fenêtre (appli PC) ; dans l'appli Android, l'écran est déjà entier. */
export const canFullscreen = () => !native() && (DESKTOP || (typeof document !== "undefined" && Boolean(document.fullscreenEnabled)));
export async function toggleFullscreen() {
  try {
    if (DESKTOP) { const d = desktop(); return await d.setFullscreen(!(await d.isFullscreen())); }
    if (document.fullscreenElement) { await document.exitFullscreen(); return false; }
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    await lockLandscape();
    return true;
  } catch { return false; }
}

/** Plein écran en cours ? Suit tout seul les changements (touche F11 sur PC, Échap dans un navigateur…). */
export function useFullscreen() {
  const [on, setOn] = useState(() => !DESKTOP && typeof document !== "undefined" && Boolean(document.fullscreenElement));
  useEffect(() => {
    if (DESKTOP) {
      const d = desktop();
      d.isFullscreen().then(setOn).catch(() => {});
      return d.onFullscreen(setOn);
    }
    if (typeof document === "undefined") return undefined;
    const f = () => setOn(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  return on;
}
