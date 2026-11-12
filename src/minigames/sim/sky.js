// Pilotes de l'extrême : on vole droit devant dans un ciel de bonbons, le joueur dirige l'avion (haut, bas, gauche, droite) pour traverser des anneaux.
// Pile au centre = bonus ; mines à éviter ; boules d'énergie pour le turbo. Les 4 avions ont le même parcours, chacun avance à sa vitesse.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, clamp } from "./util.js";

export const SK = { LX: 6.6, LY: 4.2, ring: 2.3, perfect: 0.9, v0: 20, turbo: 1.5, space: 19, N: 90, mineR: 1.0, planeR: 0.55 };

/** Parcours : anneaux sur une courbe sinueuse, mines au milieu des couloirs, boules d'énergie légèrement décalées. */
export function makeCourse(r) {
  const rings = [], mines = [], orbs = [];
  let cx = 0, cy = 0;
  for (let k = 0; k < SK.N; k++) {
    const z = 30 + k * SK.space;
    if (k > 0) {
      cx = clamp(cx + (r() - 0.5) * 8.2, -SK.LX + 2.3, SK.LX - 2.3);
      cy = clamp(cy + (r() - 0.5) * 5.6, -SK.LY + 1.7, SK.LY - 1.7);
    }
    rings.push({ k, x: cx, y: cy, z, hue: k % 6 });
  }
  for (let k = 1; k < SK.N; k++) {
    const a = rings[k - 1], b = rings[k];
    if (k > 2 && r() < 0.5) {                                    // une mine sur la trajectoire directe entre deux anneaux
      const t = 0.4 + r() * 0.25;
      mines.push({ x: a.x + (b.x - a.x) * t + (r() - 0.5) * 1.4, y: a.y + (b.y - a.y) * t + (r() - 0.5) * 1.2, z: a.z + (b.z - a.z) * t, spin: r() * 6.28 });
      if (r() < 0.18) mines.push({ x: a.x + (b.x - a.x) * 0.6 + (r() < 0.5 ? -2.4 : 2.4), y: a.y + (b.y - a.y) * 0.6 + (r() - 0.5) * 2, z: a.z + (b.z - a.z) * 0.6, spin: r() * 6.28 });
    }
    if (k % 3 === 0) { const t = 0.5, sx = r() < 0.5 ? -1 : 1; orbs.push({ x: clamp(a.x + (b.x - a.x) * t + sx * 1.7, -SK.LX + 0.6, SK.LX - 0.6), y: clamp(a.y + (b.y - a.y) * t + (r() - 0.5) * 2.4, -SK.LY + 0.6, SK.LY - 0.6), z: a.z + (b.z - a.z) * t, taken: [false, false, false, false] }); }
  }
  return { rings, mines, orbs };
}

