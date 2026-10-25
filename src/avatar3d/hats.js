// Couvre-chefs, lunettes et masques. Tout est assemblé à partir de formes simples (voir kit.js), pour une tête de rayon 0,5.
const GOLD = "#f2c230", METAL = "#b3bbcc", CREAM = "#f6f1e4", BLACK = "#241c2c";
export const heartPts = (n, s) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return [s * 0.0625 * (16 * Math.sin(t) ** 3), s * 0.0625 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.9]; });

/* ================================ couvre-chefs ================================ */
export function hatOf(ctx, hb) {
  const { K, P, col } = ctx, { sph, dome, cap, cyl, cone, box, tor, poly, shade } = K;
  const id = P.hat.id, c = col.hat, cd = shade(c, -0.14), cl = shade(c, 0.16);
  const flat = (R, r, y, color, o = {}) => hb.add(tor(R, r, Math.PI * 2, 24), color, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], ...o });
  const brimDisc = (r, y, color, k = 0.07) => hb.add(sph(r, 1, k / r * 1.0 + 0.0001, 0.92 + 0, 24), color, { p: [0, y, 0.0], s: [1, 1, 1] });
  switch (id) {
    case "none": return;
    case "cap": case "capback": {
      hb.add(dome(0.545, 1, 0.78, 1.03), c, { p: [0, 0.2, -0.02] });
      const f = id === "cap" ? 1 : -1;
      hb.add(sph(0.3, 1.05, 0.1, 1), cd, { p: [0, 0.2, f * 0.52], r: f > 0 ? [0.3, 0, 0] : [0.2, Math.PI, 0] });
      hb.add(sph(0.05, 1, 1, 1), cl, { p: [0, 0.6, -0.02], ink: false });
      if (id === "capback") hb.add(box(0.12, 0.05, 0.03, 0.01), cl, { p: [0, 0.22, 0.54], ink: false });
      break; }
    case "beanie": case "pompom":
      hb.add(dome(0.55, 1, 0.92, 1.03), c, { p: [0, 0.16, -0.02] });
      flat(0.52, 0.06, 0.2, cd, { s: [1, 1.04, 1.0] });
      if (id === "pompom") hb.add(sph(0.14, 1, 1, 1), cl, { p: [0, 0.68, -0.02] });
      break;
    case "tophat":
      brimDisc(0.64, 0.3, c, 0.05); hb.add(cyl(0.35, 0.37, 0.52, 20), c, { p: [0, 0.56, 0] }); hb.add(cyl(0.375, 0.375, 0.1, 20), "#c42a3a", { p: [0, 0.38, 0], ink: false }); break;
    case "cowboy":
      hb.add(sph(0.8, 1, 0.075, 0.95, 24), c, { p: [0, 0.3, 0.0] }); hb.add(sph(0.26, 1, 0.32, 0.7), c, { p: [-0.7, 0.4, 0] }); hb.add(sph(0.26, 1, 0.32, 0.7), c, { p: [0.7, 0.4, 0] });
      hb.add(cyl(0.3, 0.37, 0.36, 18), c, { p: [0, 0.5, 0] }); hb.add(dome(0.3, 1, 0.5, 1), c, { p: [0, 0.68, 0] }); hb.add(cyl(0.375, 0.375, 0.07, 18), shade(c, -0.25), { p: [0, 0.37, 0], ink: false }); break;
    case "pirate":
      hb.add(dome(0.52, 1, 0.55, 1.03), BLACK, { p: [0, 0.3, 0] }); hb.add(sph(0.62, 1, 0.07, 0.85), BLACK, { p: [0, 0.3, 0] });
      hb.add(box(0.7, 0.07, 0.3, 0.03), BLACK, { p: [0, 0.46, 0.44], r: [-0.55, 0, 0] }); hb.add(box(0.34, 0.07, 0.6, 0.03), BLACK, { p: [-0.5, 0.48, 0.0], r: [0, 0, -0.5] }); hb.add(box(0.34, 0.07, 0.6, 0.03), BLACK, { p: [0.5, 0.48, 0.0], r: [0, 0, 0.5] });
      hb.add(sph(0.075, 1, 1.1, 0.4), CREAM, { p: [0, 0.5, 0.6], ink: false }); hb.add(cyl(0.51, 0.53, 0.07, 18), c, { p: [0, 0.33, 0], ink: false }); break;
    case "viking":
      hb.add(dome(0.55, 1, 0.8, 1.03), METAL, { p: [0, 0.2, -0.02] }); flat(0.54, 0.035, 0.22, GOLD, { s: [1, 1.0, 1] });
      for (const s of [-1, 1]) { hb.add(cone(0.095, 0.45, 10), CREAM, { p: [s * 0.62, 0.52, 0], r: [0, 0, -s * 0.55] }); hb.add(sph(0.1, 1, 1, 1), shade(METAL, -0.05), { p: [s * 0.54, 0.28, 0], ink: false }); }
      break;
    case "wizard":
      hb.add(sph(0.74, 1, 0.06, 0.8, 24), c, { p: [0, 0.3, 0] }); hb.add(cone(0.42, 1.0, 16), c, { p: [0, 0.8, 0], r: [0, 0, -0.12] }); flat(0.4, 0.04, 0.38, GOLD, { ink: false, p: [0, 0.38, 0] });
      hb.add(poly(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283 - 1.571, r = i % 2 ? 0.04 : 0.1; return [Math.cos(a) * r, Math.sin(a) * r]; }), 0.03), GOLD, { p: [0.0, 0.62, 0.4], r: [0, 0, -0.12], ink: false }); break;
    case "chef":
      hb.add(cyl(0.36, 0.36, 0.22, 18), CREAM, { p: [0, 0.34, 0] }); hb.add(sph(0.46, 1, 0.78, 1, 18), CREAM, { p: [0, 0.68, 0] });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; hb.add(sph(0.17, 1, 1, 1), CREAM, { p: [Math.sin(a) * 0.3, 0.76, Math.cos(a) * 0.3] }); }
      hb.add(cyl(0.365, 0.365, 0.05, 18), c, { p: [0, 0.27, 0], ink: false }); break;
    case "devil":
      for (const s of [-1, 1]) { hb.add(cone(0.09, 0.34, 10), c, { p: [s * 0.27, 0.58, 0.05], r: [0.2, 0, -s * 0.35] }); hb.add(cone(0.1, 0.1, 10), cd, { p: [s * 0.25, 0.43, 0.03], ink: false }); } break;
    case "cat": case "bunny": {
      const bun = id === "bunny";
      for (const s of [-1, 1]) {
        if (bun) { hb.add(cap(0.1, 0.5, 10), c, { p: [s * 0.18, 0.86, -0.02], r: [0, 0, -s * 0.12], s: [0.7, 1, 0.6] }); hb.add(cap(0.06, 0.44, 8), "#ffb3c8", { p: [s * 0.18, 0.86, 0.04], r: [0, 0, -s * 0.12], s: [0.7, 1, 0.5], ink: false }); }
        else { hb.add(cone(0.17, 0.36, 4), c, { p: [s * 0.3, 0.62, 0.0], r: [0, Math.PI / 4, -s * 0.3], s: [1, 1, 0.5] }); hb.add(cone(0.1, 0.24, 4), "#ffb3c8", { p: [s * 0.3, 0.58, 0.05], r: [0, Math.PI / 4, -s * 0.3], s: [1, 1, 0.5], ink: false }); }
      }
      hb.add(tor(0.52, 0.03, Math.PI * 0.9, 20), cd, { p: [0, 0.14, 0], r: [-0.9, 0, Math.PI * 0.05], ink: false }); break; }
    case "halo": hb.add(tor(0.3, 0.04, Math.PI * 2, 24), "#ffe36b", { p: [0, 0.86, 0], r: [Math.PI / 2 - 0.1, 0, 0], basic: true, ink: false }); break;
    case "knight":
      hb.add(dome(0.57, 1, 0.9, 1.04), METAL, { p: [0, 0.14, -0.02] }); flat(0.57, 0.04, 0.16, shade(METAL, -0.12), { ink: false }); hb.add(box(0.07, 0.34, 0.05, 0.02), shade(METAL, -0.05), { p: [0, 0.0, 0.55] });
      hb.add(box(0.05, 0.5, 0.22, 0.02), c, { p: [0, 0.72, -0.02], r: [0.1, 0, 0] }); hb.add(sph(0.14, 0.5, 1.4, 1.2), c, { p: [0, 0.78, -0.2], r: [-0.5, 0, 0] }); break;
    case "party":
      hb.add(cone(0.26, 0.62, 14), c, { p: [0.0, 0.64, 0.0], r: [0, 0, -0.1] }); for (let i = 0; i < 3; i++) hb.add(cyl(0.2 - i * 0.055, 0.215 - i * 0.055, 0.04, 14), i % 2 ? cl : shade(c, 0.4), { p: [0.0 + i * 0.02, 0.43 + i * 0.14, 0], ink: false });
      hb.add(sph(0.075, 1, 1, 1), "#ffe36b", { p: [-0.06, 0.97, 0] }); break;
    case "headband": flat(0.51, 0.05, 0.19, c, { s: [1, 1.04, 0.85] }); hb.add(box(0.08, 0.1, 0.05, 0.02), cd, { p: [0.5, 0.17, -0.1], r: [0, 0.4, 0.5] }); hb.add(box(0.08, 0.14, 0.04, 0.02), cd, { p: [0.55, 0.06, -0.12], r: [0, 0.4, -0.3] }); break;
    case "tiara": hb.add(tor(0.51, 0.025, Math.PI * 1.1, 24), GOLD, { p: [0, 0.2, 0], r: [Math.PI / 2 - 0.5, 0, Math.PI * 0.45], ink: false }); for (let i = -2; i <= 2; i++) { const a = i * 0.34, h = 0.14 - Math.abs(i) * 0.03; hb.add(cone(0.035, h, 6), GOLD, { p: [Math.sin(a) * 0.5, 0.3 + Math.cos(a) * 0.12 + h / 2 - 0.05, Math.cos(a) * 0.4], r: [0.5, 0, -a * 0.6], ink: false }); } hb.add(sph(0.045, 1, 1, 1), c, { p: [0, 0.42, 0.44], ink: false }); break;
    case "sombrero":
      hb.add(sph(1.0, 1, 0.055, 1, 28), c, { p: [0, 0.26, 0] }); hb.add(tor(0.98, 0.03, Math.PI * 2, 28), "#ffd23a", { p: [0, 0.27, 0], r: [Math.PI / 2, 0, 0], ink: false });
      hb.add(cyl(0.2, 0.34, 0.48, 18), c, { p: [0, 0.53, 0] }); hb.add(sph(0.2, 1, 0.5, 1), c, { p: [0, 0.77, 0] }); hb.add(cyl(0.345, 0.345, 0.07, 18), "#ffd23a", { p: [0, 0.36, 0], ink: false }); break;
    case "beret":
      hb.add(sph(0.5, 1, 0.34, 1, 20), c, { p: [0.07, 0.36, 0], r: [0, 0, -0.18] }); hb.add(cap(0.025, 0.08, 6), cd, { p: [0.06, 0.6, 0.0], ink: false }); flat(0.5, 0.03, 0.26, cd, { ink: false }); break;
    case "bike":
      hb.add(dome(0.57, 1, 0.82, 1.06), c, { p: [0, 0.18, -0.02] }); for (let i = -2; i <= 2; i++) hb.add(box(0.07, 0.05, 0.9, 0.02), i % 2 ? cl : shade(c, -0.3), { p: [i * 0.13, 0.57 - Math.abs(i) * 0.03, 0.0], r: [0, 0, i * 0.1], ink: false });
      hb.add(box(0.5, 0.05, 0.16, 0.02), cd, { p: [0, 0.2, 0.52] }); break;
    case "headphones":
      hb.add(tor(0.57, 0.035, Math.PI, 22), c, { p: [0, 0.0, 0], r: [0, 0, 0] }); for (const s of [-1, 1]) { hb.add(cyl(0.15, 0.15, 0.1, 16), c, { p: [s * 0.53, 0.0, 0], r: [0, 0, Math.PI / 2] }); hb.add(cyl(0.11, 0.11, 0.02, 16), BLACK, { p: [s * 0.59, 0.0, 0], r: [0, 0, Math.PI / 2], ink: false }); } break;
    case "bowler":
      hb.add(dome(0.46, 1, 0.9, 1.0), BLACK, { p: [0, 0.3, 0] }); hb.add(sph(0.62, 1, 0.06, 0.9), BLACK, { p: [0, 0.3, 0] }); hb.add(cyl(0.465, 0.465, 0.07, 18), c, { p: [0, 0.34, 0], ink: false }); break;
    case "straw":
      hb.add(sph(0.8, 1, 0.07, 0.95, 24), "#e8c872", { p: [0, 0.3, 0] }); hb.add(cyl(0.34, 0.4, 0.28, 18), "#e8c872", { p: [0, 0.44, 0] }); hb.add(dome(0.34, 1, 0.5, 1), "#e8c872", { p: [0, 0.58, 0] }); hb.add(cyl(0.405, 0.405, 0.08, 18), c, { p: [0, 0.37, 0], ink: false }); break;
    case "crown":
      hb.add(cyl(0.42, 0.45, 0.16, 20), GOLD, { p: [0, 0.38, 0] }); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; hb.add(cone(0.075, 0.28, 8), GOLD, { p: [Math.sin(a) * 0.4, 0.58, Math.cos(a) * 0.4] }); hb.add(sph(0.045, 1, 1, 1), i % 2 ? c : "#4de0ff", { p: [Math.sin(a) * 0.4, 0.73, Math.cos(a) * 0.4], ink: false }); }
      hb.add(sph(0.06, 1, 1, 1), c, { p: [0, 0.4, 0.45], ink: false }); break;
    case "skull":
      hb.add(sph(0.3, 1, 0.95, 1.0), CREAM, { p: [0, 0.72, 0.0] }); hb.add(box(0.26, 0.14, 0.24, 0.05), CREAM, { p: [0, 0.54, 0.06] });
      for (const s of [-1, 1]) hb.add(sph(0.075, 1, 1.2, 0.5), BLACK, { p: [s * 0.1, 0.72, 0.27], ink: false }); hb.add(cone(0.035, 0.07, 3), BLACK, { p: [0, 0.62, 0.3], r: [Math.PI, 0, 0], ink: false });
      for (let i = -2; i <= 2; i++) hb.add(box(0.03, 0.06, 0.02, 0.005), BLACK, { p: [i * 0.045, 0.52, 0.19], ink: false }); break;
    case "cone": hb.add(cone(0.34, 0.72, 18), "#ff7a1f", { p: [0, 0.82, 0] }); hb.add(cyl(0.2, 0.25, 0.1, 18), "#fff", { p: [0, 0.78, 0], ink: false }); hb.add(box(0.8, 0.05, 0.8, 0.02), c, { p: [0, 0.46, 0] }); break;
    case "duck": hb.add(sph(0.24, 1, 0.8, 1.15), "#ffe030", { p: [0, 0.65, -0.04] }); hb.add(sph(0.15, 1, 1, 1), "#ffe030", { p: [0, 0.86, 0.13] }); hb.add(sph(0.07, 1, 0.45, 0.9), "#ff9f1f", { p: [0, 0.84, 0.28] }); for (const s of [-1, 1]) hb.add(sph(0.02, 1, 1, 0.5), BLACK, { p: [s * 0.07, 0.9, 0.25], ink: false }); hb.add(sph(0.12, 0.4, 0.7, 0.9), "#f2c200", { p: [0.22, 0.66, -0.05], r: [0, 0, -0.3], ink: false }); hb.add(cone(0.07, 0.14, 6), "#ffe030", { p: [0, 0.68, -0.3], r: [-1.2, 0, 0] }); break;
    case "pizza": hb.add(poly([[-0.36, -0.1], [0.36, -0.1], [0, 0.66]], 0.08), "#ffd23a", { p: [0, 0.53, 0.0], r: [Math.PI / 2, 0, 0] }); hb.add(cap(0.06, 0.66, 8), "#d9a05a", { p: [0, 0.54, -0.1], r: [0, 0, Math.PI / 2] }); for (const [x, z] of [[-0.14, 0.04], [0.15, 0.1], [0.0, 0.28], [-0.05, 0.14]]) hb.add(cyl(0.065, 0.065, 0.03, 12), "#d63a3a", { p: [x, 0.585, z], ink: false }); break;
    case "ring": { hb.add(tor(0.46, 0.15, Math.PI * 2, 28), c, { p: [0, 0.4, 0], r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; hb.add(box(0.16, 0.05, 0.3, 0.02), CREAM, { p: [Math.sin(a) * 0.46, 0.4 + 0.12, Math.cos(a) * 0.46], r: [0, a, 0], ink: false }); } break; }
    case "pencil": hb.add(cyl(0.022, 0.022, 0.42, 8), "#ffd23a", { p: [0.55, 0.22, 0.06], r: [0.25, 0, -0.5] }); hb.add(cone(0.022, 0.07, 8), "#d9a476", { p: [0.43, 0.04, 0.09], r: [0.25, 0, -0.5 + Math.PI], ink: false }); hb.add(cyl(0.024, 0.024, 0.05, 8), "#ff8fb8", { p: [0.67, 0.4, 0.04], r: [0.25, 0, -0.5], ink: false }); break;
  }
}

