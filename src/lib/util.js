export const uid = (n = 8) => Math.random().toString(36).slice(2, 2 + n) + Date.now().toString(36).slice(-3);
export const pick = (a) => a[(Math.random() * a.length) | 0];
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
  try { navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ }
}
