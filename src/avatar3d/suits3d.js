// Costumes (hors animaux) : leurs volumes. Tout est posé SUR le corps du haricot, qui ne change pas (voir layers.js) :
// coques épaisses (pain du hot-dog, armure, combinaison…), bagues et manchettes sur les membres, petits reliefs (boutons, graines, rivets).
import { layerKit, rnd } from "./layers.js";

const CREAM = "#f6f1e4", GOLD = "#f2c230", METAL = "#aeb6c8", DARKM = "#8f98ab";
const TAU = Math.PI * 2;

const SUITS = {
  hotdog(ctx, L) {
    const { prof, suit: { m, a } } = ctx, tb = L.B("torso"), { sph } = L, R = rnd(7);
    const bun = L.shell({ y0: 0.06, y1: 1.62, a0: 0.62, a1: TAU - 0.62, off: 0.085, eu: 0.28, ev: 0.2 }, a);                       // le pain, enroulé autour de la saucisse
    const sau = L.shell({ y0: 0.1, y1: 1.0, a0: -0.62, a1: 0.62, off: 0.05, eu: 0.4, ev: 0.25 }, m);                                // la saucisse
    for (let i = 0; i < 15; i++) { const y = 0.17 + i * 0.05, lon = i % 2 ? 0.2 : -0.2; tb.add(sph(0.032, 1, 1, 1, 8), "#ffd23a", { p: L.pos(lon, y, sau(lon, y) + 0.008) }); }   // moutarde en zigzag
    for (let i = 0; i < 22; i++) { const lon = 0.95 + R() * (TAU - 1.9), y = 0.4 + R() * 1.1; L.stud(lon, y, bun(lon, y) - 0.004, 0.026, CREAM, { sx: 1.7, flat: 0.5 }); }   // graines de sésame
  },

  banana(ctx, L) {
    const { K, suit: { m, a } } = ctx, hb = L.B("head"), { cone, cyl, sph } = K;
    for (const c of [-2.35, -0.82, 0.82, 2.35]) L.shell({ y0: 0.05, y1: 1.62, a0: c - 0.11, a1: c + 0.11, off: 0.042, eu: 0.5, ev: 0.2 }, K.shade(m, -0.08));   // les côtes de la banane
    hb.add(cone(0.1, 0.2, 10), a, { p: [0, 0.54, 0] }); hb.add(cyl(0.07, 0.09, 0.16, 10), a, { p: [0, 0.6, 0] }); hb.add(sph(0.075, 1, 0.7, 1, 10), K.shade(a, -0.2), { p: [0, 0.69, 0] });   // la queue
  },

  taco(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), { sph } = K, yc = prof.yc;
    const shellR = L.shell({ y0: 0.06, y1: 1.5, a0: 0.55, a1: TAU - 0.55, off: 0.075, eu: 0.25, ev: 0.2 }, m);                     // la galette repliée
    L.shell({ y0: 0.12, y1: 0.95, a0: -0.52, a1: 0.52, off: 0.032, eu: 0.4, ev: 0.25 }, "#8a4b2a");                                   // la viande
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) { const y = 0.14 + i * 0.075, lon = s * (0.6 + 0.05 * Math.sin(i * 2.1)); L.stud(lon, y, shellR(lon, y), 0.062, i % 2 ? "#5fbf4a" : "#8fdc5a", { flat: 0.8, out: 0.03 }); }   // salade qui dépasse
    for (let i = 0; i < 10; i++) { const t = (i / 10) * TAU; tb.add(sph(0.12, 1, 0.8, 1, 8), i % 3 === 0 ? "#e23a3a" : i % 3 === 1 ? a : "#ffd23a", { p: [Math.sin(t) * 0.38, yc + 0.28 + Math.sin(i * 2) * 0.04, Math.cos(t) * 0.38] }); }
  },

  bee(ctx, L) {
    const { K, suit: { m, a } } = ctx, tb = L.B("torso"), hb = L.B("head"), yc = ctx.prof.yc, { sph, cap, cone } = K;
    for (const [y0, y1] of [[0.74, 0.9], [0.38, 0.54], [0.02, 0.18]]) L.shell({ y0, y1, off: 0.04, ev: 0.3 }, a);                   // les rayures en relief
    L.shell({ y0: 0.93, y1: 1.07, off: 0.05, ev: 0.35 }, K.shade(m, 0.18));                                                           // collerette duveteuse
    for (const s of [-1, 1]) {
      tb.add(sph(0.28, 0.35, 1.1, 0.6), "#bfe6ff", { p: [s * 0.3, yc - 0.12, -0.5], r: [0.3, 0, s * 0.5], opacity: 0.75, ink: true });
      hb.add(cap(0.012, 0.3, 5), a, { p: [s * 0.12, 0.62, 0.1], r: [0.2, 0, -s * 0.3] }); hb.add(sph(0.04, 1, 1, 1), a, { p: [s * 0.17, 0.78, 0.13] });
    }
    tb.add(cone(0.07, 0.2, 8), a, { p: [0, 0.34, -0.6], r: [-1.9, 0, 0] });
  },

  astro(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), hb = L.B("head"), yc = prof.yc, { sph, cap, box } = K;
    hb.add(sph(0.64, 1, 1, 1, 24), "#bfe6ff", { opacity: 0.22, ink: true, inkw: 0.014 });                                              // bulle du casque
    const suitR = L.shell({ y0: 0, y1: yc - 0.3, off: 0.036, ev: 0.22 }, m);                                                           // la combinaison, légèrement matelassée
    L.belt(yc - 0.36, 0.565, 0.05, METAL);                                                                                             // bague du casque
    L.shell({ y0: 0.3, y1: 0.42, off: 0.05, ev: 0.4 }, METAL);                                                                         // ceinture
    tb.add(box(0.34, 0.24, 0.07, 0.03), DARKM, { p: [0, 0.72, suitR(0, 0.72) + 0.02] });                                              // boîtier de commandes
    for (const [x, c] of [[-0.09, "#52f0ff"], [0, GOLD], [0.09, a]]) tb.add(sph(0.024, 1, 1, 0.8, 8), c, { p: [x, 0.74, suitR(0, 0.72) + 0.065], ink: false });
    tb.add(box(0.4, 0.5, 0.16, 0.05), METAL, { p: [0, yc - 0.55, -0.58] }); tb.add(cap(0.012, 0.3, 5), a, { p: [0.12, yc - 0.2, -0.58] }); tb.add(sph(0.035, 1, 1, 1), a, { p: [0.12, yc - 0.04, -0.58], ink: false });   // sac à dos + antenne
    L.pauldron({ r: 1.15, flat: 0.8, color: m }); L.cuff({ at: 0.78, h: 0.08, grow: 0.04, color: METAL });                            // épaules, gants
    L.legSleeve({ h: 0.2, grow: 0.034, color: m }); L.legBand(0.21, METAL);                                                            // bottes
  },

  ninja(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), hb = L.B("head"), yc = prof.yc, { box, tor, sph } = K;
    L.shell({ y0: yc - 0.2, y1: 1.78, a0: 0.75, a1: TAU - 0.75, off: 0.04, eu: 0.25, ev: 0.2 }, m);                                    // capuche (ouverte sur le visage)
    hb.add(tor(0.435, 0.032, TAU, 28), a, { p: [0, 0.3, -0.01], r: [Math.PI / 2 + 0.1, 0, 0], ink: false });                            // bandeau
    hb.add(sph(0.06, 1, 1, 0.8, 10), a, { p: [0, 0.3, -0.46] });
    for (const s of [-1, 1]) hb.add(box(0.07, 0.3, 0.025, 0.012), a, { p: [s * 0.07, 0.16, -0.5], r: [-0.15, 0, s * 0.35] });             // pans du bandeau
    L.shell({ y0: 0.26, y1: 0.4, off: 0.055, ev: 0.4 }, a);                                                                            // ceinture
    tb.add(box(0.11, 0.1, 0.07, 0.03), K.shade(a, -0.15), { p: L.pos(-0.38, 0.33, prof.rAt(0.33) + 0.075) });                          // nœud
    for (const s of [-1, 1]) tb.add(box(0.05, 0.22, 0.02, 0.01), a, { p: L.pos(-0.38, 0.2, prof.rAt(0.22) + 0.07), r: [0, -0.38, s * 0.28] });
    L.cuff({ at: 0.72, h: 0.1, grow: 0.026, color: a }); L.legBand(0.1, a, { grow: 0.03, t: 0.03 });                                   // bandes aux poignets et aux chevilles
  },

  pirate(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), hb = L.B("head"), yc = prof.yc, { box, sph, cone } = K, BROWN = "#4a3524", DARK = "#2a2430";
    for (let k = 1; k < 8; k += 2) { const top = yc - (0.4 + 0.15 * k), bot = top - 0.075; if (bot > 0.34) L.shell({ y0: bot, y1: top, off: 0.03, ev: 0.35 }, a); }   // marinière en relief
    L.shell({ y0: 0, y1: 0.2, off: 0.05, ev: 0.3 }, DARK);                                                                             // culotte
    const bel = L.shell({ y0: 0.2, y1: 0.31, off: 0.05, ev: 0.4 }, BROWN);                                                             // ceinture
    tb.add(box(0.12, 0.11, 0.05, 0.02), GOLD, { p: [0, 0.255, bel(0, 0.255) + 0.012] });                                               // boucle
    L.shell({ y0: yc + 0.14, y1: yc + 0.4, off: 0.038, ev: 0.3 }, a);                                                                  // bandana
    hb.add(sph(0.07, 1, 0.9, 0.9), a, { p: [0.36, 0.26, -0.3] }); hb.add(cone(0.06, 0.2, 4), a, { p: [0.4, 0.1, -0.33], r: [0, 0, Math.PI] }); hb.add(cone(0.05, 0.16, 4), a, { p: [0.32, 0.12, -0.36], r: [0.3, 0, Math.PI + 0.5] });   // nœud et pans
    L.legSleeve({ h: 0.24, grow: 0.03, color: BROWN }); L.legBand(0.25, K.shade(BROWN, 0.25), { grow: 0.034, t: 0.03 });                  // bottes à revers
    L.cuff({ at: 0.78, h: 0.07, grow: 0.034, color: CREAM });                                                                          // poignets de chemise
  },

  knight(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, hb = L.B("head"), tb = L.B("torso"), { sph, box, dome, tor } = K, dk = K.shade(m, -0.2);
    L.shell({ y0: 0.3, y1: 0.99, off: 0.058, ev: 0.2 }, m);                                                                            // cuirasse
    L.shell({ y0: 0.3, y1: 0.99, a0: -0.14, a1: 0.14, off: 0.05, eu: 0.5, ev: 0.2 }, K.shade(m, 0.12));                               // arête centrale
    L.shell({ y0: 0.0, y1: 0.3, off: 0.075, ev: 0.2, wave: { k: 10, amp: 0.05 } }, dk);                                               // tassettes (jupe de plates)
    L.belt(0.3, 0.53, 0.035, a);
    L.pauldron({ r: 1.4, flat: 0.75, color: m }); L.cuff({ at: 0.62, h: 0.14, grow: 0.045, color: dk });                              // épaulières, gantelets
    L.legSleeve({ h: 0.3, grow: 0.036, color: m }); L.legBand(0.31, dk, { grow: 0.04, t: 0.03 });                                       // jambières
    for (const n of ["legA", "legB"]) L.B(n).add(sph(0.075, 1, 1, 0.8, 10), K.shade(m, 0.12), { p: [0, -ctx.hipY + 0.31 + 0.09 - 0.08, ctx.lr + 0.02] });   // genouillères
    hb.add(dome(0.545, 1, 0.85, 1.03), m, { p: [0, 0.14, -0.02] }); hb.add(tor(0.54, 0.04, TAU, 22), dk, { p: [0, 0.15, 0], r: [Math.PI / 2, 0, 0], ink: false });
    hb.add(box(0.07, 0.3, 0.05, 0.02), K.shade(m, -0.1), { p: [0, 0.0, 0.55] }); hb.add(box(0.05, 0.4, 0.2, 0.02), a, { p: [0, 0.62, -0.05], r: [0.1, 0, 0] }); hb.add(sph(0.13, 0.5, 1.3, 1.1), a, { p: [0, 0.66, -0.25], r: [-0.5, 0, 0] });   // heaume, plumet
  },

  hero(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), { sph, box, cyl, poly } = K, yc = prof.yc;
    const trunks = L.shell({ y0: 0, y1: 0.22, off: 0.045, ev: 0.3 }, a);                                                               // slip
    L.shell({ y0: 0.2, y1: 0.31, off: 0.052, ev: 0.4 }, GOLD);                                                                         // ceinture
    tb.add(box(0.12, 0.12, 0.04, 0.02), K.shade(GOLD, 0.15), { p: [0, 0.255, prof.rAt(0.255) + 0.056] });
    const chest = prof.rAt(0.68) + 0.015;
    tb.add(cyl(0.17, 0.17, 0.03, 24), GOLD, { p: [0, 0.68, chest + 0.01], r: [Math.PI / 2, 0, 0] });                                   // médaillon
    tb.add(poly(Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? 0.05 : 0.13; return [Math.cos(t) * rr, Math.sin(t) * rr]; }), 0.03), a, { p: [0, 0.68, chest + 0.035] });   // étoile
    L.shell({ y0: yc - 0.46, y1: yc - 0.26, a0: Math.PI - 1.5, a1: Math.PI + 1.5, off: 0.1, eu: 0.25, ev: 0.3 }, a);                  // col de la cape
    tb.add(box(0.74, 0.95, 0.05, 0.03), a, { p: [0, yc - 0.62, -0.55], r: [-0.14, 0, 0] });                                            // cape
    for (const s of [-1, 1]) tb.add(sph(0.05, 1, 1, 1), GOLD, { p: [s * 0.2, yc - 0.18, -0.5], ink: false });
    L.legSleeve({ h: 0.25, grow: 0.034, color: a }); L.legBand(0.26, GOLD, { grow: 0.038, t: 0.026 });                                  // bottes
    L.cuff({ at: 0.78, h: 0.09, grow: 0.034, color: a }); L.cuff({ at: 0.66, h: 0.03, grow: 0.042, color: GOLD });                     // gants
  },

  chef(ctx, L) {
    const { K, prof, suit: { m, a } } = ctx, tb = L.B("torso"), hb = L.B("head"), { sph, cyl } = K, yc = prof.yc, NAVY = "#3a3f55";
    L.shell({ y0: 0.14, y1: yc - 0.3, off: 0.04, ev: 0.22 }, m);                                                                       // la veste
    const flap = L.shell({ y0: 0.18, y1: yc - 0.34, a0: -0.12, a1: 1.0, off: 0.034, eu: 0.3, ev: 0.2 }, K.shade(m, -0.04));            // pan de la veste croisée
    for (let i = 0; i < 3; i++) for (const lon of [0.3, 0.62]) { const y = 0.82 - i * 0.2; tb.add(sph(0.03, 1, 1, 0.7, 8), GOLD, { p: L.pos(lon, y, flap(lon, y) + 0.008) }); }
    L.shell({ y0: yc - 0.42, y1: yc - 0.24, off: 0.052, ev: 0.35 }, a);                                                                // foulard
    L.shell({ y0: 0, y1: 0.46, a0: -0.8, a1: 0.8, off: 0.058, eu: 0.3, ev: 0.2 }, NAVY);                                               // tablier
    L.cuff({ at: 0.78, h: 0.08, grow: 0.04, color: m });                                                                               // manchettes
    if (ctx.P.hat.id === "none") { hb.add(cyl(0.34, 0.34, 0.2, 18), CREAM, { p: [0, 0.4, 0] }); hb.add(sph(0.42, 1, 0.7, 1, 18), CREAM, { p: [0, 0.68, 0] }); for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU; hb.add(sph(0.15, 1, 1, 1), CREAM, { p: [Math.sin(t) * 0.27, 0.74, Math.cos(t) * 0.27] }); } }
  },
};

export function decorSuit(ctx) {
  const f = SUITS[ctx.suit.id]; if (f) f(ctx, layerKit(ctx));
}
