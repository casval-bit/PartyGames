// Tête : forme (superellipsoïde déformable), géométrie paramétrique, et visage PEINT sur une texture (yeux, sourcils, bouche, barbe, détails).
// Repère de la tête : rayon 0,5 · +Z = devant · +Y = haut · lon = angle autour de Y (0 = face, + vers +X) · lat = hauteur (+ vers le haut).

export const HEAD_SHAPES = {
  //          n      ax    ayT   ayB   az    pear
  round:  { n: 2,   ax: 1,    ayT: 1,    ayB: 0.98, az: 1,    pear: 0 },
  square: { n: 3.6, ax: 1.04, ayT: 0.95, ayB: 0.95, az: 0.98, pear: 0 },
  oval:   { n: 2.2, ax: 0.88, ayT: 1.12, ayB: 1.12, az: 0.95, pear: 0 },
  pear:   { n: 2.3, ax: 0.9,  ayT: 1,    ayB: 1.02, az: 0.98, pear: 0.3 },
  jaw:    { n: 3.1, ax: 1.02, ayT: 0.9,  ayB: 0.88, az: 1,    pear: 0.2 },
  egg:    { n: 2.1, ax: 0.86, ayT: 1.17, ayB: 1.02, az: 0.92, pear: -0.18 },
};
export const HEAD_SCALE = [0.78, 0.9, 1, 1.13, 1.27, 1.48];  // xs … xxl
const R = 0.5;

/** Point de la surface de la tête (rayon 0,5) dans la direction (lon, lat) ; `off` éloigne le point de la surface. */
export function surf(shape, lon, lat, off = 0) {
  const S = HEAD_SHAPES[shape] || HEAD_SHAPES.round;
  const cl = Math.cos(lat), dx = cl * Math.sin(lon), dy = Math.sin(lat), dz = cl * Math.cos(lon);
  const ay = dy > 0 ? S.ayT : S.ayB;
  const q = Math.pow(Math.abs(dx / S.ax), S.n) + Math.pow(Math.abs(dy / ay), S.n) + Math.pow(Math.abs(dz / S.az), S.n);
  const s = Math.pow(q, -1 / S.n) * R + off;
  let x = dx * s, y = dy * s, z = dz * s;
  if (S.pear) { const k = 1 + S.pear * Math.max(-1, Math.min(1, -y / R)); x *= k; z *= k; }
  return [x, y, z];
}

