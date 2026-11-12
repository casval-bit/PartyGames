// Grand Prix de karts : course sur un circuit fermé tiré au hasard (le même pour tous les joueurs). On accélère tout seul, on tourne, on ramasse des boîtes à objets.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, clamp, wrapPi } from "./util.js";

export const KT = { W: 3.5, WALL: 4.7, vmax: 9.4, M: 280, pads: 4, boxes: 4, go: 1.7 };

/** Circuit : courbe fermée lisse autour de l'origine. Renvoie les points, tangentes, normales et longueurs cumulées. */
export function makeTrack(r) {
  const M = KT.M;
  let best = null;
  for (let attempt = 0; attempt < 30; attempt++) {                  // on retire le circuit tant qu'un virage est trop serré pour rouler
    const ph = [r() * 6.283, r() * 6.283, r() * 6.283];
    const a2 = 2.2 + r() * 1.3, a3 = 0.5 + r() * 0.9, a5 = 0.15 + r() * 0.25, base = 17;
    const P = [];
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2, rad = base + a2 * Math.sin(2 * a + ph[0]) + a3 * Math.sin(3 * a + ph[1]) + a5 * Math.sin(5 * a + ph[2]);
      P.push({ x: Math.cos(a) * rad * 1.1, z: Math.sin(a) * rad * 0.9 });
    }
    const cum = [0];
    for (let i = 1; i <= M; i++) { const p = P[i - 1], q = P[i % M]; cum.push(cum[i - 1] + Math.hypot(q.x - p.x, q.z - p.z)); }
    for (let i = 0; i < M; i++) {
      const p = P[(i + M - 1) % M], q = P[(i + 1) % M], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      P[i].tx = dx / d; P[i].tz = dz / d; P[i].nx = -P[i].tz; P[i].nz = P[i].tx;        // normale = tangente tournée de 90°
    }
    // rayon de courbure minimal (moyenné sur 4 points : on ignore le bruit d'échantillonnage)
    let minR = 1e9;
    for (let i = 0; i < M; i++) {
      const a = P[i], b = P[(i + 4) % M], turn = Math.abs(Math.atan2(a.tx * b.tz - a.tz * b.tx, a.tx * b.tx + a.tz * b.tz));
      const l = (i + 4 < M ? cum[i + 4] - cum[i] : cum[M] - cum[i] + cum[(i + 4) % M]);
      if (turn > 1e-6) minR = Math.min(minR, l / turn);
    }
    best = { P, M, L: cum[M], cum, minR };
    if (minR >= 8.5) break;
  }
  return best;
}

