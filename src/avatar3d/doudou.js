// Doudous : construction 3D d'une créature ronde (corps doux paramétrique, visage peint avec expressions, oreilles, bras, pieds,
// queue, détails d'espèce) + garde-robe (doudou-gear.js) + animation par écrasement / étirement et émotes.
// Interface identique à l'ancien personnage : { group, body, anim(opts), squash(k), shadow, dispose(), … } (mini-jeux, plateau, studio).
import { partsOf } from "./schema.js";
import { paintBody, paintFace, mix, lum } from "./doudou-paint.js";
import { addGear } from "./doudou-gear.js";
import { EMOTE_BY } from "./emotes.js";

const PI = Math.PI, HALF = PI / 2, TAU = PI * 2;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrapPi = (a) => { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

/* ================================ FORME ================================ */
/**
 * Surface du corps : φ fait le tour (0 = devant, +Z), t va du bas (0) au haut (1). Superellipse (bas plat, haut arrondi),
 * tête un peu plus étroite (pear), bosses douces (joues, museau, ventre, yeux de grenouille), drapé du fantôme.
 */
export function makeShape(sp) {
  const H = sp.H, Rx = sp.Rx, Rz = sp.Rz, Y0 = sp.cy * H;
  const bumps = [];
  function base(phi, t) {
    const th = -HALF + t * PI, s = Math.sin(th), c = Math.max(0, Math.cos(th));
    const n = th < 0 ? sp.nb : sp.nt;
    const rr = Math.pow(c, 2 / n), yy = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    let y = Y0 + (th < 0 ? Y0 : H - Y0) * yy;
    const k = 1 - sp.pear * Math.pow(Math.max(0, s), 1.2);
    let rx = Rx * rr * k, rz = Rz * rr * k;
    if (sp.ghost) { const w = sm(-0.45, -0.98, s), wave = 0.5 + 0.5 * Math.cos(phi * 5); rx *= 1 + 0.07 * w * wave; rz *= 1 + 0.07 * w * wave; y -= w * 0.09 * wave; }
    return { x: rx * Math.sin(phi), y, z: rz * Math.cos(phi), s, c };
  }
  function pos(phi, t) {
    const b = base(phi, t);
    if (!bumps.length) return [b.x, b.y, b.z];
    let a = 0;
    for (const q of bumps) { const dp = wrapPi(phi - q.p) / q.wp, dt = (t - q.t) / q.wt, e = dp * dp + dt * dt; if (e < 12) a += q.a * Math.exp(-e * 0.5); }
    return [b.x + Math.sin(phi) * b.c * a, b.y + b.s * a, b.z + Math.cos(phi) * b.c * a];
  }
  function normal(phi, t) {
    if (t < 0.003) return [0, -1, 0];
    if (t > 0.997) return [0, 1, 0];
    const e = 0.0025;
    const a = pos(phi + e, t), b = pos(phi - e, t), c = pos(phi, Math.min(1, t + e)), d = pos(phi, Math.max(0, t - e));
    const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  }
  /** t de la ligne de hauteur y (devant). */
  function tAtY(y) { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (base(0, m).y < y) lo = m; else hi = m; } return (lo + hi) / 2; }
  const rxAt = (t) => Math.max(0.02, Math.abs(base(HALF, t).x));
  const lenAt = (t) => { const e = 0.003, a = pos(0, Math.min(1, t + e)), b = pos(0, Math.max(0, t - e)); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / (2 * e); };
  return { H, Rx, Rz, base, pos, normal, tAtY, rxAt, lenAt, bumps };
}

