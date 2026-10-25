// Les COSTUMES D'ANIMAUX (dino, pingouin, robot, citrouille…) : de simples costumes posés sur le haricot.
// RÈGLE ABSOLUE : un costume ne change JAMAIS la taille ni les proportions du personnage (corps, jambes, bras et mains restent exactement ceux du haricot, voir body.js).
// Un costume n'a donc le droit qu'à : des couleurs (m = principale, a = détails), de la peinture sur la texture du corps (paint / paintTop),
// de petits volumes décoratifs (decor : oreilles, crête, bec, antennes… · tail : queue), quelques traits du visage imposés (face / faceC), la couleur des jambes et des bras.
//
// m, a      : couleurs d'origine (le joueur peut les changer : Couleur du costume / Détails du costume)
// limb      : couleur des bras et des jambes ("m", "a" ou #hex) · legs : couleur des jambes si elle diffère (ex. pattes orange du pingouin)
// face      : traits du visage imposés par le costume (ex. la grenouille a de vrais yeux en volume, donc pas d'yeux peints) · faceC : teinte de la plaque du visage
// impliedNose / noseK : nez, bec ou museau offert par le costume (et son échelle)
import { PX, PY, KP, EQ, TEX_W } from "./head.js";
import { eulOf } from "./critter.js";

const W = TEX_W;
const INK = "#1b1426", CREAM = "#f6f1e4";
const row = (a) => EQ + a * KP;
const bk = (ctx, name) => (ctx.B[name] ||= new ctx.K.Bucket());

/** Ventre clair : ovale vertical qui part sous le visage (top, en unités sous l'équateur) et descend jusqu'au bas du corps. w : demi-largeur (radians). */
function belly(g, H, c, top = 0.5, w = 0.8, soft = true) {
  const y0 = row(top), ry = (H - y0) / 2 + 24, cy = y0 + ry - 12;
  g.save(); g.fillStyle = c; g.beginPath(); g.ellipse(W / 2, cy, (w * KP) / 2, ry, 0, 0, 7); g.fill();
  if (soft) { g.globalAlpha = 0.25; g.strokeStyle = "#000"; g.lineWidth = 3; g.stroke(); }
  g.restore();
}

