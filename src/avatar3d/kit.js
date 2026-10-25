// Boîte à outils 3D de l'avatar : matériaux « dessin animé », contours, formes simples et regroupement des morceaux (peu d'appels de dessin).
// Tout reçoit `M = { THREE, mergeGeometries, RoundedBoxGeometry }` (chargés à la demande, voir render.js) pour que three.js ne pèse rien tant qu'aucun avatar n'est dessiné.

export const INK = 0x16101f;           // couleur du contour
export const INK_W = 0.02;             // épaisseur du contour (unités du monde ; le personnage mesure ≈ 2)
export const OUTLINES = false;         // look Fall Guys : matière plastique douce, sans trait noir autour

const kits = new WeakMap();
export function kitOf(M) {
  let k = kits.get(M);
  if (!k) kits.set(M, (k = makeKit(M)));
  return k;
}

function makeKit(M) {
  const { THREE, mergeGeometries, RoundedBoxGeometry } = M;
  const V = THREE.Vector3;

  /* ---------------- matériaux : plastique doux et brillant (look Fall Guys) ---------------- */
  const mats = new Map();
  const toon = (color, o = {}) => {
    const key = (o.basic ? "b" : "t") + color + (o.map ? "m" + o.map.uuid : "") + (o.opacity ? "o" + o.opacity : "") + (o.rough ? "r" + o.rough : "");
    let m = mats.get(key);
    if (!m) {
      const p = { color: new THREE.Color(color) };
      if (o.map) { p.map = o.map; p.color = new THREE.Color(0xffffff); }
      if (o.opacity) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = false; }
      m = o.basic ? new THREE.MeshBasicMaterial(p) : new THREE.MeshPhysicalMaterial({ ...p, roughness: o.rough ?? 0.55, metalness: 0, envMapIntensity: 0.3, specularIntensity: o.map ? 0.28 : 0.5 });
      mats.set(key, m);
    }
    return m;
  };
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  /* ---------------- formes (toutes « non indexées », position + normale seulement) ---------------- */
  const prep = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k);
    return n;
  };
  const sph = (r, sx = 1, sy = sx, sz = sx, seg = 14) => prep(new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.7) | 0)).scale(sx, sy, sz));
  const dome = (r, sx = 1, sy = 1, sz = 1, seg = 18) => prep(new THREE.SphereGeometry(r, seg, 9, 0, Math.PI * 2, 0, Math.PI / 2).scale(sx, sy, sz));
  const cap = (r, len, seg = 8) => prep(new THREE.CapsuleGeometry(r, len, 4, seg));
  const cyl = (rt, rb, h, seg = 12) => prep(new THREE.CylinderGeometry(rt, rb, h, seg));
  const cone = (r, h, seg = 10) => prep(new THREE.ConeGeometry(r, h, seg));
  const box = (w, h, d, r = 0.02) => prep(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2.2)));
  const tor = (R, r, arc = Math.PI * 2, seg = 18) => prep(new THREE.TorusGeometry(R, r, 8, seg, arc));
  /** Anneau plat (couronnes, auréoles) : cylindre creux. */
  const ring = (R, r, h = 0.06) => prep(new THREE.TorusGeometry(R, r, 8, 24)).rotateX(Math.PI / 2).scale(1, h / (r * 2), 1);
  /** Prisme extrudé depuis un contour 2D (étoiles, cœurs, ailes…) — points [[x,y],…], épaisseur z. */
  const poly = (pts, depth = 0.04) => {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return prep(g);
  };
  /** Surface de révolution : points [[rayon, y],…] du bas vers le haut. */
  const lathe = (pts, seg = 20, phiStart = 0) => {
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, phiStart, Math.PI * 2);
    return prep(g);
  };

  /** Membre effilé (capsule dont les deux bouts n'ont pas le même rayon) : haut du membre en y = 0 (rayon r0), bas en y = -len (rayon r1). */
  const taper = (r0, r1, len, seg = 14) => {
    const pts = [];
    const n = 6;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([r1 * Math.sin(a), -len - r1 * Math.cos(a)]); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
    return prep(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), seg));
  };

  /** Boudin à bout plat : haut en y = 0 (rayon r), bas plat en y = -len, arête du bas arrondie (rayon `edge`). Jambes style Fall Guys : pas de pied. */
  const pill = (r, len, edge = r * 0.45, seg = 20) => {
    const pts = [[0.0001, -len]], n = 6;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([r - edge + edge * Math.sin(a), -len + edge - edge * Math.cos(a)]); }
    pts.push([r, 0], [0.0001, 0]);
    return prep(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));
  };

  /** Transforme une forme : p = position, r = rotation (radians XYZ), s = échelle. */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const place = (g, p, r, s) => {
    if (!p && !r && !s) return g;
    _e.set(...(r || [0, 0, 0])); _q.setFromEuler(_e);
    _m.compose(new V(...(p || [0, 0, 0])), _q, new V(...(s || [1, 1, 1])));
    return g.applyMatrix4(_m);
  };

  /** Contour : copie dont chaque sommet est poussé le long de la normale « lissée » (sommets confondus regroupés). */
  function inkGeo(g, w = INK_W) {
    const pos = g.attributes.position, nor = g.attributes.normal;
    const acc = new Map(), key = (i) => Math.round(pos.getX(i) * 1500) + "," + Math.round(pos.getY(i) * 1500) + "," + Math.round(pos.getZ(i) * 1500);
    const keys = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = (keys[i] = key(i));
      let a = acc.get(k);
      if (!a) acc.set(k, (a = [0, 0, 0]));
      a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i);
    }
    const out = g.clone(), op = out.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const a = acc.get(keys[i]), l = Math.hypot(a[0], a[1], a[2]) || 1;
      op.setXYZ(i, pos.getX(i) + (a[0] / l) * w, pos.getY(i) + (a[1] / l) * w, pos.getZ(i) + (a[2] / l) * w);
    }
    return out;
  }

  /**
   * Regroupe des formes par couleur : `add(forme, couleur, { p, r, s, ink, basic })`, puis `mount(parent)` crée un seul maillage par couleur
   * (+ un seul maillage de contour). C'est ce qui garde le personnage léger même avec 40 dreadlocks.
   */
  class Bucket {
    constructor() { this.fill = new Map(); this.ink = []; }
    add(g, color, o = {}) {
      place(g, o.p, o.r, o.s);
      const key = (o.basic ? "b" : "t") + color + (o.opacity ? "o" + o.opacity : "");
      let a = this.fill.get(key);
      if (!a) this.fill.set(key, (a = { color, o, geos: [] }));
      a.geos.push(g);
      if (OUTLINES && o.ink !== false) this.ink.push(o.inkw ? inkGeo(g, o.inkw) : inkGeo(g));
      return this;
    }
    /** Reprend le contenu d'un autre seau, après transformation (matrice 4×4) : sert à agrandir un ensemble de pièces autour d'un point. */
    absorb(other, m4) {
      if (m4) { for (const a of other.fill.values()) for (const g of a.geos) g.applyMatrix4(m4); for (const g of other.ink) g.applyMatrix4(m4); }
      for (const [key, a] of other.fill) { const e = this.fill.get(key); if (e) e.geos.push(...a.geos); else this.fill.set(key, a); }
      this.ink.push(...other.ink);
      return this;
    }
    mount(parent) {
      for (const a of this.fill.values()) {
        const g = a.geos.length > 1 ? mergeGeometries(a.geos) : a.geos[0];
        const m = new THREE.Mesh(g, toon(a.color, { basic: a.o.basic, opacity: a.o.opacity }));
        parent.add(m);
      }
      if (this.ink.length) parent.add(new THREE.Mesh(this.ink.length > 1 ? mergeGeometries(this.ink) : this.ink[0], inkMat));
      this.fill.clear(); this.ink = [];
      return parent;
    }
  }

  /** Maillage avec texture peinte (tête, torse) + son contour. */
  function textured(g, map, parent, ink = true) {
    const m = new THREE.Mesh(g, toon(0xffffff, { map, rough: 0.5 }));
    parent.add(m);
    if (OUTLINES && ink) parent.add(new THREE.Mesh(inkGeo(g), inkMat));
    return m;
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  /** Teinte plus claire / plus sombre d'une couleur #rrggbb. */
  const shade = (hex, k) => {
    const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    return "#" + new THREE.Color().setHSL(h.h, h.s, clamp(h.l + k, 0, 1)).getHexString();
  };
  const mixc = (a, b, t) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

  return { M, THREE, toon, inkMat, Bucket, textured, inkGeo, sph, dome, cap, cyl, cone, box, tor, ring, poly, lathe, taper, pill, place, lerp, clamp, smooth, shade, mixc, V };
}
