// Costumes complets (hot-dog, banane, ninja… et les animaux de animals.js) : une texture peinte sur tout le corps + quelques petits volumes (ailes, casque…).
// Un costume ne change JAMAIS la taille ni les proportions du corps, des jambes et des bras : seulement l'apparence.
import { KP, EQ, TEX_W } from "./head.js";
import { ANIMALS } from "./animals.js";
import { decorSuit } from "./suits3d.js";
import { decorAnimal } from "./animals3d.js";

const W = TEX_W, INKC = "#1b1426", CREAM = "#f6f1e4", GOLD = "#f2c230", METAL = "#aeb6c8";
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** m : couleur principale · a : détails · limb : membres ("m", "a", "skin" ou #hex) · shoe : chaussures imposées · head : la tête reste de la couleur du personnage */
const INFO = {
  hotdog:  { m: "#d94b2b", a: "#f2c46a", limb: "a" },
  banana:  { m: "#ffe030", a: "#6b4a2b", limb: "m" },
  taco:    { m: "#f2c46a", a: "#5fbf4a", limb: "m" },
  bee:     { m: "#ffcf1f", a: "#2a2430", limb: "a" },
  astro:   { m: "#f4f1ea", a: "#e23a3a", limb: "m", shoe: "#c9ced8", head: true },
  ninja:   { m: "#1d1a24", a: "#d63a3a", limb: "m", shoe: "#1d1a24", hideLower: true },
  pirate:  { m: "#f6f1e4", a: "#d63a3a", limb: "skin", head: true },
  knight:  { m: "#aeb6c8", a: "#e23a3a", limb: "m", shoe: "#8f98ab", head: true },
  hero:    { m: "#2f6fe0", a: "#e23a3a", limb: "m", shoe: "#e23a3a", head: true },
  chef:    { m: "#ffffff", a: "#e23a3a", limb: "skin", head: true },
};

for (const [id, an] of Object.entries(ANIMALS)) INFO[id] = { m: an.m, a: an.a, limb: an.limb, legs: an.legs || null, animal: an };

/** Couleurs du costume pour ce personnage. null si pas de costume. */
export function suitOf(ctx) {
  const id = ctx.P.suit.id, i = INFO[id];
  if (!i) return null;
  const m = ctx.col.suit || i.m, a = ctx.col.suit2 || i.a;
  const limb = i.limb === "m" ? m : i.limb === "a" ? a : i.limb === "skin" ? ctx.col.skin : i.limb;
  const legs = i.legs ? (i.legs === "m" ? m : i.legs === "a" ? a : i.legs) : limb;
  return { id, info: i, m, a, limb, legs, animal: i.animal || null, shoe: i.shoe ? (ctx.col.suit ? m : i.shoe) : null, hideLower: !!i.hideLower };
}

/* ============================ peinture ============================ */
export function paintSuit(g, ctx, H) {
  const { K, col } = ctx, S = ctx.suit, { id, m, a } = S, sk = col.skin;
  const d = K.shade(m, -0.15), l = K.shade(m, 0.16);
  const row = (v) => EQ + v * KP, below = ctx.prof.below;
  const ell = (x, y, rx, ry, c, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fillStyle = c; g.fill(); };
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const line = (pts, w, c) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
  const poly = (pts, c) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = c; g.fill(); };
  const r = rng(23), top = S.info.head ? row(0.36) : 0;
  if (S.info.head) { /* la tête garde la couleur du personnage */ }
  rect(0, top, W, H - top, m);
  const F = W / 2;
  if (S.animal) { if (S.animal.paint) S.animal.paint(g, ctx, H); return m; }       // costumes d'animaux : voir animals.js
  switch (id) {
    case "hotdog": {
      rect(0, row(-0.1), W, H, a);
      g.fillStyle = m; g.beginPath(); g.moveTo(F - 150, 0);
      for (let y = 0; y <= H; y += 20) g.lineTo(F - 150 + Math.sin(y / 30) * 8, y);
      for (let y = H; y >= 0; y -= 20) g.lineTo(F + 150 + Math.sin(y / 30) * 8, y);
      g.closePath(); g.fill();
      rect(0, 0, W, row(-0.06), m); rect(0, 0, 0, 0, m);
      g.fillStyle = m; g.fillRect(0, 0, W, row(-0.12));
      line(Array.from({ length: 22 }, (_, i) => [F + (i % 2 ? 40 : -40), row(0.38) + i * 16]), 12, "#ffd23a");
      for (const sx of [-1, 1]) line([[F + sx * 160, row(0.2)], [F + sx * 160, H]], 4, K.shade(a, -0.2));
      break; }
    case "banana": for (let i = 0; i < 8; i++) line([[i * 128, 0], [i * 128, H]], 5, d); for (let i = 0; i < 40; i++) ell(r() * W, r() * H, 3 + r() * 4, 3 + r() * 4, a); rect(0, 0, W, 34, a); rect(0, H - 40, W, 40, a); break;
    case "taco": for (let i = 0; i < 90; i++) ell(r() * W, r() * H, 3 + r() * 5, 2 + r() * 3, K.shade(m, -0.22)); line([[0, row(0.75)], [W, row(0.75)]], 6, K.shade(m, -0.2)); g.fillStyle = l; g.globalAlpha = 0.3; g.fillRect(0, 0, W, 26); g.globalAlpha = 1; break;
    case "bee": for (let y = row(0.4); y < H; y += 0.36 * KP) rect(0, y, W, 0.16 * KP, a); for (let i = 0; i < 70; i++) ell(r() * W, r() * H, 2, 2, K.shade(m, -0.1)); break;
    case "astro": rect(0, row(0.62), W, 10, a); rect(F - 150, row(0.7), 300, 10, a); rect(F - 62, row(0.45), 124, 80, K.shade(m, -0.1)); ell(F - 30, row(0.5), 8, 8, "#52f0ff"); ell(F, row(0.5), 8, 8, GOLD); ell(F + 30, row(0.5), 8, 8, a); poly([[F + 110, row(0.5)], [F + 170, row(0.5)], [F + 170, row(0.62)], [F + 110, row(0.62)]], "#2f6fe0"); for (let x = 0; x < W; x += 128) line([[x, row(0.36)], [x, H]], 3, K.shade(m, -0.1)); rect(0, row(0.36), W, 12, METAL); break;
    case "ninja": rect(0, 0, W, H, m); rect(0, row(0.2), W, 14, a); rect(0, row(0.62), W, 22, a); break;
    case "pirate": { for (let y = row(0.4), k = 0; y < H; y += 0.15 * KP, k++) rect(0, y, W, 0.075 * KP, k % 2 ? "#d63a3a" : CREAM); rect(0, row(0.36), W, 0.04 * KP, CREAM); rect(0, row(Math.max(0.74, below - 0.34)), W, H, "#2a2430"); rect(0, row(Math.max(0.74, below - 0.34)), W, 22, "#4a3524"); rect(F - 24, row(Math.max(0.74, below - 0.34)) - 2, 48, 28, GOLD); poly([[F - 120, row(0.36)], [F, row(0.62)], [F + 120, row(0.36)]], sk); break; }
    case "knight": for (let y = row(0.36); y < H; y += 0.2 * KP) line([[0, y], [W, y]], 3, K.shade(m, -0.22)); rect(0, row(0.36), W, 14, K.shade(m, -0.2)); ell(F, row(0.72), 0.2 * KP, 0.26 * KP, a); line([[F, row(0.55)], [F, row(0.9)]], 8, CREAM); line([[F - 30, row(0.7)], [F + 30, row(0.7)]], 8, CREAM); for (let x = 0; x < W; x += 70) ell(x, row(0.4), 4, 4, K.shade(m, 0.2)); break;
    case "hero": rect(0, row(Math.max(0.74, below - 0.3)), W, H, a); ell(F, row(0.66), 0.17 * KP, 0.17 * KP, GOLD); poly(Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * 6.283 - 1.571, rr = i % 2 ? 0.05 * KP : 0.13 * KP; return [F + Math.cos(t) * rr, row(0.66) + Math.sin(t) * rr]; }), a); rect(0, row(Math.max(0.74, below - 0.3)), W, 12, GOLD); rect(0, row(0.36), W, 14, a); break;
    case "chef": rect(0, row(0.36), W, H, "#ffffff"); for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) ell(F + (i ? 36 : -36), row(0.55 + k * 0.17), 10, 10, GOLD); line([[F, row(0.38)], [F, H]], 4, "#d9dde8"); poly([[F - 130, row(0.36)], [F, row(0.7)], [F + 130, row(0.36)]], a); rect(0, row(Math.max(0.74, below - 0.28)), W, H, "#3a3f55"); for (let x = 0; x < W; x += 36) line([[x, row(Math.max(0.74, below - 0.28))], [x, H]], 3, "#2d3144"); break;
  }
  return S.info.head ? sk : m;
}

/* ============================ volumes ============================ */
// Les volumes (couches d'épaisseur, accessoires) sont dans suits3d.js (costumes classiques) et animals.js (animaux).
export function addSuit(ctx) {
  const S = ctx.suit; if (!S) return;
  if (S.animal) { decorAnimal(ctx); if (S.animal.decor) S.animal.decor(ctx); return; }
  decorSuit(ctx);
}
