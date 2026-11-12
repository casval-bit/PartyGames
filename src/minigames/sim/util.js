// Outils communs des simulations des mini-jeux d'arène (code pur, sans affichage : testable sous Node).
/** Générateur à graine : tous les joueurs reçoivent exactement la même partie (même algorithme que kit.jsx). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const wrapPi = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
/** Fait tourner `a` vers `b` d'au plus `step` radians. */
export const turnToward = (a, b, step) => { const d = wrapPi(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
export const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
/** Entrée neutre d'un joueur : `x`, `y` ∈ [-1, 1] (y > 0 = vers le bas de l'écran = +z), `act` / `act2` = boutons. */
export const noInput = () => ({ x: 0, y: 0, act: false, act2: false });
