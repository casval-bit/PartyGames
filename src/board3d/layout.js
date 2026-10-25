// Tracé du plateau 3D : les 32 cases sont posées sur une boucle irrégulière (en forme de haricot), à égale distance les unes des autres.
// Pur calcul, sans three.js : l'indice de case est le même que dans data/board.js (0 = départ, on tourne dans le sens des aiguilles d'une montre vue d'en haut).
// Repère : x vers la droite, z vers le joueur (bas de l'écran), y vers le haut. Case 0 en bas (face à la caméra par défaut).

export const BD_N = 32;
const TAU = Math.PI * 2;

/** Point de la courbe pour t ∈ [0, 1) (t = 0 : en bas, puis vers la gauche, le haut, la droite). */
export function curveAt(t) {
  const a = Math.PI / 2 + t * TAU;
  const r = 8.4 * (1 + 0.1 * Math.sin(2 * a + 0.6) + 0.06 * Math.sin(3 * a + 1.2));
  return { x: Math.cos(a) * r * 1.2, z: Math.sin(a) * r * 0.9 };
}

/** n cases à égale distance sur la courbe : [{ x, y, z, ang }] ; ang = cap vers la case suivante (0 = vers +z). */
export function trackPoints(n = BD_N) {
  const S = 2400, pts = [], cum = [0];
  let prev = null;
  for (let i = 0; i <= S; i++) {
    const p = curveAt(i / S);
    pts.push(p);
    if (prev) cum.push(cum[i - 1] + Math.hypot(p.x - prev.x, p.z - prev.z));
    prev = p;
  }
  const L = cum[S], out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * L;
    while (j < S - 1 && cum[j + 1] < d) j++;
    const f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * f, y: 0, z: pts[j].z + (pts[j + 1].z - pts[j].z) * f, ang: 0 });
  }
  for (let k = 0; k < n; k++) {
    const a = out[k], b = out[(k + 1) % n];
    a.ang = Math.atan2(b.x - a.x, b.z - a.z);
  }
  return out;
}

/** Cases voisines i → i+1 : distance entre centres (utile pour les tests et pour dimensionner les cases). */
export function spacing(tiles) {
  const n = tiles.length, d = [];
  for (let k = 0; k < n; k++) { const a = tiles[k], b = tiles[(k + 1) % n]; d.push(Math.hypot(b.x - a.x, b.z - a.z)); }
  return d;
}

/** Plus grande étendue du plateau (pour cadrer la vue d'ensemble). */
export function extent(tiles) {
  let rx = 0, rz = 0;
  for (const t of tiles) { rx = Math.max(rx, Math.abs(t.x)); rz = Math.max(rz, Math.abs(t.z)); }
  return { rx, rz };
}

/** Position d'un pion sur sa case quand k pions s'y trouvent (j = son rang) : seul = au centre, sinon en cercle. */
export function slotOffset(j, k, radius = 0.36) {
  if (k <= 1) return { x: 0, z: 0 };
  const a = (j / k) * TAU + Math.PI / 4;
  return { x: Math.cos(a) * radius, z: Math.sin(a) * radius };
}

/**
 * Chemin d'un pion de la case `from` à la case `to` : les indices des cases à visiter, une par saut.
 * Jusqu'à `max` cases en avant ou en arrière : on y va à pied ; au-delà (téléporteur, génie, échange) : un seul grand saut.
 */
export function pathBetween(from, to, n = BD_N, max = 12) {
  if (from === to) return { steps: [], jump: false };
  const fwd = (to - from + n) % n, back = (from - to + n) % n;
  if (fwd <= max && fwd <= back) return { steps: Array.from({ length: fwd }, (_, i) => (from + i + 1) % n), jump: false };
  if (back <= max) return { steps: Array.from({ length: back }, (_, i) => (from - i - 1 + n) % n), jump: false };
  return { steps: [to], jump: true };
}
