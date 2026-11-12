// Guerre de peinture : chacun repeint les dalles sur lesquelles il marche. Foncer peint une traînée large et bouscule les autres.
// Des rouleaux apparaissent : quelques secondes de peinture extra-large. À la fin, le plus de dalles à sa couleur gagne.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S` (S.own[k] = numéro du joueur propriétaire de la dalle k, -1 = vierge).
import { rng, clamp, dist } from "./util.js";
import { makeBrawler, brawlDash, brawlMove, brawlCollide } from "./brawl.js";

export const PT = { N: 12, cell: 1, half: 6, rollerEvery: 7, rollerDur: 4.5, ptsPerTile: 4, stun: 0.7 };

export function createPaint(seed, { seconds = 35, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x5eed1234);
  const N = PT.N, H = PT.half;
  const own = new Array(N * N).fill(-1);
  const corner = [[-1, 1], [1, -1], [-1, -1], [1, 1]];
  const P = [0, 1, 2, 3].map((i) => {
    const [sx, sz] = corner[i];
    return makeBrawler(sx * (H - 1.4), sz * (H - 1.4), i > 0 || autoMe, { id: i, i, skill: 0.75 + r() * 0.4, roller: 0, stun: 0, think: 0, tx: 0, tz: 0, painted: 0 });
  });
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], own, roller: null, nextRoller: PT.rollerEvery * 0.6, events: [], done: false, counts: [0, 0, 0, 0] };
  const cellOf = (x, z) => [Math.floor(x + H), Math.floor(z + H)];
  const idx = (cx, cz) => cz * N + cx;
  const inside = (cx, cz) => cx >= 0 && cz >= 0 && cx < N && cz < N;
  const center = (cx, cz) => [cx - H + 0.5, cz - H + 0.5];

  function paintAt(o, x, z, rad) {
    const [cx, cz] = cellOf(x, z);
    for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      if (rad > 0 && dx * dx + dz * dz > rad * rad + 1) continue;
      const ax = cx + dx, az = cz + dz;
      if (!inside(ax, az)) continue;
      const k = idx(ax, az);
      if (own[k] !== o.i) {
        if (own[k] >= 0) S.counts[own[k]]--;
        own[k] = o.i; S.counts[o.i]++; o.painted++;
        S.events.push({ type: "paint", k, i: o.i });
      }
    }
  }
  /** Les bots visent une dalle proche qui n'est pas à eux (de préférence chez le meneur), ou le rouleau s'il est près. */
  function think(o, dt) {
    o.think -= dt;
    if (S.roller && dist(o.x, o.z, S.roller.x, S.roller.z) < 4.5 && o.roller <= 0) { o.tx = S.roller.x; o.tz = S.roller.z; }
    else if (o.think <= 0 || dist(o.x, o.z, o.tx, o.tz) < 0.45) {
      o.think = 0.5 + rb() * 0.7;
      const lead = S.counts.indexOf(Math.max(...S.counts));
      let best = null, bs = -1e9;
      for (let n = 0; n < 26; n++) {
        const cx = Math.floor(rb() * N), cz = Math.floor(rb() * N), k = idx(cx, cz);
        if (own[k] === o.i) continue;
        const [x, z] = center(cx, cz), d = dist(o.x, o.z, x, z);
        const sc = -d * 1.1 + (own[k] === -1 ? 1.2 : 0.6) + (own[k] === lead && lead !== o.i ? 1 : 0) + rb() * 1.5;
        if (sc > bs) { bs = sc; best = [x, z]; }
      }
      if (best) { o.tx = best[0]; o.tz = best[1]; }
    }
    const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz) || 1;
    o.ix = dx / d; o.iz = dz / d;
    // foncer : sur un adversaire tout proche, ou pour couvrir du terrain vierge
    if (o.cd <= 0 && S.t > 1) {
      const foe = P.find((q) => q !== o && q.stun <= 0 && dist(o.x, o.z, q.x, q.z) < 2.2);
      if ((foe && rb() < dt * 3 * o.skill) || rb() < dt * 0.5 * o.skill) {
        if (foe) o.face = Math.atan2(foe.x - o.x, foe.z - o.z);
        if (brawlDash(o, { speed: 11, dur: 0.3, cd: 1.6 })) S.events.push({ type: "dash", i: o.i });
      }
    }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) {
      me.ix = me.stun > 0 ? 0 : inp.x; me.iz = me.stun > 0 ? 0 : inp.y;
      if (inp.act && me.stun <= 0 && brawlDash(me, { speed: 11, dur: 0.3, cd: 1.6 })) S.events.push({ type: "dash", i: 0 });
    }
    for (const o of P) {
      o.stun = Math.max(0, o.stun - dt); o.roller = Math.max(0, o.roller - dt);
      if (o.bot) { if (o.stun > 0) { o.ix = o.iz = 0; } else think(o, dt); }
      brawlMove(o, dt, { cap: o.bot ? 5.2 * o.skill + 0.6 : 5.8, accel: 30 });
      // murs du plateau carré (léger rebond)
      const lim = H - 0.45;
      if (o.x < -lim) { o.x = -lim; o.vx = Math.abs(o.vx) * 0.3; } if (o.x > lim) { o.x = lim; o.vx = -Math.abs(o.vx) * 0.3; }
      if (o.z < -lim) { o.z = -lim; o.vz = Math.abs(o.vz) * 0.3; } if (o.z > lim) { o.z = lim; o.vz = -Math.abs(o.vz) * 0.3; }
      const rad = o.roller > 0 ? 1 : (o.dash > 0 ? 1 : 0);
      paintAt(o, o.x, o.z, rad);
    }
    const hits = brawlCollide(P, { radius: 0.62, kick0: 1.2, dashKick: 6.5 });
    for (const h of hits) { h.victim.stun = PT.stun; S.events.push({ type: "hit", i: h.victim.i, by: h.hitter.i, x: h.victim.x, z: h.victim.z }); }
    // rouleau
    S.nextRoller -= dt;
    if (!S.roller && S.nextRoller <= 0) {
      const cx = 2 + Math.floor(r() * (N - 4)), cz = 2 + Math.floor(r() * (N - 4)), [x, z] = center(cx, cz);
      S.roller = { x, z, t: 0 }; S.events.push({ type: "roller", x, z });
    }
    if (S.roller) {
      S.roller.t += dt;
      const got = P.find((o) => o.stun <= 0 && dist(o.x, o.z, S.roller.x, S.roller.z) < 0.85);
      if (got) { got.roller = PT.rollerDur; S.events.push({ type: "take", i: got.i, x: S.roller.x, z: S.roller.z }); S.roller = null; S.nextRoller = PT.rollerEvery; }
      else if (S.roller.t > 9) { S.roller = null; S.nextRoller = PT.rollerEvery * 0.5; }
    }
    if (S.t >= seconds) S.done = true;
  }
  const tiles = (o) => S.counts[o.i];
  const pts = (o) => tiles(o) * PT.ptsPerTile;
  const score = () => pts(S.me);
  const rank = () => [...P].sort((a, b) => tiles(b) - tiles(a)).map((o) => o.i);
  return { S, step, score, pts, tiles, rank, clamp };
}
