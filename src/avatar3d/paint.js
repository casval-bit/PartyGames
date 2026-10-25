// Texture peinte du corps : couleur + motif, haut (t-shirt, sweat…), bas, costume complet, puis le visage par-dessus.
import { paintFace, KP, EQ, TEX_W } from "./head.js";
import { paintSuit } from "./costume.js";

const INKC = "#1b1426", CREAM = "#f6f1e4", GOLD = "#e6b33a", METAL = "#aeb6c8";
const W = TEX_W;
const FW = 1.25;                       // un haut recouvre tout le tour du corps : f va de -FW à +FW (hors du cadre = recadré)
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Aide au dessin : trace aussi la copie décalée d'un tour, pour que rien ne soit coupé à la couture du dos. */
function wrap(g, x, fn) { fn(x); if (x < 160) fn(x + W); if (x > W - 160) fn(x - W); }

/* ============================ motifs du corps ============================ */
function pattern(g, id, c1, c2, H, K) {
  const dk = K.shade(c1, -0.18), lt = K.shade(c1, 0.16);
  const r = rng(17), row = (a) => EQ + a * KP;   // a : distance sous l'équateur du dôme (unités)
  switch (id) {
    case "none": return;
    case "belly": g.fillStyle = c2; g.beginPath(); g.ellipse(W / 2, row(0.66), 0.42 * KP, 0.58 * KP, 0, 0, 7); g.fill(); break;
    case "stripes": g.fillStyle = c2; for (let y = row(-0.5); y < H; y += 0.22 * KP) g.fillRect(0, y, W, 0.1 * KP); break;
    case "bands": g.fillStyle = c2; for (let y = row(-0.25); y < H; y += 0.62 * KP) g.fillRect(0, y, W, 0.3 * KP); break;
    case "dots": g.fillStyle = c2; for (let j = 0; j < 14; j++) for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(i * 85.33 + (j % 2) * 42.6, j * 54 + 20, 15, 0, 7); g.fill(); } break;
    case "tiger": g.strokeStyle = c2; g.lineCap = "round"; for (let i = 0; i < 14; i++) { const x0 = i * 73.1 + r() * 20; g.lineWidth = 12 + r() * 14; g.beginPath(); for (let y = 0; y <= H; y += 14) { const x = x0 + Math.sin(y / 38 + i) * 15; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } break;
    case "cow": g.fillStyle = c2; for (let i = 0; i < 16; i++) { const x = r() * W, y = r() * H, rx = 28 + r() * 40, ry = 22 + r() * 34, rot = r() * 3; wrap(g, x, (xx) => { g.beginPath(); g.ellipse(xx, y, rx, ry, rot, 0, 7); g.fill(); g.beginPath(); g.ellipse(xx + rx * 0.6, y - ry * 0.3, rx * 0.5, ry * 0.7, rot + 1, 0, 7); g.fill(); }); } break;
    case "camo": for (const [c, n] of [[c2, 14], [dk, 12]]) { g.fillStyle = c; for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, rx = 34 + r() * 46, ry = 20 + r() * 30, rot = r() * 3; wrap(g, x, (xx) => { g.beginPath(); g.ellipse(xx, y, rx, ry, rot, 0, 7); g.fill(); }); } } break;
    case "checker": g.fillStyle = c2; for (let j = 0; j * 64 < H; j++) for (let i = 0; i < 16; i++) if ((i + j) % 2) g.fillRect(i * 64, j * 64, 64, 64); break;
    case "stars": g.fillStyle = c2; for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 18 + r() * 14; wrap(g, x, (xx) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.283 - 1.571, rr = k % 2 ? s * 0.42 : s; k ? g.lineTo(xx + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(xx + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }); } break;
    case "hearts": g.fillStyle = c2; for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 16 + r() * 12; wrap(g, x, (xx) => { g.beginPath(); g.moveTo(xx, y + s); g.bezierCurveTo(xx - s * 1.5, y - s * 0.1, xx - s * 0.9, y - s * 1.1, xx, y - s * 0.35); g.bezierCurveTo(xx + s * 0.9, y - s * 1.1, xx + s * 1.5, y - s * 0.1, xx, y + s); g.fill(); }); } break;
    case "zigzag": g.strokeStyle = c2; g.lineWidth = 20; g.lineJoin = "miter"; for (let y = 30; y < H + 40; y += 90) { g.beginPath(); for (let x = 0; x <= W; x += 64) { const yy = y + (((x / 64) | 0) % 2 ? 26 : -26); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } break;
    case "grad": { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(0.35, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H); break; }
    case "split": g.fillStyle = c2; g.fillRect(0, 0, W / 2, H); break;
    case "flames": for (let i = 0; i < 16; i++) { const x = (i + 0.5) * (W / 16), h = (0.5 + r() * 0.5) * 0.9 * KP, w = 36; for (const [c, k] of [[c2, 1], ["#ffd23a", 0.6]]) { g.fillStyle = c; g.beginPath(); g.moveTo(x - w * k, H); g.quadraticCurveTo(x - w * 0.2 * k, H - h * k * 0.5, x + (r() - 0.5) * 14, H - h * k); g.quadraticCurveTo(x + w * 0.4 * k, H - h * k * 0.4, x + w * k, H); g.fill(); } } break;
    case "galaxy": { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#1a1040"); gr.addColorStop(1, K.shade(c1, -0.3)); g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H, rr = 70 + r() * 90; wrap(g, x, (xx) => { const rg = g.createRadialGradient(xx, y, 0, xx, y, rr); rg.addColorStop(0, c2 + "cc"); rg.addColorStop(1, c2 + "00"); g.fillStyle = rg; g.fillRect(xx - rr, y - rr, rr * 2, rr * 2); }); } g.fillStyle = "#fff"; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(r() * W, r() * H, 0.8 + r() * 2.2, 0, 7); g.fill(); } break; }
    case "scales": g.strokeStyle = dk; g.lineWidth = 4; for (let j = 0; j * 24 < H + 30; j++) for (let i = 0; i < 17; i++) { g.beginPath(); g.arc(i * 64 + (j % 2) * 32, j * 24, 32, 0.15, Math.PI - 0.15); g.stroke(); } g.fillStyle = lt; g.globalAlpha = 0.18; for (let j = 0; j * 48 < H; j++) g.fillRect(0, j * 48, W, 24); g.globalAlpha = 1; break;
  }
}