/* ================================ lunettes & masques ================================ */
export function glassesOf(ctx, hb) {
  const { K, P, col } = ctx, { sph, cap, cyl, cone, box, tor, poly, shade } = K, surf = ctx.surf;
  const id = P.glasses.id;
  if (id === "none") return;
  const c = col.gl, ez = surf(0, 0.1)[2] + 0.025, ex = 0.185, ey = 0.07;
  const glass = (x, r, color, op = 0.45, ry = r, y = ey) => hb.add(sph(r, 1, ry / r, 0.18, 14), color, { p: [x, y, ez], ink: false, opacity: op });
  const temples = (y = ey, color = c) => { for (const s of [-1, 1]) hb.add(box(0.016, 0.016, 0.5, 0.005), color, { p: [s * 0.355, y, ez - 0.25], r: [0, -s * 0.18, 0], ink: false }); };
  const ring = (x, R, r, color, y = ey, o = {}) => hb.add(tor(R, r, Math.PI * 2, 20), color, { p: [x, y, ez], ink: false, ...o });
  switch (id) {
    case "round": for (const s of [-1, 1]) { ring(s * ex, 0.1, 0.014, c); glass(s * ex, 0.1, "#bfe6ff", 0.3); } hb.add(tor(0.03, 0.01, Math.PI, 8), c, { p: [0, ey + 0.03, ez], ink: false }); temples(); break;
    case "square": for (const s of [-1, 1]) { const x = s * ex; glass(x, 0.1, "#bfe6ff", 0.3, 0.075); hb.add(box(0.21, 0.014, 0.014, 0.004), c, { p: [x, ey + 0.077, ez], ink: false }); hb.add(box(0.21, 0.014, 0.014, 0.004), c, { p: [x, ey - 0.077, ez], ink: false }); hb.add(box(0.014, 0.155, 0.014, 0.004), c, { p: [x - 0.105, ey, ez], ink: false }); hb.add(box(0.014, 0.155, 0.014, 0.004), c, { p: [x + 0.105, ey, ez], ink: false }); } hb.add(box(0.07, 0.014, 0.014, 0.004), c, { p: [0, ey + 0.05, ez], ink: false }); temples(); break;
    case "shades": for (const s of [-1, 1]) hb.add(box(0.225, 0.14, 0.04, 0.05), "#14101c", { p: [s * ex, ey, ez + 0.01] }); hb.add(box(0.1, 0.02, 0.02, 0.005), "#14101c", { p: [0, ey + 0.04, ez], ink: false }); for (const s of [-1, 1]) hb.add(box(0.05, 0.02, 0.01, 0.005), "#8a7aa8", { p: [s * (ex - 0.04), ey + 0.03, ez + 0.035], r: [0, 0, 0.5], ink: false, opacity: 0.8 }); temples(ey + 0.02, "#14101c"); break;
    case "aviator": for (const s of [-1, 1]) { glass(s * ex, 0.105, "#5a4b2a", 0.75, 0.125, ey - 0.01); ring(s * ex, 0.108, 0.011, GOLD, ey - 0.01, { s: [1, 1.18, 1] }); } hb.add(box(0.07, 0.012, 0.012, 0.004), GOLD, { p: [0, ey + 0.05, ez], ink: false }); temples(ey + 0.04, GOLD); break;
    case "monocle": ring(ex, 0.1, 0.014, GOLD); glass(ex, 0.1, "#dff4ff", 0.25); hb.add(cap(0.006, 0.4, 5), GOLD, { p: [ex + 0.1, ey - 0.25, ez], r: [0, 0, 0.12], ink: false }); break;
    case "patch": hb.add(sph(0.105, 1, 1.05, 0.28), BLACK, { p: [-ex, ey, ez + 0.0] }); hb.add(tor(0.505, 0.012, Math.PI * 2, 24), BLACK, { p: [0, 0.08, -0.02], r: [Math.PI / 2 + 0.15, 0.18, 0], ink: false }); break;
    case "goggles": for (const s of [-1, 1]) { ring(s * ex, 0.115, 0.03, c, ey, { ink: true }); glass(s * ex, 0.11, "#5fd0ff", 0.55); } hb.add(box(0.07, 0.04, 0.03, 0.01), c, { p: [0, ey, ez] }); hb.add(tor(0.5, 0.018, Math.PI * 2, 24), c, { p: [0, ey, -0.01], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "threed": hb.add(box(0.62, 0.2, 0.025, 0.01), CREAM, { p: [0, ey, ez + 0.005] }); hb.add(box(0.19, 0.12, 0.03, 0.01), "#ff3b4b", { p: [-ex, ey, ez + 0.01], ink: false }); hb.add(box(0.19, 0.12, 0.03, 0.01), "#2bd8ff", { p: [ex, ey, ez + 0.01], ink: false }); temples(ey, CREAM); break;
    case "mask": for (const s of [-1, 1]) { hb.add(tor(0.085, 0.045, Math.PI * 2, 18), c, { p: [s * ex, ey, ez], s: [1.1, 0.8, 0.8], r: [0, 0, s * 0.25] }); hb.add(sph(0.2, 1, 0.34, 0.16), c, { p: [s * 0.32, ey + 0.015, ez - 0.03], r: [0, -s * 0.4, s * 0.25] }); } hb.add(sph(0.1, 1, 0.5, 0.2), c, { p: [0, ey, ez + 0.01] }); temples(ey, c); break;
    case "heart": for (const s of [-1, 1]) { const pts = heartPts(22, 0.095); for (const [x, y] of pts) hb.add(sph(0.014, 1, 1, 1, 6), "#ff3b7b", { p: [s * ex + x, ey + 0.015 + y, ez], ink: false }); hb.add(poly(pts.map(([x, y]) => [x, y]), 0.02), "#ff9fc0", { p: [s * ex, ey + 0.015, ez], ink: false, opacity: 0.45 }); } temples(ey, "#ff3b7b"); break;
    case "welder": for (const s of [-1, 1]) { hb.add(tor(0.105, 0.04, Math.PI * 2, 20), "#7d8794", { p: [s * ex, ey, ez + 0.02] }); hb.add(cyl(0.1, 0.1, 0.04, 16), "#1a2a2a", { p: [s * ex, ey, ez + 0.0], r: [Math.PI / 2, 0, 0], ink: false }); hb.add(cyl(0.065, 0.065, 0.045, 16), "#3adf8c", { p: [s * ex, ey, ez + 0.002], r: [Math.PI / 2, 0, 0], ink: false, basic: true, opacity: 0.55 }); } hb.add(box(0.07, 0.04, 0.03, 0.01), "#7d8794", { p: [0, ey, ez] }); hb.add(tor(0.5, 0.03, Math.PI * 2, 24), "#5a4a3a", { p: [0, ey, -0.01], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "lynx": ring(ex, 0.105, 0.03, GOLD, ey, { ink: true }); hb.add(cyl(0.085, 0.085, 0.03, 16), "#ff9f1f", { p: [ex, ey, ez + 0.01], r: [Math.PI / 2, 0, 0], basic: true, ink: false }); hb.add(cyl(0.035, 0.035, 0.034, 12), BLACK, { p: [ex, ey, ez + 0.012], r: [Math.PI / 2, 0, 0], ink: false }); hb.add(cyl(0.02, 0.02, 0.2, 8), GOLD, { p: [ex + 0.14, ey + 0.1, ez - 0.08], r: [Math.PI / 2, 0, -0.5], ink: false }); hb.add(tor(0.5, 0.012, Math.PI * 2, 24), BLACK, { p: [0, ey, -0.01], r: [Math.PI / 2, 0, 0], ink: false }); break;
    case "visor": hb.add(sph(0.36, 1.2, 0.3, 0.3), c, { p: [0, ey + 0.01, ez - 0.07], opacity: 0.55, ink: true }); hb.add(box(0.62, 0.012, 0.012, 0.004), "#52f0ff", { p: [0, ey + 0.1, ez + 0.01], basic: true, ink: false }); for (const s of [-1, 1]) hb.add(box(0.07, 0.12, 0.09, 0.03), shade(c, -0.2), { p: [s * 0.5, ey, 0.0] }); break;
  }
}
