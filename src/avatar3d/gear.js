// Accessoires : couvre-chefs, lunettes, cou, dos, objet en main. Tout est assemblé à partir de formes simples (voir kit.js).
import { hatOf, glassesOf, heartPts } from "./hats.js";
const GOLD = "#f2c230", METAL = "#b3bbcc", CREAM = "#f6f1e4", BLACK = "#241c2c";

export function addGear(ctx) {
  const { K, P, col, surf } = ctx;
  const { sph, dome, cap, cyl, cone, box, tor, poly, shade } = K;
  const B = (n) => (ctx.B[n] ||= new K.Bucket());
  const hb = B("head");
  hatOf(ctx, hb);
  if (P.glasses.id !== "none") {      // les lunettes sont dessinées pour de petits yeux : on les agrandit autour des yeux du haricot
    const tmp = new K.Bucket(); glassesOf(ctx, tmp);
    const { THREE } = K, ey = 0.07, ez = surf(0, 0.1)[2] + 0.025, k = 1.3;
    hb.absorb(tmp, new THREE.Matrix4().makeTranslation(0, ey, ez).multiply(new THREE.Matrix4().makeScale(k, k, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -ey, -ez)));
  }
  neckOf(ctx, B("neck"));
  backOf(ctx, B("back"), B("torso"));
  handOf(ctx, B("item"));
}

/* ================================ cou (autour du bas du visage, là où commence le « haut ») ================================ */
function neckOf(ctx, nb) {
  const { K, P, col } = ctx, { sph, cap, cyl, cone, box, tor, poly, shade } = K;
  const id = P.neck.id, c = col.neck, cd = shade(c, -0.14), rn = ctx.rNeck;       // rn : rayon du corps à cette hauteur
  const ring = (R, r, y, color, o = {}) => nb.add(tor(R, r, Math.PI * 2, 28), color, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], ...o });
  switch (id) {
    case "none": return;
    case "scarf": ring(rn + 0.04, 0.085, 0, c); nb.add(box(0.14, 0.46, 0.06, 0.025), c, { p: [0.16, -0.26, rn + 0.03], r: [0.05, 0, 0.1] }); nb.add(box(0.14, 0.09, 0.062, 0.012), cd, { p: [0.19, -0.42, rn + 0.035], r: [0.05, 0, 0.1], ink: false }); nb.add(box(0.14, 0.08, 0.062, 0.012), cd, { p: [0.15, -0.2, rn + 0.035], r: [0.05, 0, 0.1], ink: false }); break;
    case "bow": nb.add(cone(0.11, 0.18, 4), c, { p: [-0.1, -0.03, rn + 0.03], r: [0, 0, Math.PI / 2], s: [1, 1, 0.6] }); nb.add(cone(0.11, 0.18, 4), c, { p: [0.1, -0.03, rn + 0.03], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.6] }); nb.add(sph(0.05, 1, 1, 1), cd, { p: [0, -0.03, rn + 0.05] }); break;
    case "bandana": ring(rn + 0.025, 0.05, 0, c); nb.add(poly([[-0.24, 0], [0.24, 0], [0, -0.38]], 0.04), c, { p: [0, 0.0, rn + 0.005], r: [-0.15, 0, 0] }); for (let i = 0; i < 3; i++) nb.add(sph(0.016, 1, 1, 1, 6), CREAM, { p: [-0.09 + i * 0.09, -0.1 - (i === 1 ? 0.1 : 0), rn + 0.05], ink: false }); break;
    case "medal": nb.add(box(0.035, 0.34, 0.016, 0.006), "#d63a3a", { p: [-0.1, -0.12, rn + 0.0], r: [0.1, 0, 0.5], ink: false }); nb.add(box(0.035, 0.34, 0.016, 0.006), "#2b6fe0", { p: [0.1, -0.12, rn + 0.0], r: [0.1, 0, -0.5], ink: false }); nb.add(cyl(0.12, 0.12, 0.035, 20), GOLD, { p: [0, -0.34, rn + 0.0], r: [Math.PI / 2 + 0.1, 0, 0] }); nb.add(sph(0.05, 1, 1, 0.5), shade(GOLD, 0.2), { p: [0, -0.34, rn + 0.03], ink: false }); break;
    case "pearls": for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283, f = Math.max(0, Math.cos(a)); nb.add(sph(0.04, 1, 1, 1, 8), "#f4f1ea", { p: [Math.sin(a) * (rn + 0.03), -0.02 - f * 0.12, Math.cos(a) * (rn + 0.03)], inkw: 0.01 }); } break;
    case "lei": for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, f = Math.max(0, Math.cos(a)); nb.add(sph(0.075, 1, 0.8, 1, 8), ["#ff4f86", "#ffd23a", "#ff8f1f", "#ffffff"][i % 4], { p: [Math.sin(a) * (rn + 0.07), -0.04 - f * 0.18, Math.cos(a) * (rn + 0.07)], inkw: 0.012 }); } break;
    case "studs": ring(rn + 0.025, 0.05, 0, "#2a2430"); for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + 0.2; nb.add(cone(0.035, 0.12, 6), METAL, { p: [Math.sin(a) * (rn + 0.08), 0, Math.cos(a) * (rn + 0.08)], r: [Math.PI / 2 * Math.cos(a), 0, -Math.PI / 2 * Math.sin(a)], inkw: 0.008 }); } break;
    case "camera": nb.add(box(0.03, 0.4, 0.014, 0.005), "#2a2430", { p: [-0.13, -0.12, rn + 0.0], r: [0.1, 0, 0.45], ink: false }); nb.add(box(0.03, 0.4, 0.014, 0.005), "#2a2430", { p: [0.13, -0.12, rn + 0.0], r: [0.1, 0, -0.45], ink: false }); nb.add(box(0.28, 0.17, 0.12, 0.035), "#2a2430", { p: [0, -0.38, rn + 0.04] }); nb.add(box(0.28, 0.06, 0.122, 0.014), METAL, { p: [0, -0.33, rn + 0.04], ink: false }); nb.add(cyl(0.07, 0.078, 0.08, 16), "#4a4a56", { p: [0, -0.39, rn + 0.12], r: [Math.PI / 2, 0, 0] }); nb.add(sph(0.045, 1, 1, 0.5), "#6fc8ff", { p: [0, -0.39, rn + 0.16], ink: false }); break;
    case "stetho": ring(rn + 0.03, 0.02, 0, METAL, { ink: false }); nb.add(tor(0.13, 0.018, Math.PI * 1.1, 16), BLACK, { p: [0, -0.2, rn + 0.0], r: [0, 0, Math.PI * 1.45], ink: false }); nb.add(cyl(0.065, 0.065, 0.035, 14), METAL, { p: [0.0, -0.4, rn + 0.02], r: [Math.PI / 2, 0, 0] }); break;
    case "heartneck": ring(rn + 0.025, 0.012, 0, GOLD, { ink: false }); nb.add(poly(heartPts(24, 0.12), 0.04), "#ff3b6b", { p: [0, -0.26, rn + 0.03], r: [-0.1, 0, 0] }); break;
    case "tube": ring(rn + 0.07, 0.1, -0.1, c); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; nb.add(box(0.1, 0.04, 0.22, 0.015), "#f6f1e4", { p: [Math.sin(a) * (rn + 0.07), -0.1 + 0.095, Math.cos(a) * (rn + 0.07)], r: [0, a, 0], ink: false }); } break;
  }
}