export function createKart(seed, { seconds = 40, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x4b415254);
  const T = makeTrack(r), { P, M, L, cum } = T;
  const at = (i) => P[((i % M) + M) % M];
  const idxAt = (d) => { let i = 0; while (i < M && cum[i + 1] < d) i++; return i % M; };
  // objets du circuit : tremplins d'accélération et boîtes à objets, répartis sans jamais se chevaucher
  const pads = Array.from({ length: KT.pads }, (_, k) => { const i = Math.floor(((k + 0.5 + (r() - 0.5) * 0.4) / KT.pads) * M); const p = at(i); const off = (r() - 0.5) * 2.2; return { i, x: p.x + p.nx * off, z: p.z + p.nz * off, tx: p.tx, tz: p.tz }; });
  const boxes = Array.from({ length: KT.boxes }, (_, k) => { const i = Math.floor(((k + 0.05 + (r() - 0.5) * 0.1) / KT.boxes) * M); return { i, spots: [-1.9, 0, 1.9].map((o) => { const p = at(i); return { x: p.x + p.nx * o, z: p.z + p.nz * o }; }), on: [true, true, true], back: [0, 0, 0] }; });
  const start = (row, lane) => { const i = M - 4 - row * 7, p = at(i), off = lane * 1.35; return { x: p.x + p.nx * off, z: p.z + p.nz * off, h: Math.atan2(p.tx, p.tz), i }; };
  const grid = [start(0, 1), start(0, -1), start(1, 1), start(1, -1)];
  const order = [2, 0, 3, 1];                                       // le joueur part 3e
  const K = [0, 1, 2, 3].map((k) => {
    const g = grid[order[k]];
    return { i: k, bot: k > 0, x: g.x, z: g.z, h: g.h, v: 0, vx: 0, vz: 0, idx: g.i, prog: (cum[g.i] - L) / L, lat: 0, steer: 0, boost: 0, spin: 0, item: null, bot_t: 0, skill: 0.95 + r() * 0.07, lane: (r() - 0.5) * 2.4, wall: 0, laps: 0, bump: 0, _held: false, sp: 0 };
  });
  if (autoMe) K[0].bot = true;
  const S = { t: 0, seconds, track: T, K, me: K[0], pads, boxes, bananas: [], events: [], done: false, endAt: null };

  const rank = (k) => K.filter((o) => o.prog > k.prog).length;       // 0 = premier
  function locate(k) {
    let best = k.idx, bd = 1e9;
    for (let d = -14; d <= 14; d++) { const j = (((k.idx + d) % M) + M) % M, p = P[j], dd = (k.x - p.x) ** 2 + (k.z - p.z) ** 2; if (dd < bd) { bd = dd; best = j; } }
    let delta = best - k.idx; if (delta > M / 2) delta -= M; else if (delta < -M / 2) delta += M;
    k.prog += ((cum[best] - cum[k.idx]) + (delta > 0 && best < k.idx ? L : 0) - (delta < 0 && best > k.idx ? L : 0)) / L;
    k.idx = best;
    const p = P[best]; k.lat = (k.x - p.x) * p.nx + (k.z - p.z) * p.nz;
  }
  function useItem(k) {
    if (!k.item) return;
    if (k.item === "boost") { k.boost = Math.max(k.boost, 1.35); S.events.push({ type: "boost", i: k.i, src: "item" }); }
    else { const bx = k.x - Math.sin(k.h) * 1.7, bz = k.z - Math.cos(k.h) * 1.7; S.bananas.push({ x: bx, z: bz, t: 0, owner: k.i }); S.events.push({ type: "drop", i: k.i, x: bx, z: bz }); }
    k.item = null;
  }
  function drive(k, dt) {                                           // intelligence des bots : on vise un point devant, sur sa voie préférée
    const look = 5 + Math.floor(k.v * 0.6), tp = at(k.idx + look), tp2 = at(k.idx + look * 2);
    let off = k.lane;
    // éviter les peaux de banane devant
    for (const b of S.bananas) { const dx = b.x - k.x, dz = b.z - k.z, d = Math.hypot(dx, dz); if (d < 6 && dx * Math.sin(k.h) + dz * Math.cos(k.h) > 0) { const p = at(k.idx), side = (b.x - p.x) * p.nx + (b.z - p.z) * p.nz; off = side > 0 ? side - 2.0 : side + 2.0; } }
    const tx = tp.x + tp.nx * off, tz = tp.z + tp.nz * off;
    const want = Math.atan2(tx - k.x, tz - k.z);
    const diff = wrapPi(want - k.h);
    k.steer = clamp(-diff * 2.6, -1, 1) * (rb() < 0.01 ? -0.4 : 1);
    // les bots ralentissent un peu avant un virage serré
    const turn = Math.abs(wrapPi(Math.atan2(tp2.tx, tp2.tz) - Math.atan2(at(k.idx).tx, at(k.idx).tz)));
    k.cap = 1 - clamp(turn * 0.28, 0, 0.16);
    k.bot_t -= dt;
    if (k.item && k.bot_t <= 0) {
      if (k.item === "boost") { useItem(k); k.bot_t = 1 + rb(); }
      else if (K.some((o) => o !== k && o.prog < k.prog && k.prog - o.prog < 0.1)) { useItem(k); k.bot_t = 1.5; }
    }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const go = S.t >= KT.go;
    const me = S.me;
    if (!me.bot) { me.steer = clamp(inp.x, -1, 1); if (inp.act && !me._held) useItem(me); me._held = inp.act; }
    const first = Math.max(...K.map((k) => k.prog));
    for (const k of K) {
      k.cap = k.bot ? 1 : 1;
      if (k.bot && go) drive(k, dt);
      k.boost = Math.max(0, k.boost - dt); k.spin = Math.max(0, k.spin - dt); k.bump = Math.max(0, k.bump - dt);
      let vt = go ? KT.vmax : 0;
      if (k.bot) vt *= k.skill * k.cap * (1 + (k.prog < first ? clamp((first - k.prog) * 0.8, 0, 0.06) : -0.025));
      if (Math.abs(k.lat) > KT.W) vt *= 0.55;                          // dans l'herbe
      if (k.boost > 0) vt = KT.vmax * 1.5;
      if (k.spin > 0) vt *= 0.35;
      k.v += (vt - k.v) * Math.min(1, (k.boost > 0 ? 5 : 1.7) * dt);
      const steer = k.spin > 0 ? 0 : k.steer;
      k.h += (k.spin > 0 ? 14 : -steer * 2.2 * (0.35 + 0.65 * clamp(k.v / 6, 0, 1))) * dt;
      const dx = Math.sin(k.h) * k.v, dz = Math.cos(k.h) * k.v, grip = k.spin > 0 ? 3 : 8;
      k.vx += (dx - k.vx) * Math.min(1, grip * dt); k.vz += (dz - k.vz) * Math.min(1, grip * dt);
      k.x += k.vx * dt; k.z += k.vz * dt;
      k.sp = Math.hypot(k.vx, k.vz);
    }
    // chocs entre karts
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const p = K[a], q = K[b], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.55 && d > 1e-4) {
        const nx = dx / d, nz = dz / d, ov = (1.55 - d) / 2;
        p.x -= nx * ov; p.z -= nz * ov; q.x += nx * ov; q.z += nz * ov;
        const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
        if (rv < 0) { p.vx += nx * rv * 0.5; p.vz += nz * rv * 0.5; q.vx -= nx * rv * 0.5; q.vz -= nz * rv * 0.5; if (p.bump <= 0 && q.bump <= 0) { p.bump = q.bump = 0.2; S.events.push({ type: "bump", x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, i: a, j: b }); } }
      }
    }
    for (const k of K) {
      locate(k);
      const p = P[k.idx];
      if (Math.abs(k.lat) > KT.WALL) {                                 // les glissières
        const s = Math.sign(k.lat), over = Math.abs(k.lat) - KT.WALL;
        k.x -= p.nx * s * over; k.z -= p.nz * s * over;
        const vn = k.vx * p.nx + k.vz * p.nz;
        if (vn * s > 0) { k.vx -= p.nx * vn * 1.5; k.vz -= p.nz * vn * 1.5; }
        k.v *= 0.82; k.lat = s * KT.WALL;
        if (k.wall <= 0) { S.events.push({ type: "wall", i: k.i, x: k.x, z: k.z }); k.wall = 0.3; }
      }
      k.wall = Math.max(0, k.wall - dt);
      // tremplins, boîtes, bananes
      for (const pd of pads) if (Math.hypot(k.x - pd.x, k.z - pd.z) < 1.7 && k.boost < 0.6) { k.boost = 1.1; S.events.push({ type: "boost", i: k.i, src: "pad" }); }
      for (const bx of boxes) bx.spots.forEach((s, n) => {
        if (bx.on[n] && !k.item && Math.hypot(k.x - s.x, k.z - s.z) < 1.25) {
          bx.on[n] = false; bx.back[n] = 3.2;
          k.item = r() < 0.55 ? "boost" : "banana"; S.events.push({ type: "item", i: k.i, item: k.item, x: s.x, z: s.z });
        }
      });
      for (let n = S.bananas.length - 1; n >= 0; n--) {
        const b = S.bananas[n]; b.t += dt;
        if (k.spin <= 0 && (b.owner !== k.i || b.t > 0.8) && Math.hypot(k.x - b.x, k.z - b.z) < 1.0) { k.spin = 1.0; k.boost = 0; S.bananas.splice(n, 1); S.events.push({ type: "spin", i: k.i, x: b.x, z: b.z }); }
      }
    }
    for (const bx of boxes) bx.on.forEach((on, n) => { if (!on) { bx.back[n] -= dt; if (bx.back[n] <= 0) bx.on[n] = true; } });
    if (S.t >= seconds && S.endAt == null) S.endAt = S.t + 0.4;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const BONUS = [100, 60, 30, 0];
  const score = (k = S.me) => Math.max(0, Math.round(k.prog * 100)) + BONUS[rank(k)];
  return { S, step, score, rank, at };
}
