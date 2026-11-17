export const uid = (n = 8) => Math.random().toString(36).slice(2, 2 + n) + Date.now().toString(36).slice(-3);
export const pick = (a) => a[(Math.random() * a.length) | 0];
/** Code de salon à dicter ou à copier : 6 caractères, sans ceux qu'on confond (0/O, 1/I/L). */
export const roomCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[(Math.random() * 31) | 0]).join("");
/** Code tapé par un joueur : sans espaces ni tirets, en majuscules pour un code de 6 caractères (salon du jeu de cartes). */
export const cleanRoomCode = (s) => { const c = String(s || "").replace(/[\s-]/g, ""); return c.length === 6 ? c.toUpperCase() : c; };
export function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    return null;
  }
}
export function vibrate(p) {
  try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ }
}