/* ================================ dos ================================ */
function backOf(ctx, bb, tb) {
  const { K, P, col, tw } = ctx, { sph, dome, cap, cyl, cone, box, tor, poly, shade } = K;
  const id = P.back.id, c = col.back, cd = shade(c, -0.16), cl = shade(c, 0.16);
  const wing = (s, pts, color, scl = 1, rot = [0, 0, 0], depth = 0.03) => bb.add(poly(pts.map(([x, y]) => [x * scl * s, y * scl]), depth), color, { p: [s * 0.12, 0.08, -0.05], r: [rot[0], rot[1] * s, rot[2] * s] });
  const featherWing = [[0, 0], [0.2, 0.18], [0.5, 0.3], [0.8, 0.28], [0.95, 0.12], [0.8, 0.1], [0.9, -0.05], [0.7, -0.05], [0.78, -0.2], [0.55, -0.15], [0.55, -0.32], [0.3, -0.2], [0.2, -0.35], [0.05, -0.18]];
  const batWing = [[0, 0], [0.25, 0.3], [0.55, 0.5], [0.95, 0.38], [0.8, 0.1], [0.88, -0.12], [0.62, -0.02], [0.58, -0.28], [0.36, -0.06], [0.2, -0.3], [0.06, -0.1]];
  switch (id) {
    case "none": return;
    case "cape": bb.add(box(0.52 * tw, 0.82, 0.03, 0.02), c, { p: [0, -0.3, -0.05], r: [-0.07, 0, 0] }); bb.add(tor(0.14, 0.05, Math.PI * 2, 14), c, { p: [0, 0.28, 0.1], r: [Math.PI / 2, 0, 0], ink: false }); bb.add(sph(0.045, 1, 1, 1), GOLD, { p: [0, 0.27, 0.22], ink: false }); bb.add(box(0.5 * tw, 0.04, 0.032, 0.01), cd, { p: [0, -0.7, -0.14], r: [-0.07, 0, 0], ink: false }); break;
    case "angel": for (const s of [-1, 1]) { wing(s, featherWing, c, 0.8, [0, -0.3, 0.2]); wing(s, featherWing.map(([x, y]) => [x * 0.75, y * 0.75 - 0.05]), cl, 0.8, [0, -0.3, 0.2], 0.035); } break;
    case "bat": for (const s of [-1, 1]) { wing(s, batWing, c, 0.82, [0, -0.3, 0.1]); bb.add(cap(0.014, 0.5, 5), cd, { p: [s * 0.4, 0.28, -0.07], r: [0, 0, -s * 1.1], ink: false }); } break;
    case "pack": bb.add(box(0.34 * tw, 0.42, 0.17, 0.06), c, { p: [0, -0.06, -0.12] }); bb.add(box(0.22 * tw, 0.16, 0.05, 0.03), cd, { p: [0, -0.12, -0.22] }); bb.add(box(0.36 * tw, 0.04, 0.18, 0.015), cl, { p: [0, 0.1, -0.12], ink: false }); for (const s of [-1, 1]) bb.add(box(0.05, 0.44, 0.03, 0.012), cd, { p: [s * 0.1 * tw, -0.04, -0.01], ink: false }); break;
    case "jet": for (const s of [-1, 1]) { bb.add(cyl(0.075, 0.075, 0.46, 12), METAL, { p: [s * 0.1, -0.05, -0.15] }); bb.add(cone(0.07, 0.1, 12), cd, { p: [s * 0.1, 0.22, -0.15] }); bb.add(cone(0.06, 0.22, 10), "#ff8f1f", { p: [s * 0.1, -0.38, -0.15], r: [Math.PI, 0, 0], basic: true, ink: false }); bb.add(cone(0.035, 0.14, 10), "#ffe36b", { p: [s * 0.1, -0.34, -0.15], r: [Math.PI, 0, 0], basic: true, ink: false }); bb.add(cyl(0.078, 0.078, 0.04, 12), c, { p: [s * 0.1, -0.2, -0.15], ink: false }); } bb.add(box(0.2, 0.05, 0.06, 0.01), cd, { p: [0, 0.0, -0.13], ink: false }); break;
    case "quiver": bb.add(cyl(0.07, 0.085, 0.5, 12), c, { p: [0.07, -0.02, -0.14], r: [0, 0, -0.35] }); for (let i = 0; i < 3; i++) { bb.add(cyl(0.01, 0.01, 0.3, 5), CREAM, { p: [0.0 + i * 0.05, 0.3, -0.14], r: [0, 0, -0.35 + i * 0.1], ink: false }); bb.add(cone(0.035, 0.1, 4), ["#ff4f4f", "#ffd23a", "#4fb6ff"][i], { p: [0.0 + i * 0.05 - 0.04, 0.42, -0.14], r: [0, 0, -0.35 + i * 0.1], ink: false }); } bb.add(box(0.04, 0.52, 0.02, 0.008), cd, { p: [0.0, 0.0, 0.0], r: [0, 0, 0.5], ink: false }); break;
    case "tank": bb.add(cyl(0.11, 0.11, 0.55, 12), c, { p: [-0.09, -0.05, -0.14] }); bb.add(cyl(0.11, 0.11, 0.55, 12), shade(c, 0.12), { p: [0.09, -0.05, -0.14] }); for (const s of [-1, 1]) bb.add(cyl(0.032, 0.032, 0.12, 8), METAL, { p: [s * 0.09, 0.3, -0.14], ink: false }); bb.add(box(0.34, 0.04, 0.08, 0.015), cd, { p: [0, 0.12, -0.1], ink: false }); bb.add(box(0.34, 0.04, 0.08, 0.015), cd, { p: [0, -0.2, -0.1], ink: false }); break;
    case "shell": bb.add(dome(0.27 * tw, 1, 0.75, 1.0), c, { p: [0, -0.08, -0.06], r: [-Math.PI / 2, 0, 0] }); for (const [x, y] of [[0, 0], [-0.13, 0.1], [0.13, 0.1], [-0.13, -0.12], [0.13, -0.12], [0, -0.24]]) bb.add(cyl(0.07, 0.07, 0.02, 6), cl, { p: [x, -0.08 + y, -0.38 + Math.abs(x) * 0.5], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "guitar": bb.add(sph(0.2, 1, 1.1, 0.3), c, { p: [0.05, -0.3, -0.16], r: [0, 0, 0.5] }); bb.add(sph(0.15, 1, 1, 0.3), c, { p: [0.18, -0.08, -0.16], r: [0, 0, 0.5] }); bb.add(cyl(0.05, 0.05, 0.04, 12), BLACK, { p: [0.08, -0.2, -0.2], r: [Math.PI / 2, 0, 0], ink: false }); bb.add(box(0.05, 0.5, 0.04, 0.012), "#7a4a2a", { p: [0.4, 0.22, -0.16], r: [0, 0, 0.5] }); bb.add(box(0.08, 0.1, 0.04, 0.012), cd, { p: [0.55, 0.47, -0.16], r: [0, 0, 0.5] }); bb.add(box(0.03, 0.9, 0.012, 0.004), BLACK, { p: [0.0, 0.0, 0.0], r: [0, 0, -0.5], ink: false }); break;
    case "butterfly": for (const s of [-1, 1]) { bb.add(sph(0.3, 1, 1.15, 0.12), c, { p: [s * 0.32, 0.18, -0.1], r: [0, -s * 0.35, -s * 0.5] }); bb.add(sph(0.2, 1, 1.1, 0.12), cd, { p: [s * 0.26, -0.18, -0.1], r: [0, -s * 0.35, s * 0.3] }); bb.add(sph(0.09, 1, 1, 0.14), CREAM, { p: [s * 0.4, 0.26, -0.16], r: [0, -s * 0.35, 0], ink: false }); } break;
  }
}

/* ================================ objet en main ================================ */
function handOf(ctx, hb) {
  const { K, P, col } = ctx, { sph, dome, cap, cyl, cone, box, tor, poly, lathe, shade } = K;
  const id = P.hand.id, c = col.hand, cd = shade(c, -0.15), cl = shade(c, 0.18);
  const up = (y) => y;                     // les objets montent le long de l'avant-bras (axe +Y), la prise est à l'origine
  switch (id) {
    case "none": return;
    case "sword": hb.add(cyl(0.025, 0.025, 0.16, 8), "#6b4a2b", { p: [0, 0.0, 0] }); hb.add(box(0.2, 0.04, 0.05, 0.015), GOLD, { p: [0, 0.1, 0] }); hb.add(box(0.06, 0.6, 0.025, 0.012), c, { p: [0, 0.42, 0] }); hb.add(cone(0.042, 0.1, 4), c, { p: [0, 0.77, 0], s: [1, 1, 0.6], r: [0, Math.PI / 4, 0] }); hb.add(box(0.012, 0.5, 0.028, 0.004), cl, { p: [0, 0.42, 0], ink: false }); break;
    case "mallet": hb.add(cyl(0.025, 0.025, 0.7, 8), "#8a5a2b", { p: [0, 0.2, 0] }); hb.add(cyl(0.11, 0.11, 0.3, 14), c, { p: [0, 0.58, 0], r: [0, 0, Math.PI / 2] }); for (const s of [-1, 1]) hb.add(cyl(0.115, 0.115, 0.03, 14), cl, { p: [s * 0.11, 0.58, 0], r: [0, 0, Math.PI / 2], ink: false }); hb.add(cyl(0.12, 0.12, 0.03, 14), cd, { p: [0, 0.58, 0], r: [0, 0, Math.PI / 2], ink: false }); break;
    case "balloon": hb.add(cyl(0.004, 0.004, 0.8, 4), CREAM, { p: [0, 0.4, 0], ink: false }); hb.add(sph(0.22, 1, 1.18, 1, 16), c, { p: [0, 1.0, 0] }); hb.add(cone(0.035, 0.05, 6), cd, { p: [0, 0.76, 0], r: [Math.PI, 0, 0], ink: false }); hb.add(sph(0.045, 1, 0.6, 0.4), CREAM, { p: [-0.1, 1.12, 0.14], ink: false }); break;
    case "trophy": hb.add(lathe([[0.001, 0], [0.09, 0.0], [0.04, 0.08], [0.03, 0.2], [0.11, 0.26], [0.17, 0.5], [0.1, 0.5], [0.001, 0.4]], 18), GOLD, { p: [0, 0.05, 0] }); hb.add(box(0.2, 0.06, 0.2, 0.02), "#6b4a2b", { p: [0, 0.03, 0] }); for (const s of [-1, 1]) hb.add(tor(0.07, 0.014, Math.PI, 10), GOLD, { p: [s * 0.15, 0.4, 0], r: [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2], ink: false }); break;
    case "pad": hb.add(box(0.34, 0.08, 0.17, 0.04), c, { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0.0] }); for (const s of [-1, 1]) { hb.add(cyl(0.035, 0.035, 0.02, 10), BLACK, { p: [s * 0.1, 0.0, 0.06], ink: false, r: [Math.PI / 2, 0, 0] }); } for (let i = 0; i < 4; i++) hb.add(sph(0.016, 1, 1, 1, 6), ["#ff4f4f", "#ffd23a", "#4fb6ff", "#4fe08a"][i], { p: [0.1 + Math.cos(i * 1.57) * 0.03, 0.12 + Math.sin(i * 1.57) * 0.03, 0.05], ink: false }); break;
    case "mic": hb.add(cyl(0.026, 0.034, 0.28, 10), BLACK, { p: [0, 0.14, 0] }); hb.add(sph(0.075, 1, 1, 1, 12), METAL, { p: [0, 0.34, 0] }); hb.add(tor(0.07, 0.008, Math.PI * 2, 12), "#7d8794", { p: [0, 0.34, 0], ink: false }); hb.add(tor(0.07, 0.008, Math.PI * 2, 12), "#7d8794", { p: [0, 0.34, 0], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "lolli": hb.add(cyl(0.014, 0.014, 0.6, 6), CREAM, { p: [0, 0.3, 0] }); hb.add(cyl(0.19, 0.19, 0.05, 20), c, { p: [0, 0.78, 0], r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 3; i++) hb.add(tor(0.05 + i * 0.05, 0.014, Math.PI * 2, 16), i % 2 ? CREAM : cd, { p: [0, 0.78, 0.03], ink: false }); break;
    case "bomb": hb.add(sph(0.16, 1, 1, 1, 16), "#2a2430", { p: [0, 0.2, 0] }); hb.add(cyl(0.04, 0.05, 0.05, 10), METAL, { p: [0, 0.37, 0] }); hb.add(tor(0.06, 0.008, Math.PI * 1.2, 8), "#c8a96b", { p: [0.04, 0.45, 0], ink: false }); hb.add(sph(0.045, 1, 1, 1, 6), "#ffb02e", { p: [0.1, 0.5, 0], basic: true, ink: false }); hb.add(sph(0.03, 1, 1, 1, 6), "#fff2a0", { p: [0.1, 0.5, 0.0], basic: true, ink: false }); hb.add(sph(0.04, 1, 0.6, 0.3), "#6a6479", { p: [-0.06, 0.28, 0.14], ink: false }); break;
    case "flag": hb.add(cyl(0.015, 0.015, 0.95, 6), "#8a6a3b", { p: [0, 0.4, 0] }); hb.add(sph(0.03, 1, 1, 1), GOLD, { p: [0, 0.89, 0], ink: false }); hb.add(poly([[0, 0], [0.4, 0.04], [0.38, -0.12], [0.4, -0.28], [0, -0.3]], 0.02), c, { p: [0.02, 0.84, 0] }); hb.add(poly([[0, -0.1], [0.38, -0.12], [0.39, -0.2], [0, -0.2]], 0.024), CREAM, { p: [0.02, 0.84, 0], ink: false }); break;
    case "pan": hb.add(cyl(0.02, 0.02, 0.32, 8), BLACK, { p: [0, 0.1, 0] }); hb.add(cyl(0.2, 0.2, 0.035, 20), "#3a3a44", { p: [0, 0.4, 0.0], r: [0, 0, 0] }); hb.add(cyl(0.17, 0.17, 0.04, 20), "#1d1d26", { p: [0, 0.402, 0.0], ink: false }); break;
    case "flowers": hb.add(cone(0.1, 0.34, 10), "#f4e6c7", { p: [0, 0.2, 0], r: [Math.PI, 0, 0] }); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283, f = [c, "#ffd23a", "#ff8fb8", "#fff", cl][i]; hb.add(cyl(0.008, 0.008, 0.3, 4), "#2a9f4d", { p: [Math.sin(a) * 0.04, 0.4, Math.cos(a) * 0.04], r: [Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15], ink: false }); hb.add(sph(0.065, 1, 0.7, 1, 8), f, { p: [Math.sin(a) * 0.1, 0.56 + (i % 2) * 0.05, Math.cos(a) * 0.1] }); hb.add(sph(0.025, 1, 1, 1, 6), "#ffe36b", { p: [Math.sin(a) * 0.1, 0.59 + (i % 2) * 0.05, Math.cos(a) * 0.1 + 0.04], ink: false }); } break;
    case "wand": hb.add(cyl(0.016, 0.02, 0.55, 8), BLACK, { p: [0, 0.22, 0] }); hb.add(cyl(0.022, 0.022, 0.1, 8), CREAM, { p: [0, 0.0, 0], ink: false }); hb.add(poly(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283 - 1.571, r = i % 2 ? 0.04 : 0.1; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0.03), "#ffe36b", { p: [0, 0.6, 0], basic: true }); for (const [x, y] of [[0.14, 0.7], [-0.12, 0.66], [0.1, 0.52]]) hb.add(sph(0.016, 1, 1, 1, 5), "#fff7b0", { p: [x, y, 0.02], basic: true, ink: false }); break;
    case "squirt": hb.add(box(0.07, 0.24, 0.12, 0.03), c, { p: [0, 0.12, 0.02] }); hb.add(cyl(0.035, 0.035, 0.3, 10), cd, { p: [0, 0.3, 0.12], r: [Math.PI / 2, 0, 0] }); hb.add(sph(0.11, 1, 1.1, 1), "#7fd4ff", { p: [0, 0.3, -0.04], opacity: 0.7 }); hb.add(cyl(0.03, 0.03, 0.08, 8), cl, { p: [0, 0.3, 0.3], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "banana": for (let i = 0; i < 7; i++) { const t = i / 6, a = -0.9 + t * 1.8; hb.add(sph(0.065 - Math.abs(t - 0.5) * 0.03, 1, 1.5, 1, 8), "#ffe030", { p: [Math.sin(a) * 0.3 - 0.1, 0.16 + Math.cos(a) * 0.3 - 0.1 + t * 0.1, 0], r: [0, 0, -a], inkw: 0.014 }); } hb.add(cyl(0.025, 0.03, 0.06, 6), "#6b4a2b", { p: [-0.4, 0.38, 0], r: [0, 0, 0.9], ink: false }); break;
    case "die": hb.add(box(0.26, 0.26, 0.26, 0.05), CREAM, { p: [0, 0.18, 0.0], r: [0.3, 0.5, 0.2] }); { const pips = [[0, 0.135, 0]]; hb.add(sph(0.026, 1, 1, 0.6), BLACK, { p: [0.0, 0.31, 0.0], r: [0.3, 0.5, 0.2], ink: false }); hb.add(sph(0.024, 1, 1, 0.6), c, { p: [0.12, 0.2, 0.1], ink: false }); hb.add(sph(0.024, 1, 1, 0.6), c, { p: [-0.05, 0.12, 0.13], ink: false }); } break;
    case "hourglass": hb.add(box(0.2, 0.03, 0.2, 0.01), "#6b4a2b", { p: [0, 0.0, 0] }); hb.add(box(0.2, 0.03, 0.2, 0.01), "#6b4a2b", { p: [0, 0.48, 0] }); hb.add(cone(0.08, 0.22, 10), "#cfeaff", { p: [0, 0.14, 0], r: [Math.PI, 0, 0], opacity: 0.6, ink: false }); hb.add(cone(0.08, 0.22, 10), "#cfeaff", { p: [0, 0.34, 0], opacity: 0.6, ink: false }); hb.add(cone(0.06, 0.12, 10), c, { p: [0, 0.07, 0], ink: false }); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) hb.add(cyl(0.01, 0.01, 0.46, 4), "#6b4a2b", { p: [x * 0.09, 0.24, z * 0.09], ink: false }); break;
    case "axe": hb.add(cyl(0.025, 0.028, 0.8, 8), "#8a5a2b", { p: [0, 0.3, 0] }); hb.add(poly([[0, 0.1], [0.28, 0.2], [0.26, -0.12], [0, -0.02]], 0.05), METAL, { p: [0.0, 0.58, 0] }); hb.add(box(0.07, 0.2, 0.06, 0.015), shade(METAL, -0.2), { p: [-0.01, 0.62, 0] }); break;
  }
}
