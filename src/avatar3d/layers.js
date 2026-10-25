// Couches d'épaisseur des costumes : des « coques » souples posées SUR le corps (même profil, rayon + épaisseur), des bagues sur les membres, des petits reliefs.
// RÈGLE : une couche ne remplace jamais le corps, les jambes ou les bras du haricot (body.js) : elle se pose dessus, avec une épaisseur mesurée
// (quelques centièmes), et ne déplace rien. Retirez le costume : le corps en dessous est exactement le même.
import { paramGeo } from "./head.js";
import { eulOf } from "./critter.js";

const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
/** Masque « visage » : 0 devant le visage (tête, face), 1 ailleurs : une seule coque continue autour du corps, sans couture, qui laisse le visage dégagé. */
export const faceMask = (yc, { half = 0.42, soft = 0.34, low = 0.42, lsoft = 0.22 } = {}) => (lon, y) => {
  const f = Math.abs(Math.atan2(Math.sin(lon), Math.cos(lon)));                       // angle depuis le devant (0 = face)
  return Math.max(sm((f - half) / soft), sm((yc - low - y) / lsoft));
};

/**
 * Coque : portion de la peau du corps, épaissie. Hauteurs en « espace de conception » (bas du corps = 0, tête = prof.yc, sommet = prof.top).
 * Longitude 0 = devant (+Z), π/2 = côté droit (+X).
 * o : y0 (bas) · y1 (haut) · a0, a1 (angles ; par défaut tout le tour) · off (épaisseur au centre) · eu / ev (largeur du bord arrondi, en fraction)
 *     lobes { n, amp } : côtes en relief (creux en lon 0 puis tous les 2π/n, sur les traits peints) · mask(lon, y) : 0..1, retire de l'épaisseur (zone du visage) · wave { k, amp } : bas festonné · extra(lon, y) : rayon en plus
 * Renvoie { geo, r(lon, y) : rayon de la surface de la coque (pour y poser des détails) }.
 */
export function makeShell(K, prof, o) {
  const { y0, y1, off = 0.05, eu = 0.3, ev = 0.22, lobes, wave, extra, mask, bury = 0.012 } = o;
  const a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, span = a1 - a0, ring = Math.abs(span - Math.PI * 2) < 1e-6;
  const bottom = (lon) => y0 + (wave ? wave.amp * (0.5 + 0.5 * Math.cos(lon * wave.k)) : 0);
  const thick = (lon, y, fu, fv) => (off + (lobes ? lobes.amp * (0.5 - 0.5 * Math.cos(lon * lobes.n)) : 0) + (extra ? extra(lon, y) : 0)) * fu * fv * (mask ? mask(lon, y) : 1);
  const falloff = (t, e) => Math.pow(sm(t / e), 0.55);
  const at = (u, v) => {
    const lon = a0 + u * span, yb = bottom(lon), y = y1 + (yb - y1) * v;
    const fu = ring ? 1 : falloff(Math.min(u, 1 - u), eu), fv = falloff(Math.min(v, 1 - v), ev);
    return { lon, y, r: prof.rAt(y) + thick(lon, y, fu, fv) - bury };
  };
  const nu = Math.max(8, Math.ceil(span * 12)), nv = Math.max(8, Math.ceil((y1 - y0) * 26));
  const geo = paramGeo(K, (u, v) => { const p = at(u, v); return [p.r * Math.sin(p.lon), p.y, p.r * Math.cos(p.lon)]; }, nu, nv, { center: [0, (y0 + y1) / 2, 0], probe: [0.5, 0.5] });
  /** Rayon de la surface (coque + épaisseur) à (lon, y) : sert à poser boutons, graines, etc. */
  const r = (lon, y) => {
    const u = ring ? 0.5 : (lon - a0) / span, v = (y - y1) / (bottom(lon) - y1 || 1);
    const fu = ring ? 1 : falloff(Math.max(0, Math.min(u, 1 - u)), eu), fv = falloff(Math.max(0, Math.min(v, 1 - v)), ev);
    return prof.rAt(y) + thick(lon, y, fu, fv);
  };
  return { geo, r };
}