export function createSky(seed, { seconds = 36, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x5c1b17);
  const C = makeCourse(r);
  const P = [0, 1, 2, 3].map((i) => ({
    i, bot: i > 0 || autoMe, x: (i - 1.5) * 1.2, y: 0, z: 0, vx: 0, vy: 0, v: SK.v0, energy: 0.35, turbo: false, spin: 0, inv: 0,
    next: 0, rings: 0, perfects: 0, combo: 0, best: 0, mines: 0, orbs: 0, pts: 0, roll: 0, pitch: 0,
    skill: 0.9 + rb() * 0.2, aim: 0.55 + rb() * 0.55, see: 0.55 + rb() * 0.4,
    err: Array.from({ length: SK.N }, () => [rb() + rb() - 1, rb() + rb() - 1]),
    seen: new Set(), ix: 0, iy: 0, wantTurbo: false,
  }));
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], course: C, events: [], done: false, endAt: null };

  /**
   * Intelligence des bots : parmi quelques points de passage dans l'anneau, on garde celui dont la trajectoire évite les mines
   * (vers cet anneau, puis vers le suivant) tout en restant près du centre ; puis on vise avec une erreur propre à chaque bot.
   */
  const OFFS = [[0, 0], [1.1, 0], [-1.1, 0], [0, 0.9], [0, -0.9], [1.3, 0.9], [-1.3, 0.9], [1.3, -0.9], [-1.3, -0.9], [1.9, 0], [-1.9, 0]];
  function think(o) {
    const ring = C.rings[o.next], nxt = C.rings[o.next + 1]; if (!ring) { o.ix = o.iy = 0; return; }
    for (const m of C.mines) if (!o.seen.has(m) && m.z - o.z > 0 && m.z - o.z < 18 + 34 * o.see) o.seen.add(m);
    const near = C.mines.filter((m) => o.seen.has(m) && m.z > o.z - 1 && m.z < (nxt ? nxt.z : ring.z));
    const hitCost = (x0, y0, z0, x1, y1, z1) => {
      let c = 0;
      for (const m of near) {
        if (m.z < z0 || m.z > z1) continue;
        const t = (m.z - z0) / Math.max(0.01, z1 - z0), d = Math.hypot(x0 + (x1 - x0) * t - m.x, y0 + (y1 - y0) * t - m.y);
        if (d < 2.1) c += (2.1 - d) * 7;
      }
      return c;
    };
    let best = null, bc = 1e9;
    for (const [ox, oy] of OFFS) {
      const tx = clamp(ring.x + ox, -SK.LX, SK.LX), ty = clamp(ring.y + oy, -SK.LY, SK.LY);
      const c = Math.hypot(ox, oy) * 0.7 + hitCost(o.x, o.y, o.z, tx, ty, ring.z) + (nxt ? hitCost(tx, ty, ring.z, nxt.x, nxt.y, nxt.z) : 0) + Math.abs(tx - o.x) * 0.04;
      if (c < bc) { bc = c; best = [tx, ty]; }
    }
    const e = o.err[o.next], errAmp = 3.1 - o.aim * 1.45;
    const tx = best[0] + e[0] * errAmp, ty = best[1] + e[1] * errAmp * 0.8;
    o.ix = clamp((tx - o.x) * 0.9, -1, 1); o.iy = clamp(-(ty - o.y) * 1.0, -1, 1);   // iy > 0 = vers le bas (comme la manette)
    o.wantTurbo = o.energy > 0.55 && o.spin <= 0 && !near.some((m) => m.z - o.z > 0 && m.z - o.z < 16 && Math.hypot(m.x - o.x, m.y - o.y) < 3);
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) { me.ix = inp.x; me.iy = inp.y; me.wantTurbo = inp.act; }
    for (const o of P) {
      if (o.bot) think(o);
      o.spin = Math.max(0, o.spin - dt); o.inv = Math.max(0, o.inv - dt);
      // direction : l'avion glisse vers la vitesse voulue (un peu d'inertie)
      const spinK = o.spin > 0 ? 0.25 : 1;
      const vxT = o.ix * 8.4 * spinK, vyT = -o.iy * 6.4 * spinK;
      o.vx += (vxT - o.vx) * Math.min(1, 7 * dt); o.vy += (vyT - o.vy) * Math.min(1, 7 * dt);
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (Math.abs(o.x) > SK.LX) { o.x = Math.sign(o.x) * SK.LX; o.vx *= 0.2; }
      if (Math.abs(o.y) > SK.LY) { o.y = Math.sign(o.y) * SK.LY; o.vy *= 0.2; }
      // vitesse : turbo tant qu'il y a de l'énergie, mine = ralentissement
      o.turbo = o.wantTurbo && o.energy > 0 && o.spin <= 0;
      if (o.turbo) o.energy = Math.max(0, o.energy - 0.36 * dt);
      const vt = SK.v0 * (o.bot ? o.skill : 1) * (o.turbo ? SK.turbo : 1) * (o.spin > 0 ? 0.45 : 1);
      o.v += (vt - o.v) * Math.min(1, 4 * dt);
      o.z += o.v * dt;
      o.roll += (clamp(-o.vx * 0.085, -0.7, 0.7) - o.roll) * Math.min(1, 9 * dt);
      o.pitch += (clamp(o.vy * 0.05, -0.4, 0.4) - o.pitch) * Math.min(1, 8 * dt);
      // anneaux : on les valide quand on franchit leur plan
      for (let g = 0; g < 3; g++) {
        const ring = C.rings[o.next];
        if (!ring || o.z < ring.z) break;
        const d = Math.hypot(o.x - ring.x, o.y - ring.y);
        if (d < SK.ring - 0.2) {
          const perfect = d < SK.perfect;
          o.rings++; o.combo++; o.best = Math.max(o.best, o.combo); if (perfect) o.perfects++;
          const gain = 10 + (perfect ? 10 : 0) + Math.min(8, o.combo - 1);
          o.pts += gain;
          S.events.push({ type: "ring", i: o.i, k: ring.k, perfect, gain, combo: o.combo, x: ring.x, y: ring.y, z: ring.z });
        } else { o.combo = 0; S.events.push({ type: "miss", i: o.i, k: ring.k, x: o.x, y: o.y, z: o.z }); }
        o.next++;
      }
      // mines et boules d'énergie
      if (o.inv <= 0) for (const m of C.mines) {
        if (Math.abs(m.z - o.z) > 1.3) continue;
        if (Math.hypot(m.x - o.x, m.y - o.y) < SK.mineR + SK.planeR) { o.spin = 0.9; o.inv = 1.6; o.combo = 0; o.mines++; o.pts = Math.max(0, o.pts - 6); S.events.push({ type: "mine", i: o.i, x: m.x, y: m.y, z: m.z }); break; }
      }
      for (const b of C.orbs) {
        if (b.taken[o.i] || Math.abs(b.z - o.z) > 1.3) continue;
        if (Math.hypot(b.x - o.x, b.y - o.y) < 1.15) { b.taken[o.i] = true; o.energy = Math.min(1, o.energy + 0.3); o.orbs++; S.events.push({ type: "orb", i: o.i, k: C.orbs.indexOf(b), x: b.x, y: b.y, z: b.z }); }
      }
    }
    if (S.t >= seconds && S.endAt == null) S.endAt = S.t + 0.3;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const rank = (o) => P.filter((q) => q.pts > o.pts || (q.pts === o.pts && q.z > o.z && q !== o)).length;
  /** Score : 10 par anneau, +10 si pile au centre, +1 par anneau d'affilée (jusqu'à +8), −6 par mine ; bonus de classement final 60 / 35 / 15 / 0. */
  const score = (o = S.me) => Math.max(0, Math.round(o.pts)) + (S.done || S.t >= seconds ? [60, 35, 15, 0][rank(o)] : 0);
  return { S, step, score, rank };
}
