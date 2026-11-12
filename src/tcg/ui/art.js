// Illustrations ORIGINALES des cartes, dessinées sur un canvas (aucune image officielle) :
// un décor propre à chaque famille + un médaillon avec les initiales du personnage. Plus la carte est rare,
// plus l'illustration est travaillée (rayons, particules, cadre doré) ; les Légendaires ont droit à la pleine carte.
import { FAMILY, subOf } from "../cards/index.js";
import { RARITY } from "../rules.js";
import { paintIcon } from "../../ui/iconPaint.js";

const cache = new Map();
const MAX = 260;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(seed) { let s = seed || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

const STOP = new Set(["le", "la", "les", "de", "du", "des", "et", "d", "l", "y", "von", "della", "van"]);
/** Initiales du médaillon : « Monkey D. Luffy » → ML, « Pikachu » → P. */
export function initials(name) {
  const w = String(name).replace(/[^\p{L}\s'-]/gu, " ").split(/[\s'-]+/).filter((x) => x && !STOP.has(x.toLowerCase()));
  if (!w.length) return "?";
  if (w.length === 1) return w[0][0].toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}
const TYPE_ICON = { loc: "castle", obj: "gem", evt: "sparkles", plot: "scroll" };

/* ------------------------------ décors ------------------------------ */
function sky(g, W, H, a, b, ang = 0.3) {
  const gr = g.createLinearGradient(W * ang, 0, W * (1 - ang), H);
  gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function stars(g, W, H, r, n, col = "#fff") { for (let i = 0; i < n; i++) { g.fillStyle = rgba(col, 0.3 + r() * 0.7); const s = r() * 1.6 + 0.4; g.fillRect(r() * W, r() * H * 0.7, s, s); } }
function hills(g, W, H, y0, amp, col, r, n = 5) {
  g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
  for (let i = 0; i <= n; i++) { const x = (i / n) * W; g.lineTo(x, y0 - amp * (0.4 + r() * 0.6)); }
  g.lineTo(W, H); g.closePath(); g.fill();
}
function trees(g, W, H, y0, col, r, n = 14) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + r() * 10 - 5, h = H * (0.18 + r() * 0.22), w = h * 0.38;
    g.beginPath(); g.moveTo(x, y0 - h); g.lineTo(x - w, y0); g.lineTo(x + w, y0); g.closePath(); g.fill();
  }
  g.fillRect(0, y0, W, H - y0);
}
function skyline(g, W, H, y0, col, r) {
  g.fillStyle = col;
  let x = 0;
  while (x < W) { const w = 10 + r() * 22, h = H * (0.15 + r() * 0.4); g.fillRect(x, y0 - h, w - 2, h + H); x += w; }
}
function rays(g, cx, cy, R, col, n, r, a = 0.18) {
  g.save(); g.translate(cx, cy);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + r() * 0.2, w = 0.06 + r() * 0.08;
    g.fillStyle = rgba(col, a * (0.5 + r() * 0.5));
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, t, t + w); g.closePath(); g.fill();
  }
  g.restore();
}
function glowDisk(g, x, y, R, col, a = 0.9) {
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
}

