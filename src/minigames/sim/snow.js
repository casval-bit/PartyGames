// Boules de neige géantes : chacun pousse sa boule de neige sur un plateau enneigé ; elle grossit en roulant sur la neige fraîche (et laisse l'herbe derrière elle).
// Les grosses boules écrasent les petites (elles leur prennent de la neige) et les poussent dans le vide : celui qui tombe perd les deux tiers de sa boule,
// et le dernier qui l'a touché en récupère la plus grande partie. Score : taille de la boule à la fin + éjections. Simulation pure : le décor 3D lit `S`.
import { rng, clamp, dist, wrapPi } from "./util.js";

export const SN = { R: 5.8, N: 44, cell: 0.006, regrow: 0.03, m0: 1.0, dash: 0.3, dashCd: 1.5, inv: 1.8, respawn: 1.6 };
export const radiusOf = (m) => 0.74 * Math.pow(Math.max(0.2, m), 0.4);

export function createSnow(seed, { seconds = 38, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x5a0f1);
  const { R, N } = SN, cs = (2 * R) / N;
  const snow = new Float32Array(N * N), inside = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -R + (i + 0.5) * cs, z = -R + (j + 0.5) * cs; if (Math.hypot(x, z) < R - 0.05) { inside[j * N + i] = 1; snow[j * N + i] = 1; } }
  const starts = [[0, 3.8], [-3.8, 0], [0, -3.8], [3.8, 0]];            // le joueur en bas
  const P = starts.map(([x, z], i) => ({ i, bot: i > 0 || autoMe, x, z, vx: 0, vz: 0, m: SN.m0, rho: radiusOf(SN.m0), roll: 0, face: Math.atan2(-x, -z), ix: 0, iz: 0, dash: 0, cd: 0, inv: 0, alive: true, fall: 0, respawn: 0, kos: 0, falls: 0, last: null, lastT: -99, skill: 0.85 + rb() * 0.3, think: rb() * 0.3, gx: 0, gz: 0, grabbed: 0, hits: 0, peak: SN.m0 }));
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, R, N, snow, P, me: P[0], events: [], done: false, endAt: null, dirty: true };

  const snowAt = (x, z) => { const i = Math.floor((x + R) / cs), j = Math.floor((z + R) / cs); return i >= 0 && j >= 0 && i < N && j < N ? snow[j * N + i] : 0; };
  function eat(o, dt) {
    const rad = o.rho * 0.9, i0 = Math.max(0, Math.floor((o.x - rad + R) / cs)), i1 = Math.min(N - 1, Math.floor((o.x + rad + R) / cs)), j0 = Math.max(0, Math.floor((o.z - rad + R) / cs)), j1 = Math.min(N - 1, Math.floor((o.z + rad + R) / cs));
    let got = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * N + i; if (!inside[k] || snow[k] <= 0.02) continue;
      const x = -R + (i + 0.5) * cs, z = -R + (j + 0.5) * cs;
      if (Math.hypot(x - o.x, z - o.z) < rad) { got += snow[k]; snow[k] = 0; }
    }
    if (got > 0) { const gain = got * SN.cell * clamp(7 / o.m, 0.3, 1); o.m += gain; o.grabbed += gain; o.peak = Math.max(o.peak, o.m); S.dirty = true; }
  }
  /** Bots : cherchent la neige la plus riche, chassent plus petit qu'eux près du bord, fuient plus gros qu'eux. */
  function think(o) {
    o.think = 0.18 + rb() * 0.12;
    const alive = S.P.filter((q) => q !== o && q.alive && q.respawn <= 0);
    let ax = 0, az = 0, mode = "snow";
    // menace : un plus gros près de nous
    let threat = null, prey = null;
    for (const q of alive) {
      const d = dist(o.x, o.z, q.x, q.z);
      if (q.m > o.m * 1.18 && d < 3.6 + q.rho && (!threat || d < threat.d)) threat = { q, d };
      if (o.m > q.m * 1.12 && d < 6.5 && (!prey || Math.hypot(q.x, q.z) > Math.hypot(prey.q.x, prey.q.z))) prey = { q, d };
    }
    if (threat && rb() < 0.9 * o.skill) {
      mode = "flee"; const dx = o.x - threat.q.x, dz = o.z - threat.q.z, d = Math.hypot(dx, dz) || 1;
      ax = dx / d; az = dz / d; const e = Math.hypot(o.x, o.z); if (e > R - 2.6) { ax -= (o.x / e) * 1.4; az -= (o.z / e) * 1.4; }
    } else if (prey && o.m > 1.4) {
      mode = "hunt"; const q = prey.q, e = Math.hypot(q.x, q.z) || 1, ox = q.x / e, oz = q.z / e;   // on vise à la pousser vers le bord : on arrive du côté du centre
      const tx = q.x - ox * (o.rho + q.rho) * 0.8, tz = q.z - oz * (o.rho + q.rho) * 0.8, behind = (o.x - q.x) * ox + (o.z - q.z) * oz < -0.2;
      const gx = behind ? q.x : tx, gz = behind ? q.z : tz, dx = gx - o.x, dz = gz - o.z, d = Math.hypot(dx, dz) || 1;
      ax = dx / d; az = dz / d;
      if (behind && d < 2.7 + o.rho && o.cd <= 0 && rb() < 0.55 * o.skill) { o.wantDash = true; }
    } else {
      let best = -1, bd = null;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + rb() * 0.2, dx = Math.sin(a), dz = Math.cos(a);
        let sc = 0;
        for (const d of [1.3, 2.6, 4.0]) { const x = o.x + dx * d, z = o.z + dz * d; if (Math.hypot(x, z) > R - 1.3) { sc -= 2.2; continue; } sc += snowAt(x, z) * (1.6 - d * 0.22); }
        if (sc > best) { best = sc; bd = [dx, dz]; }
      }
      if (bd) { ax = bd[0]; az = bd[1]; }
      const e = Math.hypot(o.x, o.z); if (e > R - 1.9) { ax -= (o.x / e) * 1.5; az -= (o.z / e) * 1.5; }
    }
    const e = Math.hypot(o.x, o.z); if (e > R - 1.4 && mode !== "hunt") { ax -= (o.x / e) * 1.0; az -= (o.z / e) * 1.0; }
    const m = Math.hypot(ax, az) || 1; o.ix = ax / m; o.iz = az / m; o.mode = mode;
  }
  function fallOff(o) {
    o.alive = false; o.fall = 0.001; o.falls++;
    const lost = o.m * 0.62, by = o.last != null && S.t - o.lastT < 3 ? S.P[o.last] : null;
    o.m = Math.max(0.85, o.m - lost);
    if (by && by !== o) { by.m += lost * 0.6; by.kos++; by.peak = Math.max(by.peak, by.m); S.events.push({ type: "ko", i: by.i, from: o.i, x: o.x, z: o.z, gain: lost * 0.6 }); }
    S.events.push({ type: "fall", i: o.i, x: o.x, z: o.z, by: by ? by.i : null });
    o.respawn = SN.respawn;
  }
  function revive(o) {
    // réapparition près du centre, loin des autres
    let best = [0, 0], bd = -1;
    for (let k = 0; k < 10; k++) { const a = r() * 6.283, d = r() * 2.4, x = Math.sin(a) * d, z = Math.cos(a) * d; const md = Math.min(...S.P.filter((q) => q !== o && q.alive).map((q) => dist(x, z, q.x, q.z)), 9); if (md > bd) { bd = md; best = [x, z]; } }
    Object.assign(o, { x: best[0], z: best[1], vx: 0, vz: 0, alive: true, fall: 0, respawn: 0, inv: SN.inv, dash: 0, rho: radiusOf(o.m), last: null });
    S.events.push({ type: "respawn", i: o.i, x: o.x, z: o.z });
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) { me.ix = inp.x; me.iz = inp.y; if (inp.act && !me._held) me.wantDash = true; me._held = inp.act; const mg = Math.hypot(me.ix, me.iz); if (mg > 1) { me.ix /= mg; me.iz /= mg; } }
    const n = 2, h = dt / n;
    for (const o of S.P) {
      o.cd = Math.max(0, o.cd - dt); o.inv = Math.max(0, o.inv - dt); o.dash = Math.max(0, o.dash - dt);
      if (!o.alive) {
        o.fall += dt; o.x += o.vx * dt * 0.8; o.z += o.vz * dt * 0.8;
        if (o.fall > 0) { o.respawn -= dt; if (o.respawn <= 0 && S.endAt == null) revive(o); }
        continue;
      }
      if (o.bot) { o.think -= dt; if (o.think <= 0) think(o); }
      if (o.wantDash && o.cd <= 0) { o.dash = SN.dash; o.cd = SN.dashCd; S.events.push({ type: "dash", i: o.i, x: o.x, z: o.z }); }
      o.wantDash = false;
    }
    for (let k = 0; k < n; k++) {
      for (const o of S.P) {
        if (!o.alive) continue;
        const dashing = o.dash > 0, acc = (dashing ? 54 : 21) * Math.pow(o.m, -0.3), cap = (o.bot ? o.skill * 0.97 : 1) * 5.3 * Math.pow(o.m, -0.18) * (dashing ? 1.85 : 1);
        const ix = o.ix, iz = o.iz;
        o.vx += ix * acc * h; o.vz += iz * acc * h;
        const damp = Math.exp(-(ix || iz ? 0.7 : 2.4) * h); o.vx *= damp; o.vz *= damp;
        const sp = Math.hypot(o.vx, o.vz); if (sp > cap) { o.vx *= cap / sp; o.vz *= cap / sp; }
        o.x += o.vx * h; o.z += o.vz * h;
        const speed = Math.hypot(o.vx, o.vz); o.roll += (speed * h) / o.rho;
        if (speed > 0.4) o.face = Math.atan2(o.vx, o.vz);
        o.rho = radiusOf(o.m);
        if (speed > 0.5) eat(o, h);
      }
      // collisions entre boules
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        const p = S.P[a], q = S.P[b]; if (!p.alive || !q.alive) continue;
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = (p.rho + q.rho) * 0.92;
        if (d < min && d > 1e-5) {
          const nx = dx / d, nz = dz / d, wp = 1 / p.m, wq = 1 / q.m, ov = min - d;
          p.x -= nx * ov * wp / (wp + wq); p.z -= nz * ov * wp / (wp + wq); q.x += nx * ov * wq / (wp + wq); q.z += nz * ov * wq / (wp + wq);
          const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
          if (rv < 0) {
            const e = (p.dash > 0 || q.dash > 0) ? 0.95 : 0.55, j = -(1 + e) * rv / (wp + wq);
            p.vx -= j * nx * wp; p.vz -= j * nz * wp; q.vx += j * nx * wq; q.vz += j * nz * wq;
            const vn = -rv, big = p.m >= q.m ? p : q, small = big === p ? q : p, ratio = big.m / small.m;
            p.last = q.i; p.lastT = S.t; q.last = p.i; q.lastT = S.t;
            if (vn > 1.4 && p.inv <= 0 && q.inv <= 0) {
              let take = 0;
              if (ratio >= 1.15) { take = clamp(0.05 * (vn - 1.2) * small.m * Math.min(ratio, 3), 0, 0.3 * small.m); small.m -= take; big.m += take; big.peak = Math.max(big.peak, big.m); small.hits++; }
              S.events.push({ type: "hit", a: p.i, b: q.i, x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, power: vn, take, big: big.i, small: small.i });
            }
          }
        }
      }
      for (const o of S.P) if (o.alive && Math.hypot(o.x, o.z) > R + 0.15) fallOff(o);
    }
    // la neige repousse doucement
    for (let k = 0; k < snow.length; k++) if (inside[k] && snow[k] < 1) { snow[k] = Math.min(1, snow[k] + SN.regrow * dt); }
    S.dirty = true;
    if (S.t >= seconds && S.endAt == null) S.endAt = S.t + 0.3;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const scoreOf = (o) => Math.round(o.m * 60) + o.kos * 40;
  const rank = (o) => S.P.filter((q) => scoreOf(q) > scoreOf(o)).length;
  return { S, step, score: () => scoreOf(S.me), scoreOf, rank, snowAt };
}