/* ============================ haut peint ============================ */
function paintShirt(g, ctx, y0, y1) {
  const { K, P, col } = ctx, c1 = col.top, c2 = col.top2, sk = col.skin, d1 = K.shade(c1, -0.14), l1 = K.shade(c1, 0.12), id = P.top.id;
  if (id === "none") return;
  const sc = (y1 - y0) / 224, Hh = 224, FB = (W / 2) / sc / 512;      // FB : position f du milieu du dos
  g.save(); g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); g.translate(W / 2, y0); g.scale(sc, sc);
  g.lineCap = "round"; g.lineJoin = "round";
  const X = (f) => f * 512, Y = (y) => Hh * (1 - y);
  const rect = (f0, ya, f1, yb, c) => { g.fillStyle = c; g.fillRect(X(f0), Y(yb), (f1 - f0) * 512, (yb - ya) * Hh); };
  const fill = (c) => rect(-FW * 1.4, -0.1, FW * 1.4, 1.1, c);
  const poly = (pts, c) => { g.beginPath(); pts.forEach(([f, y], i) => (i ? g.lineTo(X(f), Y(y)) : g.moveTo(X(f), Y(y)))); g.closePath(); g.fillStyle = c; g.fill(); };
  const line = (pts, w, c) => { g.beginPath(); pts.forEach(([f, y], i) => (i ? g.lineTo(X(f), Y(y)) : g.moveTo(X(f), Y(y)))); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
  const ell = (f, y, rf, ry, c) => { g.beginPath(); g.ellipse(X(f), Y(y), rf * 512, ry * Hh, 0, 0, 7); g.fillStyle = c; g.fill(); };
  const scoop = (rw, rh) => ell(0, 1.0, rw, rh, sk);
  switch (id) {
    case "tee": fill(c1); scoop(0.09, 0.2); line([[-0.09, 0.99], [0, 0.82], [0.09, 0.99]], 4, d1); break;
    case "hoodie": fill(c1); scoop(0.06, 0.1); rect(-0.14, 0.08, 0.14, 0.42, d1); g.strokeStyle = l1; g.lineWidth = 2.5; g.strokeRect(X(-0.14), Y(0.42), 0.28 * 512, 0.34 * Hh);
      line([[-0.05, 0.9], [-0.05, 0.6]], 5, c2); line([[0.05, 0.9], [0.05, 0.6]], 5, c2); ell(-0.05, 0.58, 0.008, 0.035, c2); ell(0.05, 0.58, 0.008, 0.035, c2); break;
    case "tank": fill(sk); rect(-FW * 1.4, -0.1, FW * 1.4, 0.55, c1); poly([[-0.22, 0.5], [0.22, 0.5], [0.2, 0.85], [0.12, 1.02], [0.05, 1.02], [0.03, 0.8], [-0.03, 0.8], [-0.05, 1.02], [-0.12, 1.02], [-0.2, 0.85]], c1); ell(0, 0.84, 0.09, 0.12, sk); break;
    case "jacket": fill(c1); poly([[-0.05, 1.05], [0.05, 1.05], [0.04, -0.05], [-0.04, -0.05]], c2); line([[0, 1], [0, 0]], 4, d1); rect(-0.25, 0.05, -0.14, 0.1, d1); rect(0.14, 0.05, 0.25, 0.1, d1);
      poly([[-0.12, 1.05], [-0.04, 1.05], [-0.04, 0.78]], d1); poly([[0.12, 1.05], [0.04, 1.05], [0.04, 0.78]], d1); rect(-FW * 1.4, -0.1, FW * 1.4, 0.06, d1); break;
    case "suit": fill(c1); poly([[-0.09, 1.05], [0.09, 1.05], [0, 0.3]], CREAM); poly([[-0.022, 0.92], [0.022, 0.92], [0.036, 0.4], [0, 0.32], [-0.036, 0.4]], c2); poly([[-0.09, 1.05], [-0.15, 0.97], [-0.025, 0.28], [0, 0.3]], K.shade(c1, 0.06)); poly([[0.09, 1.05], [0.15, 0.97], [0.025, 0.28], [0, 0.3]], K.shade(c1, 0.06));
      ell(-0.014, 0.22, 0.008, 0.035, GOLD); ell(-0.014, 0.08, 0.008, 0.035, GOLD); break;
    case "overalls": fill(c2); rect(-0.2, -0.1, 0.2, 0.66, c1); rect(-0.2, 0.62, -0.13, 1.1, c1); rect(0.13, 0.62, 0.2, 1.1, c1); rect(-0.2, 0.62, 0.2, 0.65, d1); rect(-0.1, 0.28, 0.1, 0.5, d1); g.strokeStyle = l1; g.lineWidth = 2.5; g.strokeRect(X(-0.1), Y(0.5), 0.2 * 512, 0.22 * Hh);
      ell(-0.165, 0.62, 0.009, 0.04, GOLD); ell(0.165, 0.62, 0.009, 0.04, GOLD); break;
    case "hawaii": { fill(c1); const r = rng(5); for (let i = 0; i < 60; i++) { const f = (r() - 0.5) * 2 * FB, y = 0.02 + r() * 0.96, rr = 9 + r() * 7, cx = X(f), cy = Y(y);
        g.fillStyle = c2; for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283; g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr * 0.7, rr * 0.55, 0, 7); g.fill(); }
        g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(cx, cy, rr * 0.38, 0, 7); g.fill(); }
      for (let i = 0; i < 18; i++) { const f = (r() - 0.5) * 2 * FB, y = 0.1 + r() * 0.8; poly([[f, y], [f + 0.03, y + 0.1], [f - 0.03, y + 0.16]], "#2a9f4d"); }
      poly([[-0.1, 1.05], [0.1, 1.05], [0, 0.55]], sk); line([[-0.1, 1.02], [0, 0.55], [0.1, 1.02]], 4, d1); break; }
    case "stripes": fill(c2); for (let i = 0; i < 6; i++) rect(-FW * 1.4, i * 0.18, FW * 1.4, i * 0.18 + 0.09, c1); ell(0, 1.0, 0.14, 0.14, sk); break;
    case "jersey": fill(c1); rect(-FW * 1.4, -0.1, FW * 1.4, 0.06, c2); rect(-0.34, -0.1, -0.28, 1.1, c2); rect(0.28, -0.1, 0.34, 1.1, c2); poly([[-0.1, 1.05], [0.1, 1.05], [0, 0.8]], c2);
      g.font = "900 100px 'Luckiest Guy','Arial Black',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 9; g.strokeStyle = INKC; for (const f of [0, FB, -FB]) { g.strokeText("10", X(f), Y(0.42)); g.fillStyle = c2; g.fillText("10", X(f), Y(0.42)); } break;
    case "vest": fill(c2); poly([[-0.3, -0.1], [-0.02, -0.1], [-0.025, 0.62], [-0.11, 1.05], [-0.3, 1.05]], c1); poly([[0.3, -0.1], [0.02, -0.1], [0.025, 0.62], [0.11, 1.05], [0.3, 1.05]], c1); rect(0.3, -0.1, FW * 1.4, 1.1, c1); rect(-FW * 1.4, -0.1, -0.3, 1.1, c1);
      for (let i = 0; i < 3; i++) ell(0.055, 0.12 + i * 0.16, 0.008, 0.035, GOLD); line([[-0.02, 0], [-0.025, 0.62], [-0.11, 1]], 3, d1); line([[0.02, 0], [0.025, 0.62], [0.11, 1]], 3, d1); break;
    case "labcoat": fill(c2); poly([[-0.09, 1.05], [0.09, 1.05], [0, 0.4]], c1); poly([[-0.09, 1.05], [-0.16, 0.97], [-0.025, 0.35], [0, 0.4]], K.shade(c2, -0.08)); poly([[0.09, 1.05], [0.16, 0.97], [0.025, 0.35], [0, 0.4]], K.shade(c2, -0.08));
      line([[0, 0.38], [0, 0]], 3, K.shade(c2, -0.2)); g.strokeStyle = K.shade(c2, -0.2); g.lineWidth = 3; g.strokeRect(X(-0.24), Y(0.35), 0.13 * 512, 0.22 * Hh); line([[-0.2, 0.34], [-0.2, 0.5]], 4, "#3a7be0"); line([[-0.17, 0.34], [-0.17, 0.48]], 4, "#d63a3a"); break;
    case "armor": fill(METAL); poly([[-0.24, 0.98], [0.24, 0.98], [0.19, 0.2], [-0.19, 0.2]], K.shade(METAL, 0.1)); line([[0, 0.98], [0, 0.2]], 4, K.shade(METAL, -0.2)); line([[-0.22, 0.6], [0.22, 0.6]], 4, K.shade(METAL, -0.2));
      g.strokeStyle = c1; g.lineWidth = 8; g.strokeRect(X(-0.24), Y(0.98), 0.48 * 512, 0.78 * Hh); ell(0, 0.58, 0.032, 0.09, c1); rect(-FW * 1.4, -0.1, FW * 1.4, 0.16, K.shade(METAL, -0.18)); for (let i = -6; i < 7; i++) ell(i * 0.08, 0.07, 0.008, 0.03, c1); break;
    case "toga": fill(c2); poly([[-0.26, 1.05], [-0.17, 1.05], [0.3, -0.05], [0.21, -0.05]], c1); poly([[-0.17, 1.05], [0.0, 1.05], [0.42, -0.05], [0.3, -0.05]], K.shade(c2, -0.06)); line([[-0.26, 1.05], [0.21, -0.05]], 4, GOLD); line([[-0.17, 1.05], [0.3, -0.05]], 4, GOLD); rect(-FW * 1.4, -0.1, FW * 1.4, 0.05, GOLD); break;
    case "dress": fill(c1); rect(-FW * 1.4, 0.2, FW * 1.4, 0.32, c2); ell(0, 0.26, 0.022, 0.06, c2); poly([[-0.12, 1.05], [0.12, 1.05], [0, 0.78]], sk); line([[-0.12, 1.02], [0, 0.78], [0.12, 1.02]], 4, d1); break;
    case "kimono": { fill(c1); const r = rng(9); for (let i = 0; i < 40; i++) ell((r() - 0.5) * 2 * FB, 0.3 + r() * 0.65, 0.014, 0.04, K.shade(c1, 0.16));
      poly([[-0.13, 1.05], [-0.05, 1.05], [0.15, 0.38], [0.06, 0.38]], c2); poly([[0.13, 1.05], [0.05, 1.05], [-0.15, 0.38], [-0.06, 0.38]], K.shade(c2, -0.1)); rect(-FW * 1.4, 0.1, FW * 1.4, 0.42, c2); ell(0, 0.26, 0.055, 0.13, GOLD); break; }
    case "tux": fill(c1); poly([[-0.11, 1.05], [0.11, 1.05], [0.05, 0.12], [-0.05, 0.12]], CREAM); poly([[-0.11, 1.05], [-0.17, 0.96], [-0.025, 0.4], [-0.02, 0.45]], K.shade(c1, 0.1)); poly([[0.11, 1.05], [0.17, 0.96], [0.025, 0.4], [0.02, 0.45]], K.shade(c1, 0.1)); for (let i = 0; i < 4; i++) ell(0, 0.78 - i * 0.18, 0.008, 0.035, INKC); rect(-FW * 1.4, -0.1, FW * 1.4, 0.05, c2); break;
    case "spiked": fill(c1); line([[-0.26, 1.05], [0.24, -0.05]], 34, d1); for (let i = 0; i < 7; i++) { const t = i / 6; ell(-0.26 + 0.5 * t, 1.02 - t * 1.0, 0.011, 0.04, METAL); } rect(-FW * 1.4, 0.06, FW * 1.4, 0.16, d1); for (let i = -9; i < 10; i++) ell(i * 0.09, 0.11, 0.008, 0.028, METAL); break;
    default: fill(c1);
  }
  g.restore();
}