/** Outils liés à un personnage en cours de construction (ctx de build.js). */
export function layerKit(ctx) {
  const { K, prof } = ctx, { sph, cyl, box, pill, tor } = K;
  const B = (n) => (ctx.B[n] ||= new K.Bucket());
  const legs = ["legA", "legB"], forearms = ["foreA", "foreB"], uparms = ["armA", "armB"];
  /** Pose une coque sur le corps (seau « torso ») ; renvoie sa fonction de rayon. */
  const shell = (o, color, bucket = "torso") => { const s = makeShell(K, prof, o); B(bucket).add(s.geo, color); return s.r; };
  /** Position (x, y, z) d'un point posé sur une surface de rayon r à (lon, y). */
  const pos = (lon, y, r) => [r * Math.sin(lon), y, r * Math.cos(lon)];
  /** Normale approximative du corps à (lon, y) : sert à coucher un volume plat sur la peau. */
  const normal = (lon, y) => { const dr = (prof.rAt(y + 0.03) - prof.rAt(y - 0.03)) / 0.06; const n = [Math.sin(lon), -dr, Math.cos(lon)], l = Math.hypot(...n); return n.map((v) => v / l); };
  /** Pastille / écaille / bouton : volume aplati posé à plat sur la peau. r : rayon · flat : épaisseur (0..1) · rOut : rayon de la surface de pose. */
  const stud = (lon, y, rOut, size, color, { flat = 0.45, sx = 1, sz = 1, bucket = "torso", out = 0 } = {}) => {
    const n = normal(lon, y), p = pos(lon, y, rOut + out);
    B(bucket).add(sph(size, sx, flat, sz, 10), color, { p, r: eulOf(K, n) });
  };
  /** Manchon sur les deux jambes (bottes, jambières, bas de pantalon) : bas aligné sur le sol, bord du bas arrondi. */
  const legSleeve = ({ h, grow = 0.03, color, edge = 0.05, lift = 0 }) => { for (const n of legs) B(n).add(pill(ctx.lr + grow, h, Math.min(edge, (ctx.lr + grow) * 0.55), 22), color, { p: [0, -ctx.hipY + lift + h + 0.012, 0] }); };
  /** Bague sur les deux jambes à la hauteur y (0 = sol). */
  const legBand = (y, color, { grow = 0.036, t = 0.026 } = {}) => { for (const n of legs) B(n).add(tor(ctx.lr + grow, t, Math.PI * 2, 24), color, { p: [0, -ctx.hipY + y, 0], r: [Math.PI / 2, 0, 0], ink: false }); };
  /** Manchette sur les deux avant-bras (gants, bracelets) : t = distance au coude (0..1), h = hauteur. */
  const cuff = ({ at = 0.8, h = 0.07, grow = 0.03, color }) => { for (const n of forearms) B(n).add(cyl(ctx.arW + grow, ctx.arW + grow * 0.8, h, 16), color, { p: [0, -ctx.ARM_F * at, 0] }); };
  /** Manche sur toute la longueur du bras (haut + avant-bras). */
  const sleeve = ({ grow = 0.026, flare = 0, color }) => {
    for (const n of uparms) B(n).add(cyl(ctx.ar + grow, ctx.arM + grow + flare * 0.4, ctx.ARM_U, 16), color, { p: [0, -ctx.ARM_U / 2, 0] });
    for (const n of forearms) B(n).add(cyl(ctx.arM + grow + flare * 0.4, ctx.arW + grow + flare, ctx.ARM_F * 0.9, 16), color, { p: [0, -ctx.ARM_F * 0.45, 0] });
  };
  /** Épaulette : calotte arrondie posée sur l'épaule. */
  const pauldron = ({ r = 1.3, flat = 0.7, color }) => { for (const n of uparms) B(n).add(sph(ctx.ar * r, 1.05, flat, 1.05, 14), color, { p: [0, 0.015, 0] }); };
  /** Bague tout autour du corps (collier, ceinture) : tore couché. */
  const belt = (y, rOut, t, color) => B("torso").add(tor(rOut, t, Math.PI * 2, 36), color, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], ink: false });
  return { B, shell, pos, normal, stud, legSleeve, legBand, cuff, sleeve, pauldron, belt, box, sph, cyl, uparms };
}

/** Petit générateur pseudo-aléatoire (graines, taches) : même résultat à chaque fois. */
export function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
