import { useEffect, useRef, useState } from "react";

/** Générateur pseudo-aléatoire à graine : tous les joueurs reçoivent exactement la même partie. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
export const rpick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function rshuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const vib = (p) => { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate && navigator.vibrate(p); } catch { /* sans vibreur */ } };

/** Rend un `finish(score)` qui ne s'exécute qu'une fois. */
export function useFinish(onFinish) {
  const done = useRef(false), cb = useRef(onFinish);
  cb.current = onFinish;
  return (score) => {
    if (done.current) return;
    done.current = true;
    const n = Number(score);
    cb.current(Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
  };
}
/** Score courant : `ref` (lecture immédiate), `val` (affichage), `add`. */
export function useScore(start = 0) {
  const ref = useRef(start);
  const [val, setVal] = useState(start);
  return { ref, val, add: (n) => { ref.current += n; setVal(ref.current); }, set: (n) => { ref.current = n; setVal(n); } };
}
/** Chrono du mini-jeu : appelle `onEnd` une seule fois quand le temps est écoulé. */
export function useClock(seconds, onEnd, active = true) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (!active) return undefined; // jeux 3D : le chrono ne démarre qu'au premier affichage
    const t0 = performance.now();
    let raf, fired = false;
    const fire = () => { if (!fired) { fired = true; end.current(); } };
    const loop = () => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) return fire();
      raf = requestAnimationFrame(loop);
    };
    loop();
    const to = setTimeout(fire, seconds * 1000 + 60); // filet de sécurité si l'onglet est en arrière-plan
    return () => { cancelAnimationFrame(raf); clearTimeout(to); };
  }, [seconds, active]);
  return { left, frac: left / seconds };
}
/** Boucle d'animation : `fn(dtSecondes, tMs)` à chaque image. */
export function useFrame(fn, deps = []) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    let raf, last = performance.now();
    const t0 = last;
    const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; f.current(dt, now - t0); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
export function TimeBar({ clock }) {
  return <div className="mgtime" role="timer" aria-label={`${Math.ceil(clock.left)} secondes`}><i style={{ width: `${Math.round(clock.frac * 1000) / 10}%` }} /><b>{Math.ceil(clock.left)}</b></div>;
}