export const ANIMALS = {
  /* ─────────────── Dino : dos à piques, grosse queue ─────────────── */
  dino: {
    name: "Dino", lv: 0, m: "#2fcf63", a: "#ff9f1c", limb: "m",
    paint(g, ctx, H) {
      const { K, suit: { m } } = ctx;
      belly(g, H, K.mixc(m, "#fff4d6", 0.65), 0.55, 0.9);
      for (let i = 0; i < 7; i++) { g.fillStyle = K.shade(m, -0.12); g.beginPath(); g.ellipse(i * 40 + 20, row(0.6) + (i % 3) * 40, 14, 20, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(W - 40 - i * 40, row(0.7) + (i % 2) * 50, 14, 20, 0, 0, 7); g.fill(); }
    },
    decor(ctx) {
      const { K, prof, suit: { m, a } } = ctx, T = bk(ctx, "torso"), Hd = bk(ctx, "head"), dk = K.shade(m, -0.2);
      for (let i = 0; i < 8; i++) { const y = prof.yc + 0.3 - i * 0.2, z = -prof.rAt(Math.max(prof.hb + 0.1, y)) * 0.97; T.add(K.cone(0.13 - i * 0.008, 0.3 - i * 0.02, 4), a, { p: [0, y, z], r: [-1.0 - i * 0.07, 0, 0], s: [1, 1, 0.6] }); }
      for (const s of [-1, 1]) Hd.add(K.sph(0.05, 1, 1, 0.7), dk, { p: [s * 0.11, -0.12, 0.47] });      // narines
      for (let i = 0; i < 4; i++) { const ph = 0.95 + i * 0.4, d = [0, Math.sin(ph), Math.cos(ph)]; Hd.add(K.cone(0.1 - i * 0.012, 0.26 - i * 0.03, 4), a, { p: [0, d[1] * 0.5, d[2] * 0.5], r: eulOf(K, d), s: [1, 1, 0.6] }); }
      for (const s of [-1, 1]) Hd.add(K.cone(0.055, 0.2, 6), "#fff4d6", { p: [s * 0.4, 0.2, 0.24], r: [0.5, 0, -s * 0.5] });                          // petites cornes de joue
    },
    tail(ctx) {
      const { K, suit: { m, a } } = ctx, tb = bk(ctx, "tail");
      for (let i = 0; i < 8; i++) { const t = i / 7, r = 0.3 * (1 - t * 0.86), y = t * t * 0.3, z = -0.1 - t * 0.7; tb.add(K.sph(r, 1, 1, 1.35, 14), m, { p: [0, y, z], ink: false }); if (i < 7) tb.add(K.cone(0.07, 0.15, 4), a, { p: [0, y + r * 0.95, z], r: [-0.3, 0, 0], s: [1, 1, 0.6] }); }
    },
  },

  /* ─────────────── Pingouin : ventre blanc, pattes orange, bec ─────────────── */
  penguin: {
    name: "Pingouin", lv: 0, m: "#1f1d27", a: "#f6f3ec", limb: "m", legs: "#ff9f1f",
    impliedNose: "beak", noseK: 1.35,
    paint(g, ctx, H) { belly(g, H, ctx.suit.a, 0.28, 1.1); },
    tail(ctx) { const { K, suit: { m } } = ctx; bk(ctx, "tail").add(K.cone(0.16, 0.3, 4), m, { p: [0, 0.0, -0.16], r: [-1.9, 0, 0], s: [1.4, 1, 0.5] }); },
  },

  /* ─────────────── Poussin : tout jaune, houppette, pattes orange ─────────────── */
  chick: {
    name: "Poussin", lv: 0, m: "#ffd23a", a: "#ff9f1c", limb: "m", legs: "#ff9f1f",
    impliedNose: "beak", noseK: 1.2,
    paint(g, ctx, H) { belly(g, H, ctx.K.mixc(ctx.suit.m, "#fff", 0.55), 0.5, 0.95); },
    decor(ctx) { const { K, suit: { m } } = ctx, Hd = bk(ctx, "head"); for (const [x, ang, h] of [[-0.07, 0.35, 0.2], [0, 0, 0.28], [0.08, -0.35, 0.2]]) Hd.add(K.sph(0.045, 1, 3.6 * h / 0.2 * 0.5, 0.7), m, { p: [x * 1.3, 0.52 + h * 0.3, 0.03], r: [0, 0, ang] }); },
    tail(ctx) { const { K, suit: { m } } = ctx, tb = bk(ctx, "tail"); for (const [ang, h] of [[-0.45, 0.2], [0, 0.26], [0.45, 0.2]]) tb.add(K.sph(0.05, 1, h / 0.05 * 0.5, 0.7), m, { p: [Math.sin(ang) * 0.1, 0.1 + h * 0.4, -0.14], r: [-0.5, 0, -ang] }); },
  },

  /* ─────────────── Grenouille : gros yeux sur la tête, grande bouche ─────────────── */
  frog: {
    name: "Grenouille", lv: 0, m: "#b6e43a", a: "#f1d9b5", limb: "m",
    face: { eyes: "none", patch: "none", brow: "none", mouth: "none" },
    paint(g, ctx, H) {
      const { K, suit: { m, a } } = ctx;
      belly(g, H, a, 0.6, 1.0); g.fillStyle = K.shade(m, -0.14); for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(80 + i * 70, row(0.7) + ((i * 37) % 80), 22, 16, 0, 0, 7); g.fill(); }
    },
    paintTop(g) {   // grande bouche qui fait presque le tour de la face
      g.save(); g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath();
      for (let i = 0; i <= 24; i++) { const t = i / 24, x = -0.3 + 0.6 * t, y = -0.1 - Math.sin(t * Math.PI) * 0.085; (i ? g.lineTo : g.moveTo).call(g, PX(x, y), PY(y)); }
      g.stroke(); g.fillStyle = INK; for (const s of [-1, 1]) { g.beginPath(); g.arc(PX(s * 0.04, 0.0), PY(0.0), 4, 0, 7); g.fill(); } g.restore();
    },
    decor(ctx) {
      const { K, col, suit: { m } } = ctx, Hd = bk(ctx, "head");
      for (const s of [-1, 1]) {
        Hd.add(K.sph(0.17, 1, 1, 1), m, { p: [s * 0.2, 0.4, 0.22] });
        Hd.add(K.sph(0.125, 1, 1, 0.9), "#ffffff", { p: [s * 0.215, 0.43, 0.33] });
        Hd.add(K.sph(0.065, 1, 1.15, 0.6), col.eye, { p: [s * 0.215, 0.43, 0.43] });
        Hd.add(K.sph(0.018, 1, 1, 1), "#fff", { p: [s * 0.2, 0.46, 0.475], ink: false });
      }
    },
  },

  /* ─────────────── Ours : oreilles rondes, ventre clair, truffe ─────────────── */
  bear: {
    name: "Ours", lv: 0, m: "#8a5a38", a: "#f1d9b5", limb: "m",
    impliedNose: "dog",
    paint(g, ctx, H) { belly(g, H, ctx.suit.a, 0.55, 1.0); },
    decor(ctx) {
      const { K, suit: { m } } = ctx, Hd = bk(ctx, "head"), inner = K.mixc(m, "#ffb3c8", 0.6);
      for (const s of [-1, 1]) { Hd.add(K.sph(0.17, 1, 1, 0.65), m, { p: [s * 0.36, 0.38, -0.03] }); Hd.add(K.sph(0.1, 1, 1, 0.5), inner, { p: [s * 0.36, 0.38, 0.05], ink: false }); }
    },
    tail(ctx) { const { K, suit: { m } } = ctx; bk(ctx, "tail").add(K.sph(0.16, 1, 1, 1), m, { p: [0, 0.05, -0.1] }); },
  },

  /* ─────────────── Robot : panneaux, voyants, antenne, écran-visage ─────────────── */
  robot: {
    name: "Robot", lv: 2, m: "#aab0bd", a: "#22c8d8", limb: "#8f98ab",
    face: { patch: "wide", mouth: "none", brow: "none", eyes: "robot" }, faceC: "#1b2733",
    paint(g, ctx, H) {
      const { K, suit: { m, a } } = ctx, dk = K.shade(m, -0.2);
      g.save(); g.strokeStyle = dk; g.lineWidth = 5;
      for (let i = 0; i < 4; i++) { const x = (i * W) / 4; g.beginPath(); g.moveTo(x, row(0.3)); g.lineTo(x, H); g.stroke(); }
      for (let i = 0; i < 4; i++) { const cx = (i * W) / 4 + W / 8; g.fillStyle = K.shade(m, -0.08); g.fillRect(cx - 60, row(0.62), 120, 150); g.strokeRect(cx - 60, row(0.62), 120, 150); }
      g.fillStyle = a; g.fillRect(W / 2 - 48, row(0.7), 96, 22); g.fillStyle = "#ff5a5a"; g.beginPath(); g.arc(W / 2 - 30, row(0.96), 9, 0, 7); g.fill(); g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(W / 2, row(0.96), 9, 0, 7); g.fill(); g.fillStyle = "#6bff6b"; g.beginPath(); g.arc(W / 2 + 30, row(0.96), 9, 0, 7); g.fill();
      g.restore();
    },
    decor(ctx) {
      const { K, suit: { m, a } } = ctx, Hd = bk(ctx, "head");
      Hd.add(K.cyl(0.018, 0.018, 0.2, 8), "#8f98ab", { p: [0, 0.58, 0], ink: false }); Hd.add(K.sph(0.065, 1, 1, 1), a, { p: [0, 0.71, 0], basic: true });
      for (const s of [-1, 1]) { Hd.add(K.cyl(0.1, 0.1, 0.14, 14), K.shade(m, -0.25), { p: [s * 0.49, 0.04, 0], r: [0, 0, Math.PI / 2] }); Hd.add(K.cyl(0.045, 0.045, 0.16, 10), "#8f98ab", { p: [s * 0.49, 0.04, 0], r: [0, 0, Math.PI / 2], ink: false }); }
    },
  },

  /* ─────────────── Fantôme : drap blanc, grands yeux ronds, bouche en O ─────────────── */
  ghost: {
    name: "Fantôme", lv: 3, m: "#f4f6ff", a: "#cfd6e2", limb: "m",
    face: { eyes: "none", mouth: "none", patch: "none", brow: "none" },
    paintTop(g) {   // grands yeux noirs et bouche en O
      g.save(); g.fillStyle = "#14101c";
      for (const [x, y, rx, ry] of [[-0.125, 0.045, 0.058, 0.105], [0.125, 0.045, 0.058, 0.105], [0, -0.115, 0.04, 0.065]]) {
        g.beginPath(); for (let i = 0; i <= 28; i++) { const t = (i / 28) * Math.PI * 2, px = PX(x + Math.cos(t) * rx, y + Math.sin(t) * ry), py = PY(y + Math.sin(t) * ry); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill();
      }
      g.fillStyle = "#fff"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(PX(s * 0.125 - 0.012, 0.09), PY(0.09), 5, 8, 0, 0, 7); g.fill(); }
      g.restore();
    },
    paint(g, ctx, H) {
      const { suit: { a } } = ctx, y0 = row(Math.max(0.9, ctx.prof.below - 0.3));
      g.save(); g.fillStyle = a; g.globalAlpha = 0.4; for (let i = 0; i < 6; i++) g.fillRect(i * (W / 6) + 20, row(0.55), 26, H);        // plis du drap
      g.globalAlpha = 0.55; for (let x = 0; x < W + 64; x += 64) { g.beginPath(); g.arc(x, y0, 32, 0, Math.PI); g.fill(); } g.fillRect(0, y0 - 2, W, H - y0 + 2);   // ourlet festonné
      g.restore();
    },
    decor(ctx) { const { K, suit: { m } } = ctx, Hd = bk(ctx, "head"); Hd.add(K.cone(0.06, 0.22, 8), m, { p: [0.02, 0.58, 0], r: [0, 0, -0.5] }); },        // petite mèche de drap
  },

  /* ─────────────── Requin : ventre blanc, branchies, aileron dorsal et de queue ─────────────── */
  shark: {
    name: "Requin", lv: 4, m: "#4fb6ff", a: "#f6f3ec", limb: "m",
    paint(g, ctx, H) {
      const { K, suit: { m, a } } = ctx;
      belly(g, H, a, 0.24, 1.15); g.save(); g.strokeStyle = K.shade(m, -0.25); g.lineWidth = 6; g.lineCap = "round";
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = W / 2 + s * 250 + (s * i * 14); g.beginPath(); g.moveTo(x, row(0.8) + i * 6); g.quadraticCurveTo(x + s * 14, row(0.95), x, row(1.15) - i * 6); g.stroke(); }
      g.restore();
    },
    decor(ctx) {
      const { K, prof, suit: { m } } = ctx, T = bk(ctx, "torso"), d = K.shade(m, -0.14), yc = prof.yc;
      T.add(K.poly([[-0.2, 0], [0.18, 0], [0.04, 0.5], [-0.1, 0.54]], 0.06), d, { p: [0, yc - 0.02, -prof.rAt(yc - 0.02) * 0.82], r: [0, Math.PI / 2, 0] });
      bk(ctx, "head").add(K.poly([[-0.2, 0], [0.18, 0], [0.04, 0.34], [-0.08, 0.38]], 0.05), d, { p: [0, 0.44, -0.03], r: [-0.55, Math.PI / 2, 0] });       // aileron sur la tête, penché vers l'arrière
    },
    tail(ctx) { const { K, suit: { m } } = ctx, d = K.shade(m, -0.14); bk(ctx, "tail").add(K.poly([[0, 0], [0.38, 0.32], [0.12, 0.02], [0.34, -0.3]], 0.05), d, { p: [0, 0.18, -0.1], r: [0, Math.PI / 2, 0] }); },
  },

  /* ─────────────── Alien : grands yeux noirs en amande, antennes ─────────────── */
  alien: {
    name: "Alien", lv: 5, m: "#9b5cf0", a: "#e5dcff", limb: "m",
    face: { eyes: "none", patch: "none", brow: "none", mouth: "none" },
    paintTop(g, ctx) {
      g.save();
      for (const s of [-1, 1]) {
        const pts = []; for (let i = 0; i <= 30; i++) { const t = (i / 30) * Math.PI * 2, ex = Math.cos(t) * 0.085, ey = Math.sin(t) * 0.14, an = s * 0.5; pts.push([s * 0.13 + ex * Math.cos(an) - ey * Math.sin(an), 0.04 + ex * Math.sin(an) + ey * Math.cos(an)]); }
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(PX(x, y), PY(y)) : g.moveTo(PX(x, y), PY(y)))); g.closePath(); g.fillStyle = "#07060a"; g.fill();
        g.globalAlpha = 0.9; g.fillStyle = "#fff"; g.beginPath(); g.ellipse(PX(s * 0.13 - s * 0.012, 0.085), PY(0.085), 7, 10, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      }
      g.strokeStyle = ctx.K.shade(ctx.suit.m, -0.3); g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(PX(-0.04, -0.12), PY(-0.12)); g.quadraticCurveTo(PX(0, -0.14), PY(-0.14), PX(0.04, -0.12), PY(-0.12)); g.stroke(); g.restore();
    },
    decor(ctx) {
      const { K, suit: { m, a } } = ctx, Hd = bk(ctx, "head");
      for (const s of [-1, 1]) { Hd.add(K.cyl(0.014, 0.018, 0.3, 6), K.shade(m, -0.1), { p: [s * 0.14, 0.64, 0.02], r: [0.1, 0, -s * 0.28], ink: false }); Hd.add(K.sph(0.055, 1, 1, 1), a, { p: [s * 0.215, 0.8, 0.05], basic: true }); }
    },
  },

  /* ─────────────── Cactus : côtes peintes, piquants, fleur sur la tête, pattes de pot ─────────────── */
  cactus: {
    name: "Cactus", lv: 6, m: "#2f8f4a", a: "#ff6fae", limb: "m", legs: "#b5653a",
    paint(g, ctx, H) {
      const { K, suit: { m } } = ctx;
      g.save(); g.strokeStyle = K.shade(m, -0.16); g.lineWidth = 5; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(i * W / 10, 0); g.lineTo(i * W / 10, H); g.stroke(); }
      g.fillStyle = CREAM; for (let i = 0; i < 90; i++) { const x = ((i * 97) % W), y = row(0.35) + ((i * 53) % (H - row(0.35))); g.fillRect(x, y, 2, 7); g.fillRect(x - 3, y + 2, 8, 2); }
      g.restore();
    },
    decor(ctx) {
      const { K, suit: { a } } = ctx, Hd = bk(ctx, "head");
      for (let i = 0; i < 6; i++) { const an = (i / 6) * 6.283; Hd.add(K.sph(0.085, 1, 0.55, 1, 8), a, { p: [Math.sin(an) * 0.1, 0.52, Math.cos(an) * 0.1], r: [Math.cos(an) * 0.9, 0, -Math.sin(an) * 0.9] }); }
      Hd.add(K.sph(0.06, 1, 0.8, 1), "#ffd23a", { p: [0, 0.55, 0], ink: false });
    },
  },

  /* ─────────────── Champignon : chapeau rouge à pois blancs ─────────────── */
  mushroom: {
    name: "Champignon", lv: 7, m: "#f1d9b5", a: "#f0373f", limb: "m",
    decor(ctx) {
      const { K, suit: { a } } = ctx, Hd = bk(ctx, "head"), cap = a, dk = K.shade(cap, -0.16), RC = 0.66;
      Hd.add(K.dome(RC, 1, 0.62, 1, 28), cap, { p: [0, 0.2, 0] });
      Hd.add(K.cyl(RC, RC, 0.02, 28), "#fff0d0", { p: [0, 0.2, 0], ink: false });
      Hd.add(K.cyl(RC + 0.005, RC + 0.005, 0.05, 28), dk, { p: [0, 0.22, 0], ink: false });
      const q = RC / 0.8;
      for (const [x0, z0, r0] of [[0, 0.58, 0.1], [-0.34, 0.42, 0.075], [0.36, 0.4, 0.085], [-0.52, 0, 0.09], [0.55, -0.05, 0.1], [0, -0.55, 0.11], [-0.3, -0.42, 0.08], [0.3, -0.44, 0.085], [-0.18, 0.0, 0.1], [0.2, 0.18, 0.07]]) {
        const x = x0 * q, z = z0 * q, y = 0.2 + RC * 0.62 * Math.sqrt(Math.max(0.001, 1 - (x * x + z * z) / (RC * RC))) - 0.02;
        Hd.add(K.sph(r0 * q, 1, 0.35, 1, 10), "#ffffff", { p: [x, y, z], ink: false });
      }
    },
  },

  /* ─────────────── Bonhomme de neige : blanc, boutons de charbon, nez-carotte ─────────────── */
  snowman: {
    name: "Bonhomme de neige", lv: 8, m: "#f6f3ec", a: "#1d1a24", limb: "m",
    impliedNose: "carrot",
    paint(g, ctx) {
      const { K, suit: { m, a } } = ctx;
      g.save(); g.fillStyle = K.shade(m, -0.1); g.globalAlpha = 0.5; g.fillRect(0, row(0.28), W, 26); g.globalAlpha = 0.25; g.fillRect(0, row(0.28) + 26, W, 22);     // creux entre les deux « boules »
      g.globalAlpha = 1; g.fillStyle = a; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(W / 2, row(0.6) + i * 84, 14, 0, 7); g.fill(); }
      g.restore();
    },
  },

  /* ─────────────── Citrouille : côtes peintes, tige et feuille, lueur de lanterne ─────────────── */
  pumpkin: {
    name: "Citrouille", lv: 9, m: "#ff9f1c", a: "#2f8f4a", limb: "a", faceC: "#f6e7a8",
    paint(g, ctx, H) {
      const { K, suit: { m } } = ctx;
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? K.shade(m, -0.08) : K.shade(m, 0.05); g.fillRect(i * 128, 0, 128, H); g.strokeStyle = K.shade(m, -0.28); g.lineWidth = 4; g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, H); g.stroke(); }
    },
    decor(ctx) {
      const { K, suit: { a } } = ctx, Hd = bk(ctx, "head");
      Hd.add(K.cyl(0.055, 0.085, 0.2, 8), a, { p: [0, 0.57, 0] });
      Hd.add(K.tor(0.14, 0.028, Math.PI * 1.4, 10), K.shade(a, 0.1), { p: [0.1, 0.66, 0], r: [0, 0, 0.5], ink: false });
      Hd.add(K.sph(0.16, 1.3, 0.2, 0.8), K.shade(a, 0.08), { p: [-0.16, 0.5, -0.1], r: [0.2, 0.4, 0.4] });
    },
  },
};

export const ANIMAL_IDS = Object.keys(ANIMALS);
