// Nez / becs / museaux, oreilles, cornes & crêtes, queues, barbe : tout ce qui fait de lui un animal rigolo.
// Repère « tête » : sphère de rayon 0,5 centrée à l'origine (voir body.js). +Z = devant.
import { surf } from "./head.js";

const PINK = "#ffb3c8", ORANGE = "#ffa51f", CREAM = "#f6f1e4", GOLD = "#f2c230";

export function eulOf(K, d) {
  const q = new K.THREE.Quaternion().setFromUnitVectors(new K.THREE.Vector3(0, 1, 0), new K.THREE.Vector3(d[0], d[1], d[2]).normalize());
  const e = new K.THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}
export const dirOf = (lon, lat) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

export function addCritter(ctx) {
  const { K, P, col } = ctx, { sph, cone, cap, cyl, box, tor, poly, shade, mixc } = K;
  const hb = (ctx.B.head ||= new K.Bucket());
  const S = (lon, lat, off = 0) => surf("round", lon, lat, off);
  const sk = ctx.headC || col.skin, skD = shade(sk, -0.12), inner = mixc(sk, PINK, 0.65);
  /** Pose un volume « debout » sur la surface de la tête (la pointe regarde vers l'extérieur). */
  const stand = (geo, lon, lat, color, o = {}, out = 0, tilt = 0) => {
    const d = dirOf(lon, lat), p = S(lon, lat, out);
    hb.add(geo, color, { p, r: eulOf(K, [d[0], d[1] + tilt, d[2]]), ...o });
  };

  /* ---------------- nez / bec / museau ---------------- */
  const nose = ctx.impliedNose && P.nose.id === "none" ? ctx.impliedNose : P.nose.id;
  const nl = -0.12, np = S(0, nl);
  switch (nose) {
    case "button": hb.add(sph(0.05, 1, 0.9, 0.8), shade(sk, 0.1), { p: [0, np[1], np[2] + 0.005], inkw: 0.008 }); break;
    case "big": hb.add(sph(0.1, 1, 1.1, 1.1), shade(sk, 0.08), { p: [0, np[1] + 0.0, np[2] + 0.03], inkw: 0.012 }); break;
    case "point": hb.add(cone(0.075, 0.24, 10), shade(sk, 0.08), { p: [0, np[1], np[2] + 0.08], r: [Math.PI / 2 - 0.1, 0, 0] }); break;
    case "clown": hb.add(sph(0.085, 1, 1, 1), "#e8352f", { p: [0, np[1] + 0.005, np[2] + 0.045] }); hb.add(sph(0.025, 1, 0.8, 0.5), "#ff9a8f", { p: [-0.03, np[1] + 0.035, np[2] + 0.1], ink: false }); break;
    case "pig": hb.add(cyl(0.12, 0.125, 0.09, 16), "#ff9db8", { p: [0, np[1] - 0.01, np[2] + 0.05], r: [Math.PI / 2, 0, 0] }); for (const s of [-1, 1]) hb.add(sph(0.022, 1, 1.5, 0.6), shade(sk, -0.3), { p: [s * 0.04, np[1] - 0.01, np[2] + 0.1], ink: false }); break;
    case "duck": hb.add(sph(0.2, 1, 0.36, 0.78), ORANGE, { p: [0, np[1] - 0.01, np[2] + 0.1] }); hb.add(sph(0.17, 1, 0.28, 0.7), shade(ORANGE, -0.1), { p: [0, np[1] - 0.065, np[2] + 0.08] }); break;
    case "beak": { const kk = (ctx.suit && ctx.suit.animal && ctx.suit.animal.noseK) || 1; hb.add(cone(0.1 * kk, 0.26 * kk, 4), ORANGE, { p: [0, np[1] - 0.02, np[2] + 0.1 * kk], r: [Math.PI / 2, 0, Math.PI / 4], s: [1.1, 1, 0.8] }); hb.add(cone(0.08 * kk, 0.2 * kk, 4), shade(ORANGE, -0.12), { p: [0, np[1] - 0.075 * kk, np[2] + 0.08 * kk], r: [Math.PI / 2, 0, Math.PI / 4], s: [1, 1, 0.6] }); break; }
    case "dog": hb.add(sph(0.16, 1.05, 0.8, 0.7), shade(sk, 0.14), { p: [0, np[1] - 0.04, np[2] + 0.04] }); hb.add(sph(0.06, 1, 0.8, 0.8), "#241c2c", { p: [0, np[1] + 0.02, np[2] + 0.1] }); break;
    case "trunk": for (let i = 0; i < 7; i++) { const t = i / 6; hb.add(sph(0.075 - t * 0.02, 1, 1, 1, 10), shade(sk, -0.04), { p: [0, np[1] + 0.02 - t * t * 0.3 - t * 0.04, np[2] + 0.06 + t * 0.2 - t * t * 0.04], inkw: 0.01 }); } break;
    case "toucan": hb.add(cone(0.17, 0.56, 14), "#ffb02e", { p: [0, np[1] - 0.03, np[2] + 0.27], r: [Math.PI / 2 + 0.28, 0, 0], s: [1, 1, 0.8] }); hb.add(cone(0.12, 0.4, 12), "#ff8a1f", { p: [0, np[1] - 0.14, np[2] + 0.2], r: [Math.PI / 2 + 0.05, 0, 0], s: [1, 1, 0.6] }); hb.add(sph(0.07, 1, 1, 1), "#e23a3a", { p: [0, np[1] - 0.12, np[2] + 0.53], inkw: 0.01 }); break;
    case "carrot": hb.add(cone(0.09, 0.5, 12), "#ff8a1f", { p: [0, np[1] + 0.04, np[2] + 0.2], r: [Math.PI / 2 + 0.08, 0, 0] }); for (const q of [0.06, 0.15]) hb.add(tor(0.055 - q * 0.2, 0.006, Math.PI * 2, 10), "#e0661a", { p: [0, np[1] + 0.04 - q * 0.04, np[2] + 0.05 + q * 1.1], ink: false }); break;
    case "snout": hb.add(cone(0.11, 0.3, 12), shade(sk, 0.06), { p: [0, np[1] - 0.02, np[2] + 0.1], r: [Math.PI / 2, 0, 0] }); hb.add(sph(0.045, 1, 1, 1), PINK, { p: [0, np[1] - 0.02, np[2] + 0.26], inkw: 0.008 }); for (const s of [-1, 1]) for (let i = 0; i < 2; i++) hb.add(cap(0.004, 0.2, 4), "#241c2c", { p: [s * 0.14, np[1] - 0.05 - i * 0.02, np[2] + 0.12], r: [0, 0, s * (Math.PI / 2 - 0.1 + i * 0.2)], ink: false }); break;
  }

  /* ---------------- oreilles ---------------- */
  const ears = P.ears.id;
  for (const s of [-1, 1]) {
    switch (ears) {
      case "bear": stand(K.sph(0.15, 1, 1, 0.55), s * 0.95, 0.95, sk, { inkw: 0.012 }, 0.01); stand(K.sph(0.09, 1, 1, 0.5), s * 0.95, 0.95, inner, { ink: false }, 0.07); break;
      case "cat": stand(cone(0.17, 0.34, 4), s * 0.8, 0.98, sk, { s: [1, 1, 0.55] }, 0.0); stand(cone(0.1, 0.22, 4), s * 0.8, 0.98, inner, { ink: false, s: [1, 1, 0.5] }, 0.04); break;
      case "bunny": hb.add(cap(0.1, 0.55, 10), sk, { p: [s * 0.2, 0.86, -0.02], r: [0, 0, -s * 0.13], s: [0.7, 1, 0.55] }); hb.add(cap(0.06, 0.48, 8), inner, { p: [s * 0.2, 0.86, 0.04], r: [0, 0, -s * 0.13], s: [0.7, 1, 0.5], ink: false }); break;
      case "dog": hb.add(sph(0.13, 0.5, 1.6, 0.9), skD, { p: [s * 0.53, 0.22, 0.0], r: [0, 0, s * 0.28] }); break;
      case "mouse": stand(K.sph(0.25, 1, 1, 0.25), s * 0.85, 0.82, sk, { inkw: 0.012 }, 0.0, 0.0); stand(K.sph(0.17, 1, 1, 0.25), s * 0.85, 0.82, inner, { ink: false }, 0.05); break;
      case "elf": hb.add(cone(0.085, 0.4, 8), sk, { p: [s * 0.62, 0.2, -0.02], r: [0, 0, -s * 1.15], s: [1, 1, 0.45] }); break;
      case "bat": hb.add(cone(0.15, 0.5, 4), skD, { p: [s * 0.3, 0.64, -0.04], r: [0, Math.PI / 4, -s * 0.28], s: [1, 1, 0.45] }); hb.add(cone(0.09, 0.34, 4), inner, { p: [s * 0.3, 0.6, 0.0], r: [0, Math.PI / 4, -s * 0.28], s: [1, 1, 0.4], ink: false }); break;
      case "eleph": hb.add(sph(0.34, 0.16, 1, 0.9), skD, { p: [s * 0.55, 0.05, -0.06], r: [0, s * 0.35, s * 0.1] }); hb.add(sph(0.26, 0.1, 0.78, 0.7), inner, { p: [s * 0.6, 0.05, -0.04], r: [0, s * 0.35, s * 0.1], ink: false }); break;
      case "fin": hb.add(poly([[0, -0.12], [0.22, 0.04], [0.14, 0.0], [0.24, 0.18], [0.03, 0.09], [0, 0.13]], 0.025), shade(sk, -0.06), { p: [s * 0.5, 0.08, 0], r: [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0], s: [1.2, 1.3, 1] }); break;
    }
  }

  /* ---------------- cornes & crêtes ---------------- */
  const crest = P.crest.id;
  switch (crest) {
    case "horns": for (const s of [-1, 1]) stand(cone(0.075, 0.26, 8), s * 0.65, 1.05, CREAM, {}, 0.0, 0.1); break;
    case "unicorn": { const d = dirOf(0, 1.1), p = S(0, 1.1, 0); hb.add(cone(0.08, 0.5, 12), "#fff3c4", { p: [p[0], p[1] + 0.22, p[2] + 0.03], r: [0.22, 0, 0] }); for (let i = 0; i < 4; i++) hb.add(tor(0.06 - i * 0.012, 0.01, Math.PI * 2, 10), GOLD, { p: [p[0], p[1] + 0.07 + i * 0.09, p[2] + 0.01 + i * 0.02], r: [Math.PI / 2 + 0.22, 0, 0], ink: false }); break; }
    case "antlers": for (const s of [-1, 1]) { const br = "#8a5a32"; hb.add(cap(0.03, 0.4, 6), br, { p: [s * 0.28, 0.72, -0.02], r: [0, 0, -s * 0.35] }); hb.add(cap(0.025, 0.24, 6), br, { p: [s * 0.4, 0.84, -0.02], r: [0, 0, -s * 0.9] }); hb.add(cap(0.022, 0.2, 6), br, { p: [s * 0.2, 0.92, -0.02], r: [0, 0, s * 0.25] }); } break;
    case "antenna": for (const s of [-1, 1]) { hb.add(cap(0.012, 0.32, 5), "#241c2c", { p: [s * 0.14, 0.64, 0.02], r: [0.1, 0, -s * 0.25], ink: false }); hb.add(sph(0.05, 1, 1, 1), s > 0 ? "#ff4f86" : "#4de0ff", { p: [s * 0.21, 0.82, 0.04], basic: true, inkw: 0.01 }); } break;
    case "sprout": hb.add(cyl(0.015, 0.02, 0.2, 6), "#3d9f46", { p: [0, 0.58, 0] }); for (const s of [-1, 1]) hb.add(sph(0.1, 1.3, 0.28, 0.8), "#5fcf5f", { p: [s * 0.1, 0.7, 0], r: [0, 0, s * 0.45] }); break;
    case "spikes": for (let i = 0; i < 6; i++) { const ph = 0.7 + i * 0.42, d = [0, Math.sin(ph), Math.cos(ph)]; hb.add(cone(0.085 - i * 0.004, 0.22 - i * 0.012, 4), GOLD, { p: [0, d[1] * 0.5 + d[1] * 0.07, d[2] * 0.5 + d[2] * 0.07], r: eulOf(K, d) }); } break;
    case "comb": for (let i = 0; i < 4; i++) hb.add(sph(0.095 - Math.abs(i - 1.2) * 0.012, 1, 1.15, 0.8), "#e23a3a", { p: [0, 0.54 - Math.abs(i - 1.2) * 0.02, 0.2 - i * 0.14], inkw: 0.01 }); break;
    case "fin": hb.add(poly([[-0.22, 0], [0.2, 0], [0.04, 0.42], [-0.08, 0.5]], 0.05), shade(sk, -0.12), { p: [0, 0.48, -0.04], r: [0, Math.PI / 2, 0] }); break;
    case "bolt": hb.add(poly([[0.1, 0.34], [-0.06, 0.1], [0.03, 0.1], [-0.1, -0.16], [0.14, 0.14], [0.04, 0.14], [0.18, 0.34]].map(([x, y]) => [x * 1.1, y * 1.1]), 0.05), "#ffe03a", { p: [0, 0.66, 0], r: [0, 0, 0], basic: true }); break;
    case "prop": hb.add(cyl(0.02, 0.02, 0.1, 6), "#241c2c", { p: [0, 0.55, 0], ink: false }); for (let i = 0; i < 2; i++) hb.add(sph(0.3, 1, 0.07, 0.12), i ? "#e23a3a" : "#4fb6ff", { p: [0, 0.61, 0], r: [0, i * Math.PI / 2 + 0.3, 0.06], inkw: 0.012 }); hb.add(sph(0.04, 1, 1, 1), GOLD, { p: [0, 0.62, 0], ink: false }); break;
    case "candle": hb.add(cyl(0.05, 0.055, 0.3, 10), CREAM, { p: [0, 0.65, 0] }); hb.add(sph(0.04, 0.8, 1.5, 0.8), "#ff9f1f", { p: [0, 0.86, 0], basic: true, ink: false }); hb.add(sph(0.022, 0.8, 1.4, 0.8), "#fff3a0", { p: [0, 0.855, 0.01], basic: true, ink: false }); break;
  }

  /* ---------------- moustache / barbe ---------------- */
  const bd = P.beard.id, hc = col.hair, m0 = S(0, -0.3);
  if (bd === "mustache" || bd === "handlebar" || bd === "full" || bd === "long") for (const s of [-1, 1]) {
    hb.add(sph(0.07, 1.4, 0.55, 0.7), hc, { p: [s * 0.065, m0[1] + 0.145, m0[2] + 0.01], r: [0, 0, -s * 0.2] });
    if (bd === "handlebar") hb.add(K.tor(0.04, 0.013, Math.PI * 1.2, 10), hc, { p: [s * 0.16, m0[1] + 0.155, m0[2] - 0.005], r: [0, 0, s > 0 ? 0.3 : Math.PI - 0.3] });
  }
  if (bd === "goatee") hb.add(sph(0.1, 1, 1.15, 0.7), hc, { p: [0, -0.4, 0.42] });
  if (bd === "soul") hb.add(sph(0.035, 1, 1.4, 0.8), hc, { p: [0, -0.3, 0.47] });
  if (bd === "full") hb.add(sph(0.36, 1.05, 0.5, 0.85), hc, { p: [0, -0.37, 0.08] });
  if (bd === "long") { hb.add(sph(0.36, 1.05, 0.5, 0.85), hc, { p: [0, -0.37, 0.08] }); hb.add(cone(0.24, 0.62, 14), hc, { p: [0, -0.74, 0.2], r: [Math.PI, 0, 0], s: [1, 1, 0.6] }); }
}