/** Maillage d'une grille (φ, t) de la surface, décalée le long de la normale (off(φ, t)). */
function gridGeometry(THREE, shape, p0, p1, t0, t1, nu, nv, off = null) {
  const P = [], N = [], U = [], I = [];
  for (let j = 0; j <= nv; j++) {
    const t = t0 + ((t1 - t0) * j) / nv;
    for (let i = 0; i <= nu; i++) {
      const phi = p0 + ((p1 - p0) * i) / nu, p = shape.pos(phi, t), n = shape.normal(phi, t), o = off ? off(phi, t) : 0;
      P.push(p[0] + n[0] * o, p[1] + n[1] * o, p[2] + n[2] * o); N.push(n[0], n[1], n[2]); U.push(i / nu, j / nv);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    I.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  return g;
}

/** Tube effilé le long d'une courbe (queues, cornes, antennes). rad(s) = rayon, ratio = aplatissement de la section. */
export function tubeGeometry(THREE, pts, rad, seg = 24, rs = 12, ratio = 1) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const fr = curve.computeFrenetFrames(seg, false), P = [], I = [], UV = [];
  for (let i = 0; i <= seg; i++) {
    const s = i / seg, C = curve.getPointAt(s), Nn = fr.normals[i], B = fr.binormals[i], r = rad(s);
    for (let j = 0; j <= rs; j++) {
      const a = (j / rs) * TAU, cx = Math.cos(a) * r, cy = Math.sin(a) * r * ratio;
      P.push(C.x + Nn.x * cx + B.x * cy, C.y + Nn.y * cx + B.y * cy, C.z + Nn.z * cx + B.z * cy); UV.push(j / rs, s);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) { const a = i * (rs + 1) + j, b = a + rs + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  g.computeVertexNormals();
  return g;
}
/** Oriente un objet : son axe +Y vers `up`, son +Z au plus près de `fwd`. */
export function orient(THREE, obj, up, fwd) {
  const Y = new THREE.Vector3(up[0], up[1], up[2]).normalize();
  const F = new THREE.Vector3(fwd[0], fwd[1], fwd[2]);
  const Z = F.sub(Y.clone().multiplyScalar(F.dot(Y))).normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
/** Profil d'oreille (rayon en fonction de s ∈ [0, 1]) → maillage tourné puis aplati. */
function earGeometry(THREE, r, h, w, flat, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const s = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, r(s) * w), s * h)); }
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(1, 1, flat);
  g.computeVertexNormals();
  return g;
}
const EARS = {
  cat: { r: (s) => Math.pow(1 - s, 0.62) * (1 - 0.18 * s), h: 0.27, w: 0.15, flat: 0.5, phi: 0.58, y: 0.86, tilt: 0.55, inner: 0.6 },
  fox: { r: (s) => Math.pow(1 - s, 0.7) * (1 - 0.1 * s), h: 0.36, w: 0.155, flat: 0.48, phi: 0.56, y: 0.86, tilt: 0.45, inner: 0.6 },
  bunny: { r: (s) => Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.42) / 0.58, 2))), h: 0.52, w: 0.1, flat: 0.55, phi: 0.36, y: 0.93, tilt: 0.35, inner: 0.62 },
  bear: { r: (s) => Math.sqrt(Math.max(0, 1 - s * s)), h: 0.13, w: 0.135, flat: 0.62, phi: 0.66, y: 0.87, tilt: 0.85, inner: 0.62 },
  mouse: { r: (s) => Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.52) / 0.52, 2))), h: 0.34, w: 0.19, flat: 0.32, phi: 0.66, y: 0.86, tilt: 0.95, inner: 0.65 },
  owl: { r: (s) => Math.pow(1 - s, 0.6), h: 0.17, w: 0.08, flat: 0.6, phi: 0.62, y: 0.9, tilt: 1.15, inner: 0 },
  dog: { r: (s) => Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.55) / 0.6, 2))), h: 0.36, w: 0.13, flat: 0.42, phi: 1.12, y: 0.84, tilt: -1, inner: 0, droop: true },
};

/* ================================ CONSTRUCTION ================================ */
const matCache = new WeakMap();
/** Matériau « doux » partagé (pièces unies). */
function soft(THREE, hex, o = {}) {
  let m = matCache.get(THREE); if (!m) matCache.set(THREE, (m = new Map()));
  const key = hex + "|" + (o.r ?? "") + "|" + (o.m ?? "") + "|" + (o.e ?? "");
  if (!m.has(key)) m.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: o.r ?? 0.62, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, envMapIntensity: o.m ? 0.8 : 0.22 }));
  return m.get(key);
}
export { soft };