/* ============================ bas peint ============================ */
function paintPants(g, ctx, y0, y1) {
  const { K, P, col } = ctx, id = P.bot.id;
  if (id === "none") return;
  const c = col.bot, d = K.shade(c, -0.15), l = K.shade(c, 0.14);
  g.save(); g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip();
  g.fillStyle = c; g.fillRect(0, y0, W, y1 - y0);
  g.fillStyle = d; g.fillRect(0, y0, W, 5);                            // ceinture
  if (id === "jeans") { g.strokeStyle = l; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(W / 2 - 60, y0 + 8); g.lineTo(W / 2 - 60, y1); g.moveTo(W / 2 + 60, y0 + 8); g.lineTo(W / 2 + 60, y1); g.stroke(); g.setLineDash([]); }
  if (id === "trunks") { g.fillStyle = "#f4f1ea"; g.fillRect(0, y0 + 12, W, 8); }
  if (id === "kilt") { g.strokeStyle = l; g.lineWidth = 5; for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); } g.strokeStyle = d; for (let y = y0 + 10; y < y1; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  if (id === "tutu") { g.fillStyle = l; g.fillRect(0, y0 + 6, W, 6); }
  g.restore();
}

/** Toute la texture du corps. Renvoie { cv, rows } (rows : repères utiles : débuts du haut et du bas). La texture fait `texScale` × 1024 pixels de large, mais on dessine toujours dans le repère de base (1024). */
export function paintBody(ctx) {
  const { K, P, col, prof } = ctx, S = ctx.texScale || 2;
  const H = Math.ceil(prof.L * KP), cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  const g = cv.getContext("2d");
  g.scale(S, S);
  g.fillStyle = col.skin; g.fillRect(0, 0, W, H);
  const row = (a) => EQ + a * KP;
  const below = prof.below, shirtTop = 0.36, pantsAt = Math.max(shirtTop + 0.32, below - 0.4);
  let faceBase = col.skin;
  if (P.suit.id !== "none") faceBase = paintSuit(g, ctx, H) || col.skin;
  else {
    pattern(g, P.pat.id, col.skin, col.skin2, H, K);
    paintShirt(g, ctx, row(shirtTop), row(pantsAt + 0.03));
    paintPants(g, ctx, row(pantsAt), H);
  }
  // bec, groin, trompe… cachent la bouche peinte
  const noMouth = ["duck", "beak", "toucan", "trunk"].includes(P.nose.id);
  const fc = col.face || (P.suit.id !== "none" ? (ctx.suit.info.head ? col.skin : ctx.suit.m) : col.skin);
  paintFace(g, { face: fc, faceL: K.shade(fc, 0.07), faceD: K.shade(fc, -0.16), patch: P.suit.id === "ninja" ? "band" : P.patch.id, eyes: P.eyes.id, eyec: col.eye, brow: P.brow.id,
    mouth: noMouth ? "none" : P.mouth.id, beard: P.beard.id, detail: P.face.id, hairc: col.hair });
  if (ctx.suit && ctx.suit.animal && ctx.suit.animal.paintTop) ctx.suit.animal.paintTop(g, ctx, H);      // visage propre au costume (bouche de grenouille, yeux d'alien…)
  return { cv, shirtTop, pantsAt };
}
export { CREAM, GOLD, METAL, INKC };
