// Palets glacés : curling en folie. Chacun lance ses palets depuis son bord du plateau de glace vers la cible du centre ;
// les palets se heurtent, se chassent, et ceux qui tombent du plateau sont perdus. À la fin, chaque palet restant rapporte selon son anneau.
// Commandes : on tient le joystick dans la direction voulue (plus on le pousse, plus le tir est puissant) et on relâche pour lancer.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, clamp, dist } from "./util.js";

export const PK = { R: 6.0, SEAT: 5.55, r: 0.55, decel: 3.4, vmin: 4.0, vmax: 12.0, stones: 7, cd: 0.85, bounce: 0.88, ring: [0.8, 1.8, 3.0, 4.2], val: [5, 3, 2, 1] };

/** Points d'un palet selon sa distance au centre (0 = en dehors de la cible). */
export const ringValue = (d) => { for (let i = 0; i < 4; i++) if (d < PK.ring[i]) return PK.val[i]; return 0; };
export const speedOf = (pow) => PK.vmin + (PK.vmax - PK.vmin) * clamp(pow, 0, 1);
/** Puissance (0..1) d'après la poussée du joystick : sous 25 % on n'a pas encore engagé le tir. */
export const powOf = (mag) => clamp((mag - 0.25) / 0.75, 0, 1);