const MOTIF = {
  grid(g, W, H, c, r) {
    sky(g, W, H, "#020c1c", mix(c.c2, c.c, 0.35));
    const hz = H * 0.52;
    g.strokeStyle = rgba(c.c, 0.55); g.lineWidth = 1;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 6, hz); g.lineTo(W / 2 + i * W * 0.16, H); g.stroke(); }
    for (let k = 1; k < 9; k++) { const y = hz + (H - hz) * Math.pow(k / 9, 1.8); g.globalAlpha = 0.25 + k / 14; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { const x = r() * W, h = H * (0.25 + r() * 0.3); const gr = g.createLinearGradient(0, hz - h, 0, hz); gr.addColorStop(0, rgba(c.c, 0)); gr.addColorStop(1, rgba(c.c, 0.45)); g.fillStyle = gr; g.fillRect(x, hz - h, 4 + r() * 6, h); }
    for (let i = 0; i < 18; i++) { g.fillStyle = rgba("#aef6ff", 0.15 + r() * 0.4); const s = 2 + r() * 5; g.fillRect(r() * W, r() * hz, s, s); }
  },
  rain(g, W, H, c, r) {
    sky(g, W, H, "#0b0d18", mix(c.c2, c.c, 0.25));
    g.strokeStyle = rgba("#ffffff", 0.08); g.lineWidth = 2; g.beginPath(); g.arc(W * 0.72, H * 0.3, H * 0.2, 0, Math.PI * 2); g.stroke();
    skyline(g, W, H, H * 0.82, rgba("#050608", 0.9), r);
    g.strokeStyle = rgba("#cfd8ff", 0.25); g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 14); g.stroke(); }
  },
  clouds(g, W, H, c, r) {
    sky(g, W, H, "#7cc8ff", "#d8f0ff", 0);
    for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H * 0.6, s = 14 + r() * 18; g.fillStyle = "rgba(255,255,255,0.92)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * s * 0.7, y + (k % 2) * 4, s * (0.7 + r() * 0.4), 0, Math.PI * 2); g.fill(); } }
    const cols = ["#ff5d5d", "#ffd23f", "#3fa7ff", "#5ad17a"];
    for (let i = 0; i < 7; i++) { const s = 16 + r() * 14; g.fillStyle = cols[i % 4]; g.fillRect(i * (W / 6.5) + r() * 6, H - s - r() * 8, s, s); g.strokeStyle = "rgba(0,0,0,0.25)"; g.strokeRect(i * (W / 6.5) + 2, H - s, s - 4, s - 4); }
  },
  waves(g, W, H, c, r) {
    sky(g, W, H, "#ffb36b", "#2d6fb7", 0);
    glowDisk(g, W * 0.7, H * 0.36, H * 0.32, "#ffe6a0", 0.95);
    g.fillStyle = "#fff4cf"; g.beginPath(); g.arc(W * 0.7, H * 0.36, H * 0.1, 0, Math.PI * 2); g.fill();
    const sx = W * (0.15 + r() * 0.3);
    g.fillStyle = "rgba(20,20,30,0.85)"; g.beginPath(); g.moveTo(sx, H * 0.6); g.lineTo(sx + 26, H * 0.6); g.lineTo(sx + 20, H * 0.66); g.lineTo(sx + 6, H * 0.66); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(sx + 13, H * 0.6); g.lineTo(sx + 13, H * 0.4); g.lineTo(sx + 28, H * 0.56); g.closePath(); g.fill();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = mix("#1b4f8a", "#0a2140", k / 4);
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) g.lineTo(x, H * (0.62 + k * 0.09) + Math.sin(x / (14 + k * 4) + k * 2 + r()) * 4);
      g.lineTo(W, H); g.closePath(); g.fill();
    }
  },
  energy(g, W, H, c, r) {
    sky(g, W, H, mix(c.c, "#000000", 0.55), mix(c.c, "#ffffff", 0.15));
    rays(g, W / 2, H * 0.5, W, "#ffffff", 22, r, 0.12);
    for (let k = 0; k < 3; k++) { g.strokeStyle = rgba("#ffffff", 0.25 - k * 0.06); g.lineWidth = 3 - k; g.beginPath(); g.arc(W / 2, H * 0.5, H * (0.28 + k * 0.12), 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 20; i++) glowDisk(g, r() * W, r() * H, 3 + r() * 6, "#ffffff", 0.5);
  },
  stage(g, W, H, c, r) {
    sky(g, W, H, "#12052a", "#3b1066");
    for (let i = 0; i < 4; i++) { const x = W * (0.12 + i * 0.25); const gr = g.createLinearGradient(x, 0, W / 2, H); gr.addColorStop(0, rgba(i % 2 ? "#ffcc33" : "#ff6fd8", 0.5)); gr.addColorStop(1, rgba("#ffffff", 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 4, 0); g.lineTo(x + 4, 0); g.lineTo(W / 2 + 60 - i * 30, H); g.lineTo(W / 2 - 60 + i * 30, H); g.closePath(); g.fill(); }
    for (let i = 0; i < 24; i++) glowDisk(g, r() * W, r() * H * 0.8, 3 + r() * 9, i % 2 ? "#ffcc33" : "#ff8ae2", 0.35);
    g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, H * 0.84, W, H);
    for (let i = 0; i < 16; i++) { const h = 4 + r() * 18; g.fillStyle = rgba("#ffcc33", 0.6); g.fillRect(i * (W / 16) + 2, H - h - 2, W / 16 - 4, h); }
  },
  sun(g, W, H, c, r) {
    sky(g, W, H, "#ff9f1c", "#5a1d00", 0.1);
    rays(g, W / 2, H * 0.42, W, "#ffe08a", 18, r, 0.22);
    glowDisk(g, W / 2, H * 0.42, H * 0.34, "#ffd166", 0.95);
    g.fillStyle = "#ffe9a8"; g.beginPath(); g.arc(W / 2, H * 0.42, H * 0.14, 0, Math.PI * 2); g.fill();
    hills(g, W, H, H * 0.8, H * 0.2, "#3a1600", r, 4);
    g.fillStyle = "#2a0f00"; const px = W * (0.55 + r() * 0.25), pw = W * 0.3;
    for (let k = 0; k < 5; k++) g.fillRect(px - pw / 2 + k * pw * 0.08, H * 0.82 - k * H * 0.05, pw - k * pw * 0.16, H * 0.06);
  },
  castle(g, W, H, c, r) {
    sky(g, W, H, "#06162b", mix(c.c2, c.c, 0.45));
    stars(g, W, H, r, 40);
    g.fillStyle = "#e9f7ff"; g.beginPath(); g.arc(W * 0.78, H * 0.22, H * 0.09, 0, Math.PI * 2); g.fill();
    g.fillStyle = mix(c.c2, "#000", 0.2); g.beginPath(); g.arc(W * 0.81, H * 0.2, H * 0.08, 0, Math.PI * 2); g.fill();
    hills(g, W, H, H * 0.78, H * 0.18, "#0a2a24", r, 5);
    const cx = W * (0.25 + r() * 0.2), base = H * 0.72;
    g.fillStyle = "#071a16";
    for (const [dx, w, h] of [[-26, 12, 46], [-10, 22, 34], [14, 12, 56], [28, 10, 38]]) { g.fillRect(cx + dx, base - h, w, h + 20); g.beginPath(); g.moveTo(cx + dx - 2, base - h); g.lineTo(cx + dx + w / 2, base - h - 14); g.lineTo(cx + dx + w + 2, base - h); g.closePath(); g.fill(); }
    for (let i = 0; i < 26; i++) glowDisk(g, r() * W, r() * H, 2 + r() * 5, c.c, 0.6);
  },
  baroque(g, W, H, c, r) {
    sky(g, W, H, "#1b2a44", "#c79a4a", 0);
    g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(W * 0.25, H * 0.26, H * 0.13, 0, Math.PI * 2); g.fill();
    g.strokeStyle = rgba("#fff1c1", 0.35); g.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W * (0.5 + r() * 0.5), H * r() * 0.6, 10 + r() * 30, Math.PI * (0.1 + r()), Math.PI * (1 + r())); g.stroke(); }
    g.fillStyle = "#2a1606"; const gx = W * 0.58;
    g.beginPath(); g.moveTo(gx - 40, H * 0.72); g.lineTo(gx + 44, H * 0.72); g.lineTo(gx + 32, H * 0.8); g.lineTo(gx - 30, H * 0.8); g.closePath(); g.fill();
    for (const [dx, h] of [[-20, 0.34], [4, 0.42], [26, 0.3]]) { g.fillRect(gx + dx, H * (0.72 - h), 2, H * h); g.beginPath(); g.moveTo(gx + dx + 2, H * (0.72 - h)); g.quadraticCurveTo(gx + dx + 22, H * (0.72 - h * 0.6), gx + dx + 2, H * 0.68); g.closePath(); g.fill(); }
    g.fillStyle = "#13233c"; g.fillRect(0, H * 0.8, W, H);
  },
  embers(g, W, H, c, r) {
    sky(g, W, H, "#0d0503", "#5a1a00", 0);
    glowDisk(g, W / 2, H * 1.05, H * 0.8, "#ff7b00", 0.8);
    trees(g, W, H, H * 0.86, "#070302", r, 16);
    for (let i = 0; i < 40; i++) glowDisk(g, r() * W, r() * H * 0.85, 1.5 + r() * 3.5, i % 3 ? "#ffb347" : "#ff4d00", 0.9);
  },
  jazz(g, W, H, c, r) {
    sky(g, W, H, "#0e1022", "#1b1f3b");
    stars(g, W, H, r, 50);
    g.save(); g.translate(W * 0.68, H * 0.38); g.rotate(-0.35);
    glowDisk(g, 0, 0, H * 0.34, "#ffb703", 0.35);
    g.fillStyle = "#e86a33"; g.beginPath(); g.arc(0, 0, H * 0.16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#ffd6a5"; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, H * 0.3, H * 0.07, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    const cols = ["#4ea8de", "#e63946", "#ffb703"];
    for (let i = 0; i < 3; i++) { g.fillStyle = rgba(cols[i], 0.55); g.save(); g.translate(0, H * (0.7 + i * 0.1)); g.rotate(-0.25); g.fillRect(-20, 0, W * 1.4, H * 0.06); g.restore(); }
  },
  wind(g, W, H, c, r) {
    sky(g, W, H, "#9aa7b0", "#2b3740", 0);
    g.fillStyle = "#3c4a52"; g.fillRect(0, H * 0.78, W, H);
    for (let i = 0; i < 26; i++) {
      const y = r() * H * 0.9, x = r() * W * 0.4;
      g.strokeStyle = rgba("#ffffff", 0.18 + r() * 0.3); g.lineWidth = 1 + r() * 2.2;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + W * 0.3, y - 10, x + W * 0.5, y + 12, x + W * (0.6 + r() * 0.5), y - 6); g.stroke();
    }
    for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(20,26,30,0.9)"; const x = W * 0.15 + i * 9, h = 9 + r() * 4; g.fillRect(x, H * 0.78 - h, 3, h); }
  },
  marble(g, W, H, c, r) {
    sky(g, W, H, "#f8eef6", "#d9c7d6", 0.2);
    g.strokeStyle = rgba("#8d6a86", 0.35);
    for (let i = 0; i < 9; i++) { g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); let x = r() * W, y = 0; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += H / 6; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = "#d4a537"; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, H * (0.2 + i * 0.3)); g.lineTo(W, H * (0.1 + i * 0.3)); g.stroke(); }
    glowDisk(g, W * 0.7, H * 0.4, H * 0.4, "#ff5ec4", 0.35);
  },
  moon(g, W, H, c, r) {
    sky(g, W, H, "#020812", "#0f2a4a", 0);
    stars(g, W, H, r, 40);
    glowDisk(g, W * 0.62, H * 0.32, H * 0.38, "#bfe6ff", 0.5);
    g.fillStyle = "#f2f8ff"; g.beginPath(); g.arc(W * 0.62, H * 0.32, H * 0.17, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(160,190,220,0.35)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(W * 0.62 + (r() - 0.5) * 30, H * 0.32 + (r() - 0.5) * 30, 3 + r() * 6, 0, Math.PI * 2); g.fill(); }
    trees(g, W, H, H * 0.88, "#020a12", r, 18);
    g.fillStyle = "rgba(200,225,255,0.12)"; g.fillRect(0, H * 0.7, W, H * 0.1);
  },
  halftone(g, W, H, c, r) {
    sky(g, W, H, "#ffd60a", "#e23636", 0.1);
    rays(g, W * 0.5, H * 0.55, W, "#ffffff", 16, r, 0.35);
    for (let y = 0; y < H; y += 9) for (let x = (y / 9) % 2 ? 4 : 0; x < W; x += 9) { const s = 1 + 2.6 * (y / H); g.fillStyle = "rgba(90,0,0,0.35)"; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
  },
  skyline(g, W, H, c, r) {
    sky(g, W, H, "#030712", "#16305e", 0);
    stars(g, W, H, r, 30);
    const bx = W * (0.3 + r() * 0.4);
    const gr = g.createLinearGradient(bx, H, bx + 40, 0); gr.addColorStop(0, rgba("#fff6c0", 0.55)); gr.addColorStop(1, rgba("#fff6c0", 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 4, H); g.lineTo(bx + 4, H); g.lineTo(bx + 70, 0); g.lineTo(bx + 20, 0); g.closePath(); g.fill();
    skyline(g, W, H, H * 0.86, "#050a14", r);
    for (let i = 0; i < 40; i++) { g.fillStyle = rgba("#ffe7a3", 0.5 + r() * 0.4); g.fillRect(r() * W, H * (0.6 + r() * 0.3), 2, 3); }
  },
  haunted(g, W, H, c, r) {
    sky(g, W, H, "#170b2b", "#1d4a3f", 0.2);
    stars(g, W, H, r, 26, "#e6ffd9");
    const mx = W * (0.3 + r() * 0.4), my = H * 0.24, mr = H * 0.13;
    glowDisk(g, mx, my, mr * 3, "#c8f27a", 0.32);
    g.fillStyle = "#eef7c8"; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(170,190,120,0.35)"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, 2 + r() * mr * 0.25, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "rgba(12,6,24,.92)"; g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const bx = mx + (r() - 0.5) * mr * 4, by = my + (r() - 0.5) * mr * 2.4, s = 3 + r() * 4;
      g.beginPath(); g.moveTo(bx - s, by - s * 0.3); g.quadraticCurveTo(bx - s * 0.5, by - s * 0.9, bx, by); g.quadraticCurveTo(bx + s * 0.5, by - s * 0.9, bx + s, by - s * 0.3); g.stroke();
    }
    hills(g, W, H, H * 0.8, H * 0.12, "#0d0820", r, 4);
    const hx = W * (0.5 + (r() - 0.5) * 0.3), base = H * 0.74, k = W / 180;
    const blocks = [[-32, 20, 34], [-13, 30, 50], [16, 17, 40], [31, 11, 62]].map(([dx, w, h]) => [dx * k, w * k, h * k]);
    g.fillStyle = "#08040f";
    for (const [dx, w, h] of blocks) {
      g.fillRect(hx + dx, base - h, w, h + H * 0.3);
      g.beginPath(); g.moveTo(hx + dx - 3 * k, base - h); g.lineTo(hx + dx + w / 2, base - h - (12 + r() * 8) * k); g.lineTo(hx + dx + w + 3 * k, base - h); g.closePath(); g.fill();
    }
    for (let i = 0; i < 8; i++) {
      const [dx, w, h] = blocks[i % 4], x = hx + dx + 3 * k + r() * Math.max(1, w - 8 * k), y = base - h + 6 * k + r() * Math.max(1, h - 12 * k), col = r() < 0.7 ? "#ffd75e" : "#9cff8a";
      glowDisk(g, x + 1.5 * k, y + 2 * k, 7 * k, col, 0.28); g.fillStyle = col; g.fillRect(x, y, 3 * k, 4 * k);
    }
    const dead = (x, h, s) => {
      g.strokeStyle = "#05030b"; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(x, H); g.lineTo(x + s * 5 * k, H - h); g.stroke();
      g.lineWidth = 1.4 * k;
      for (let j = 0; j < 4; j++) { const f = 0.45 + j * 0.15, y = H - h * f, bx = x + s * 5 * k * f; g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + s * (10 + r() * 12) * k, y - (6 + r() * 10) * k); g.stroke(); }
    };
    dead(W * 0.05, H * 0.5, 1); dead(W * 0.95, H * 0.44, -1);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(190,255,220,0.07)"; g.beginPath(); g.ellipse(r() * W, H * (0.8 + r() * 0.15), W * (0.3 + r() * 0.3), H * 0.04, 0, 0, Math.PI * 2); g.fill(); }
  },
  upside(g, W, H, c, r) {
    sky(g, W, H, "#0a0e1c", "#2b0d16", 0.15);
    glowDisk(g, W * (0.25 + r() * 0.5), H * 0.1, H * 0.6, "#ff2a3a", 0.32);
    g.strokeStyle = rgba("#ff7b7b", 0.55); g.lineWidth = 1.4;
    let lx = W * (0.15 + r() * 0.7), ly = 0;
    g.beginPath(); g.moveTo(lx, ly);
    for (let i = 0; i < 6; i++) { lx += (r() - 0.5) * W * 0.12; ly += H * 0.07; g.lineTo(lx, ly); }
    g.stroke();
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * W + r() * 8, h = H * (0.2 + r() * 0.25), base = H * 0.9;
      g.strokeStyle = "rgba(4,5,10,.95)"; g.lineWidth = 2 + r() * 2;
      g.beginPath(); g.moveTo(x, base); g.lineTo(x + (r() - 0.5) * 6, base - h); g.stroke();
      g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const by = base - h * (0.4 + k * 0.2); g.beginPath(); g.moveTo(x, by); g.lineTo(x + (r() - 0.5) * 18, by - 6 - r() * 8); g.stroke(); }
    }
    g.fillStyle = "#04050a"; g.fillRect(0, H * 0.9, W, H * 0.1);
    for (let i = 0; i < 46; i++) { g.fillStyle = rgba("#e8e6f0", 0.12 + r() * 0.4); const sz = 0.8 + r() * 1.8; g.fillRect(r() * W, r() * H * 0.9, sz, sz); }
    const curve = (x) => H * 0.13 + Math.sin((x / W) * Math.PI) * H * 0.07;
    g.strokeStyle = "rgba(10,10,14,.9)"; g.lineWidth = 1;
    g.beginPath(); for (let x = 0; x <= W; x += 4) (x ? g.lineTo(x, curve(x)) : g.moveTo(x, curve(x))); g.stroke();
    const bulbs = ["#ff3b30", "#ffd60a", "#34c759", "#0a84ff", "#ff9f0a"];
    for (let i = 0; i < 9; i++) { const x = ((i + 0.5) / 9) * W, y = curve(x) + 3; glowDisk(g, x, y, Math.max(6, W * 0.035), bulbs[i % 5], 0.85); g.fillStyle = bulbs[i % 5]; g.beginPath(); g.arc(x, y, Math.max(1.6, W * 0.011), 0, Math.PI * 2); g.fill(); }
  },
  // League of Legends : un décor par région (c.sub), et la Faille de l'invocateur pour ce qui va partout
  runeterra(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    if (s === "Ionia") {
      sky(g, W, H, "#2a1640", "#e98bb6", 0.1);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.28, H * 0.55, "#ffd1e6", 0.35);
      for (let i = 0; i < 3; i++) { // îles flottantes
        const x = W * (0.16 + i * 0.34 + (r() - 0.5) * 0.08), y = H * (0.2 + r() * 0.22), w = W * (0.09 + r() * 0.06);
        poly([[x - w, y], [x + w, y], [x + w * 0.3, y + w * 0.9], [x - w * 0.25, y + w * 0.7]], "rgba(44,20,58,.9)");
        g.fillStyle = "#6cc79a"; g.fillRect(x - w, y - 2 * k, w * 2, 3 * k);
      }
      hills(g, W, H, H * 0.84, H * 0.12, "#3a1c4a", r, 5);
      const px = W * (0.5 + (r() - 0.5) * 0.3), py = H * 0.84; // toit de temple
      poly([[px - 26 * k, py - 16 * k], [px + 26 * k, py - 16 * k], [px + 18 * k, py - 24 * k], [px - 18 * k, py - 24 * k]], "#24102e");
      g.fillStyle = "#24102e"; g.fillRect(px - 15 * k, py - 16 * k, 30 * k, 16 * k);
      g.fillStyle = "#ffb3d5"; g.fillRect(px - 3 * k, py - 11 * k, 6 * k, 8 * k);
      const tx = W * (r() < 0.5 ? 0.13 : 0.87); // cerisier
      g.strokeStyle = "#1e0c26"; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(tx, H); g.quadraticCurveTo(tx + 10 * k, H * 0.72, tx - 4 * k, H * 0.5); g.stroke();
      for (let i = 0; i < 24; i++) glowDisk(g, tx + (r() - 0.5) * 48 * k, H * (0.4 + r() * 0.2), (4 + r() * 6) * k, i % 3 ? "#ff9ccb" : "#ffd6ea", 0.75);
      for (let i = 0; i < 28; i++) { g.fillStyle = rgba("#ffc2df", 0.35 + r() * 0.5); g.beginPath(); g.ellipse(r() * W, r() * H, 2.2 * k, 1.1 * k, r() * 3, 0, Math.PI * 2); g.fill(); }
    } else if (s === "Freljord") {
      sky(g, W, H, "#06142c", "#4f7fae", 0.1);
      stars(g, W, H, r, 24, "#e6f6ff");
      for (let b = 0; b < 3; b++) { // aurore
        const y0 = H * (0.14 + b * 0.08), col = ["#5dffc4", "#62d6ff", "#b48cff"][b];
        g.strokeStyle = rgba(col, 0.22); g.lineWidth = (10 - b * 2) * k;
        g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = y0 + Math.sin(x / W * 6 + b + r()) * 5 * k; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
      for (let i = 0; i < 4; i++) { // montagnes enneigées
        const x = W * (i / 3) + (r() - 0.5) * 20 * k, h = H * (0.32 + r() * 0.2), w = W * (0.28 + r() * 0.1), y = H * 0.86;
        poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]], i % 2 ? "#1d3557" : "#28466f");
        poly([[x - w * 0.12, y - h * 0.76], [x, y - h], [x + w * 0.12, y - h * 0.76], [x + w * 0.04, y - h * 0.7], [x - w * 0.05, y - h * 0.72]], "#eaf6ff");
      }
      g.fillStyle = "#dbeeff"; g.fillRect(0, H * 0.86, W, H * 0.14);
      for (let i = 0; i < 40; i++) { g.fillStyle = rgba("#ffffff", 0.4 + r() * 0.6); g.beginPath(); g.arc(r() * W, r() * H, (0.6 + r() * 1.4) * k, 0, Math.PI * 2); g.fill(); }
    } else if (s === "Piltover et Zaun") {
      sky(g, W, H, "#f3c56f", "#5a3d1c", 0);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.18, H * 0.4, "#fff2c4", 0.45);
      let x = 0; // Piltover : tours et dômes
      while (x < W) {
        const w = (12 + r() * 16) * k, h = H * (0.25 + r() * 0.35), y = H * 0.66;
        g.fillStyle = "#3b2814"; g.fillRect(x, y - h, w - 2 * k, h + 4);
        g.beginPath(); g.arc(x + w / 2 - k, y - h, w / 2 - k, Math.PI, 0); g.fill();
        for (let j = 0; j < 3; j++) { g.fillStyle = rgba("#ffd36b", 0.6 + r() * 0.4); g.fillRect(x + 3 * k + r() * (w - 9 * k), y - h + 8 * k + r() * (h - 14 * k), 2 * k, 3 * k); }
        x += w;
      }
      const cx = W * (0.2 + r() * 0.6), cy = H * 0.3; // cristal hextech
      glowDisk(g, cx, cy, 22 * k, "#5ee1ff", 0.7);
      poly([[cx, cy - 9 * k], [cx + 5 * k, cy], [cx, cy + 9 * k], [cx - 5 * k, cy]], "#c8f6ff");
      const zg = g.createLinearGradient(0, H * 0.6, 0, H); zg.addColorStop(0, "rgba(60,255,154,0)"); zg.addColorStop(1, "rgba(40,190,110,0.75)"); // Zaun : la ville basse
      g.fillStyle = zg; g.fillRect(0, H * 0.6, W, H * 0.4);
      g.strokeStyle = "#0f2a1a"; g.lineWidth = 4 * k;
      for (let i = 0; i < 4; i++) { const y = H * (0.74 + i * 0.07); g.beginPath(); g.moveTo(0, y); g.lineTo(W * (0.3 + r() * 0.4), y); g.lineTo(W * (0.3 + r() * 0.4), y + 10 * k); g.lineTo(W, y + 10 * k); g.stroke(); }
      for (let i = 0; i < 14; i++) glowDisk(g, r() * W, H * (0.7 + r() * 0.3), 6 * k, "#7dffb0", 0.35);
    } else if (s === "Noxus") {
      sky(g, W, H, "#140404", "#8a1d14", 0.15);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.22, H * 0.35, "#ff4b2b", 0.45);
      g.fillStyle = "#ffb199"; g.beginPath(); g.arc(W * 0.7, H * 0.2, 9 * k, 0, Math.PI * 2); g.fill();
      const base = H * 0.86; // forteresse hérissée de pointes
      g.fillStyle = "#0b0303"; g.fillRect(0, base - H * 0.16, W, H);
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * W, h = H * (0.22 + r() * 0.3), w = (7 + r() * 6) * k;
        poly([[x - w, base - H * 0.15], [x - w * 0.4, base - h], [x, base - h - 14 * k], [x + w * 0.4, base - h], [x + w, base - H * 0.15]], "#0b0303");
      }
      for (let i = 0; i < 4; i++) { // bannières
        const x = W * (0.15 + i * 0.23), y = base - H * 0.28;
        poly([[x, y], [x + 9 * k, y], [x + 9 * k, y + 24 * k], [x + 4.5 * k, y + 19 * k], [x, y + 24 * k]], "#b3241c");
        g.fillStyle = "#1a0505"; g.fillRect(x + 3.5 * k, y + 6 * k, 2 * k, 8 * k);
      }
      for (let i = 0; i < 26; i++) { g.fillStyle = rgba(i % 2 ? "#ff9b3d" : "#ff5a2b", 0.4 + r() * 0.5); const z = (0.8 + r() * 1.6) * k; g.fillRect(r() * W, r() * H * 0.9, z, z); }
    } else if (s === "Demacia") {
      sky(g, W, H, "#2c63b0", "#d7ebff", 0.1);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.2, H * 0.5, "#fff8dc", 0.55);
      for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(r() * W, H * (0.12 + r() * 0.2), 22 * k, 6 * k, 0, 0, Math.PI * 2); g.fill(); }
      const wy = H * 0.66; // remparts blancs et tours
      g.fillStyle = "#e7edf6"; g.fillRect(0, wy, W, H);
      for (let x = 0; x < W; x += 10 * k) g.fillRect(x, wy - 5 * k, 6 * k, 5 * k);
      for (let i = 0; i < 4; i++) {
        const x = W * (0.08 + i * 0.28 + (r() - 0.5) * 0.05), w = 16 * k, h = H * (0.2 + r() * 0.12);
        g.fillStyle = "#f4f7fc"; g.fillRect(x, wy - h, w, h);
        poly([[x - 3 * k, wy - h], [x + w / 2, wy - h - 20 * k], [x + w + 3 * k, wy - h]], "#2a4f8f");
        g.fillStyle = "#e3b341"; g.fillRect(x + w / 2 - k, wy - h - 30 * k, 2 * k, 11 * k);
        poly([[x + w / 2 + k, wy - h - 30 * k], [x + w / 2 + 12 * k, wy - h - 27 * k], [x + w / 2 + k, wy - h - 24 * k]], "#3f74c9");
      }
      const ex = W * 0.5, ey = H * 0.82; // l'aile dorée de Demacia
      g.strokeStyle = "#d9a93a"; g.lineWidth = 2.5 * k;
      for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(ex - 2 * k, ey, (8 + j * 4) * k, Math.PI * 1.05, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(ex + 2 * k, ey, (8 + j * 4) * k, Math.PI * 1.5, Math.PI * 1.95); g.stroke(); }
      g.fillStyle = "#5c8f3e"; g.fillRect(0, H * 0.93, W, H * 0.07);
    } else if (s === "Ixtal") {
      sky(g, W, H, "#04241a", "#2a9a74", 0.2);
      glowDisk(g, W * 0.5, H * 0.35, H * 0.5, "#b8ffdf", 0.25);
      const px = W * (0.5 + (r() - 0.5) * 0.2), base = H * 0.86; // pyramide à degrés
      for (let j = 0; j < 5; j++) { const w = (70 - j * 12) * k, h = 10 * k; g.fillStyle = j % 2 ? "#0b3b2b" : "#0e4634"; g.fillRect(px - w / 2, base - (j + 1) * h, w, h); }
      g.fillStyle = "#0b3b2b"; g.fillRect(px - 5 * k, base - 62 * k, 10 * k, 12 * k);
      glowDisk(g, px, base - 56 * k, 12 * k, "#7dffd1", 0.6);
      [["#ff8a3d", 0.22], ["#4fc3ff", 0.5], ["#e7c25a", 0.78]].forEach(([col, f]) => { const x = W * f, y = H * (0.25 + r() * 0.15); glowDisk(g, x, y, 14 * k, col, 0.75); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 2 * k, 0, Math.PI * 2); g.fill(); });
      for (let i = 0; i < 12; i++) { // feuillage
        const left = i % 2 === 0, x = left ? r() * W * 0.22 : W - r() * W * 0.22, y = H * (0.35 + r() * 0.6);
        g.fillStyle = rgba(i % 3 ? "#0f5c3d" : "#137a4f", 0.95); g.beginPath(); g.ellipse(x, y, 20 * k, 7 * k, (left ? -0.6 : 0.6) + (r() - 0.5) * 0.6, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = "rgba(8,40,26,.9)"; g.lineWidth = 1.5 * k;
      for (let i = 0; i < 6; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (r() - 0.5) * 20 * k, H * 0.2, x + (r() - 0.5) * 10 * k, H * (0.25 + r() * 0.25)); g.stroke(); }
      g.fillStyle = "#03170f"; g.fillRect(0, base, W, H - base);
    } else if (s === "Bandle") {
      sky(g, W, H, "#3a1e5c", "#ff9f5a", 0.05);
      const qx = W * (0.25 + r() * 0.5), qy = H * 0.3; // portail
      for (let j = 0; j < 6; j++) { g.strokeStyle = rgba(j % 2 ? "#c58bff" : "#7ff0ff", 0.5 - j * 0.06); g.lineWidth = 2 * k; g.beginPath(); g.ellipse(qx, qy, (8 + j * 5) * k, (12 + j * 6) * k, 0.2, 0, Math.PI * 2); g.stroke(); }
      glowDisk(g, qx, qy, 18 * k, "#e2c4ff", 0.55);
      for (let i = 0; i < 3; i++) { g.fillStyle = ["#2f6b3a", "#3b7f45", "#295c33"][i]; g.beginPath(); g.ellipse(W * (i / 2), H * (0.92 + i * 0.02), W * 0.42, H * (0.22 - i * 0.03), 0, Math.PI, 0); g.fill(); }
      for (let i = 0; i < 3; i++) { // maisons-champignons
        const x = W * (0.18 + i * 0.32 + (r() - 0.5) * 0.06), y = H * (0.8 + r() * 0.06), h = (18 + r() * 10) * k, w = (12 + r() * 6) * k, cap = ["#e4483b", "#f2a33a", "#b05cff"][i];
        g.fillStyle = "#f3e2c4"; g.fillRect(x - w / 3, y - h, w * 0.66, h);
        g.fillStyle = cap; g.beginPath(); g.ellipse(x, y - h, w, w * 0.7, 0, Math.PI, 0); g.fill();
        g.fillStyle = "rgba(255,255,255,.85)"; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + (r() - 0.5) * w, y - h - r() * w * 0.5, 1.6 * k, 0, Math.PI * 2); g.fill(); }
        glowDisk(g, x, y - h * 0.4, 6 * k, "#ffd56b", 0.7); g.fillStyle = "#ffd56b"; g.beginPath(); g.arc(x, y - h * 0.4, 2.2 * k, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < 16; i++) glowDisk(g, r() * W, H * (0.4 + r() * 0.5), 4 * k, "#fff3a0", 0.6);
    } else { // la Faille de l'invocateur : la rivière et le Nexus
      sky(g, W, H, "#060d22", "#1b2c58", 0.2);
      stars(g, W, H, r, 30, "#d8e6ff");
      g.strokeStyle = "rgba(70,150,220,.55)"; g.lineWidth = 18 * k; // la rivière
      g.beginPath(); g.moveTo(-10, H * 0.25); g.bezierCurveTo(W * 0.3, H * 0.55, W * 0.6, H * 0.3, W + 10, H * 0.7); g.stroke();
      g.strokeStyle = "rgba(170,225,255,.35)"; g.lineWidth = 3 * k; g.stroke();
      const nx = W * 0.5, ny = H * 0.74; // le Nexus
      glowDisk(g, nx, ny, 36 * k, mix(c.c, "#5ee1ff", 0.5), 0.6);
      poly([[nx, ny - 26 * k], [nx + 12 * k, ny - 4 * k], [nx, ny + 10 * k], [nx - 12 * k, ny - 4 * k]], "#a8e9ff");
      poly([[nx, ny - 26 * k], [nx + 12 * k, ny - 4 * k], [nx, ny - 2 * k]], "#e8fbff");
      g.strokeStyle = rgba("#c8aa6e", 0.8); g.lineWidth = 2 * k; g.beginPath(); g.ellipse(nx, ny + 10 * k, 30 * k, 8 * k, 0, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = "#c8aa6e"; g.fillRect(nx + Math.cos(a) * 30 * k - k, ny + 10 * k + Math.sin(a) * 8 * k - k, 2 * k, 2 * k); }
    }
  },
  // Harry Potter : le château la nuit (cartes sans maison) ; chaque maison a son ambiance (c.sub)
  hogwarts(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    const castle = (base, col, win, x0 = 0.1, x1 = 0.9) => { // tours à toits pointus et fenêtres allumées
      const n = 6 + Math.floor(r() * 3);
      g.fillStyle = col; g.fillRect(W * x0, base - H * 0.1, W * (x1 - x0), H * 0.1 + 2);
      for (let i = 0; i < n; i++) {
        const x = W * (x0 + 0.02 + (i / (n - 1)) * (x1 - x0 - 0.04)) + (r() - 0.5) * 6 * k, w = (7 + r() * 8) * k, h = H * (0.16 + r() * 0.3);
        g.fillStyle = col; g.fillRect(x - w / 2, base - h, w, h + 2);
        poly([[x - w / 2 - 2 * k, base - h], [x, base - h - (12 + r() * 14) * k], [x + w / 2 + 2 * k, base - h]], col);
        for (let j = 0; j < 3; j++) if (r() < 0.65) { g.fillStyle = rgba(win, 0.65 + r() * 0.35); g.fillRect(x - 1.2 * k, base - h + (6 + j * 9) * k, 2.4 * k, 4 * k); }
      }
    };
    const candles = (n, y0, y1) => { for (let i = 0; i < n; i++) { const x = r() * W, y = y0 + r() * (y1 - y0); glowDisk(g, x, y - 2 * k, 7 * k, "#ffcf6b", 0.5); g.fillStyle = "#f6efd9"; g.fillRect(x - 1.2 * k, y, 2.4 * k, 7 * k); g.fillStyle = "#ffe9a3"; g.beginPath(); g.ellipse(x, y - 1.6 * k, 1.1 * k, 2 * k, 0, 0, Math.PI * 2); g.fill(); } };
    const banner = (x, y, col, col2) => { poly([[x, y], [x + 12 * k, y], [x + 12 * k, y + 30 * k], [x + 6 * k, y + 24 * k], [x, y + 30 * k]], col); g.fillStyle = col2; g.fillRect(x + 4.5 * k, y + 8 * k, 3 * k, 10 * k); };
    if (s === "Gryffondor") { // la tour au soleil couchant, bannières rouge et or
      sky(g, W, H, "#3a0a0a", "#e0782a", 0.1);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.62, H * 0.5, "#ffd27a", 0.55);
      castle(H * 0.86, "#260707", "#ffd36b");
      g.fillStyle = "#1a0505"; g.fillRect(0, H * 0.86, W, H * 0.14);
      banner(W * 0.08, H * 0.06, "#b3201f", "#f2c14e"); banner(W * 0.85, H * 0.06, "#b3201f", "#f2c14e");
      candles(7, H * 0.08, H * 0.4);
    } else if (s === "Serpentard") { // les cachots sous le lac : lumière verte et ondulations
      sky(g, W, H, "#021a12", "#0c4a33", 0.2);
      for (let i = 0; i < 5; i++) { const x = W * (0.1 + r() * 0.8); const gr = g.createLinearGradient(x, 0, x + 20 * k, H); gr.addColorStop(0, "rgba(140,255,200,.28)"); gr.addColorStop(1, "rgba(140,255,200,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 6 * k, 0); g.lineTo(x + 6 * k, 0); g.lineTo(x + 30 * k, H); g.lineTo(x + 10 * k, H); g.closePath(); g.fill(); }
      for (let i = 0; i < 3; i++) { // fenêtres en arc donnant sur l'eau
        const x = W * (0.2 + i * 0.3), y = H * 0.42, w = 18 * k, h = 30 * k;
        g.fillStyle = "#0a3b2a"; g.beginPath(); g.moveTo(x - w / 2, y + h); g.lineTo(x - w / 2, y); g.arc(x, y, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + h); g.closePath(); g.fill();
        glowDisk(g, x, y + h * 0.4, 16 * k, "#5dffb0", 0.35);
        g.strokeStyle = "#c9d6d0"; g.lineWidth = 1.5 * k; g.stroke();
      }
      g.strokeStyle = rgba("#bfe9d6", 0.35); g.lineWidth = 1.2 * k;
      for (let i = 0; i < 8; i++) { const y = r() * H * 0.35; g.beginPath(); for (let x = 0; x <= W; x += 6) { const yy = y + Math.sin(x / (10 * k) + i) * 2 * k; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
      g.strokeStyle = rgba("#d9e4e0", 0.85); g.lineWidth = 3 * k; // un serpent d'argent
      g.beginPath(); const sy = H * 0.86; for (let x = W * 0.12; x <= W * 0.88; x += 3) { const yy = sy + Math.sin((x / W) * Math.PI * 4) * 6 * k; x > W * 0.12 ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
      g.fillStyle = "#d9e4e0"; g.beginPath(); g.ellipse(W * 0.88, sy + Math.sin(Math.PI * 4 * 0.88) * 6 * k, 4 * k, 2.6 * k, 0, 0, Math.PI * 2); g.fill();
    } else if (s === "Serdaigle") { // la tour sous les étoiles et les constellations
      sky(g, W, H, "#050b2a", "#22407e", 0.15);
      stars(g, W, H, r, 40, "#e6eeff");
      g.strokeStyle = rgba("#cdb37a", 0.6); g.lineWidth = 1 * k;
      for (let c2 = 0; c2 < 2; c2++) { let x = W * (0.15 + r() * 0.6), y = H * (0.1 + r() * 0.25); g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (r() - 0.3) * 26 * k; y += (r() - 0.5) * 16 * k; g.lineTo(x, y); glowDisk(g, x, y, 4 * k, "#fff6d8", 0.9); } g.stroke(); }
      const tx = W * (0.5 + (r() - 0.5) * 0.3), base = H * 0.9, tw = 26 * k, th = H * 0.5;
      g.fillStyle = "#0b1538"; g.fillRect(tx - tw / 2, base - th, tw, th);
      g.beginPath(); g.arc(tx, base - th, tw / 2 + 2 * k, Math.PI, 0); g.fill();
      g.fillStyle = "#cdb37a"; g.fillRect(tx - 1 * k, base - th - tw / 2 - 10 * k, 2 * k, 10 * k);
      glowDisk(g, tx, base - th * 0.7, 14 * k, "#9cc0ff", 0.6); g.fillStyle = "#cfe0ff"; g.fillRect(tx - 3 * k, base - th * 0.74, 6 * k, 9 * k);
      castle(H * 0.92, "#0b1538", "#9cc0ff", 0.0, 0.3); castle(H * 0.92, "#0b1538", "#9cc0ff", 0.7, 1.0);
      g.fillStyle = "#060c26"; g.fillRect(0, H * 0.9, W, H * 0.1);
    } else if (s === "Poufsouffle") { // les serres et la porte ronde, dans la lumière dorée
      sky(g, W, H, "#f3c84b", "#7a4a12", 0);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.2, H * 0.45, "#fff3c2", 0.6);
      for (let i = 0; i < 2; i++) { // serres
        const x = W * (0.25 + i * 0.5), y = H * 0.8, w = 30 * k, h = 26 * k;
        g.fillStyle = "rgba(220,255,230,.35)"; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w, y - h * 0.5); g.quadraticCurveTo(x, y - h * 1.6, x + w, y - h * 0.5); g.lineTo(x + w, y); g.closePath(); g.fill();
        g.strokeStyle = "rgba(60,40,10,.7)"; g.lineWidth = 1.2 * k; g.stroke();
        for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x + j * w * 0.4, y); g.lineTo(x + j * w * 0.4, y - h * (0.9 - Math.abs(j) * 0.2)); g.stroke(); }
        for (let j = 0; j < 5; j++) { g.fillStyle = ["#3f8a3a", "#5aa84a", "#2f6f2c"][j % 3]; g.beginPath(); g.ellipse(x + (r() - 0.5) * w * 1.6, y - 4 * k - r() * h * 0.5, 4 * k, 7 * k, (r() - 0.5), 0, Math.PI * 2); g.fill(); }
      }
      g.fillStyle = "#4a2c0c"; g.fillRect(0, H * 0.8, W, H * 0.2);
      const dx = W * 0.5, dy = H * 0.92; // la porte ronde
      g.fillStyle = "#8a5a1e"; g.beginPath(); g.arc(dx, dy, 14 * k, Math.PI, 0); g.fill();
      g.fillStyle = "#f2c14e"; g.beginPath(); g.arc(dx + 6 * k, dy - 6 * k, 1.6 * k, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 14; i++) glowDisk(g, r() * W, r() * H * 0.7, 3 * k, "#fff2a8", 0.7);
    } else { // le château la nuit, au-dessus du lac
      sky(g, W, H, "#0a0620", "#2c2160", 0.15);
      stars(g, W, H, r, 34, "#f0eaff");
      g.fillStyle = "#fdf6dc"; g.beginPath(); g.arc(W * (0.15 + r() * 0.7), H * 0.16, 8 * k, 0, Math.PI * 2); g.fill();
      castle(H * 0.66, "#120b2a", "#ffd36b");
      g.fillStyle = "#0a1230"; g.fillRect(0, H * 0.66, W, H * 0.34);
      for (let i = 0; i < 14; i++) { g.fillStyle = rgba("#ffd36b", 0.15 + r() * 0.3); g.fillRect(r() * W, H * (0.7 + r() * 0.26), (6 + r() * 14) * k, 1.2 * k); }
      candles(5, H * 0.08, H * 0.34);
      const cols = ["#b3201f", "#1f7a45", "#2b5fbf", "#e8b923"];
      cols.forEach((col, i) => banner(W * (0.05 + i * 0.26), H * 0.04, col, "#f2e6c4"));
    }
  },
  // Star Wars : l'espace (cartes sans camp) ; chaque camp a son décor (c.sub)
  galaxy(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    const space = (a, b, n = 60) => { sky(g, W, H, a, b, 0.2); for (let i = 0; i < n; i++) { g.fillStyle = rgba("#ffffff", 0.2 + r() * 0.8); const z = (0.4 + r() * 1.3) * k; g.fillRect(r() * W, r() * H, z, z); } };
    const nebula = (col, n = 5, y1 = 0.7) => { for (let i = 0; i < n; i++) glowDisk(g, r() * W, r() * H * y1, (30 + r() * 40) * k, col, 0.16 + r() * 0.14); };
    if (s === "Jedi") { // la Force : des pierres qui flottent au-dessus des marais brumeux
      space("#020a1c", "#0d3a5c", 40); nebula("#4fa3ff", 5);
      for (let i = 0; i < 5; i++) {
        const x = W * (0.12 + i * 0.19 + (r() - 0.5) * 0.06), y = H * (0.3 + r() * 0.3), w = (6 + r() * 7) * k;
        glowDisk(g, x, y, w * 2.2, "#7cc4ff", 0.35);
        poly([[x - w, y], [x - w * 0.4, y - w * 0.7], [x + w * 0.6, y - w * 0.6], [x + w, y + w * 0.1], [x + w * 0.2, y + w * 0.8], [x - w * 0.7, y + w * 0.5]], "#1a2f3e");
      }
      g.fillStyle = "#06141c"; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.84 + Math.sin(x * 0.07) * 4 * k + r() * 3 * k); g.lineTo(W, H); g.closePath(); g.fill();
      g.strokeStyle = "#0a1f2a"; g.lineWidth = 3 * k; for (let i = 0; i < 4; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + (r() - 0.5) * 30 * k, H * 0.8, x + (r() - 0.5) * 20 * k, H * 0.66); g.stroke(); }
      for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(180,220,255,.08)"; g.beginPath(); g.ellipse(r() * W, H * (0.82 + r() * 0.12), W * (0.3 + r() * 0.3), H * 0.035, 0, 0, Math.PI * 2); g.fill(); }
    } else if (s === "Sith") { // une planète de lave et une tour noire
      sky(g, W, H, "#0d0204", "#5a0a0a", 0.2);
      nebula("#ff2a2a", 4, 0.5);
      const tx = W * (0.5 + (r() - 0.5) * 0.4), base = H * 0.78; // la tour
      poly([[tx - 14 * k, base], [tx - 7 * k, base - H * 0.5], [tx + 7 * k, base - H * 0.5], [tx + 14 * k, base]], "#090103");
      poly([[tx - 7 * k, base - H * 0.5], [tx - 13 * k, base - H * 0.56], [tx - 2 * k, base - H * 0.52]], "#090103");
      poly([[tx + 7 * k, base - H * 0.5], [tx + 13 * k, base - H * 0.56], [tx + 2 * k, base - H * 0.52]], "#090103");
      glowDisk(g, tx, base - H * 0.4, 8 * k, "#ff3b3b", 0.6);
      g.fillStyle = "#120304"; g.fillRect(0, base, W, H - base);
      for (let i = 0; i < 4; i++) { // rivières de lave
        g.strokeStyle = rgba(i % 2 ? "#ff7a1a" : "#ffb02e", 0.85); g.lineWidth = (2 + r() * 3) * k;
        g.beginPath(); let x = r() * W; g.moveTo(x, base); for (let y = base; y <= H; y += 6 * k) { x += (r() - 0.5) * 14 * k; g.lineTo(x, y); } g.stroke();
      }
      for (let i = 0; i < 30; i++) { g.fillStyle = rgba(i % 2 ? "#ff9b3d" : "#ff4b2b", 0.4 + r() * 0.5); const z = (0.8 + r() * 1.6) * k; g.fillRect(r() * W, r() * H, z, z); }
    } else if (s === "Rébellion") { // le saut dans l'hyperespace
      sky(g, W, H, "#02040c", "#0b1a3a", 0.5);
      const cx = W * 0.5, cy = H * 0.48;
      for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2, d0 = (6 + r() * 30) * k, d1 = d0 + (20 + r() * 80) * k;
        g.strokeStyle = rgba(i % 5 ? "#dfe9ff" : "#7fb6ff", 0.25 + r() * 0.6); g.lineWidth = (0.5 + r() * 1.2) * k;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 * 0.7); g.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1 * 0.7); g.stroke();
      }
      glowDisk(g, cx, cy, 30 * k, "#cfe3ff", 0.5);
      glowDisk(g, W * (0.15 + r() * 0.7), H * 0.85, 40 * k, "#f08a24", 0.35);
    } else if (s === "Empire") { // un hangar d'acier : lignes de fuite, projecteurs et voyants rouges
      sky(g, W, H, "#0b0e12", "#3a434d", 0);
      const vx = W * 0.5, vy = H * 0.42;
      g.strokeStyle = "rgba(170,185,200,.35)"; g.lineWidth = 1 * k;
      for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(vx + i * 2 * k, vy); g.lineTo(vx + i * W * 0.14, H); g.stroke(); }
      for (let j = 1; j < 8; j++) { const y = vy + (H - vy) * Math.pow(j / 8, 1.7); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = "#151a20"; g.fillRect(0, 0, W, H * 0.16);
      for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.2); glowDisk(g, x, H * 0.16, 18 * k, "#e8f1ff", 0.4); g.fillStyle = "#e8f1ff"; g.fillRect(x - 6 * k, H * 0.15, 12 * k, 2 * k); }
      g.fillStyle = "#05070a"; g.fillRect(vx - 26 * k, vy - 20 * k, 52 * k, 20 * k); // la baie ouverte sur l'espace
      for (let i = 0; i < 18; i++) { g.fillStyle = "#ffffff"; g.fillRect(vx - 26 * k + r() * 52 * k, vy - 20 * k + r() * 20 * k, 0.8 * k, 0.8 * k); }
      for (let i = 0; i < 8; i++) glowDisk(g, r() * W, H * (0.2 + r() * 0.2), 3 * k, "#ff2a2a", 0.85);
    } else if (s === "Pègre") { // le désert aux deux soleils
      sky(g, W, H, "#3b1d3a", "#f0a04a", 0);
      const sx = W * (0.3 + r() * 0.3), sy = H * 0.5;
      glowDisk(g, sx, sy, 30 * k, "#ffd27a", 0.6); g.fillStyle = "#fff0c2"; g.beginPath(); g.arc(sx, sy, 8 * k, 0, Math.PI * 2); g.fill();
      glowDisk(g, sx + 26 * k, sy + 8 * k, 22 * k, "#ffb35a", 0.55); g.fillStyle = "#ffd9a0"; g.beginPath(); g.arc(sx + 26 * k, sy + 8 * k, 5.5 * k, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 3; i++) { g.fillStyle = ["#c9773a", "#b0612b", "#8f4c22"][i]; g.beginPath(); g.ellipse(W * (i * 0.5), H * (0.86 + i * 0.04), W * 0.6, H * (0.18 - i * 0.03), 0, Math.PI, 0); g.fill(); g.fillRect(0, H * (0.86 + i * 0.04), W, H); }
      for (let i = 0; i < 3; i++) { // maisons-dômes
        const x = W * (0.15 + i * 0.33 + (r() - 0.5) * 0.06), y = H * 0.9, w = (9 + r() * 5) * k;
        g.fillStyle = "#e8c79a"; g.beginPath(); g.arc(x, y, w, Math.PI, 0); g.fill();
        g.fillStyle = "#4a2a14"; g.beginPath(); g.arc(x, y, w * 0.38, Math.PI, 0); g.fill();
      }
    } else { // l'espace profond : une planète à anneaux et sa lune
      space("#02030a", "#101a3a", 80); nebula(mix(c.c, "#9a7bff", 0.6), 4);
      const px = W * (0.3 + r() * 0.4), py = H * 0.58, pr = 30 * k;
      const gr = g.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr); gr.addColorStop(0, "#d9b98a"); gr.addColorStop(1, "#3a2a1a");
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba("#ffe8b0", 0.6); g.lineWidth = 3 * k; g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.42, -0.25, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#c8ccd6"; g.beginPath(); g.arc(px + pr * 2.1, py - pr * 1.1, 5 * k, 0, Math.PI * 2); g.fill();
    }
  },
  // Game of Thrones : un décor par faction (c.sub) ; Port-Réal et sa baie pour ce qui va partout
  westeros(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    const keep = (x0, x1, base, col, hmin, hmax, win) => { // un château : courtine crénelée et tours carrées
      g.fillStyle = col; g.fillRect(W * x0, base - H * 0.12, W * (x1 - x0), H * 0.12 + 2);
      for (let x = W * x0; x < W * x1; x += 6 * k) g.fillRect(x, base - H * 0.12 - 3 * k, 3.5 * k, 3 * k);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = W * (x0 + (i + 0.5) * (x1 - x0) / n) + (r() - 0.5) * 6 * k, w = (9 + r() * 7) * k, h = H * (hmin + r() * (hmax - hmin));
        g.fillStyle = col; g.fillRect(x - w / 2, base - h, w, h + 2);
        for (let j = 0; j < 3; j++) g.fillRect(x - w / 2 + j * w / 2.5, base - h - 3 * k, w / 5, 3 * k);
        if (win) for (let j = 0; j < 2; j++) if (r() < 0.7) { g.fillStyle = rgba(win, 0.7 + r() * 0.3); g.fillRect(x - 1.2 * k, base - h + (6 + j * 10) * k, 2.4 * k, 4 * k); }
      }
    };
    const snow = (n, col = "#ffffff") => { for (let i = 0; i < n; i++) { g.fillStyle = rgba(col, 0.35 + r() * 0.6); g.beginPath(); g.arc(r() * W, r() * H, (0.6 + r() * 1.5) * k, 0, Math.PI * 2); g.fill(); } };
    if (s === "Stark") { // Winterfell sous la neige, et l'arbre-cœur aux feuilles rouges
      sky(g, W, H, "#26323f", "#9fb3c6", 0.1);
      keep(0.05, 0.62, H * 0.84, "#18202a", 0.2, 0.42, "#ffcf7a");
      const tx = W * 0.8, ty = H * 0.86;
      g.strokeStyle = "#e9e4da"; g.lineWidth = 6 * k; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx - 6 * k, H * 0.6, tx + 4 * k, H * 0.42); g.stroke();
      g.lineWidth = 2.5 * k; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(tx + 2 * k, H * (0.5 + i * 0.04)); g.lineTo(tx + (r() - 0.5) * 50 * k, H * (0.3 + r() * 0.15)); g.stroke(); }
      for (let i = 0; i < 26; i++) glowDisk(g, tx + (r() - 0.5) * 56 * k, H * (0.26 + r() * 0.22), (3 + r() * 5) * k, i % 3 ? "#c4161c" : "#ff5a4a", 0.85);
      g.fillStyle = "#f2f5f8"; g.fillRect(0, H * 0.84, W, H * 0.16);
      snow(50);
    } else if (s === "Lannister") { // Castral Roc au couchant, au-dessus de la mer, et l'or qui brille
      sky(g, W, H, "#5a0d12", "#f2b44a", 0.05);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.62, H * 0.5, "#ffe08a", 0.6);
      poly([[W * 0.08, H], [W * 0.18, H * 0.5], [W * 0.42, H * 0.38], [W * 0.66, H * 0.44], [W * 0.8, H * 0.6], [W * 0.9, H]], "#3a0a0c");
      keep(0.2, 0.7, H * 0.44, "#3a0a0c", 0.1, 0.24, "#ffd36b");
      g.fillStyle = "rgba(90,20,20,.55)"; g.fillRect(0, H * 0.82, W, H * 0.18);
      for (let i = 0; i < 18; i++) { g.fillStyle = rgba("#ffd36b", 0.25 + r() * 0.4); g.fillRect(r() * W, H * (0.84 + r() * 0.14), (6 + r() * 14) * k, 1.3 * k); }
      for (let i = 0; i < 16; i++) glowDisk(g, r() * W, r() * H * 0.8, 3 * k, "#ffe9a8", 0.8);
    } else if (s === "Targaryen") { // la nuit de feu : flammes et silhouettes ailées
      sky(g, W, H, "#0a0204", "#4a0808", 0.2);
      for (let i = 0; i < 4; i++) glowDisk(g, r() * W, H * (0.75 + r() * 0.2), (40 + r() * 30) * k, i % 2 ? "#ff4d1a" : "#ffb03a", 0.45);
      for (let i = 0; i < 3; i++) { // ailes de dragon au loin
        const x = W * (0.2 + i * 0.3 + (r() - 0.5) * 0.1), y = H * (0.18 + r() * 0.25), w = (14 + r() * 10) * k;
        poly([[x, y], [x - w, y - w * 0.5], [x - w * 0.6, y - w * 0.1], [x - w * 1.1, y + w * 0.1], [x - w * 0.3, y + w * 0.15], [x, y + w * 0.3], [x + w * 0.3, y + w * 0.15], [x + w * 1.1, y + w * 0.1], [x + w * 0.6, y - w * 0.1], [x + w, y - w * 0.5]], "rgba(8,2,4,.92)");
      }
      for (let i = 0; i < 9; i++) { const x = (i / 8) * W, h = H * (0.15 + r() * 0.25); const gr = g.createLinearGradient(0, H - h, 0, H); gr.addColorStop(0, "rgba(255,120,30,0)"); gr.addColorStop(1, "rgba(255,90,20,.85)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 14 * k, H); g.quadraticCurveTo(x, H - h * 1.2, x + 14 * k, H); g.fill(); }
      for (let i = 0; i < 30; i++) { g.fillStyle = rgba(i % 2 ? "#ffb03a" : "#ff4d1a", 0.4 + r() * 0.5); const z = (0.8 + r() * 1.6) * k; g.fillRect(r() * W, r() * H, z, z); }
    } else if (s === "Baratheon") { // la tempête sur Accalmie
      sky(g, W, H, "#0d0f14", "#3b3f22", 0.2);
      for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(20,22,28,.7)"; g.beginPath(); g.ellipse(r() * W, H * (0.1 + r() * 0.2), (30 + r() * 30) * k, (8 + r() * 6) * k, 0, 0, Math.PI * 2); g.fill(); }
      let lx = W * (0.3 + r() * 0.4), ly = 0; g.strokeStyle = "#ffe66b"; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(lx, ly);
      for (let i = 0; i < 7; i++) { lx += (r() - 0.5) * 22 * k; ly += H * 0.08; g.lineTo(lx, ly); } g.stroke();
      glowDisk(g, lx, ly, 30 * k, "#fff3a0", 0.35);
      keep(0.15, 0.85, H * 0.86, "#0a0b0e", 0.25, 0.4, "#ffe66b");
      g.fillStyle = "#0a0b0e"; g.fillRect(0, H * 0.86, W, H * 0.14);
      g.strokeStyle = "rgba(200,210,230,.25)"; g.lineWidth = 1 * k; for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4 * k, y + 10 * k); g.stroke(); }
    } else if (s === "Greyjoy") { // la mer grise, les drakkars et la pluie
      sky(g, W, H, "#141c22", "#55636b", 0.2);
      for (let b = 0; b < 4; b++) { g.fillStyle = ["#1d3a3f", "#183236", "#132a2d", "#0e2124"][b]; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * (0.6 + b * 0.1) + Math.sin(x * 0.05 + b + r()) * 4 * k); g.lineTo(W, H); g.closePath(); g.fill(); }
      for (let i = 0; i < 2; i++) { // drakkars
        const x = W * (0.25 + i * 0.45), y = H * (0.6 + i * 0.05), w = (26 + r() * 8) * k;
        poly([[x - w, y - 4 * k], [x + w, y - 4 * k], [x + w * 0.8, y + 4 * k], [x - w * 0.8, y + 4 * k]], "#0a0d0f");
        g.fillStyle = "#0a0d0f"; g.fillRect(x - k, y - 30 * k, 2 * k, 26 * k);
        poly([[x + k, y - 28 * k], [x + 16 * k, y - 22 * k], [x + 16 * k, y - 10 * k], [x + k, y - 8 * k]], "#2c2f31");
        g.fillStyle = "#e3b341"; g.beginPath(); g.arc(x + 8 * k, y - 18 * k, 3 * k, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = "rgba(200,220,230,.3)"; g.lineWidth = 1 * k; for (let i = 0; i < 50; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3 * k, y + 9 * k); g.stroke(); }
    } else if (s === "Tyrell") { // les jardins de Hautjardin et leurs roses
      sky(g, W, H, "#9ed7f0", "#f6f1c8", 0);
      glowDisk(g, W * (0.3 + r() * 0.4), H * 0.2, H * 0.4, "#fff8d8", 0.7);
      keep(0.25, 0.75, H * 0.58, "#e9e2cc", 0.12, 0.26, null);
      for (let b = 0; b < 3; b++) { g.fillStyle = ["#2f6b2c", "#3b7f36", "#245a22"][b]; g.fillRect(0, H * (0.6 + b * 0.12), W, H * 0.12); }
      for (let i = 0; i < 40; i++) { const x = r() * W, y = H * (0.62 + r() * 0.36); glowDisk(g, x, y, 4 * k, "#ffd84d", 0.5); g.fillStyle = i % 4 ? "#f5c518" : "#e8445a"; g.beginPath(); g.arc(x, y, 1.8 * k, 0, Math.PI * 2); g.fill(); }
    } else if (s === "Martell") { // Dorne : le soleil, le palais aux coupoles et le sable
      sky(g, W, H, "#ff8a2a", "#ffe2a8", 0);
      glowDisk(g, W * 0.5, H * 0.32, 30 * k, "#fff3c4", 0.9); g.fillStyle = "#fff6d6"; g.beginPath(); g.arc(W * 0.5, H * 0.32, 11 * k, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 4; i++) { const x = W * (0.15 + i * 0.24), w = (10 + r() * 6) * k, h = H * (0.18 + r() * 0.16), y = H * 0.8;
        g.fillStyle = "#7a3510"; g.fillRect(x - w / 2, y - h, w, h); g.beginPath(); g.arc(x, y - h, w / 2 + 2 * k, Math.PI, 0); g.fill();
        g.fillRect(x - 0.8 * k, y - h - w / 2 - 8 * k, 1.6 * k, 8 * k); }
      g.fillStyle = "#c98a3a"; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.82 + Math.sin(x * 0.03 + r()) * 4 * k); g.lineTo(W, H); g.closePath(); g.fill();
    } else if (s === "Garde de Nuit") { // le Mur : sept cents pieds de glace
      sky(g, W, H, "#060a14", "#2a3550", 0.2);
      stars(g, W, H, r, 26, "#dfe8ff");
      const wy = H * 0.34, gr = g.createLinearGradient(0, wy, 0, H * 0.84); gr.addColorStop(0, "#d6ecff"); gr.addColorStop(1, "#7ea6c8");
      g.fillStyle = gr; g.fillRect(0, wy, W, H * 0.5);
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1 * k; for (let i = 0; i < 9; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, wy); g.lineTo(x + (r() - 0.5) * 10 * k, H * 0.84); g.stroke(); }
      for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.2) + (r() - 0.5) * 8 * k; g.fillStyle = "#0b0c10"; g.fillRect(x - 1.5 * k, wy - 9 * k, 3 * k, 9 * k); g.beginPath(); g.arc(x, wy - 10 * k, 1.8 * k, 0, Math.PI * 2); g.fill(); }
      keep(0.3, 0.7, H * 0.9, "#0b0c10", 0.06, 0.14, "#ffb24d");
      g.fillStyle = "#e9f1f8"; g.fillRect(0, H * 0.88, W, H * 0.12);
      snow(40);
    } else if (s === "Marcheurs blancs") { // la nuit glacée et les yeux bleus dans le noir
      sky(g, W, H, "#020611", "#0f2a44", 0.2);
      for (let i = 0; i < 5; i++) glowDisk(g, r() * W, r() * H * 0.6, (30 + r() * 30) * k, "#5fc8ff", 0.12);
      trees(g, W, H, H * 0.86, "#03070d", r, 12);
      for (let i = 0; i < 8; i++) { const x = r() * W, y = H * (0.5 + r() * 0.3); glowDisk(g, x - 3 * k, y, 5 * k, "#8fe3ff", 0.9); glowDisk(g, x + 3 * k, y, 5 * k, "#8fe3ff", 0.9); g.fillStyle = "#e8fbff"; g.fillRect(x - 4 * k, y - 0.7 * k, 2 * k, 1.4 * k); g.fillRect(x + 2 * k, y - 0.7 * k, 2 * k, 1.4 * k); }
      snow(55, "#cfefff");
    } else { // Port-Réal : la ville sur ses collines, au bord de la baie
      sky(g, W, H, "#1b1426", "#c86b4a", 0.1);
      glowDisk(g, W * (0.2 + r() * 0.6), H * 0.5, H * 0.45, "#ffcf8a", 0.45);
      hills(g, W, H, H * 0.72, H * 0.12, "#2a1a24", r, 4);
      skyline(g, W, H, H * 0.74, "#24151f", r);
      keep(0.32, 0.68, H * 0.6, "#5a1e1e", 0.14, 0.3, "#ffd36b");
      g.fillStyle = "#1f2a44"; g.fillRect(0, H * 0.84, W, H * 0.16);
      for (let i = 0; i < 16; i++) { g.fillStyle = rgba("#ffcf8a", 0.2 + r() * 0.4); g.fillRect(r() * W, H * (0.86 + r() * 0.12), (6 + r() * 14) * k, 1.2 * k); }
    }
  },
  // Le Seigneur des Anneaux : un décor par camp (c.sub) ; l'anneau d'or dans les ténèbres pour ce qui va partout
  middleearth(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    const peaks = (y0, col, n, hmin, hmax) => { for (let i = 0; i < n; i++) { const x = W * (i / (n - 1)) + (r() - 0.5) * 20 * k, h = H * (hmin + r() * (hmax - hmin)), w = W * (0.18 + r() * 0.12); poly([[x - w, y0], [x, y0 - h], [x + w, y0]], col); } };
    if (s === "Hobbits") { // les collines de la Comté et leurs portes rondes
      sky(g, W, H, "#8fd0f0", "#f7f3d0", 0);
      glowDisk(g, W * (0.2 + r() * 0.6), H * 0.18, H * 0.4, "#fff8d8", 0.7);
      for (let b = 0; b < 3; b++) { g.fillStyle = ["#8cc063", "#6fa84a", "#5a9440"][b]; g.beginPath(); g.ellipse(W * (0.15 + b * 0.38), H * (0.82 + b * 0.04), W * 0.42, H * (0.34 - b * 0.06), 0, Math.PI, 0); g.fill(); }
      g.fillStyle = "#4f8636"; g.fillRect(0, H * 0.86, W, H * 0.14);
      for (let i = 0; i < 3; i++) { const x = W * (0.18 + i * 0.32 + (r() - 0.5) * 0.05), y = H * (0.8 + r() * 0.06), d = (8 + r() * 4) * k, col = ["#2e7d32", "#d4a017", "#b23a2a"][i];
        g.fillStyle = "#6b4a2b"; g.beginPath(); g.arc(x, y, d + 2 * k, Math.PI, 0); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, d, Math.PI, 0); g.fill();
        g.fillStyle = "#f2d16b"; g.beginPath(); g.arc(x, y - d * 0.45, 1.4 * k, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? "#ffd84d" : "#ffffff"; g.beginPath(); g.arc(r() * W, H * (0.88 + r() * 0.1), 1.2 * k, 0, Math.PI * 2); g.fill(); }
    } else if (s === "Elfes") { // la forêt d'argent de la Lórien et ses lumières
      sky(g, W, H, "#0c1a2e", "#5c7ea3", 0.1);
      for (let i = 0; i < 7; i++) { const x = W * (0.05 + i * 0.15) + (r() - 0.5) * 6 * k, w = (5 + r() * 4) * k;
        const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "#d9e3ee"); gr.addColorStop(1, "#8ea3b8"); g.fillStyle = gr; g.fillRect(x - w / 2, H * 0.1, w, H);
        for (let j = 0; j < 3; j++) { g.fillStyle = rgba("#e8d27a", 0.45); g.beginPath(); g.ellipse(x, H * (0.12 + j * 0.12 + r() * 0.04), (12 + r() * 6) * k, (5 + r() * 2) * k, 0, 0, Math.PI * 2); g.fill(); } }
      for (let i = 0; i < 26; i++) glowDisk(g, r() * W, r() * H, (3 + r() * 4) * k, i % 3 ? "#e6f0ff" : "#ffe9a8", 0.75);
      g.fillStyle = "rgba(10,25,40,.6)"; g.fillRect(0, H * 0.9, W, H * 0.1);
    } else if (s === "Nains") { // les salles de la montagne et la lueur des forges
      sky(g, W, H, "#120a06", "#3a2210", 0.3);
      glowDisk(g, W * 0.5, H * 0.95, H * 0.6, "#ff8a2a", 0.5);
      for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.2), w = 12 * k; g.fillStyle = "#2a1a0e"; g.fillRect(x - w / 2, H * 0.1, w, H * 0.9); g.fillStyle = "#3c2716"; g.fillRect(x - w / 2 - 3 * k, H * 0.1, w + 6 * k, 6 * k); g.fillRect(x - w / 2 - 3 * k, H * 0.86, w + 6 * k, 6 * k);
        g.strokeStyle = rgba("#d9a441", 0.6); g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(x - w / 2 + 2 * k, H * 0.3); g.lineTo(x, H * 0.36); g.lineTo(x + w / 2 - 2 * k, H * 0.3); g.stroke(); }
      for (let i = 0; i < 30; i++) { g.fillStyle = rgba(i % 2 ? "#ffd36b" : "#ff9b3d", 0.4 + r() * 0.5); const z = (0.8 + r() * 1.6) * k; g.fillRect(r() * W, H * (0.5 + r() * 0.5), z, z); }
    } else if (s === "Gondor") { // la Cité blanche étagée sur sa montagne, à l'aube
      sky(g, W, H, "#1c2a4a", "#f2c9a0", 0);
      glowDisk(g, W * (0.15 + r() * 0.2), H * 0.5, H * 0.5, "#ffe2b0", 0.5);
      poly([[W * 0.35, H], [W * 0.62, H * 0.12], [W * 0.95, H]], "#4a5468");
      for (let t = 0; t < 6; t++) { const y = H * (0.88 - t * 0.12), w = W * (0.34 - t * 0.045), x = W * (0.62 - (0.34 - t * 0.045) / 2) - t * 2 * k; g.fillStyle = t % 2 ? "#eef2f6" : "#dfe5ec"; g.fillRect(x, y - H * 0.1, w, H * 0.1); }
      g.fillStyle = "#f8fbff"; g.fillRect(W * 0.6, H * 0.12, 3 * k, H * 0.18);
      g.fillStyle = "#2a3346"; g.fillRect(0, H * 0.9, W, H * 0.1);
    } else if (s === "Rohan") { // les plaines du Rohan et la salle dorée sur sa colline
      sky(g, W, H, "#5aa0d8", "#f6e7b8", 0);
      peaks(H * 0.6, "#8fa6b8", 5, 0.12, 0.24);
      g.fillStyle = "#7da04a"; g.beginPath(); g.ellipse(W * 0.5, H * 0.72, W * 0.22, H * 0.14, 0, Math.PI, 0); g.fill();
      const hx = W * 0.5, hy = H * 0.6; poly([[hx - 16 * k, hy], [hx, hy - 10 * k], [hx + 16 * k, hy]], "#c99a2e"); g.fillStyle = "#8a5a1e"; g.fillRect(hx - 13 * k, hy, 26 * k, 7 * k);
      g.fillStyle = "#9ab85a"; g.fillRect(0, H * 0.72, W, H * 0.28);
      g.strokeStyle = "rgba(240,220,140,.6)"; g.lineWidth = 1 * k; for (let i = 0; i < 60; i++) { const x = r() * W, y = H * (0.74 + r() * 0.26); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 * k, y - 5 * k); g.stroke(); }
    } else if (s === "Mordor") { // le volcan, la tour noire et le ciel de cendre
      sky(g, W, H, "#1a0505", "#6e1608", 0.2);
      poly([[W * 0.05, H * 0.86], [W * 0.32, H * 0.38], [W * 0.4, H * 0.36], [W * 0.66, H * 0.86]], "#1e0806");
      glowDisk(g, W * 0.36, H * 0.36, 26 * k, "#ff5a1a", 0.7);
      g.strokeStyle = "rgba(255,110,30,.85)"; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(W * 0.36, H * 0.38); g.quadraticCurveTo(W * 0.3, H * 0.6, W * 0.24, H * 0.86); g.stroke();
      const tx = W * 0.8; poly([[tx - 12 * k, H * 0.86], [tx - 5 * k, H * 0.22], [tx + 5 * k, H * 0.22], [tx + 12 * k, H * 0.86]], "#080202");
      poly([[tx - 5 * k, H * 0.22], [tx - 8 * k, H * 0.12], [tx - 1 * k, H * 0.2]], "#080202"); poly([[tx + 5 * k, H * 0.22], [tx + 8 * k, H * 0.12], [tx + 1 * k, H * 0.2]], "#080202");
      glowDisk(g, tx, H * 0.16, 14 * k, "#ff7a1a", 0.8);
      g.fillStyle = "#120303"; g.fillRect(0, H * 0.86, W, H * 0.14);
      for (let i = 0; i < 30; i++) { g.fillStyle = rgba(i % 2 ? "#ff9b3d" : "#8a8a8a", 0.3 + r() * 0.5); const z = (0.8 + r() * 1.6) * k; g.fillRect(r() * W, r() * H, z, z); }
    } else if (s === "Isengard") { // la tour noire au milieu des forges et de la fumée
      sky(g, W, H, "#141518", "#4a4d55", 0.2);
      for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(30,30,34,.55)"; g.beginPath(); g.ellipse(r() * W, H * (0.1 + r() * 0.3), (24 + r() * 30) * k, (8 + r() * 6) * k, 0, 0, Math.PI * 2); g.fill(); }
      const tx = W * 0.5; poly([[tx - 13 * k, H * 0.9], [tx - 9 * k, H * 0.18], [tx + 9 * k, H * 0.18], [tx + 13 * k, H * 0.9]], "#050506");
      for (let j = 0; j < 4; j++) poly([[tx - 9 * k + j * 6 * k, H * 0.18], [tx - 9 * k + j * 6 * k + 1.5 * k, H * 0.08], [tx - 9 * k + j * 6 * k + 3 * k, H * 0.18]], "#050506");
      for (let i = 0; i < 6; i++) { const x = W * (0.08 + i * 0.17); if (Math.abs(x - tx) < 18 * k) continue; glowDisk(g, x, H * 0.9, 16 * k, "#ff6a1a", 0.6); g.fillStyle = "rgba(60,60,64,.5)"; g.beginPath(); g.ellipse(x + 4 * k, H * 0.6, 6 * k, 18 * k, 0.2, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#0c0c0e"; g.fillRect(0, H * 0.9, W, H * 0.1);
    } else { // l'Anneau d'or qui brille dans les ténèbres
      sky(g, W, H, "#06070d", "#1d1a10", 0.2);
      peaks(H * 0.92, "#0f0e0a", 5, 0.15, 0.3);
      const cx = W * 0.5, cy = H * 0.46, R = 18 * k;
      glowDisk(g, cx, cy, R * 3.2, "#ffcf5a", 0.4);
      g.strokeStyle = "#f2c24a"; g.lineWidth = 5 * k; g.beginPath(); g.ellipse(cx, cy, R, R * 0.42, -0.2, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "rgba(255,240,190,.9)"; g.lineWidth = 1.4 * k; g.beginPath(); g.ellipse(cx, cy - 1.5 * k, R - 1 * k, R * 0.42 - 1 * k, -0.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      for (let i = 0; i < 20; i++) glowDisk(g, r() * W, r() * H * 0.8, 2.5 * k, "#ffe9a8", 0.6);
    }
  },
  // Narnia : le réverbère dans la forêt enneigée ; l'hiver de la Sorcière (trait Sorcière) ; la mer du Passeur d'Aurore
  narnia(g, W, H, c, r) {
    const k = W / 180, tr = c.tr || [];
    const snow = (n, col = "#ffffff") => { for (let i = 0; i < n; i++) { g.fillStyle = rgba(col, 0.35 + r() * 0.6); g.beginPath(); g.arc(r() * W, r() * H, (0.6 + r() * 1.5) * k, 0, Math.PI * 2); g.fill(); } };
    if (tr.includes("Sorcière")) { // l'éternel hiver et le château de glace
      sky(g, W, H, "#0a1530", "#6f9cc8", 0.15);
      const cx = W * (0.5 + (r() - 0.5) * 0.2), base = H * 0.86;
      for (let i = -3; i <= 3; i++) { const h = H * (0.3 + (3 - Math.abs(i)) * 0.1 + r() * 0.06), w = 7 * k, x = cx + i * 12 * k;
        g.fillStyle = rgba("#dff3ff", 0.85); g.beginPath(); g.moveTo(x - w, base); g.lineTo(x, base - h); g.lineTo(x + w, base); g.closePath(); g.fill(); }
      glowDisk(g, cx, base - H * 0.3, 40 * k, "#bfe9ff", 0.35);
      trees(g, W, H, base, "#173052", r, 12);
      g.fillStyle = "#e9f5ff"; g.fillRect(0, base, W, H - base);
      snow(60);
    } else if (tr.includes("Passeur d'Aurore")) { // la mer de l'Est à l'aube et la proue en tête de dragon
      sky(g, W, H, "#f7b46b", "#3b6fa8", 0);
      glowDisk(g, W * 0.5, H * 0.56, H * 0.5, "#ffe6a8", 0.6);
      for (let b = 0; b < 4; b++) { g.fillStyle = ["#2f6fa8", "#285f92", "#20507c", "#184266"][b]; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * (0.6 + b * 0.1) + Math.sin(x * 0.05 + b * 2 + r()) * 3 * k); g.lineTo(W, H); g.closePath(); g.fill(); }
      const sx = W * (0.3 + r() * 0.4), sy = H * 0.66;
      g.fillStyle = "#3a2210"; g.beginPath(); g.moveTo(sx - 28 * k, sy); g.lineTo(sx + 24 * k, sy); g.lineTo(sx + 18 * k, sy + 7 * k); g.lineTo(sx - 22 * k, sy + 7 * k); g.closePath(); g.fill();
      g.fillRect(sx - 1 * k, sy - 34 * k, 2 * k, 34 * k);
      g.fillStyle = "#b03a2e"; g.fillRect(sx - 14 * k, sy - 30 * k, 26 * k, 20 * k);
      g.fillStyle = "#d9a441"; g.beginPath(); g.arc(sx - 1 * k, sy - 20 * k, 5 * k, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#3a2210"; g.beginPath(); g.moveTo(sx + 24 * k, sy); g.quadraticCurveTo(sx + 34 * k, sy - 10 * k, sx + 28 * k, sy - 18 * k); g.lineTo(sx + 22 * k, sy - 12 * k); g.closePath(); g.fill();
    } else { // le réverbère au milieu de la forêt enneigée
      sky(g, W, H, "#1a2440", "#5d6f9a", 0.2);
      trees(g, W, H, H * 0.86, "#0f1a2c", r, 14);
      g.fillStyle = "#eef3fa"; g.fillRect(0, H * 0.86, W, H * 0.14);
      const lx = W * (0.5 + (r() - 0.5) * 0.3), ly = H * 0.86;
      g.fillStyle = "#1a1a1a"; g.fillRect(lx - 1.5 * k, ly - 52 * k, 3 * k, 52 * k);
      g.fillRect(lx - 5 * k, ly - 62 * k, 10 * k, 10 * k);
      glowDisk(g, lx, ly - 57 * k, 34 * k, "#ffd27a", 0.75);
      g.fillStyle = "#fff1c4"; g.fillRect(lx - 3.5 * k, ly - 60.5 * k, 7 * k, 7 * k);
      g.fillStyle = "rgba(255,214,140,.22)"; g.beginPath(); g.ellipse(lx, ly + 2 * k, 30 * k, 6 * k, 0, 0, Math.PI * 2); g.fill();
      snow(50);
    }
  },
  // Studio Ghibli : la forêt des esprits, les bains d'Aburaya la nuit, le ciel et ses grands nuages, la mer ; sinon les champs et le ciel d'été
  ghibli(g, W, H, c, r) {
    const k = W / 180, tr = c.tr || [];
    const cloud = (x, y, s, col) => { g.fillStyle = col; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + (i - 2) * 9 * s * k, y - Math.sin((i / 4) * Math.PI) * 9 * s * k, (9 + Math.sin((i / 4) * Math.PI) * 6) * s * k, 0, Math.PI * 2); g.fill(); } g.fillRect(x - 22 * s * k, y - 2 * s * k, 44 * s * k, 9 * s * k); };
    if (tr.includes("Aburaya")) { // les bains la nuit, toits rouges et lanternes
      sky(g, W, H, "#0b1030", "#2a2a5a", 0.2);
      stars(g, W, H, r, 22, "#eef");
      const bx = W * 0.5, base = H * 0.86;
      for (let t = 0; t < 4; t++) { const w = (70 - t * 12) * k, y = base - t * 16 * k;
        g.fillStyle = "#3a1414"; g.fillRect(bx - w / 2 + 4 * k, y - 14 * k, w - 8 * k, 14 * k);
        for (let j = 0; j < 5; j++) { g.fillStyle = rgba("#ffcf6b", 0.75 + r() * 0.25); g.fillRect(bx - w / 2 + 8 * k + j * (w - 16 * k) / 5, y - 10 * k, 4 * k, 5 * k); }
        g.fillStyle = "#a52a2a"; g.beginPath(); g.moveTo(bx - w / 2 - 4 * k, y - 14 * k); g.quadraticCurveTo(bx, y - 22 * k, bx + w / 2 + 4 * k, y - 14 * k); g.lineTo(bx + w / 2 - 2 * k, y - 16 * k); g.lineTo(bx - w / 2 + 2 * k, y - 16 * k); g.closePath(); g.fill(); }
      for (let i = 0; i < 10; i++) { const x = r() * W, y = H * (0.3 + r() * 0.5); glowDisk(g, x, y, 6 * k, "#ff9b3d", 0.7); g.fillStyle = "#ff6a3d"; g.beginPath(); g.ellipse(x, y, 2 * k, 3 * k, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#14204a"; g.fillRect(0, base, W, H - base);
      for (let i = 0; i < 14; i++) { g.fillStyle = rgba("#ffcf6b", 0.2 + r() * 0.3); g.fillRect(r() * W, base + r() * (H - base), (6 + r() * 12) * k, 1.2 * k); }
    } else if (tr.includes("Forêt") || tr.includes("Esprit")) { // la forêt des esprits et le grand arbre
      sky(g, W, H, "#0d2a1a", "#3f7d4a", 0.3);
      for (let i = 0; i < 6; i++) { const x = r() * W; const gr = g.createLinearGradient(x, 0, x + 30 * k, H); gr.addColorStop(0, "rgba(220,255,200,.25)"); gr.addColorStop(1, "rgba(220,255,200,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 12 * k, 0); g.lineTo(x + 40 * k, H); g.lineTo(x + 20 * k, H); g.closePath(); g.fill(); }
      const tx = W * (0.5 + (r() - 0.5) * 0.2);
      g.fillStyle = "#2a1a0e"; g.beginPath(); g.moveTo(tx - 18 * k, H); g.quadraticCurveTo(tx - 8 * k, H * 0.6, tx - 10 * k, H * 0.3); g.lineTo(tx + 10 * k, H * 0.3); g.quadraticCurveTo(tx + 8 * k, H * 0.6, tx + 18 * k, H); g.closePath(); g.fill();
      for (let i = 0; i < 9; i++) { g.fillStyle = ["#1f5a2e", "#2c7a3c", "#174a26"][i % 3]; g.beginPath(); g.arc(tx + (r() - 0.5) * 120 * k, H * (0.08 + r() * 0.25), (18 + r() * 14) * k, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 24; i++) glowDisk(g, r() * W, H * (0.4 + r() * 0.55), (2 + r() * 3) * k, i % 3 ? "#eaffd8" : "#ffffff", 0.8);
      g.fillStyle = "#123a1e"; g.fillRect(0, H * 0.92, W, H * 0.08);
    } else if (tr.includes("Mer")) { // la mer et les vagues-poissons
      sky(g, W, H, "#8fd3f2", "#e9f8ff", 0);
      for (let b = 0; b < 4; b++) { g.fillStyle = ["#3fa4d8", "#2f8cc4", "#2476ad", "#1a6196"][b]; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, H * (0.5 + b * 0.12) + Math.sin(x * 0.06 + b * 1.7 + r()) * 5 * k); g.lineTo(W, H); g.closePath(); g.fill(); }
      for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(r() * W, H * (0.5 + r() * 0.45), 4 * k, 1.5 * k, 0, 0, Math.PI * 2); g.fill(); }
    } else if (tr.includes("Ciel") || tr.includes("Pilote")) { // le grand ciel bleu et les nuages en tours
      sky(g, W, H, "#2f86d6", "#bfe6ff", 0);
      cloud(W * 0.3, H * 0.62, 1.6, "rgba(255,255,255,.95)"); cloud(W * 0.75, H * 0.4, 1.1, "rgba(255,255,255,.9)"); cloud(W * 0.15, H * 0.25, 0.8, "rgba(255,255,255,.85)");
      g.fillStyle = "#2a3a4a"; const px = W * (0.55 + r() * 0.3), py = H * (0.2 + r() * 0.2); g.fillRect(px - 10 * k, py, 20 * k, 2 * k); g.fillRect(px - 2 * k, py - 3 * k, 6 * k, 6 * k);
    } else { // les champs d'été et le ciel de cumulus
      sky(g, W, H, "#4aa3e0", "#dff3ff", 0);
      cloud(W * 0.35, H * 0.4, 1.3, "rgba(255,255,255,.95)"); cloud(W * 0.8, H * 0.28, 0.9, "rgba(255,255,255,.9)");
      for (let b = 0; b < 3; b++) { g.fillStyle = ["#7fc25a", "#5fa844", "#4a9038"][b]; g.beginPath(); g.ellipse(W * (0.2 + b * 0.35), H * (0.86 + b * 0.04), W * 0.45, H * (0.24 - b * 0.04), 0, Math.PI, 0); g.fill(); }
      g.fillStyle = "#4a9038"; g.fillRect(0, H * 0.9, W, H * 0.1);
      for (let i = 0; i < 30; i++) { g.fillStyle = i % 2 ? "#ffe066" : "#ffffff"; g.beginPath(); g.arc(r() * W, H * (0.8 + r() * 0.2), 1.2 * k, 0, Math.PI * 2); g.fill(); }
    }
  },
  // Gundam : l'espace et un décor par univers (c.sub)
  gundam(g, W, H, c, r) {
    const k = W / 180, s = c.sub;
    const space = (a, b, n = 60) => { sky(g, W, H, a, b, 0.2); for (let i = 0; i < n; i++) { g.fillStyle = rgba("#ffffff", 0.2 + r() * 0.8); const z = (0.4 + r() * 1.2) * k; g.fillRect(r() * W, r() * H, z, z); } };
    const beam = (col) => { const y0 = r() * H, y1 = r() * H; g.strokeStyle = rgba(col, 0.85); g.lineWidth = 2.2 * k; g.beginPath(); g.moveTo(-10, y0); g.lineTo(W + 10, y1); g.stroke(); glowDisk(g, W * 0.5, (y0 + y1) / 2, 18 * k, col, 0.35); };
    const planet = (x, y, R, a, b) => { const gr = g.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill(); };
    if (s === "Fédération") { space("#020614", "#0c1e44"); planet(W * 0.2, H * 1.05, H * 0.55, "#6fb6ff", "#123a7a"); beam("#ff5aa0"); beam("#6fe3ff"); }
    else if (s === "Zeon") {
      space("#08030a", "#2a0c12"); planet(W * 0.85, H * 0.2, 18 * k, "#ffd27a", "#7a4a1a");
      const cx = W * 0.45, cy = H * 0.55; g.save(); g.translate(cx, cy); g.rotate(-0.4); g.fillStyle = "#3a3f46"; g.fillRect(-55 * k, -9 * k, 110 * k, 18 * k);
      for (let i = 0; i < 3; i++) { g.fillStyle = rgba("#ffd27a", 0.5); g.fillRect(-50 * k + i * 36 * k, -3 * k, 26 * k, 6 * k); } g.restore();
      beam("#ff3b3b");
    } else if (s === "After Colony") { // le ciel bleu traversé de météores
      sky(g, W, H, "#0c2a5a", "#6fb6ff", 0.1);
      for (let i = 0; i < 5; i++) { const x = r() * W, y = r() * H * 0.6; g.strokeStyle = "rgba(255,240,200,.8)"; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 30 * k, y - 18 * k); g.stroke(); glowDisk(g, x, y, 6 * k, "#fff2c4", 0.9); }
      g.fillStyle = "#c9dcf0"; g.fillRect(0, H * 0.86, W, H * 0.14);
    } else if (s === "Cosmic Era") { // les colonies-sabliers de PLANT
      space("#020a10", "#0c3a34");
      for (let i = 0; i < 3; i++) { const x = W * (0.2 + i * 0.3), y = H * (0.35 + r() * 0.3), h = (26 + r() * 10) * k; g.fillStyle = "rgba(160,230,210,.55)"; g.beginPath(); g.moveTo(x - 9 * k, y - h); g.lineTo(x + 9 * k, y - h); g.lineTo(x + 1.5 * k, y); g.lineTo(x + 9 * k, y + h); g.lineTo(x - 9 * k, y + h); g.lineTo(x - 1.5 * k, y); g.closePath(); g.fill(); }
      beam("#5affc8");
    } else if (s === "Anno Domini") { // les particules GN
      space("#020812", "#0a2a3a", 30);
      for (let i = 0; i < 60; i++) glowDisk(g, W * (0.5 + Math.sin(i * 0.4) * 0.35) + (r() - 0.5) * 20 * k, (i / 60) * H, (2 + r() * 3) * k, "#7dffb8", 0.7);
      glowDisk(g, W * 0.5, H * 0.5, 40 * k, "#7dffb8", 0.25);
    } else if (s === "Post Disaster") { // le désert rouge de Mars
      sky(g, W, H, "#3a1208", "#c8642a", 0);
      planet(W * 0.75, H * 0.22, 10 * k, "#fff0c4", "#d9a441");
      for (let b = 0; b < 3; b++) { g.fillStyle = ["#a8441c", "#8a3414", "#6e2a10"][b]; g.beginPath(); g.ellipse(W * (b * 0.5), H * (0.86 + b * 0.04), W * 0.6, H * (0.2 - b * 0.03), 0, Math.PI, 0); g.fill(); g.fillRect(0, H * (0.86 + b * 0.04), W, H); }
    } else if (s === "Ad Stella") { // l'école en orbite, blanche et rose
      space("#0a0a1e", "#3a1a3a");
      const cx = W * 0.5, cy = H * 0.55; g.strokeStyle = "rgba(255,200,230,.75)"; g.lineWidth = 4 * k; g.beginPath(); g.ellipse(cx, cy, 60 * k, 16 * k, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#f2f2f8"; g.fillRect(cx - 8 * k, cy - 22 * k, 16 * k, 44 * k); glowDisk(g, cx, cy, 30 * k, "#ff9ad0", 0.3);
    } else { space("#02040c", "#141a3a", 80); planet(W * 0.7, H * 0.7, 30 * k, "#8fd3ff", "#1a3a7a"); beam("#ffd27a"); }
  },
  rings(g, W, H, c, r) {
    sky(g, W, H, "#0b1020", "#2a3346");
    for (let k = 0; k < 7; k++) { g.strokeStyle = rgba(k % 2 ? "#5ee1ff" : "#c084fc", 0.35 - k * 0.03); g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, H / 2, W * (0.08 + k * 0.07), H * (0.06 + k * 0.06), 0.3, 0, Math.PI * 2); g.stroke(); }
    glowDisk(g, W / 2, H / 2, H * 0.3, "#5ee1ff", 0.35);
  },
};

/* ------------------------------ médaillon ------------------------------ */
function medallion(g, cx, cy, R, d, c, tier) {
  // halo
  if (tier >= 2) glowDisk(g, cx, cy, R * 1.9, c.c, 0.45 + tier * 0.06);
  g.save();
  const sides = tier >= 3 ? 6 : 0;
  const shape = (rr) => { g.beginPath(); if (sides) { for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + (i / sides) * Math.PI * 2; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); } else g.arc(cx, cy, rr, 0, Math.PI * 2); };
  shape(R);
  const gr = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gr.addColorStop(0, mix(c.c2, "#000000", 0.25)); gr.addColorStop(1, mix(c.c2, c.c, 0.35));
  g.fillStyle = gr; g.fill();
  g.lineWidth = tier >= 4 ? 4 : 2.5; g.strokeStyle = tier >= 4 ? "#ffd166" : rgba(mix(c.c, "#ffffff", 0.3), 0.95); g.stroke();
  if (tier >= 4) { shape(R * 0.86); g.lineWidth = 1.2; g.strokeStyle = rgba("#fff3c4", 0.8); g.stroke(); }
  if (d.type === "char") {
    const t = initials(d.name);
    g.fillStyle = "#ffffff"; g.shadowColor = c.c; g.shadowBlur = tier >= 3 ? 14 : 6;
    g.font = `800 ${Math.round(R * (t.length > 1 ? 0.78 : 1))}px Sora, "Segoe UI", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(t, cx, cy + R * 0.04);
  } else {
    paintIcon(g, d.artIcon || TYPE_ICON[d.type] || "star", cx, cy, R * 1.1, { color: "#ffffff", stroke: 1.6, glow: tier >= 3 ? 10 : 0 });
  }
  g.restore();
}

/** Couleurs d'une carte : celles de sa famille (ou de son type Pokémon / sa région principale). `sub` : ce sous-groupe (décor). */
export function cardColors(d) {
  const f = FAMILY[d.type === "plot" ? d.univ : d.fam] || FAMILY.neutre || { color: "#a9b6cc", color2: "#2a3346", motif: "rings" };
  let c = f.color, c2 = f.color2;
  const tb = d.pt && d.pt.length ? subOf(d.fam, d.pt[0]) : null;
  if (tb) { c = tb.color; c2 = mix(c, "#0b1020", 0.72); }
  return { c, c2, motif: f.motif || "rings", sub: tb ? tb.id : null, tr: d.traits || [] };
}

/**
 * Illustration d'une carte (data URL JPEG, en cache). w×h en pixels CSS ; `full` : format pleine carte (Légendaires).
 * Renvoie null si le canvas n'est pas disponible (tests).
 */
export function cardArt(d, w = 160, h = 112, full = false) {
  if (typeof document === "undefined" || !d) return null;
  const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const key = `${d.id}|${w}x${h}|${full ? 1 : 0}|${dpr}`;
  if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return v; }
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return null;
  const r = rnd(hash(d.id));
  const c = cardColors(d);
  const tier = d.type === "plot" ? 2 : (RARITY[d.r] || RARITY.C).tier;
  (MOTIF[c.motif] || MOTIF.rings)(g, W, H, c, r);
  // la rareté : plus c'est rare, plus c'est riche
  if (tier <= 1) { g.fillStyle = "rgba(4,10,24,0.42)"; g.fillRect(0, 0, W, H); }
  if (tier >= 3) rays(g, W / 2, H * (full ? 0.36 : 0.5), Math.max(W, H), mix(c.c, "#ffffff", 0.4), 14, r, tier >= 4 ? 0.2 : 0.12);
  if (tier >= 4) { for (let i = 0; i < 26; i++) glowDisk(g, r() * W, r() * H, 1.5 + r() * 4 * dpr, i % 2 ? "#ffe9a8" : "#ffffff", 0.85); }
  if (tier >= 5) { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "rgba(255,209,102,0.25)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(192,132,252,0.28)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // médaillon
  const R = Math.min(W, H) * (full ? 0.2 : tier >= 4 ? 0.27 : 0.24);
  if (d.type !== "plot" && !d.noMedal) medallion(g, W / 2, full ? H * 0.34 : H * 0.52, R, d, c, tier);
  const url = cv.toDataURL("image/jpeg", 0.86);
  cache.set(key, url);
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return url;
}
