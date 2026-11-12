// Roi de la colline : une zone dorée change de place ; seul dans la zone, on marque. Les autres te poussent hors de l'arène (tu reviens après un court instant).
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, clamp, dist } from "./util.js";
import { makeBrawler, brawlDash, brawlMove, brawlCollide } from "./brawl.js";

export const CR = { R: 6.0, ZR: 1.75, rate: 14, ko: 20, respawn: 1.5, moveEvery: 9, warn: 1.8 };

export function createCrown(seed, { seconds = 35, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0xc0ffee77);
  const spawn = (i) => { const a = Math.PI * 0.5 + (i * Math.PI) / 2; return [Math.sin(a + Math.PI) * 4.4, Math.cos(a + Math.PI) * 4.4]; };
  const P = [0, 1, 2, 3].map((i) => { const [x, z] = spawn(i); return makeBrawler(x, z, i > 0 || autoMe, { id: i, i, skill: 0.8 + r() * 0.4, hold: 0, kos: 0, respawn: 0, inv: 0, last: null, lastT: -9, out: false, think: 0, tgt: null, spin: r() < 0.5 ? 1 : -1 }); });
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], zone: { x: 0, z: 0, r: CR.ZR }, next: null, nextT: CR.moveEvery, who: -1, events: [], done: false };
  const pickZone = () => { const a = r() * 6.283, d = 1.8 + r() * 2.1; return { x: Math.sin(a) * d, z: Math.cos(a) * d, r: CR.ZR }; };
  const inZone = (o) => Math.hypot(o.x - S.zone.x, o.z - S.zone.z) < S.zone.r - 0.1;
  const dashSafe = (o, tx, tz) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz) || 1; return Math.hypot(o.x + (dx / d) * 3.2, o.z + (dz / d) * 3.2) < CR.R - 0.5; };

  function think(o, dt) {
    o.ix = o.iz = 0;
    if (S.t < 0.8 || !o.alive) return;
    const z = S.zone, occ = P.filter((p) => p.alive && inZone(p));
    const others = occ.filter((p) => p !== o);
    const edge = Math.hypot(o.x, o.z);
    let tx = z.x - o.x, tz = z.z - o.z, d = Math.hypot(tx, tz);
    const here = inZone(o);
    if (here && !others.length) {                                // seul dans la zone : on tient, en gardant un œil sur les voisins
      tx = z.x - o.x; tz = z.z - o.z;
      const nb = P.filter((p) => p !== o && p.alive).sort((a, b) => dist(o.x, o.z, a.x, a.z) - dist(o.x, o.z, b.x, b.z))[0];
      if (nb && dist(o.x, o.z, nb.x, nb.z) < 2.6 && o.cd <= 0 && dashSafe(o, nb.x, nb.z) && rb() < dt * 2.2 * o.skill) { o.face = Math.atan2(nb.x - o.x, nb.z - o.z); brawlDash(o); S.events.push({ type: "dash", i: o.i }); }
      const k = Math.min(1, d / 0.9); o.ix = (tx / (d || 1)) * k * 0.7; o.iz = (tz / (d || 1)) * k * 0.7;
    } else if (others.length) {                                 // quelqu'un tient la zone : on le pousse dehors
      const v = others.sort((a, b) => dist(o.x, o.z, a.x, a.z) - dist(o.x, o.z, b.x, b.z))[0];
      tx = v.x + v.vx * 0.2 - o.x; tz = v.z + v.vz * 0.2 - o.z; d = Math.hypot(tx, tz) || 1;
      o.ix = tx / d; o.iz = tz / d;
      if (d < 3 && o.cd <= 0 && dashSafe(o, v.x, v.z) && rb() < dt * 3 * o.skill) { brawlDash(o); S.events.push({ type: "dash", i: o.i }); }
    } else {                                                    // zone libre : on y court
      o.ix = tx / (d || 1); o.iz = tz / (d || 1);
    }
    if (edge > CR.R - 1.3) { const k = (edge - (CR.R - 1.3)) * 1.6; o.ix -= (o.x / edge) * k; o.iz -= (o.z / edge) * k; }
    const m = Math.hypot(o.ix, o.iz); if (m > 1) { o.ix /= m; o.iz /= m; }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) { me.ix = inp.x; me.iz = inp.y; if (inp.act && me.alive && brawlDash(me)) S.events.push({ type: "dash", i: 0 }); }
    for (const o of P) {
      o.inv = Math.max(0, o.inv - dt);
      if (o.out) {                                              // tombé : il chute puis revient
        o.vy -= 22 * dt; o.y += o.vy * dt; o.x += o.vx * dt; o.z += o.vz * dt;
        o.respawn -= dt;
        if (o.respawn <= 0) { const [x, z] = spawn(o.i); Object.assign(o, { x, z, vx: 0, vz: 0, y: 0, vy: 0, out: false, alive: true, inv: 1.6, dash: 0, last: null }); S.events.push({ type: "respawn", i: o.i }); }
        continue;
      }
      if (o.bot) think(o, dt);
      o.speedK = 1;
      brawlMove(o, dt, { cap: o.bot ? 5.6 * o.skill : 6.2 });
    }
    const hits = brawlCollide(P.filter((p) => p.alive), { radius: 0.66, kick0: 1.5, dashKick: 7, canHit: (a, b) => a.inv <= 0 && b.inv <= 0 });
    for (const h of hits) { h.victim.last = h.hitter; h.victim.lastT = S.t; S.events.push({ type: "hit", i: h.victim.i, by: h.hitter.i, x: h.victim.x, z: h.victim.z }); }
    for (const o of P) {
      if (!o.alive) continue;
      if (Math.hypot(o.x, o.z) > CR.R + 0.15) {
        o.alive = false; o.out = true; o.vy = 2.5; o.respawn = CR.respawn;
        const by = o.last && S.t - o.lastT < 2.6 ? o.last : null;
        if (by && by !== o) by.kos++;
        S.events.push({ type: "fall", i: o.i, by: by ? by.i : null, x: o.x, z: o.z });
      }
    }
    // la zone : un seul occupant marque
    const occ = P.filter((p) => p.alive && inZone(p));
    S.who = occ.length === 1 ? occ[0].i : (occ.length ? -2 : -1);        // -1 vide, -2 disputée
    if (occ.length === 1) occ[0].hold += dt;
    S.nextT -= dt;
    if (S.nextT <= CR.warn && !S.next) { S.next = pickZone(); S.events.push({ type: "warn", x: S.next.x, z: S.next.z }); }
    if (S.nextT <= 0 && S.next) { S.zone = S.next; S.next = null; S.nextT = CR.moveEvery; S.events.push({ type: "move", x: S.zone.x, z: S.zone.z }); }
    if (S.t >= seconds) S.done = true;
  }
  const pts = (o) => Math.round(o.hold * CR.rate) + o.kos * CR.ko;
  const score = () => pts(S.me);
  return { S, step, score, pts };
}