export function createPucks(seed, { seconds = 44, stones = PK.stones, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x9c4d7);
  const seatAng = [Math.PI / 2, Math.PI, -Math.PI / 2, 0];            // 0 = en bas de l'écran (z positif), puis dans le sens des aiguilles
  const P = [0, 1, 2, 3].map((i) => {
    const a = seatAng[i], sx = Math.cos(a) * PK.SEAT, sz = Math.sin(a) * PK.SEAT;
    return { i, bot: i > 0 || autoMe, a, sx, sz, ix: -Math.cos(a), iz: -Math.sin(a), left: stones, cd: 0.5, aim: { on: false, dx: 0, dz: -1, pow: 0, peak: 0 }, pts: 0, kos: 0, thrown: 0, skill: 0.75 + rb() * 0.4, next: 1.0 + rb() * 1.6, style: rb() };
  });
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], stones: [], events: [], done: false, endAt: null, calm: 0, nid: 1 };

  const alive = () => S.stones.filter((s) => !s.out);
  /** Lance un palet depuis le siège de `o` : direction (dx, dz) normalisée, puissance 0..1. */
  function throwStone(o, dx, dz, pow) {
    if (o.left <= 0 || o.cd > 0) return false;
    let d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const inn = dx * o.ix + dz * o.iz;
    if (inn < 0.12) { const k = 0.12 - inn; dx += o.ix * k; dz += o.iz * k; d = Math.hypot(dx, dz); dx /= d; dz /= d; }   // jamais vers l'extérieur
    const v = speedOf(pow);
    S.stones.push({ id: S.nid++, owner: o.i, x: o.sx - o.ix * 0.0, z: o.sz, vx: dx * v, vz: dz * v, out: false, fall: 0, last: o.i, hits: 0, spin: 0 });
    o.left--; o.cd = PK.cd; o.thrown++;
    S.events.push({ type: "throw", i: o.i, x: o.sx, z: o.sz, v, dx, dz });
    return true;
  }
  /** Où s'arrêterait un palet lancé ainsi (ligne droite, sans choc). */
  const stopPoint = (o, dx, dz, pow) => { const v = speedOf(pow), d = (v * v) / (2 * PK.decel); return { x: o.sx + dx * d, z: o.sz + dz * d, d }; };

  /** Les bots : tir « placé » vers le centre, ou tir « de chasse » sur le palet adverse le plus rentable. */
  function think(o) {
    if (o.left <= 0 || o.cd > 0 || S.t < o.next) return;
    const enemy = alive().filter((s) => s.owner !== o.i && ringValue(Math.hypot(s.x, s.z)) >= 2 && Math.hypot(s.vx, s.vz) < 0.5);
    const mine = alive().filter((s) => s.owner === o.i);
    let dx, dz, pow, hit = false;
    const noise = (0.075 / o.skill);
    if (enemy.length && o.left < stones && rb() < 0.35 + 0.35 * o.style) {
      enemy.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
      const t = enemy[0]; hit = true;
      const ex = t.x - o.sx, ez = t.z - o.sz, d = Math.hypot(ex, ez), ang = Math.atan2(ez, ex) + (rb() - 0.5) * 2 * noise;
      dx = Math.cos(ang); dz = Math.sin(ang);
      const v = Math.sqrt(2 * PK.decel * d) + 4.2 + rb() * 1.5;
      pow = clamp((v - PK.vmin) / (PK.vmax - PK.vmin), 0, 1);
    }
    if (!hit) {
      // tir placé : près du centre, en évitant d'être collé à un palet adverse bien placé si possible
      const a = rb() * 6.283, rad = rb() * 0.9 + (mine.length > 1 ? 0.8 : 0), tx = Math.cos(a) * rad, tz = Math.sin(a) * rad;
      const ex = tx - o.sx, ez = tz - o.sz, d = Math.hypot(ex, ez), ang = Math.atan2(ez, ex) + (rb() - 0.5) * 2 * noise * 0.8;
      dx = Math.cos(ang); dz = Math.sin(ang);
      const v = Math.sqrt(2 * PK.decel * d) * (1 + (rb() - 0.5) * 0.16 / o.skill);
      pow = clamp((v - PK.vmin) / (PK.vmax - PK.vmin), 0, 1);
    }
    throwStone(o, dx, dz, pow);
    o.next = S.t + 1.5 + rb() * 2.0 / o.skill;
  }

  function scoreOf(i) {
    let sum = 0, best = null;
    for (const s of alive()) {
      const d = Math.hypot(s.x, s.z);
      if (s.owner === i) sum += ringValue(d) * 10;
      if (ringValue(d) > 0 && (!best || d < best.d)) best = { d, owner: s.owner };
    }
    return sum + (best && best.owner === i ? 30 : 0) + P[i].kos * 10;
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    for (const o of P) o.cd = Math.max(0, o.cd - dt);
    // joystick : on vise tant qu'on tient, on lance au relâchement
    if (!me.bot) {
      const mag = Math.hypot(inp.x, inp.y), a = me.aim;
      if (mag > 0.12) { a.on = true; a.dx = inp.x / mag; a.dz = inp.y / mag; a.pow = powOf(mag); a.peak = Math.max(a.peak, mag); }
      else if (a.on) {
        a.on = false;
        if (a.peak >= 0.3 && me.left > 0) { if (me.cd > 0) { /* trop tôt : le palet précédent vient de partir */ } else throwStone(me, a.dx, a.dz, a.pow); }
        a.peak = 0; a.pow = 0;
      }
    }
    for (const o of P) if (o.bot) think(o);
    // physique (deux pas pour les tirs rapides)
    const n = 2, h = dt / n;
    for (let k = 0; k < n; k++) {
      const live = alive();
      for (const s of S.stones) {
        if (s.out) { s.fall += h; s.x += s.vx * h * 0.6; s.z += s.vz * h * 0.6; continue; }
        const v = Math.hypot(s.vx, s.vz);
        if (v > 0) { const nv = Math.max(0, v - PK.decel * h); s.vx *= nv / v; s.vz *= nv / v; }
        s.x += s.vx * h; s.z += s.vz * h; s.spin += v * h * 0.5;
      }
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        const p = live[a], q = live[b], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = PK.r * 2;
        if (d < min && d > 1e-5) {
          const nx = dx / d, nz = dz / d, ov = (min - d) / 2;
          p.x -= nx * ov; p.z -= nz * ov; q.x += nx * ov; q.z += nz * ov;
          const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
          if (rv < 0) {
            const j = -(1 + PK.bounce) * rv / 2, pFaster = Math.hypot(p.vx, p.vz) >= Math.hypot(q.vx, q.vz);   // qui frappe : le plus rapide AVANT le choc
            p.vx -= j * nx; p.vz -= j * nz; q.vx += j * nx; q.vz += j * nz;
            const pw = -rv;
            if (pw > 0.6) {
              S.events.push({ type: "hit", x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, power: pw });
              // le plus rapide « touche » l'autre : si l'autre tombe, c'est lui qui marque
              if (pFaster) { q.last = p.owner === q.owner ? q.last : p.owner; } else { p.last = q.owner === p.owner ? p.last : q.owner; }
              p.hits++; q.hits++;
            }
          }
        }
      }
      for (const s of live) {
        if (Math.hypot(s.x, s.z) > PK.R + 0.28 && !s.out) {
          s.out = true; s.fall = 0;
          const by = s.last !== s.owner ? s.last : null;
          if (by != null) { P[by].kos++; S.events.push({ type: "ko", i: by, owner: s.owner, x: s.x, z: s.z }); }
          S.events.push({ type: "out", i: s.owner, x: s.x, z: s.z, by });
        }
      }
    }
    for (let i = S.stones.length - 1; i >= 0; i--) if (S.stones[i].out && S.stones[i].fall > 1.1) S.stones.splice(i, 1);
    for (const o of P) o.pts = scoreOf(o.i);
    // fin : plus aucun palet à lancer et tout est immobile (ou temps écoulé)
    const moving = alive().some((s) => Math.hypot(s.vx, s.vz) > 0.12);
    const allThrown = P.every((o) => o.left <= 0);
    S.calm = allThrown && !moving ? S.calm + dt : 0;
    if (S.endAt == null && (S.t >= seconds || S.calm > 0.9)) S.endAt = S.t + (S.t >= seconds ? 0.2 : 0.4);
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const rank = (i) => P.filter((q) => q.pts > P[i].pts).length;
  const score = () => P[0].pts;
  return { S, step, score, rank, throwStone, stopPoint, scoreOf };
}
