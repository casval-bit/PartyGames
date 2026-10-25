// Costumes d'animaux : leurs COUCHES d'épaisseur (ventres bombés, côtes, plumes, plaques, drap, ceintures, bottes…).
// Comme tout costume, elles se posent SUR le haricot sans rien changer au corps, aux jambes ni aux bras (voir layers.js).
import { layerKit, rnd, faceMask } from "./layers.js";
import { eulOf } from "./critter.js";

const TAU = Math.PI * 2;

/** Ventre en relief : même ovale que le dessin du ventre (animals.js), mais épais. top : distance sous l'équateur du dessin · w : demi-largeur du dessin (radians). */
function belly(ctx, L, color, top, w, off = 0.05) {
  return L.shell({ y0: 0.07, y1: ctx.prof.yc - top + 0.02, a0: -w * 0.9, a1: w * 0.9, off, eu: 0.3, ev: 0.22 }, color);
}

const LAYERS = {
  dino(ctx, L) {
    const { K, suit: { m } } = ctx, c = K.mixc(m, "#fff4d6", 0.65);
    belly(ctx, L, c, 0.55, 0.9);
    for (let i = 0; i < 6; i++) { const y = 0.17 + i * 0.1; L.shell({ y0: y - 0.016, y1: y + 0.016, a0: -0.7, a1: 0.7, off: 0.066, eu: 0.4, ev: 0.5 }, K.mixc(m, "#fff4d6", 0.38)); }   // plis du ventre
  },

  penguin(ctx, L) {
    belly(ctx, L, ctx.suit.a, 0.28, 1.1, 0.062);
  },

  chick(ctx, L) {
    const { K, suit: { m } } = ctx, light = K.mixc(m, "#fff", 0.55), s = belly(ctx, L, light, 0.5, 0.95, 0.05), R = rnd(3);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 7; i++) {                                                                  // duvet : écailles de plumes qui se chevauchent
      const lon = -0.74 + (i + (row % 2) * 0.5) * 0.22 + (R() - 0.5) * 0.04, y = 0.14 + row * 0.13;
      L.stud(lon, y, s(lon, y), 0.075, K.mixc(m, "#fff", 0.45 + (row % 2) * 0.12), { flat: 0.55, out: 0.006 });
    }
    for (const n of L.uparms) for (const [dy, len, rot] of [[-0.05, 0.2, 0.1], [-0.1, 0.17, 0.3], [-0.15, 0.13, 0.5]]) L.B(n).add(L.sph(0.04, 1, len / 0.04 * 0.5, 0.55, 8), K.shade(m, -0.06 - rot * 0.1), { p: [(n === "armA" ? -1 : 1) * (ctx.ar + 0.012), dy - len * 0.35, 0], r: [0, 0, (n === "armA" ? 1 : -1) * rot] });   // plumes le long du bras
  },

  frog(ctx, L) {
    const { K, suit: { m, a } } = ctx, s = belly(ctx, L, a, 0.6, 1.0, 0.05), R = rnd(11);
    for (let i = 0; i < 16; i++) { const lon = 0.8 + R() * (TAU - 1.6), y = 0.35 + R() * 0.9; L.stud(lon, y, ctx.prof.rAt(y) - 0.004, 0.03 + R() * 0.02, K.shade(m, -0.14), { flat: 0.8 }); }   // verrues
    for (let i = 0; i < 6; i++) { const lon = -0.7 + i * 0.28, y = 0.3 + (i % 2) * 0.12; L.stud(lon, y, s(lon, y), 0.045, K.shade(a, -0.1), { flat: 0.6, out: 0.004 }); }
  },

  bear(ctx, L) {
    const { K, suit: { m, a } } = ctx, hb = L.B("head");
    belly(ctx, L, a, 0.55, 1.0, 0.055);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hb.add(K.cone(0.055, 0.15, 5), K.shade(m, 0.04 * i), { p: [s * (0.435 - i * 0.015), -0.08 - i * 0.08, 0.17 + i * 0.03], r: [0.2, 0, s * (-1.35 + i * 0.2)] });   // touffes aux joues
  },

  robot(ctx, L) {
    const { K, suit: { m, a } } = ctx, tb = L.B("torso"), dk = K.shade(m, -0.2), { box, sph, cyl } = K;
    const plate = L.shell({ y0: 0.34, y1: 0.99, a0: -0.9, a1: 0.9, off: 0.05, eu: 0.12, ev: 0.12 }, K.shade(m, -0.06));                 // plastron
    L.shell({ y0: 0.18, y1: 0.3, off: 0.062, ev: 0.4 }, dk);                                                                            // ceinture
    for (const s of [-1, 1]) { tb.add(box(0.2, 0.26, 0.04, 0.015), dk, { p: L.pos(s * 0.45, 0.64, plate(s * 0.45, 0.64) + 0.01), r: [0, s * 0.45, 0] }); for (const y of [0.55, 0.73]) tb.add(sph(0.018, 1, 1, 1, 6), "#dfe5f0", { p: L.pos(s * 0.45 + s * 0.08, y, plate(s * 0.45, y) + 0.034), ink: false }); }   // panneaux et rivets
    L.pauldron({ r: 1.3, flat: 0.85, color: dk }); L.cuff({ at: 0.8, h: 0.075, grow: 0.034, color: dk });                              // épaules, poignets
    L.legSleeve({ h: 0.13, grow: 0.03, color: dk }); L.legBand(0.14, a, { grow: 0.036, t: 0.016 });                                    // chevilles
  },

  ghost(ctx, L) {
    const { K, prof, suit: { m } } = ctx, yc = prof.yc;
    L.shell({ y0: 0, y1: yc - 0.3, off: 0.06, ev: 0.22, wave: { k: 7, amp: 0.11 } }, m);                                              // le drap, ourlet festonné
    L.shell({ y0: yc - 0.42, y1: yc + 0.4, a0: 0.95, a1: TAU - 0.95, off: 0.05, eu: 0.22, ev: 0.2 }, m);                                // capuche du drap autour du visage
    for (const c of [0.85, 2.2, 3.7, 5.2]) L.shell({ y0: 0.14, y1: yc - 0.36, a0: c - 0.1, a1: c + 0.1, off: 0.03, eu: 0.5, ev: 0.3 }, K.shade(m, -0.06));   // plis
    L.sleeve({ grow: 0.02, flare: 0.02, color: m });                                                                                   // manches de drap
  },

  shark(ctx, L) {
    const { K, suit: { m, a } } = ctx, dk = K.shade(m, -0.25);
    belly(ctx, L, a, 0.24, 1.15, 0.05);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const c = s * (1.18 + i * 0.1); L.shell({ y0: 0.62, y1: 0.94 - i * 0.04, a0: c - 0.022, a1: c + 0.022, off: 0.028, eu: 0.5, ev: 0.4 }, dk); }   // branchies
  },

  alien(ctx, L) {
    const { K, suit: { m, a } } = ctx, tb = L.B("torso");
    L.shell({ y0: 0.88, y1: 0.98, off: 0.045, ev: 0.4 }, K.shade(m, 0.12)); L.shell({ y0: 0.6, y1: 0.68, off: 0.04, ev: 0.4 }, K.shade(m, 0.12));   // anneaux du corps
    tb.add(L.sph(0.065, 1, 1, 0.7, 12), a, { p: L.pos(0, 0.78, ctx.prof.rAt(0.78) + 0.02), basic: true });                              // gemme lumineuse
    L.cuff({ at: 0.8, h: 0.05, grow: 0.032, color: a });
  },

  cactus(ctx, L) {
    const { K, prof, suit: { m } } = ctx, yc = prof.yc, tb = L.B("torso");
    const r = L.shell({ y0: 0.04, y1: yc + 0.36, off: 0.012, lobes: { n: 10, amp: 0.036 }, ev: 0.16, mask: faceMask(yc) }, m);          // côtes en relief : une coque continue, creux sur les traits peints
    for (let k = 0; k < 10; k++) for (let y = 0.2; y < 1.0; y += 0.13) {                                                                 // piquants posés sur le haut des côtes
      const lon = ((k + 0.5) / 10) * TAU + (((y * 100) | 0) % 2) * 0.05, n = L.normal(lon, y);
      tb.add(K.cone(0.011, 0.07, 5), "#f6f1e4", { p: L.pos(lon, y, r(lon, y) - 0.004), r: eulOf(K, n) });
    }
  },

  mushroom(ctx, L) {
    const { K } = ctx;
    L.shell({ y0: 0.82, y1: 0.97, off: 0.09, ev: 0.35 }, "#fff6e2");                                                                    // collerette du pied
    L.B("head").add(K.tor(0.66, 0.04, TAU, 30), K.shade(ctx.suit.a, -0.2), { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0], ink: false });      // bord épais du chapeau
  },

  snowman(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), yc = prof.yc;
    const bump = L.shell({ y0: 0.04, y1: 0.82, off: 0.06, ev: 0.3 }, m);                                                                // la grosse boule du bas
    for (const y of [0.68, 0.5, 0.32]) tb.add(K.sph(0.05, 1, 1, 0.7, 10), a, { p: L.pos(0, y, bump(0, y) + 0.008) });                   // boutons de charbon
    L.shell({ y0: yc - 0.42, y1: yc - 0.26, off: 0.06, ev: 0.35 }, "#e23a3a");                                                          // écharpe
    tb.add(K.box(0.1, 0.26, 0.04, 0.02), "#c9302c", { p: L.pos(-0.5, yc - 0.52, prof.rAt(yc - 0.52) + 0.05), r: [0, -0.5, 0.08] });
  },

  pumpkin(ctx, L) {
    const { K, prof, suit: { m } } = ctx, yc = prof.yc;
    L.shell({ y0: 0.04, y1: yc + 0.36, off: 0.012, lobes: { n: 8, amp: 0.04 }, ev: 0.16, mask: faceMask(yc) }, K.mixc(m, "#ff6a00", 0.4));                       // côtes de la citrouille : une coque continue
  },
};

export function decorAnimal(ctx) {
  const f = LAYERS[ctx.suit.id]; if (!f) return;
  f(ctx, layerKit(ctx));
}
