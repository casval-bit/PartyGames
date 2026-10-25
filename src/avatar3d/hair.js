// Coiffures : une « calotte » qui épouse la tête (limite du front / côtés / nuque réglable) + des morceaux en volume selon le style.
import { paramGeo, surf } from "./head.js";

const TALL = new Set(["spiky", "mohawk", "bun", "afro", "curly", "flame", "pompadour", "tuft"]);
const KEEP_HAIR_HATS = new Set(["none", "headband", "halo", "pencil", "tiara", "crown", "party", "bunny", "cat", "devil", "skull"]);

/** Orientation (angles d'Euler) qui amène +Y dans la direction d. */
function eulOf(K, d) {
  const q = new K.THREE.Quaternion().setFromUnitVectors(new K.THREE.Vector3(0, 1, 0), new K.THREE.Vector3(d[0], d[1], d[2]).normalize());
  const e = new K.THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

export function addHair(ctx) {
  const { K, P, col, headShape } = ctx;
  const { sph, cap, cone, cyl, box, tor } = K;
  const hb = (ctx.B.head ||= new K.Bucket());
  let style = P.hair.id;
  if (style === "none") return;
  const hatId = P.hat.id;
  if (!KEEP_HAIR_HATS.has(hatId) && TALL.has(style)) return;
  const hc = col.hair, hd = K.shade(hc, -0.1), hl = K.shade(hc, 0.14);

  const S = (lon, lat, off = 0) => surf(headShape, lon, lat, off);
  /** Calotte : limites de la racine (front, côtés, nuque), épaisseur `off`. */
  const capHair = (front0, side, back, off, color = hc, o = {}) => {
    const smooth = K.smooth, lerp = K.lerp, front = front0 + 0.22;
    const hair = (a) => (a < 0.9 ? lerp(front, front * 0.6 + side * 0.4, smooth(0.2, 0.9, a)) : a < 1.7 ? lerp(front * 0.6 + side * 0.4, side, smooth(0.9, 1.7, a)) : lerp(side, back, smooth(1.7, 2.9, a)));
    const g = paramGeo(K, (u, v) => {
      const lon = (u - 0.5) * Math.PI * 2, a = Math.abs(lon), lat = K.lerp(Math.PI / 2, hair(a), v);
      return S(lon, lat, off * (0.55 + 0.45 * Math.sin(Math.max(0.05, (lat + 0.5) / 2))));
    }, 40, 14, { flip: false });
    hb.add(g, color, o);
  };
  const strand = (lon, lat, len, r, tilt = 0.35, color = hc, drop = 1) => {   // mèche pendante partant d'un point de la tête
    const p = S(lon, lat, 0.02), out = norm([Math.sin(lon), 0, Math.cos(lon)]);
    hb.add(cap(r, len, 6), color, { p: [p[0] + out[0] * 0.03, p[1] - len / 2 * drop, p[2] + out[2] * 0.03], r: [out[2] * tilt * -1, 0, out[0] * tilt], inkw: 0.009 });
  };
  const spike = (lon, lat, h, r, color = hc, o = {}) => {
    const p = S(lon, lat, 0.0), d = norm([Math.cos(lat) * Math.sin(lon), Math.sin(lat) + 0.25, Math.cos(lat) * Math.cos(lon)]);
    hb.add(cone(r, h, 8), color, { p: [p[0] + d[0] * h * 0.42, p[1] + d[1] * h * 0.42, p[2] + d[2] * h * 0.42], r: eulOf(K, d), ...o });
  };

  switch (style) {
    case "tuft":
      for (let i = 0; i < 3; i++) { const a = (i - 1) * 0.42; hb.add(cap(0.035, 0.24, 6), hc, { p: [Math.sin(a) * 0.1, 0.57, 0.02], r: [0, 0, -a * 1.2], inkw: 0.01 }); }
      hb.add(tor(0.075, 0.03, Math.PI * 1.55, 10), hc, { p: [0.03, 0.74, 0.0], r: [0, 0, 0.5], inkw: 0.01 });
      break;
    case "buzz": capHair(0.62, 0.3, 0.0, 0.012, hc); break;
    case "short": capHair(0.55, 0.2, -0.2, 0.045); break;
    case "side":
      capHair(0.58, 0.2, -0.2, 0.045);
      hb.add(sph(0.3, 1.2, 0.5, 0.7), hl, { p: [-0.14, 0.34, 0.27], r: [0.5, 0.2, 0.45] });
      hb.add(sph(0.2, 1, 0.5, 0.6), hc, { p: [-0.3, 0.24, 0.25], r: [0.2, 0.4, 0.8] });
      break;
    case "spiky":
      capHair(0.55, 0.15, -0.15, 0.04);
      for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2, lat = 0.75 + (i % 2) * 0.25; spike(a, lat, 0.34 + (i % 3) * 0.06, 0.1); }
      spike(0.0, 1.45, 0.4, 0.1);
      break;
    case "mohawk":
      capHair(1.0, 0.7, 0.1, 0.012, K.shade(hc, -0.12));
      for (let i = 0; i < 9; i++) { const lat = 1.25 - i * 0.2 + (i > 6 ? -0.05 : 0); const p = S(0, lat, 0.0), d = norm([0, Math.sin(lat) + 0.3, Math.cos(lat)]); hb.add(cone(0.075, 0.32 - i * 0.012, 8), hc, { p: [p[0] + d[0] * 0.14, p[1] + d[1] * 0.14, p[2] + d[2] * 0.14], r: eulOf(K, d), s: [0.55, 1, 1] }); }
      break;
    case "long":
      capHair(0.52, -0.05, -0.55, 0.05);
      hb.add(box(0.98, 0.9, 0.3, 0.12), hc, { p: [0, -0.18, -0.3] });
      for (const s of [-1, 1]) hb.add(cap(0.07, 0.5, 8), hc, { p: [s * 0.44, -0.1, 0.1], r: [0, 0, s * 0.06] });
      break;
    case "pony": {
      capHair(0.55, 0.12, -0.3, 0.045);
      const p = S(Math.PI, 0.35, 0.02);
      hb.add(tor(0.07, 0.025, Math.PI * 2, 10), K.shade(hc, 0.3), { p: [p[0], p[1], p[2] - 0.02], r: [Math.PI / 2 - 0.4, 0, 0], ink: false });
      hb.add(sph(0.12, 1, 1, 1), hc, { p: [p[0], p[1] - 0.04, p[2] - 0.1] });
      hb.add(cap(0.1, 0.4, 8), hc, { p: [p[0], p[1] - 0.28, p[2] - 0.2], r: [-0.4, 0, 0] });
      hb.add(cone(0.1, 0.22, 8), hc, { p: [p[0], p[1] - 0.58, p[2] - 0.32], r: [Math.PI + 0.4, 0, 0] });
      break; }
    case "bun":
      capHair(0.55, 0.15, -0.25, 0.045);
      hb.add(sph(0.22, 1, 0.95, 1), hc, { p: [0, 0.54, -0.04] });
      hb.add(tor(0.18, 0.025, Math.PI * 2, 14), K.shade(hc, 0.3), { p: [0, 0.42, -0.04], r: [Math.PI / 2, 0, 0], ink: false });
      break;
    case "afro":
      capHair(0.7, -0.5, -0.65, 0.17);
      hb.add(sph(0.74, 1, 0.9, 1, 22), hc, { p: [0, 0.26, -0.14] });
      break;
    case "curly": {
      capHair(0.5, -0.1, -0.35, 0.06);
      let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 34; i++) { const lon = r() * Math.PI * 2, lat = 0.15 + r() * 1.3, rr = 0.1 + r() * 0.05, p = S(lon, lat, 0.09); if (Math.cos(lon) > 0.2 && lat < 0.8) continue; hb.add(sph(rr, 1, 1, 1, 10), r() > 0.5 ? hc : hd, { p, inkw: 0.009 }); }
      break; }
    case "bob":
      capHair(0.4, -0.55, -0.6, 0.075);
      break;
    case "pigtails":
      capHair(0.55, 0.2, -0.2, 0.045);
      for (const s of [-1, 1]) {
        const p = S(s * 1.75, 0.2, 0.03);
        hb.add(sph(0.05, 1, 1, 1), "#ff6fae", { p: [p[0] + s * 0.03, p[1], p[2]], ink: false });
        hb.add(sph(0.13, 1, 1, 1), hc, { p: [p[0] + s * 0.08, p[1] - 0.1, p[2]] });
        hb.add(cap(0.1, 0.34, 8), hc, { p: [p[0] + s * 0.14, p[1] - 0.34, p[2]], r: [0, 0, s * 0.18] });
        hb.add(cone(0.1, 0.2, 8), hc, { p: [p[0] + s * 0.2, p[1] - 0.6, p[2]], r: [0, 0, Math.PI + s * 0.18] });
      }
      break;
    case "bowl":
      capHair(0.4, 0.0, -0.05, 0.06);
      break;
    case "pompadour":
      capHair(0.58, 0.2, -0.2, 0.045);
      hb.add(sph(0.26, 1.15, 0.7, 1.35), hl, { p: [0, 0.5, 0.2], r: [-0.55, 0, 0] });
      hb.add(sph(0.2, 1, 0.8, 1), hc, { p: [0, 0.44, -0.04] });
      break;
    case "braids":
      capHair(0.55, -0.05, -0.45, 0.05);
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) hb.add(sph(0.075 - i * 0.004, 1, 1.2, 1, 10), i % 2 ? hc : hd, { p: [s * (0.4 + i * 0.012), -0.02 - i * 0.12, 0.24 - i * 0.02], inkw: 0.009 });
      for (const s of [-1, 1]) hb.add(sph(0.045, 1, 1, 1), "#ff6fae", { p: [s * 0.46, -0.76, 0.16], ink: false });
      hb.add(box(0.92, 0.42, 0.22, 0.1), hc, { p: [0, -0.02, -0.3] });
      break;
    case "emo":
      capHair(0.42, -0.1, -0.45, 0.05);
      hb.add(sph(0.3, 1.1, 0.34, 0.52), hc, { p: [-0.08, 0.2, 0.34], r: [0.35, -0.3, 0.55], s: [1, 1.9, 1] });
      hb.add(box(0.5, 0.7, 0.2, 0.09), hc, { p: [0, -0.1, -0.3] });
      strand(-0.8, 0.0, 0.36, 0.08, 0.1); strand(0.85, 0.05, 0.25, 0.06, -0.1);
      break;
    case "dreads": {
      capHair(0.5, 0.0, -0.3, 0.05);
      let seed = 5; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 22; i++) { const lon = (i / 22) * Math.PI * 2 + r() * 0.2; if (Math.abs(lon - Math.PI * 2) < 0.7 || lon < 0.7) { if (Math.cos(lon) > 0.4) continue; } const lat = 0.15 + r() * 0.5, len = 0.35 + r() * 0.35; strand(lon, lat, len, 0.045, 0.28, i % 3 ? hc : hd); }
      break; }
    case "flame": {
      capHair(0.55, 0.15, -0.15, 0.04, hc);
      const hot = K.shade(hc, 0.2), core = "#ffe86b";
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; spike(a, 0.8 + (i % 2) * 0.25, 0.46 + (i % 3) * 0.1, 0.1, i % 2 ? hot : hc, { basic: true, ink: false }); }
      spike(0, 1.4, 0.55, 0.1, core, { basic: true, ink: false });
      break; }
  }
}