/** Géométrie paramétrique : fn(u, v) → [x,y,z], u,v ∈ [0,1]. Normales par différences finies, orientées vers l'extérieur du centre. */
export function paramGeo(K, fn, nu, nv, { uv = false, flip = false, center = [0, 0, 0], probe = [0.31, 0.43] } = {}) {
  const { THREE } = K;
  const e = 1e-3, pts = [], nrm = [], uvs = [];
  const P = (u, v) => fn(Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
  const N = (u, v) => {
    const a = P(u - e, v), b = P(u + e, v), c = P(u, v - e), d = P(u, v + e);
    const du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dv = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
    let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    let l = Math.hypot(...n);
    if (l < 1e-9) { const p = P(u, v); n = [p[0], p[1], p[2]]; l = Math.hypot(...n) || 1; }
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  // orientation : vers l'extérieur ?
  const pm = P(probe[0], probe[1]), nm = N(probe[0], probe[1]);
  const sgn = ((pm[0] - center[0]) * nm[0] + (pm[1] - center[1]) * nm[1] + (pm[2] - center[2]) * nm[2] >= 0 ? 1 : -1) * (flip ? -1 : 1);
  const vert = (u, v) => { const p = P(u, v), n = N(u, v); pts.push(p[0], p[1], p[2]); nrm.push(n[0] * sgn, n[1] * sgn, n[2] * sgn); if (uv) uvs.push(u, 1 - v); };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
    if (sgn > 0) { vert(u0, v0); vert(u1, v0); vert(u0, v1); vert(u1, v0); vert(u1, v1); vert(u0, v1); }
    else { vert(u0, v0); vert(u0, v1); vert(u1, v0); vert(u1, v0); vert(u0, v1); vert(u1, v1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

/** Tête entière (u = longitude de -π à π, face au milieu ; v = du haut vers le bas). */
export function headGeo(K, shape) {
  return paramGeo(K, (u, v) => surf(shape, (u - 0.5) * Math.PI * 2, (0.5 - v) * Math.PI), 48, 30, { uv: true });
}

/* ================================ visage peint ================================ */
// Style Fall Guys : une « plaque » claire sur le haut du haricot, deux yeux noirs en gélule, presque rien d'autre.
// Tout est dessiné en coordonnées de SURFACE (x = distance sur l'horizontale, y = distance au-dessus de l'équateur du dôme), puis reprojeté
// sur la texture en tenant compte du rétrécissement des parallèles vers le sommet : un rond reste rond sur le crâne.
const INKC = "#1b1426", WHITE = "#ffffff";
export const TEX_W = 1024, EQ = 256;
export const KP = TEX_W / Math.PI;   // pixels (de la texture de base 1024) par unité (sphère de rayon 0,5)
/** Positions du visage (unités de surface) : les yeux, le nez et la bouche s'y calent. */
export const FACE = { eyeY: 0.1, eyeX: 0.085, browY: 0.205, noseY: -0.01, mouthY: -0.11, cy: 0.05 };
export const PX = (x, y) => TEX_W / 2 + (x * KP) / (y > 0 ? Math.max(0.4, Math.cos(Math.min(1.2, y / 0.5))) : 1);
export const PY = (y) => EQ - y * KP;

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const ellPts = (cx, cy, rx, ry, rot = 0, n = 40, a0 = 0, a1 = Math.PI * 2) => {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n, x = Math.cos(t) * rx, y = Math.sin(t) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
};
/** Gélule verticale (ry ≥ rx) ou horizontale. */
const pillPts = (cx, cy, rx, ry) => {
  const out = [];
  if (ry >= rx) { const k = ry - rx; out.push(...ellPts(cx, cy + k, rx, rx, 0, 14, 0, Math.PI), ...ellPts(cx, cy - k, rx, rx, 0, 14, Math.PI, Math.PI * 2)); }
  else { const k = rx - ry; out.push(...ellPts(cx + k, cy, ry, ry, 0, 14, -Math.PI / 2, Math.PI / 2), ...ellPts(cx - k, cy, ry, ry, 0, 14, Math.PI / 2, Math.PI * 1.5)); }
  return out;
};
const rrectPts = (x0, y0, x1, y1, r) => {
  const out = [];
  for (const [cx, cy, a] of [[x1 - r, y1 - r, 0], [x0 + r, y1 - r, 1], [x0 + r, y0 + r, 2], [x1 - r, y0 + r, 3]]) out.push(...ellPts(cx, cy, r, r, 0, 8, (a * Math.PI) / 2, ((a + 1) * Math.PI) / 2));
  return out;
};
const bez = (p0, p1, p2, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });

/**
 * P = { face (#hex de la plaque), faceL, faceD, patch, eyes, eyec, brow, mouth, beard, detail, hairc, noBrow }
 * Dessine sur le contexte 2D du corps (déjà mis à l'échelle de la texture de base).
 */
export function paintFace(g, P) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  const trace = (pts, close) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(PX(x, y), PY(y)) : g.moveTo(PX(x, y), PY(y)))); if (close) g.closePath(); };
  const fillPts = (pts, fill) => { trace(pts, true); g.fillStyle = fill; g.fill(); };
  const ell = (cx, cy, rx, ry, fill, rot = 0) => fillPts(ellPts(cx, cy, rx, ry, rot), fill);
  const pill = (cx, cy, rx, ry, fill) => fillPts(pillPts(cx, cy, rx, ry), fill);
  const line = (pts, w, col) => { trace(pts, false); g.strokeStyle = col; g.lineWidth = w * KP; g.stroke(); };
  const poly = (pts, fill) => fillPts(pts, fill);
  const arc = (cx, cy, r, a0, a1, w, col) => line(ellPts(cx, cy, r, r, 0, 18, a0, a1), w, col);
  const shine = (cx, cy, k = 1) => { g.globalAlpha = 0.92; ell(cx - 0.01 * k, cy + 0.024 * k, 0.0085 * k, 0.012 * k, WHITE); g.globalAlpha = 1; };
  const dark = P.hairc, ec = P.eyec === "#1d1d24" ? "#07060a" : P.eyec, FC = P.face, LED = P.eyec === "#1d1d24" ? "#52f0ff" : P.eyec;   // le noir par défaut est un vrai noir (l'éclairage le grise un peu)
  const { eyeY: eY, eyeX: eX, browY: bY, mouthY: mY } = FACE;

  /* ---- plaque du visage ---- */
  const patchPts = {
    oval: () => ellPts(0, 0.05, 0.172, 0.222), round: () => ellPts(0, 0.06, 0.2, 0.2), wide: () => ellPts(0, 0.07, 0.25, 0.165), tall: () => ellPts(0, 0.06, 0.14, 0.265),
    band: () => rrectPts(-0.33, 0.015, 0.33, 0.185, 0.085),
  }[P.patch];
  if (patchPts) {
    const pts = patchPts();
    g.save(); g.shadowColor = "rgba(20,10,40,.34)"; g.shadowBlur = 5; g.shadowOffsetY = 1; fillPts(pts, FC); g.restore();
    const cx = PX(0, 0.1), cy = PY(0.14), gr = g.createRadialGradient(cx, cy, 2, cx, cy, 0.26 * KP);
    gr.addColorStop(0, P.faceL); gr.addColorStop(1, FC);
    fillPts(pts, gr);
    trace(pts, true); g.strokeStyle = P.faceD; g.globalAlpha = 0.55; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
  }

  /* ---- barbe peinte (zone du bas de la plaque ; moustaches et grosses barbes sont aussi en volume, voir critter.js) ---- */
  if (P.beard === "stubble") {
    const r = rng(7); g.fillStyle = dark; g.globalAlpha = 0.5;
    for (let i = 0; i < 140; i++) { const x = (r() - 0.5) * 0.3, y = -0.02 - r() * 0.15; if (Math.abs(x) < 0.05 && y > -0.13 && y < -0.08) continue; g.beginPath(); g.arc(PX(x, y), PY(y), 1.5 + r() * 1.3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  /* ---- détails du visage ---- */
  const R2 = rng(11);
  switch (P.detail) {
    case "blush": for (const s of [-1, 1]) { g.globalAlpha = 0.8; ell(s * 0.125, -0.035, 0.04, 0.025, "#ff7d9a"); g.globalAlpha = 1; } break;
    case "freckles": g.fillStyle = "#a35f36"; for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1, x = s * (0.07 + R2() * 0.09), y = 0.0 - R2() * 0.06; g.beginPath(); g.arc(PX(x, y), PY(y), 2 + R2() * 1.4, 0, 7); g.fill(); } break;
    case "scar": line([[-0.14, 0.2], [-0.06, -0.06]], 0.013, "#a63a3a"); for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.22, x = -0.14 + 0.08 * t, y = 0.2 - 0.26 * t; line([[x - 0.022, y + 0.008], [x + 0.022, y - 0.008]], 0.008, "#f6e6d4"); } break;
    case "paint": for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line([[s * (0.1 + i * 0.04), -0.03], [s * (0.115 + i * 0.04), -0.12]], 0.016, i === 1 ? WHITE : "#d62a3a"); break;
    case "star": { const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.02 : 0.045; pts.push([0.14 + Math.cos(a) * r, -0.04 - Math.sin(a) * r]); } poly(pts, "#ffd23a"); break; }
    case "tear": poly([[-0.085, 0.03], [-0.1, -0.02], [-0.085, -0.045], [-0.07, -0.02]], "#69c3ff"); break;
    case "plaster": g.save(); g.translate(PX(0.13, -0.04), PY(-0.04)); g.rotate(-0.5); g.fillStyle = "#f2c79a"; g.fillRect(-0.06 * KP, -0.022 * KP, 0.12 * KP, 0.044 * KP); g.fillStyle = "#d9a476"; g.fillRect(-0.016 * KP, -0.022 * KP, 0.032 * KP, 0.044 * KP); g.restore(); break;
    case "tattoo": g.globalAlpha = 0.85; line([[0.15, 0.17], [0.19, 0.2], [0.21, 0.12], [0.17, 0.06], [0.19, 0.0]], 0.012, INKC); g.globalAlpha = 1; break;
    case "sweat": poly([[0.2, 0.2], [0.18, 0.15], [0.2, 0.125], [0.22, 0.15]], "#7cc8ff"); break;
  }

  /* ---- bouche (petite, au bas de la plaque) ---- */
  const smileCurve = (w, d, th = 0.012) => line(bez([-w, mY + 0.008], [0, mY - d * 2], [w, mY + 0.008]), th, INKC);
  const grinPts = (w, d) => bez([-w, mY + 0.012], [0, mY - d * 3.2], [w, mY + 0.012], 16);
  const grin = (w, d, teeth) => {
    const pts = grinPts(w, d);
    g.save(); trace(pts, true); g.fillStyle = "#4a1626"; g.fill(); g.clip();
    if (teeth) { g.fillStyle = WHITE; g.fillRect(PX(-w, mY), PY(mY + 0.012), 2 * w * KP, 0.03 * KP); }
    ell(0, mY - d * 2.2, w * 0.45, d * 0.8, "#f06a85");
    g.restore(); trace(pts, true); g.strokeStyle = INKC; g.lineWidth = 0.009 * KP; g.stroke();
  };
  switch (P.mouth) {
    case "smile": smileCurve(0.055, 0.03); break;
    case "grin": grin(0.075, 0.03, true); break;
    case "flat": line([[-0.04, mY], [0.04, mY]], 0.012, INKC); break;
    case "open": ell(0, mY - 0.005, 0.03, 0.04, "#4a1626"); ell(0, mY - 0.022, 0.02, 0.015, "#f06a85"); trace(ellPts(0, mY - 0.005, 0.03, 0.04), true); g.strokeStyle = INKC; g.lineWidth = 0.008 * KP; g.stroke(); break;
    case "smirk": line(bez([-0.04, mY], [0.015, mY - 0.03], [0.055, mY + 0.025], 12), 0.012, INKC); break;
    case "tongue": smileCurve(0.055, 0.03); poly([[-0.022, mY - 0.012], [0.022, mY - 0.012], [0.025, mY - 0.05], [0, mY - 0.068], [-0.025, mY - 0.05]], "#ff6f92"); line([[0, mY - 0.02], [0, mY - 0.05]], 0.004, "#c4405f"); break;
    case "fangs": smileCurve(0.06, 0.028); for (const s of [-1, 1]) poly([[s * 0.028, mY - 0.002], [s * 0.046, mY - 0.002], [s * 0.037, mY - 0.04]], WHITE); break;
    case "gap": grin(0.075, 0.03, true); g.fillStyle = "#4a1626"; g.fillRect(PX(0.01, mY), PY(mY + 0.012), 0.02 * KP, 0.032 * KP); break;
    case "cat": for (const s of [-1, 1]) line(bez([0, mY + 0.02], [s * 0.012, mY - 0.02], [s * 0.04, mY], 10), 0.01, INKC); break;
    case "shock": ell(0, mY - 0.005, 0.022, 0.03, "#4a1626"); trace(ellPts(0, mY - 0.005, 0.022, 0.03), true); g.strokeStyle = INKC; g.lineWidth = 0.008 * KP; g.stroke(); break;
    case "braces": grin(0.075, 0.03, true); g.fillStyle = "#c9d3de"; for (let i = -3; i <= 3; i++) g.fillRect(PX(i * 0.016, mY) - 2, PY(mY + 0.004), 4, 0.016 * KP); break;
    case "kiss": ell(0, mY - 0.003, 0.024, 0.02, "#ff6f92"); line([[-0.024, mY - 0.003], [0.024, mY - 0.003]], 0.006, "#c4405f"); break;
    case "derp": smileCurve(0.05, 0.026); poly([[0.012, mY - 0.004], [0.052, mY - 0.012], [0.058, mY - 0.048], [0.034, mY - 0.06], [0.012, mY - 0.035]], "#ff6f92"); break;
    case "zig": line([[-0.055, mY], [-0.035, mY + 0.014], [-0.012, mY - 0.014], [0.012, mY + 0.014], [0.035, mY - 0.014], [0.055, mY]], 0.011, INKC); break;
  }

  /* ---- yeux ---- */
  const eyeAt = (cx, cy, k, s, sc = 1) => {
    const E = (v) => v * sc;
    const sclera = (rx, ry, x = cx, y = cy) => { ell(x, y, E(rx), E(ry), WHITE); trace(ellPts(x, y, E(rx), E(ry)), true); g.strokeStyle = "rgba(27,20,38,.9)"; g.lineWidth = 0.009 * KP; g.stroke(); };
    const pupil = (dx, dy, r, x = cx, y = cy) => { ell(x + dx, y + dy, E(r), E(r), ec === "#ffffff" ? INKC : ec); shine(x + dx, y + dy, E(r) / 0.03); };
    const lid = (dir) => { /* paupière : un pan de la couleur de la plaque */ };
    switch (k) {
      case "pill": pill(cx, cy, E(0.03), E(0.062), ec); shine(cx, cy, sc); break;
      case "round": ell(cx, cy, E(0.043), E(0.047), ec); shine(cx, cy, sc * 1.1); break;
      case "dot": ell(cx, cy, E(0.024), E(0.027), ec); shine(cx, cy, sc * 0.6); break;
      case "big": pill(cx, cy, E(0.04), E(0.085), ec); shine(cx, cy, sc * 1.3); break;
      case "googly": sclera(0.056, 0.064); pupil(s * -0.012, -0.016, 0.032); break;
      case "derp": if (s < 0) { sclera(0.062, 0.07); pupil(-0.02, 0.022, 0.03); } else { sclera(0.04, 0.046); pupil(0.01, -0.012, 0.016); } break;
      case "angry": pill(cx, cy, E(0.03), E(0.062), ec); shine(cx, cy - 0.01, sc); poly([[cx - s * 0.05, cy + 0.012], [cx + s * 0.05, cy + 0.06], [cx + s * 0.05, cy + 0.11], [cx - s * 0.05, cy + 0.11]], FC); line([[cx - s * 0.04, cy + 0.016], [cx + s * 0.04, cy + 0.056]], 0.012, INKC); break;
      case "sleepy": pill(cx, cy, E(0.03), E(0.062), ec); poly([[cx - 0.05, cy + 0.0], [cx + 0.05, cy + 0.0], [cx + 0.05, cy + 0.11], [cx - 0.05, cy + 0.11]], FC); line([[cx - 0.04, cy], [cx + 0.04, cy]], 0.012, INKC); break;
      case "happy": arc(cx, cy - 0.03, 0.04, Math.PI * 1.12, Math.PI * 1.88, 0.02, INKC); break;
      case "wink": if (s < 0) { pill(cx, cy, E(0.03), E(0.062), ec); shine(cx, cy, sc); } else arc(cx, cy - 0.03, 0.04, Math.PI * 1.12, Math.PI * 1.88, 0.02, INKC); break;
      case "cross": line([[cx - 0.032, cy + 0.04], [cx + 0.032, cy - 0.04]], 0.018, INKC); line([[cx - 0.032, cy - 0.04], [cx + 0.032, cy + 0.04]], 0.018, INKC); break;
      case "star": { const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.02 : 0.055; pts.push([cx + Math.cos(a) * r, cy - Math.sin(a) * r]); } poly(pts, "#ffc21f"); trace(pts, true); g.strokeStyle = "#c27a00"; g.lineWidth = 0.007 * KP; g.stroke(); break; }
      case "robot": g.fillStyle = "#0b1f2a"; g.fillRect(PX(cx - 0.04, cy), PY(cy + 0.05), 0.08 * KP, 0.1 * KP); g.fillStyle = LED; g.fillRect(PX(cx - 0.032, cy), PY(cy + 0.042), 0.064 * KP, 0.084 * KP); g.fillStyle = "rgba(0,0,0,0.22)"; for (let i = 0; i < 4; i++) g.fillRect(PX(cx - 0.032, cy), PY(cy + 0.034) + i * 0.02 * KP, 0.064 * KP, 0.005 * KP); break;
      case "heart": { const pts = []; for (let i = 0; i <= 28; i++) { const t = (i / 28) * Math.PI * 2, hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([cx + hx * 0.0036, cy + 0.004 + hy * 0.0036]); } poly(pts, "#ff4f86"); ell(cx - 0.02, cy + 0.02, 0.008, 0.005, WHITE, -0.6); break; }
      case "spiral": sclera(0.056, 0.064); { const pts = []; for (let i = 0; i < 70; i++) { const a = i * 0.34, r = 0.002 + i * 0.0007; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.1]); } line(pts, 0.008, INKC); } break;
      case "anime": ell(cx, cy, E(0.048), E(0.066), ec); g.save(); trace(ellPts(cx, cy, E(0.048), E(0.066)), true); g.clip(); ell(cx, cy - 0.05, 0.06, 0.04, "rgba(0,0,0,.3)"); g.restore(); ell(cx, cy - 0.004, E(0.026), E(0.036), INKC); ell(cx - 0.015, cy + 0.026, 0.013, 0.015, WHITE); ell(cx + 0.014, cy - 0.022, 0.007, 0.007, WHITE); break;
    }
  };
  if (P.eyes === "cyclops") { pill(0, eY, 0.05, 0.09, ec); shine(0, eY, 1.5); }
  else {
    for (const s of [-1, 1]) eyeAt(s * eX, eY, P.eyes === "three" ? "pill" : P.eyes, s);
    if (P.eyes === "three") { pill(0, eY + 0.135, 0.022, 0.044, ec); shine(0, eY + 0.135, 0.8); }
  }

  /* ---- sourcils : de simples traits ---- */
  const brow = (s, k) => {
    const cx = s * eX, w = 0.019, hw = 0.05;
    switch (k) {
      case "normal": line(bez([cx - hw, bY], [cx, bY + 0.022], [cx + hw, bY], 10), w, dark); break;
      case "angry": line([[cx + s * hw, bY + 0.03], [cx - s * hw, bY - 0.012]], w * 1.2, dark); break;
      case "sad": line([[cx + s * hw, bY - 0.012], [cx - s * hw, bY + 0.03]], w, dark); break;
      case "thick": line(bez([cx - hw, bY], [cx, bY + 0.026], [cx + hw, bY + 0.002], 10), w * 1.8, dark); break;
      case "raised": { const up = s > 0 ? 0.032 : 0; line(bez([cx - hw, bY + up], [cx, bY + 0.026 + up], [cx + hw, bY + up - 0.004], 10), w, dark); break; }
      case "uni": if (s > 0) line(bez([-eX - hw, bY + 0.003], [0, bY + 0.026], [eX + hw, bY + 0.003], 14), w * 1.7, dark); break;
    }
  };
  if (!P.noBrow && P.eyes !== "cyclops") for (const s of [-1, 1]) brow(s, P.brow);
  g.restore();
}
