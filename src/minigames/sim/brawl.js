// Physique des « haricots qui se poussent » : élan, foncer (dash), chocs. Utilisée par la patate explosive et le roi de la colline.
import { clamp } from "./util.js";

/** Un combattant : position, vitesse, direction (face), foncer (dash/cd) et l'intention du moment (ix, iz ∈ [-1, 1]). */
export function makeBrawler(x, z, bot, extra = {}) {
  return { x, z, vx: 0, vz: 0, y: 0, vy: 0, face: 0, dash: 0, cd: 0, ix: 0, iz: 0, bot: Boolean(bot), alive: true, ...extra };
}
export function brawlDash(o, { speed = 12, dur = 0.28, cd = 1.3 } = {}) {
  if (o.cd > 0 || !o.alive || o.dash > 0) return false;
  o.dash = dur; o.cd = cd;
  const sp = Math.hypot(o.vx, o.vz);
  const dx = sp > 0.5 ? o.vx / sp : Math.sin(o.face), dz = sp > 0.5 ? o.vz / sp : Math.cos(o.face);
  o.vx = dx * speed; o.vz = dz * speed;
  return true;
}
/** Avance un combattant selon son intention (o.ix, o.iz). */
export function brawlMove(o, dt, { accel = 34, cap = 6.2, dashCap = 14, damp = 2.4 } = {}) {
  const m = Math.hypot(o.ix, o.iz);
  if (m > 0.08) {
    const k = accel / Math.max(1, m);
    o.vx += o.ix * k * dt; o.vz += o.iz * k * dt;
    o.face = Math.atan2(o.ix, o.iz);
  }
  const d = Math.exp(-(o.dash > 0 ? 0.6 : damp) * dt);
  o.vx *= d; o.vz *= d;
  const sp = Math.hypot(o.vx, o.vz), c = o.dash > 0 ? dashCap : cap * (o.speedK || 1);
  if (sp > c) { o.vx *= c / sp; o.vz *= c / sp; }
  o.dash = Math.max(0, o.dash - dt); o.cd = Math.max(0, o.cd - dt);
  o.x += o.vx * dt; o.z += o.vz * dt;
}
/**
 * Chocs entre combattants (on se repousse ; celui qui fonce pousse fort). Renvoie la liste des chocs [{a, b, hitter, victim}] de cette image.
 * `radius` = rayon d'un haricot.
 */
export function brawlCollide(list, { radius = 0.7, kick0 = 1.5, dashKick = 7, canHit = () => true } = {}) {
  const hits = [], D = radius * 2;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const p = list[i], q = list[j];
    if (!p.alive || !q.alive) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d >= D || d < 0.001) continue;
    const nx = dx / d, nz = dz / d, ov = D - d;
    p.x -= nx * ov / 2; p.z -= nz * ov / 2; q.x += nx * ov / 2; q.z += nz * ov / 2;
    if (!canHit(p, q)) continue;
    const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
    const kick = Math.max(0, -rv) + kick0 + (p.dash > 0 ? dashKick : 0) + (q.dash > 0 ? dashKick : 0);
    const wp = p.dash > 0 ? 1.8 : 1, wq = q.dash > 0 ? 1.8 : 1, pw = wp / (wp + wq);
    q.vx += nx * kick * pw * 1.2; q.vz += nz * kick * pw * 1.2; p.vx -= nx * kick * (1 - pw) * 1.2; p.vz -= nz * kick * (1 - pw) * 1.2;
    if (p.dash > 0 || q.dash > 0) { const hitter = p.dash > q.dash ? p : q; hits.push({ hitter, victim: hitter === p ? q : p }); }
  }
  return hits;
}
/** Retient le joueur dans un disque de rayon R (mur invisible, léger rebond). */
export function keepInDisc(o, R, bounce = 0.4) {
  const d = Math.hypot(o.x, o.z);
  if (d > R) {
    const nx = o.x / d, nz = o.z / d;
    o.x = nx * R; o.z = nz * R;
    const vn = o.vx * nx + o.vz * nz;
    if (vn > 0) { o.vx -= (1 + bounce) * vn * nx; o.vz -= (1 + bounce) * vn * nz; }
  }
}
export { clamp };