export function makeFigure(M, x, o = {}) {
  const { THREE } = M;
  const P = partsOf(x), sp = P.espece;
  const own = [];                                   // géométries, textures et matériaux à libérer
  const geo = (g) => (own.push(g), g);
  const C = { color: P.color.hex, color2: P.color2.hex };
  const galaxy = P.motif.id === "galaxie";
  const partHex = galaxy ? "#2a2160" : C.color;     // oreilles, bras, pieds, queue : couleur dominante
  const rough = sp.glossy ? 0.16 : sp.metal ? 0.34 : 0.6, metal = sp.metal ? 0.45 : 0;
  const partMat = soft(THREE, partHex, { r: rough, m: metal });
  const innerHex = mix(C.color, "#ff9ab8", lum(C.color) > 0.75 ? 0.55 : 0.68);
  const shape = makeShape(sp);
  const Rx = sp.Rx, Rz = sp.Rz, H = sp.H;

  /* ---- mise en page du visage (unités monde, autour du centre des yeux) ---- */
  const tc = shape.tAtY(sp.face.y * H), Lc = shape.lenAt(tc);
  const er = sp.face.er * Rx, E = { ex: sp.face.ex * Rx, rx: er * 0.88, ry: er * 1.12 };
  const snout = !!sp.snout;
  const L = {
    eye: E, mouthW: 0.15 * Rx, mouthY: snout ? -E.ry * 1.05 - 0.05 * Rx : -E.ry * 0.78,
    blush: { x: E.ex + E.rx * 0.62, y: -E.ry * 1.0, r: 0.13 * Rx }, noseY: snout ? -E.ry * 0.78 : -E.ry * 0.38, noseR: (snout ? 0.06 : 0.032) * Rx,
    snoutY: -E.ry * 1.0, snoutR: 0.24 * Rx,
  };
  // bosses : joues potelées, museau, ventre, yeux de grenouille
  for (const s of [-1, 1]) shape.bumps.push({ p: s * Math.asin(clamp(L.blush.x / shape.rxAt(tc), -0.95, 0.95)), t: tc + L.blush.y / Lc, a: 0.022 * Rx, wp: 0.22, wt: 0.07 });
  if (snout) shape.bumps.push({ p: 0, t: tc + L.snoutY / Lc, a: 0.075 * Rx, wp: 0.2, wt: 0.05 });
  shape.bumps.push({ p: 0, t: 0.3, a: 0.03 * Rx, wp: 0.55, wt: 0.12 });
  if (sp.frogEyes) for (const s of [-1, 1]) shape.bumps.push({ p: s * Math.asin(clamp(E.ex / shape.rxAt(tc), -0.95, 0.95)), t: tc + 0.015, a: 0.16 * Rx, wp: 0.19, wt: 0.055 });
  const Lc2 = shape.lenAt(tc);
  const px0 = (fx, fy) => { const t = tc + fy / Lc2; return [Math.asin(clamp(fx / shape.rxAt(t), -0.985, 0.985)), t]; };
  /** Point et normale de la surface pour une position du visage (unités monde). */
  const faceAt = (fx, fy) => { const [phi, t] = px0(fx, fy); return { p: shape.pos(phi, t), n: shape.normal(phi, t), phi, t }; };

  /* ---- corps ---- */
  const root = new THREE.Group(), rig = new THREE.Group(), body = new THREE.Group(), core = new THREE.Group();
  root.add(rig); rig.add(body); body.add(core);
  const bcv = document.createElement("canvas"); bcv.width = 512; bcv.height = 256;
  const glowCv = paintBody(bcv.getContext("2d"), { W: 512, H: 256, eyeT: tc }, { motif: P.motif.id, color: C.color, color2: C.color2 }, sp);
  const btex = new THREE.CanvasTexture(bcv); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 4; own.push(btex);
  let gtex = null; if (glowCv) { gtex = new THREE.CanvasTexture(glowCv); gtex.colorSpace = THREE.SRGBColorSpace; own.push(gtex); }
  const bodyMat = new THREE.MeshStandardMaterial({ map: btex, roughness: rough, metalness: metal, envMapIntensity: metal ? 0.8 : sp.glossy ? 0.7 : 0.22, emissive: gtex ? 0xffffff : 0x000000, emissiveMap: gtex, emissiveIntensity: gtex ? 0.9 : 0 });
  own.push(bodyMat);
  const bodyMesh = new THREE.Mesh(geo(gridGeometry(THREE, shape, -PI, PI, 0, 1, 72, 54)), bodyMat);
  core.add(bodyMesh);

  /* ---- visage : une pièce qui épouse le corps, texture peinte par expression ---- */
  const phiF = Math.min(1.3, Math.asin(clamp((L.blush.x + L.blush.r * 2.0) / shape.rxAt(tc), 0, 0.97)) + 0.08);
  const tTop = Math.min(0.985, tc + (E.ry * 2.15) / Lc2), tBot = Math.max(0.05, tc + (L.mouthY - 0.14 * Rx) / Lc2);
  const fW = 512, fH = clamp(Math.round((fW * (tTop - tBot) * Lc2) / (2 * phiF * shape.rxAt(tc))), 96, 512);
  const F = {
    W: fW, H: fH, eye: E, mouthY: L.mouthY, mouthW: L.mouthW, blush: L.blush, noseY: L.noseY, noseR: L.noseR, snoutY: L.snoutY, snoutR: L.snoutR,
    px: (fx, fy) => { const [phi, t] = px0(fx, fy); return [((phi + phiF) / (2 * phiF)) * fW, (1 - (t - tBot) / (tTop - tBot)) * fH]; },
    sx: (fx, fy) => { const [phi, t] = px0(fx, fy); return fW / (2 * phiF * shape.rxAt(t) * Math.max(0.3, Math.cos(phi))); },
    sy: fH / ((tTop - tBot) * Lc2),
    style: {
      eyes: P.eyes.id, eyec: P.eyec.hex, mouth: P.mouth.id, blush: P.blush.hex || null, blushStyle: P.blush.id, deco: P.deco.id,
      lidC: galaxy ? "#2a2160" : C.color, beak: !!sp.beak, nose: sp.nose || null, snout, snoutC: mix(C.color, "#fff6ec", 0.62),
      eyeRings: !!sp.eyeRings, ringC: mix(C.color, "#ffffff", 0.45), mask: P.glasses.id === "masque", maskC: P.glc.hex,
    },
  };
  const dome = 0.022 * (Rx / 0.6);
  const faceGeo = geo(gridGeometry(THREE, shape, -phiF, phiF, tBot, tTop, 56, 40, (phi, t) => {
    const fx = shape.rxAt(t) * Math.sin(phi), fy = (t - tc) * Lc2;
    let d = 9;
    for (const s of [-1, 1]) d = Math.min(d, Math.pow((fx - s * E.ex) / E.rx, 2) + Math.pow(fy / E.ry, 2));
    return 0.004 + (d < 1 ? dome * Math.pow(1 - d, 0.6) : 0);
  }));
  const faces = new Map();
  const faceTex = (expr) => {
    if (faces.has(expr)) return faces.get(expr);
    const cv = document.createElement("canvas"); cv.width = fW; cv.height = fH;
    paintFace(cv.getContext("2d"), F, expr);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; own.push(t);
    faces.set(expr, t); return t;
  };
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex("n"), transparent: true, depthWrite: false, roughness: 0.42, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  own.push(faceMat);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat); faceMesh.renderOrder = 2; core.add(faceMesh);

  /* ---- oreilles ---- */
  const ears = [];
  if (sp.ears && EARS[sp.ears]) {
    const D = EARS[sp.ears], k = Rx / 0.6;
    const outer = geo(earGeometry(THREE, D.r, D.h * k, D.w * k, D.flat));
    const inner = D.inner ? geo(earGeometry(THREE, D.r, D.h * k * 0.72, D.w * k * D.inner, D.flat * 0.7)) : null;
    const innerMat = soft(THREE, sp.ears === "fox" ? "#fff2e2" : innerHex, { r: 0.7 });
    for (const s of [-1, 1]) {
      const t = shape.tAtY(D.y * H), phi = s * D.phi, p = shape.pos(phi, t), n = shape.normal(phi, t);
      const g = new THREE.Group();
      const sink = 0.035 * k;
      g.position.set(p[0] - n[0] * sink, p[1] - n[1] * sink, p[2] - n[2] * sink);
      const up = D.droop ? [s * 0.45, -1, 0.15] : [n[0] * D.tilt + s * 0.05, 1, n[2] * D.tilt * 0.4];
      orient(THREE, g, up, [s * 0.25, 0, 1]);
      const m = new THREE.Mesh(outer, partMat); g.add(m);
      if (inner) { const mi = new THREE.Mesh(inner, innerMat); mi.position.set(0, D.h * k * 0.08, D.w * k * D.flat * 0.66); g.add(mi); }
      core.add(g); ears.push(g);
    }
  }
  if (sp.ears === "bolt") for (const s of [-1, 1]) { const t = tc, phi = s * 1.45, p = shape.pos(phi, t), n = shape.normal(phi, t); const g = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 20)), soft(THREE, "#c9d2e3", { r: 0.3, m: 0.6 })); g.position.set(p[0], p[1], p[2]); orient(THREE, g, n, [0, 1, 0]); core.add(g); }

  /* ---- détails d'espèce ---- */
  const hdr = shape.tAtY(H * 0.97);
  if (sp.beak) {
    const { p, n } = faceAt(0, sp.beak === "hook" ? -E.ry * 0.55 : -E.ry * 0.62);
    const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
    const len = (sp.beak === "hook" ? 0.11 : 0.13) * Rx / 0.6;
    const m = new THREE.Mesh(geo(new THREE.ConeGeometry(0.075 * Rx / 0.6, len, 18)), soft(THREE, "#ffa63a", { r: 0.45 }));
    m.position.y = len / 2 - 0.01; m.scale.set(1.25, 1, 0.8); g.add(m);
    orient(THREE, g, sp.beak === "hook" ? [n[0], n[1] - 0.7, n[2]] : n, [0, 1, 0]); core.add(g);
  }
  if (sp.tuft) for (let k = -1; k <= 1; k++) { const m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.05, 14, 10)), partMat); m.scale.set(0.8, 2.2, 0.8); m.position.set(k * 0.05, H + 0.06, 0.02); m.rotation.z = -k * 0.45; core.add(m); }
  if (sp.horns) for (const s of [-1, 1]) {
    const t = shape.tAtY(H * 0.9), phi = s * 0.42, p = shape.pos(phi, t), n = shape.normal(phi, t);
    const m = new THREE.Mesh(geo(tubeGeometry(THREE, [[0, -0.02, 0], [s * 0.02, 0.08, -0.01], [s * 0.07, 0.16, -0.04]], (u) => 0.055 * (1 - u * 0.92), 10, 10)), soft(THREE, "#f3e1c0", { r: 0.5 }));
    m.position.set(p[0], p[1], p[2]); orient(THREE, m, [n[0] * 0.5, 1, n[2] * 0.3], [0, 0, 1]); core.add(m);
  }
  if (sp.spikes) for (let k = 0; k < 5; k++) {
    const t = 0.35 + k * 0.13, p = shape.pos(PI, t), n = shape.normal(PI, t);
    const m = new THREE.Mesh(geo(new THREE.ConeGeometry(0.055 - k * 0.004, 0.12, 12)), soft(THREE, C.color2, { r: 0.55 }));
    m.position.set(p[0], p[1], p[2]); orient(THREE, m, n, [0, 1, 0]); m.translateY(0.035); core.add(m);
  }
  if (sp.gills) for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) {
    const t = tc + 0.04, phi = s * 1.25, p = shape.pos(phi, t), n = shape.normal(phi, t);
    const m = new THREE.Mesh(geo(tubeGeometry(THREE, [[0, 0, 0], [0, 0.08, 0], [0, 0.17, 0.02]], (u) => 0.036 * (1 - u * 0.4) * (u > 0.9 ? (1 - u) * 10 : 1), 8, 10)), soft(THREE, mix(C.color, "#ff5f9a", 0.55), { r: 0.55 }));
    m.position.set(p[0], p[1] + k * 0.07, p[2]); orient(THREE, m, [n[0] + s * 0.2, 0.55 + k * 0.6, n[2]], [0, 0, 1]); core.add(m);
  }
  if (sp.antennae) for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 0.17, H - 0.03, 0.02); g.rotation.z = -s * 0.32;
    g.add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 8)), partMat)); g.children[0].position.y = 0.15;
    const ball = new THREE.Mesh(geo(new THREE.SphereGeometry(0.055, 16, 12)), soft(THREE, "#7dff9a", { r: 0.3, e: 0x2f8a46 })); ball.position.y = 0.31; g.add(ball);
    core.add(g);
  }
  if (sp.antenna) {
    const g = new THREE.Group(); g.position.set(0, H - 0.02, 0);
    const st = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 8)), soft(THREE, "#c9d2e3", { r: 0.3, m: 0.6 })); st.position.y = 0.11; g.add(st);
    const ball = new THREE.Mesh(geo(new THREE.SphereGeometry(0.05, 16, 12)), soft(THREE, "#ff5a6e", { r: 0.3, e: 0x8a1428 })); ball.position.y = 0.24; g.add(ball);
    core.add(g);
  }
  void hdr;

  /* ---- bras ---- */
  const arms = [];
  if (sp.arms) {
    const k = Rx / 0.6;
    const dim = sp.arms === "flipper" ? [0.075, 0.25, 0.13] : sp.arms === "wing" ? [0.07, 0.2, 0.15] : [0.095, 0.165, 0.095];
    const g0 = geo(new THREE.SphereGeometry(1, 22, 16)); g0.translate(0, -1, 0);
    for (const s of [-1, 1]) {
      const t = shape.tAtY(H * (sp.arms === "nub" ? 0.47 : 0.52)), phi = s * 1.32, p = shape.pos(phi, t), n = shape.normal(phi, t);
      const piv = new THREE.Group(); piv.position.set(p[0] - n[0] * 0.045, p[1], p[2] - n[2] * 0.045);
      const m = new THREE.Mesh(g0, sp.arms === "wing" ? soft(THREE, mix(partHex, "#000000", 0.08), { r: rough }) : partMat);
      m.scale.set(dim[0] * k, dim[1] * k, dim[2] * k); piv.add(m);
      piv.userData.rest = s * (sp.arms === "nub" ? 0.32 : 0.18);
      core.add(piv); arms.push(piv);
    }
  }

  /* ---- pieds ---- */
  const feet = [];
  if (sp.feet) {
    const k = Rx / 0.6;
    const dim = sp.feet === "long" ? [0.13, 0.08, 0.24] : sp.feet === "duck" ? [0.15, 0.045, 0.17] : sp.feet === "frog" ? [0.17, 0.05, 0.19] : [0.145, 0.085, 0.18];
    const fm = sp.feet === "duck" ? soft(THREE, "#ffa63a", { r: 0.5 }) : P.motif.id === "chaussettes" ? soft(THREE, C.color2, { r: rough }) : partMat;
    const g0 = geo(new THREE.SphereGeometry(1, 22, 14));
    for (const s of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(s * sp.Rx * 0.38, dim[1] * k * 0.92, sp.Rz * 0.56);
      const m = new THREE.Mesh(g0, fm); m.scale.set(dim[0] * k, dim[1] * k, dim[2] * k); f.add(m);
      f.userData.base = f.position.clone(); f.userData.foot = m;
      rig.add(f); feet.push(f);
    }
  }

  /* ---- queue ---- */
  let tail = null;
  if (sp.tail) {
    tail = new THREE.Group();
    const t0 = shape.tAtY(H * (sp.tail === "pom" || sp.tail === "tuft" ? 0.2 : 0.18)), p = shape.pos(PI, t0);
    tail.position.set(p[0], p[1], p[2] + 0.03); core.add(tail);
    const T = sp.tail;
    if (T === "cat") tail.add(new THREE.Mesh(geo(tubeGeometry(THREE, [[0, 0, 0.02], [0.05, 0.05, -0.16], [0.12, 0.2, -0.24], [0.1, 0.38, -0.22], [0.0, 0.46, -0.16]], (u) => 0.055 * (1 - u * 0.25) * (u > 0.93 ? Math.sqrt(Math.max(0, (1 - u) / 0.07)) : 1), 32, 12)), partMat));
    if (T === "dog") tail.add(new THREE.Mesh(geo(tubeGeometry(THREE, [[0, 0, 0.02], [0, 0.08, -0.12], [0, 0.22, -0.18]], (u) => 0.05 * (1 - u * 0.3) * (u > 0.9 ? Math.sqrt(Math.max(0, (1 - u) / 0.1)) : 1), 16, 12)), partMat));
    if (T === "mouse") tail.add(new THREE.Mesh(geo(tubeGeometry(THREE, [[0, -0.05, 0.02], [0.05, -0.12, -0.2], [0.2, -0.13, -0.36], [0.32, -0.05, -0.38], [0.38, 0.08, -0.3]], (u) => 0.022 * (1 - u * 0.6), 32, 8)), soft(THREE, "#ffb3c7", { r: 0.55 })));
    if (T === "pom" || T === "tuft") { const pomMat = sp.id === "lapin" ? soft(THREE, mix(partHex, "#ffffff", 0.6), { r: 0.75 }) : partMat; const m = new THREE.Mesh(geo(new THREE.SphereGeometry(0.1 * Rx / 0.6, 18, 14)), pomMat); m.position.z = -0.03; if (T === "tuft") m.scale.set(0.7, 1.3, 0.7); tail.add(m); }
    if (T === "fox") {
      const g1 = geo(tubeGeometry(THREE, [[0, 0, 0.04], [0.06, 0.06, -0.16], [0.16, 0.22, -0.3], [0.2, 0.42, -0.3]], (u) => (0.05 + Math.sin(Math.min(1, u * 1.15) * PI) * 0.11) * (u > 0.9 ? Math.sqrt(Math.max(0, (1 - u) / 0.1)) : 1), 30, 14));
      tail.add(new THREE.Mesh(g1, partMat));
      const tip = new THREE.Mesh(geo(new THREE.SphereGeometry(0.085, 16, 12)), soft(THREE, "#fff6ea", { r: 0.7 })); tip.position.set(0.2, 0.44, -0.3); tip.scale.set(1, 0.85, 1); tail.add(tip);
    }
    if (T === "dragon") {
      tail.add(new THREE.Mesh(geo(tubeGeometry(THREE, [[0, 0, 0.05], [0.04, -0.04, -0.2], [0.16, 0.0, -0.36], [0.28, 0.1, -0.4]], (u) => 0.1 * (1 - u * 0.92), 24, 12)), partMat));
      const sp2 = new THREE.Mesh(geo(new THREE.ConeGeometry(0.06, 0.12, 4)), soft(THREE, C.color2, { r: 0.55 })); sp2.position.set(0.3, 0.12, -0.41); sp2.rotation.set(0.2, 0, -1.0); sp2.scale.set(1, 1, 0.4); tail.add(sp2);
    }
    if (T === "axo") tail.add(new THREE.Mesh(geo(tubeGeometry(THREE, [[0, 0, 0.04], [0, 0.02, -0.16], [0.02, 0.05, -0.34], [0.05, 0.1, -0.46]], (u) => 0.075 * (1 - u * 0.8), 20, 12, 2.2)), partMat));
  }

  /* ---- garde-robe ---- */
  const gear = addGear({ THREE, M, shape, sp, P, core, rig, feet, arms, soft, own, geo, faceAt, E, L, tc, Lc: Lc2, C, partMat, rough, tube: (pts, rad, seg, rs, ratio) => tubeGeometry(THREE, pts, rad, seg, rs, ratio), orient, grid: gridGeometry });

  /* ---- ombre douce ---- */
  const scv = document.createElement("canvas"); scv.width = scv.height = 64;
  { const g = scv.getContext("2d"), gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,0.45)"); gr.addColorStop(0.6, "rgba(0,0,0,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const stex = new THREE.CanvasTexture(scv); own.push(stex);
  const shadow = new THREE.Mesh(geo(new THREE.CircleGeometry(Rx * 1.12, 32)), new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false }));
  own.push(shadow.material);
  shadow.rotation.x = -HALF; shadow.position.y = 0.012;
  if (o.shadow !== false) root.add(shadow);

  /* ---- repères (studio, cadrages) ---- */
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(core);
  const top = Math.max(box.max.y, H);
  const faceY = shape.pos(0, tc)[1];
  const anchor = (x0, y0, z0) => { const a = new THREE.Object3D(); a.position.set(x0, y0, z0); core.add(a); return a; };
  const anchors = {
    tete: anchor(0, Math.max(H * 0.98, top - 0.08), 0),
    visage: anchor(0, faceY - E.ry * 0.4, shape.pos(0, tc)[2] + 0.05),
    corps: anchor(Rx * 0.25, H * 0.32, shape.pos(0.4, 0.32)[2] + 0.06),
    dos: anchor(-Rx * 0.9, H * 0.5, -Rz * 0.4),   // côté gauche de l'écran (vue de trois quarts), loin du visage
    pieds: anchor(Rx * 0.38, 0.06, Rz * 0.75),
  };
  const focus = {
    full: { y: top / 2, span: Math.max(top, Rx * 2.2) * 1.18 },
    tete: { y: (faceY + top) / 2, span: (top - faceY) * 2.4 + 0.2 },
    visage: { y: faceY - E.ry * 0.5, span: Rx * 1.55 },
    corps: { y: H * 0.45, span: H * 1.25 },
    dos: { y: H * 0.5, span: H * 1.3 },
    pieds: { y: 0.1, span: Rx * 1.6 },
  };

  /* ---- animation ---- */
  const st = { ex: "n", blinkAt: -1, blinkUntil: -1, last: 0 };
  const baseRig = sp.float ? 0.14 : 0;
  const setArm = (a, x0, z0, y0 = 0) => { if (a) a.rotation.set(x0, y0, z0); };
  const fig = {
    group: root, body, core, rig, shadow, color: C.color, scale: 1, x, height: top, faces: true, anchors, focus,
    dims: { H, Rx, Rz, top, faceY, eyeY: faceY },
    bones: {}, head: anchors.tete, torso: core, legs: feet, arms,
    ctx: { THREE, headCY: faceY, hr: Rx, G: { head: anchors.tete }, K: { THREE } },
    /** Pose : run 0..1, air, stun, fall, cheer, sit, steer, surf, push, toss, t (s), emote + emoteT, look (−1..1). */
    anim(a = {}) {
      const t = a.t || 0, run = a.run || 0;
      let hop = 0, sy = 1 + 0.022 * Math.sin(t * 2.3), lean = 0, roll = 0, yaw = (a.look || 0) * 0.45, ex = "n";
      let aL = [0, 0.32], aR = [0, -0.32], wag = Math.sin(t * 2.4) * 0.18, earK = Math.sin(t * 1.7) * 0.03;
      let fo = [[0, 0, 0], [0, 0, 0]];                       // pieds : [soulève, avance, bascule]
      if (a.sit) { const s = a.steer || 0; sy = 0.9; fo = [[0.04, 0.12, -0.6], [0.04, 0.12, -0.6]]; aL = [-1.05 - s * 0.25, 0.22]; aR = [-1.05 + s * 0.25, -0.22]; roll = s * 0.07; }
      else if (a.surf != null) { const k = a.surf; sy = 0.93; lean = 0.06; roll = -k * 0.24; aL = [0, 1.2 + k * 0.35]; aR = [0, -1.2 + k * 0.35]; }
      else if (a.fall) { roll = Math.sin(t * 16) * 0.35; aL = [0, 2.5 + Math.sin(t * 20) * 0.3]; aR = [0, -2.5 - Math.sin(t * 20) * 0.3]; sy = 1.07; ex = "wow"; fo = [[0.05, 0.05, 0.6], [0.05, -0.05, -0.6]]; }
      else if (a.air) { sy = 1.1; aL = [0, 2.2]; aR = [0, -2.2]; fo = [[0.02, 0.05, 0.5], [0.04, -0.04, -0.3]]; }
      else if (a.stun) { roll = Math.sin(t * 9) * 0.17; lean = 0.07; sy = 0.97 + Math.sin(t * 9) * 0.02; aL = [0.25, 0.6]; aR = [0.25, -0.6]; ex = "dizzy"; }
      else if (a.cheer) { const b = Math.abs(Math.sin(t * 7)); hop = b * 0.2; sy = 1 + (b - 0.5) * 0.12; aL = [0, 2.5 + Math.sin(t * 14) * 0.25]; aR = [0, -2.5 - Math.sin(t * 14 + 1) * 0.25]; ex = "happy"; wag = Math.sin(t * 14) * 0.55; }
      else if (a.push) { lean = 0.3; aL = [-1.4, 0.2]; aR = [-1.4, -0.2]; ex = "angry"; }
      else if (run > 0.04) {
        const ph = t * 13, s = Math.sin(ph), c = Math.cos(ph);
        hop = Math.abs(s) * 0.085 * run; sy = 1 + (Math.abs(s) - 0.55) * 0.09 * run; lean = 0.16 * run; roll = s * 0.07 * run;
        aL = [s * 0.95 * run, 0.42]; aR = [-s * 0.95 * run, -0.42]; wag = s * 0.45;
        fo = [[Math.max(0, c) * 0.08 * run, s * 0.13 * run, -s * 0.35 * run], [Math.max(0, -c) * 0.08 * run, -s * 0.13 * run, s * 0.35 * run]];
      }
      if (a.toss) { const k = a.toss; aR = [-2.7 * k, -0.3]; lean -= 0.1 * k; }
      // émotes
      if (a.emote && EMOTE_BY[a.emote]) {
        const d = EMOTE_BY[a.emote].dur, e = a.emoteT || 0, w = sm(0, 0.2, e) * (1 - sm(d - 0.3, d, e));
        const q = { hop: 0, sy: 1, lean: 0, roll: 0, yaw: 0, aL: [0, 0.32], aR: [0, -0.32], ex: "n" };
        switch (a.emote) {
          case "wave": q.aR = [-0.15, -2.55 + Math.sin(e * 11) * 0.38]; q.roll = Math.sin(e * 5.5) * 0.05; q.ex = "happy"; break;
          case "dance": q.hop = Math.abs(Math.sin(e * 6)) * 0.14; q.roll = Math.sin(e * 3) * 0.2; q.yaw = Math.sin(e * 3) * 0.35; q.aL = [0, 1.5 + Math.sin(e * 6) * 0.8]; q.aR = [0, -1.5 + Math.sin(e * 6) * 0.8]; q.ex = "happy"; break;
          case "laugh": q.hop = Math.abs(Math.sin(e * 12)) * 0.05; q.sy = 1 + Math.sin(e * 24) * 0.04; q.lean = -0.12; q.aL = [-0.7, 0.55]; q.aR = [-0.7, -0.55]; q.ex = "happy"; break;
          case "cry": q.sy = 0.95; q.roll = Math.sin(e * 22) * 0.03; q.lean = 0.1; q.aL = [-2.2, 0.55]; q.aR = [-2.2, -0.55]; q.ex = "sad"; break;
          case "angry": q.roll = Math.sin(e * 32) * 0.05; q.sy = 0.96; q.hop = Math.abs(Math.sin(e * 8)) * 0.04; q.aL = [0.35, 0.2]; q.aR = [0.35, -0.2]; q.ex = "angry"; break;
          case "thumbs": q.aR = [-1.65, -0.45]; q.lean = -0.05; q.ex = "wink"; break;
          case "clap": { const k = Math.abs(Math.sin(e * 13)); q.aL = [-1.3, 0.08 + k * 0.42]; q.aR = [-1.3, -0.08 - k * 0.42]; q.hop = k * 0.03; q.ex = "happy"; break; }
          case "heart": q.aL = [-2.3, 0.95]; q.aR = [-2.3, -0.95]; q.hop = Math.abs(Math.sin(e * 5)) * 0.06; q.ex = "love"; break;
          case "shrug": q.aL = [0, 1.3]; q.aR = [0, -1.3]; q.roll = 0.12; q.sy = 1.03; q.ex = "n"; break;
          case "facepalm": q.aR = [-2.25, -0.75]; q.lean = 0.2; q.ex = "blink"; break;
          case "bow": q.lean = 0.5 * Math.sin(Math.min(1, e / (d * 0.7)) * PI); q.aL = [0.3, 0.15]; q.aR = [0.3, -0.15]; q.ex = "blink"; break;
          case "victory": q.hop = e < 0.6 ? Math.sin((e / 0.6) * PI) * 0.4 : Math.abs(Math.sin(e * 6)) * 0.04; q.aR = [0, -2.85]; q.aL = [0, 0.6]; q.ex = "happy"; break;
          default: break;
        }
        hop = lerp(hop, q.hop, w); sy = lerp(sy, q.sy, w); lean = lerp(lean, q.lean, w); roll = lerp(roll, q.roll, w); yaw = lerp(yaw, q.yaw, w);
        aL = [lerp(aL[0], q.aL[0], w), lerp(aL[1], q.aL[1], w)]; aR = [lerp(aR[0], q.aR[0], w), lerp(aR[1], q.aR[1], w)];
        if (w > 0.5) ex = q.ex;
      }
      // clignement des yeux (toutes les 2 à 5 s)
      if (t < st.last || st.blinkAt < 0) st.blinkAt = t + 1 + Math.random() * 3;
      st.last = t;
      if (t > st.blinkAt) { st.blinkUntil = t + 0.13; st.blinkAt = t + 2 + Math.random() * 3.2; }
      if (ex === "n" && t < st.blinkUntil) ex = "blink";
      // application
      rig.position.y = baseRig + hop + (sp.float ? Math.sin(t * 2.2) * 0.05 : 0);
      const sx = 1 / Math.sqrt(Math.max(0.5, sy));
      core.scale.set(sx, sy, sx);
      core.rotation.set(lean, yaw, roll);
      if (arms[0]) setArm(arms[1], aL[0], aL[1]);       // arms[1] = côté +X (gauche du personnage)
      if (arms[0]) setArm(arms[0], aR[0], aR[1]);
      feet.forEach((f, i) => { const b = f.userData.base, q = fo[i === 1 ? 0 : 1]; f.position.set(b.x, b.y + q[0], b.z + q[1]); f.rotation.x = q[2]; });
      if (tail) { tail.rotation.y = wag; tail.rotation.x = -Math.abs(wag) * 0.2; }
      for (const [i, e] of ears.entries()) e.rotation.z = (i ? 1 : -1) * earK;
      if (gear && gear.anim) gear.anim(t, { hop, run, air: !!a.air, fall: !!a.fall });
      if (ex !== st.ex) { st.ex = ex; faceMat.map = faceTex(ex); }
      shadow.scale.setScalar(Math.max(0.55, 1 - (rig.position.y - baseRig * 0.5) * 0.9));
    },
    /** Écrase / étire (rebond au saut, atterrissage). */
    squash(k) { body.scale.set(1 + k * 0.4, 1 - k, 1 + k * 0.4); },
    dispose() {
      for (const g of own) if (g && g.dispose) g.dispose();
      root.traverse((m) => { if (m.geometry && m.geometry.dispose) m.geometry.dispose(); });
    },
  };
  fig.anim({});
  return fig;
}