/** Queue (dans le groupe « tail », fixé à l'arrière du corps ; s'étend vers -Z). */
export function addTail(ctx) {
  const { K, P, col } = ctx, { sph, cone, cap, tor, poly, shade, mixc } = K;
  const id = P.tail.id;
  if (id === "none") { const an = ctx.suit && ctx.suit.animal; if (an && an.tail) { an.tail(ctx); return "costume"; } return null; }     // pas de queue choisie : celle du costume, s'il en a une
  const tb = (ctx.B.tail ||= new K.Bucket()), sk = ctx.headC || col.skin, skD = shade(sk, -0.14);
  switch (id) {
    case "cat": for (let i = 0; i < 9; i++) { const t = i / 8; tb.add(sph(0.075, 1, 1, 1, 8), i > 6 ? shade(sk, -0.3) : sk, { p: [Math.sin(t * 2.4) * 0.14, t * 0.42, -0.12 - t * 0.34], inkw: 0.012 }); } break;
    case "fox": tb.add(sph(0.2, 0.9, 1, 1.9), "#ee7a2a", { p: [0, 0.18, -0.36], r: [0.7, 0, 0] }); tb.add(sph(0.12, 0.85, 0.9, 1.1), CREAM, { p: [0, 0.4, -0.68], r: [0.7, 0, 0] }); break;
    case "dino": tb.add(cone(0.22, 0.8, 10), sk, { p: [0, 0.06, -0.5], r: [-1.75, 0, 0] }); for (let i = 0; i < 3; i++) tb.add(cone(0.06, 0.14, 4), GOLD, { p: [0, 0.22 - i * 0.02, -0.28 - i * 0.2], r: [-0.4, 0, 0] }); break;
    case "bunny": tb.add(sph(0.2, 1, 1, 1), "#fff", { p: [0, 0.04, -0.14] }); break;
    case "pig": for (let i = 0; i < 12; i++) { const t = (i / 11) * Math.PI * 2.2; tb.add(sph(0.05, 1, 1, 1, 6), "#ff9db8", { p: [Math.sin(t) * 0.1, 0.1 + Math.cos(t) * 0.1 + i * 0.016, -0.12 - i * 0.016], inkw: 0.008 }); } break;
    case "mouse": for (let i = 0; i < 9; i++) { const t = i / 8; tb.add(sph(0.04, 1, 1, 1, 6), "#ffb3c8", { p: [Math.sin(t * 5) * 0.1, 0.02 + t * 0.12, -0.12 - t * 0.6], inkw: 0.008 }); } break;
    case "devil": for (let i = 0; i < 8; i++) { const t = i / 7; tb.add(sph(0.04, 1, 1, 1, 6), "#c4202c", { p: [Math.sin(t * 3) * 0.12, t * 0.5, -0.12 - t * 0.3], inkw: 0.008 }); } tb.add(cone(0.1, 0.2, 4), "#c4202c", { p: [0.18, 0.62, -0.46], r: [-0.8, 0, 0.7], s: [1, 1, 0.4] }); break;
    case "duck": for (let i = -2; i <= 2; i++) tb.add(sph(0.09, 0.55, 1.2, 0.8), i % 2 ? "#e8e8f0" : "#fff", { p: [i * 0.07, 0.1 + 0.03 - Math.abs(i) * 0.03, -0.14], r: [0.7, 0, i * 0.3] }); break;
  }
  return id;
}
