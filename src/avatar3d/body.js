// Corps « haricot » : UN SEUL corps pour tout le monde. Une surface lisse (dôme de tête de rayon 0,5 + ventre + fond arrondi), texture peinte dessus.
// RÈGLE ABSOLUE : la taille et les proportions ne changent JAMAIS, avec ou sans costume. Les costumes, couleurs, motifs et accessoires
// ne modifient que l'apparence (texture) ou ajoutent de petits volumes décoratifs ; ils ne touchent ni au corps, ni aux jambes, ni aux bras.
// Tout est dessiné dans l'« espace de conception » (dôme = rayon 0,5, bas du corps à y = 0) puis le groupe est mis à l'échelle `BEAN.bs`.
import { paramGeo } from "./head.js";

const R = 0.5;
/** LES mesures du haricot (une seule fois, partout). bs : échelle · Lc : hauteur de la partie droite · hb : hauteur du fond · Rm : rayon du ventre · Rb : rayon en bas */
export const BEAN = Object.freeze({ bs: 0.72, Lc: 0.85, hb: 0.45, Rm: 0.5, Rb: 0.46 });
/** Jambes, bras et mains (monde, avant échelle) : identiques pour tous. */
export const LIMBS = Object.freeze({
  legH: 0.34,                      // hauteur des jambes
  hipY: 0.34 + 0.13,
  legR: 0.135, legX: 0.19 * Math.pow(BEAN.bs, 0.6),
  armR: 0.122, armRM: 0.108, armRW: 0.094, armU: 0.25, armF: 0.22,
  shoulderDrop: 0.36,              // l'épaule est posée à cette distance sous le centre de la tête (espace de conception)
  shoulderEmbed: 0.06,             // le haut du bras est enfoncé dans le corps : il pousse du corps, il n'est pas « clipsé » dessus
  rest: Object.freeze({ sz: 0.42, ez: 0.25, sx: -0.12, ex: -0.7 }),    // pose de repos : bras qui pendent, un peu écartés, coudes légèrement pliés vers l'avant
});
export const LEG_H = LIMBS.legH;

const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
/** Rayon de la partie droite : courbe lisse R → Rm (à mi-hauteur) → Rb, pente nulle aux deux bouts (raccord parfait avec le dôme et le fond). */
const hermite = (R, Rm, Rb, t) => {
  const m1 = (Rb - R), seg = (p0, p1, m0, mm1, u) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * 0.5 * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * 0.5 * mm1; };
  return t < 0.5 ? seg(R, Rm, 0, m1, t * 2) : seg(Rm, Rb, m1, 0, (t - 0.5) * 2);
};

/** Profil du corps en 2D (rayon, hauteur) de haut en bas, avec abscisse curviligne : sert à la géométrie ET à la texture. */
export function profileOf(b = BEAN) {
  const Lc = Math.max(0.05, b.Lc), hb = b.hb, yb = hb, yc = hb + Lc, pts = [];
  const N1 = 22, N2 = Math.max(8, Math.round(Lc * 60)), N3 = 22;
  for (let i = 0; i <= N1; i++) { const a = (i / N1) * Math.PI / 2; pts.push([R * Math.sin(a), yc + R * Math.cos(a)]); }
  for (let i = 1; i <= N2; i++) {
    const t = i / N2, y = yc - Lc * t;
    pts.push([hermite(R, b.Rm, b.Rb, t), y]);
  }
  for (let i = 1; i <= N3; i++) { const a = (i / N3) * Math.PI / 2, y = yb - hb * Math.sin(a); pts.push([b.Rb * Math.cos(a), y]); }
  const S = [0];
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = S[S.length - 1];
  const at = (v) => {
    const s = Math.max(0, Math.min(1, v)) * L;
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const t = (s - S[lo]) / ((S[hi] - S[lo]) || 1);
    return [lerp(pts[lo][0], pts[hi][0], t), lerp(pts[lo][1], pts[hi][1], t)];
  };
  /** Rayon à la hauteur y (y de conception). */
  const rAt = (y) => {
    if (y >= yc) return Math.sqrt(Math.max(0, R * R - (y - yc) ** 2));
    if (y <= yb) return b.Rb * Math.sqrt(Math.max(0, 1 - ((yb - y) / hb) ** 2));
    return hermite(R, b.Rm, b.Rb, (yc - y) / Lc);
  };
  return { at, rAt, L, yc, yb, hb, Lc, top: yc + R, Larc: L, eqArc: (Math.PI / 2) * R, below: L - (Math.PI / 2) * R };
}

export function bodyGeo(K, prof) {
  return paramGeo(K, (u, v) => {
    const lon = (u - 0.5) * Math.PI * 2, [r, y] = prof.at(v);
    return [r * Math.sin(lon), y, r * Math.cos(lon)];
  }, 64, 72, { uv: true, center: [0, prof.yc, 0], probe: [0.31, 0.07] });
}
