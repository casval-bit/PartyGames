// Chars d'assaut : 4 petits chars dans une arène semée de blocs. On tire dans la direction où le char regarde ; les obus rebondissent une fois.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, clamp, turnToward, wrapPi } from "./util.js";

export const TK = { HX: 6.0, HZ: 8.2, R: 0.78, speed: 4.7, hp: 3, shellV: 12.5, shellR: 0.2, reload: 0.55, life: 2.1 };
const SPAWNS = [[-4.2, 6.8], [4.2, 6.8], [-4.2, -6.8], [4.2, -6.8]];            // le joueur en bas à gauche

export function createTanks(seed, { seconds = 45, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x7a11c0de);
  // blocs : on en tire quelques-uns dans une moitié, on les recopie en miroir (point central) pour que l'arène soit juste
  const blocks = [];
  const okSpot = (b) => {
    for (const [sx, sz] of SPAWNS) if (b.x1 > sx - 2.6 && b.x0 < sx + 2.6 && b.z1 > sz - 2.6 && b.z0 < sz + 2.6) return false;
    if (b.x1 > -1.0 && b.x0 < 1.0 && b.z1 > -1.0 && b.z0 < 1.0) return false;           // un petit couloir libre au centre
    for (const o of blocks) if (b.x1 + 2.0 > o.x0 && b.x0 - 2.0 < o.x1 && b.z1 + 2.0 > o.z0 && b.z0 - 2.0 < o.z1) return false;
    return b.x0 > -TK.HX + 1.0 && b.x1 < TK.HX - 1.0 && b.z0 > -TK.HZ + 1.0 && b.z1 < TK.HZ - 1.0;
  };
  for (let tries = 0; tries < 200 && blocks.length < 6; tries++) {
    const w = 1.2 + r() * 1.8, d = 1.2 + r() * 1.8, cx = (r() * 2 - 1) * (TK.HX - 1.5), cz = -(0.8 + r() * (TK.HZ - 2.4));
    const b = { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
    if (!okSpot(b)) continue;
    blocks.push(b);
    const m = { x0: -b.x1, x1: -b.x0, z0: -b.z1, z1: -b.z0 };
    if (okSpot(m)) blocks.push(m); else blocks.pop();
  }
  const T = SPAWNS.map(([x, z], i) => ({ i, bot: i > 0, x, z, vx: 0, vz: 0, heading: z > 0 ? Math.PI : 0, hp: TK.hp, alive: true, cd: 0.6, ix: 0, iz: 0, hit: 0, kills: 0, hits: 0,
    react: 0, skill: 0.8 + r() * 0.35, strafe: r() < 0.5 ? 1 : -1, strafeT: 0, tgt: null, tgtT: 0, stuckT: 0, lastX: x, lastZ: z, wander: 0, wx: 0, wz: 0 }));
  if (autoMe) T[0].bot = true;
  const S = { t: 0, seconds, blocks, T, me: T[0], shells: [], events: [], win: false, done: false, endAt: null };

  const hitBlock = (x, z, rad) => blocks.find((b) => x > b.x0 - rad && x < b.x1 + rad && z > b.z0 - rad && z < b.z1 + rad);
  function pushOut(o, b, rad) {
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1);
    const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
    if (d >= rad) return;
    if (d > 1e-6) { o.x += (dx / d) * (rad - d); o.z += (dz / d) * (rad - d); return; }
    const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, m = Math.min(l, rr, t, bt);
    if (m === l) o.x = b.x0 - rad; else if (m === rr) o.x = b.x1 + rad; else if (m === t) o.z = b.z0 - rad; else o.z = b.z1 + rad;
  }
  /** Le segment (a → b) est-il libre de blocs ? */
  function los(ax, az, bx, bz) {
    for (const k of blocks) {
      let t0 = 0, t1 = 1;
      const dx = bx - ax, dz = bz - az;
      for (const [p, q, lo, hi] of [[ax, dx, k.x0 - 0.1, k.x1 + 0.1], [az, dz, k.z0 - 0.1, k.z1 + 0.1]]) {
        if (Math.abs(q) < 1e-9) { if (p < lo || p > hi) { t0 = 2; break; } continue; }
        let a = (lo - p) / q, b = (hi - p) / q; if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t0 <= t1) return false;
    }
    return true;
  }

  function fire(o) {
    if (!o.alive || o.cd > 0) return false;
    let h = o.heading;
    if (!o.bot) {                                            // petite aide à la visée pour le joueur
      let best = null, bd = 99;
      for (const e of T) { if (e === o || !e.alive) continue; const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), da = Math.abs(wrapPi(Math.atan2(dx, dz) - h)); if (da < 0.3 && d < bd && los(o.x, o.z, e.x, e.z)) { bd = d; best = Math.atan2(dx, dz); } }
      if (best != null) h += wrapPi(best - h) * 0.85;
    } else h += (rb() - 0.5) * 0.14 / o.skill;
    o.cd = o.bot ? TK.reload * (1.5 - 0.4 * o.skill) : TK.reload;
    S.shells.push({ x: o.x + Math.sin(h) * 1.05, z: o.z + Math.cos(h) * 1.05, vx: Math.sin(h) * TK.shellV, vz: Math.cos(h) * TK.shellV, owner: o.i, life: TK.life, bounces: 1, age: 0 });
    S.events.push({ type: "shot", i: o.i, x: o.x + Math.sin(h) * 1.05, z: o.z + Math.cos(h) * 1.05, h });
    return true;
  }

  function think(o, dt) {                                     // intelligence des bots
    o.ix = o.iz = 0; o.wantFire = false;
    if (S.t < 1.0) return;
    const foes = T.filter((e) => e !== o && e.alive);
    o.tgtT -= dt;
    if (!o.tgt || !o.tgt.alive || o.tgtT <= 0) {
      let best = null, bd = 1e9;
      for (const e of foes) { const d = Math.hypot(e.x - o.x, e.z - o.z) * (e.bot ? 1 : 0.75); if (d < bd) { bd = d; best = e; } }
      o.tgt = best; o.tgtT = 1.3 + rb();
    }
    const e = o.tgt;
    if (!e) return;
    // esquive : un obus ennemi qui fonce sur moi
    for (const s of S.shells) {
      if (s.owner === o.i) continue;
      const rx = o.x - s.x, rz = o.z - s.z, along = rx * s.vx + rz * s.vz;
      if (along <= 0) continue;
      const sp = Math.hypot(s.vx, s.vz), cross = Math.abs(rx * s.vz - rz * s.vx) / sp, tt = along / (sp * sp) * 1;
      if (cross < 1.3 && tt < 0.35 && rb() < 0.9 * o.skill) { const sg = (rx * s.vz - rz * s.vx) > 0 ? 1 : -1; o.ix = (-s.vz / sp) * sg * -1; o.iz = (s.vx / sp) * sg * -1; return; }
    }
    const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
    const seen = los(o.x, o.z, e.x, e.z);
    // bloqué ? alors on change de direction un moment
    o.stuckT += dt;
    if (o.stuckT > 1.4) { if (Math.hypot(o.x - o.lastX, o.z - o.lastZ) < 0.6) { o.wander = 1.1; const a = rb() * 6.283; o.wx = Math.sin(a); o.wz = Math.cos(a); } o.lastX = o.x; o.lastZ = o.z; o.stuckT = 0; }
    if (o.wander > 0) { o.wander -= dt; o.ix = o.wx; o.iz = o.wz; return; }
    if (seen && d < 15) {
      const diff = Math.abs(wrapPi(want - o.heading));
      if (diff > 0.09) {                                       // on se tourne vers la cible (petit mouvement = rotation sur place)
        o.ix = Math.sin(want) * 0.2; o.iz = Math.cos(want) * 0.2; o.react = (0.28 + rb() * 0.3) / o.skill;
      } else {
        o.react -= dt;
        if (o.react <= 0) o.wantFire = true;
        if (d < 4.2) { o.ix = -Math.sin(want) * 0.7; o.iz = -Math.cos(want) * 0.7; }     // trop près : on recule
        else if (d > 9) { o.ix = Math.sin(want) * 0.6; o.iz = Math.cos(want) * 0.6; }
      }
      return;
    }
    // pas de ligne de tir : on avance vers la cible en contournant les blocs
    let vx = dx / (d || 1), vz = dz / (d || 1);
    for (const b of blocks) {
      const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), px = o.x - cx, pz = o.z - cz, pd = Math.hypot(px, pz);
      if (pd < 2.3) { const k = (2.3 - pd) / 2.3 * 1.6; vx += (px / (pd || 1)) * k + (pz / (pd || 1)) * 0.9 * o.strafe * k; vz += (pz / (pd || 1)) * k - (px / (pd || 1)) * 0.9 * o.strafe * k; }
    }
    const m = Math.hypot(vx, vz) || 1;
    o.ix = vx / m; o.iz = vz / m;
  }

  function kill(o, by) {
    o.alive = false; o.hp = 0; o.diedAt = S.t;
    S.events.push({ type: "boom", i: o.i, x: o.x, z: o.z, by });
    if (by != null && by !== o.i) T[by].kills++;
    if (o === S.me) S.endAt = S.endAt == null ? S.t + 1.5 : S.endAt;
    else if (!T.slice(1).some((e) => e.alive) && S.me.alive && S.endAt == null) { S.win = true; S.endAt = S.t + 1.8; }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) { me.ix = inp.x; me.iz = inp.y; if (inp.act) fire(me); }
    for (const o of T) {
      if (!o.alive) continue;
      if (o.bot) { think(o, dt); if (o.wantFire) fire(o); }
      o.cd = Math.max(0, o.cd - dt); o.hit = Math.max(0, o.hit - dt);
      const m = Math.hypot(o.ix, o.iz);
      if (m > 0.08) o.heading = turnToward(o.heading, Math.atan2(o.ix, o.iz), 9.5 * dt);
      const sp = TK.speed * Math.min(1, m) * (m > 0.08 ? 1 : 0);
      const align = m > 0.08 ? Math.max(0.25, Math.cos(wrapPi(Math.atan2(o.ix, o.iz) - o.heading))) : 0;     // on avance mieux quand on est tourné du bon côté
      const tvx = Math.sin(o.heading) * sp * align * (Math.abs(wrapPi(Math.atan2(o.ix, o.iz) - o.heading)) > 1.2 ? 0.3 : 1), tvz = Math.cos(o.heading) * sp * align * (Math.abs(wrapPi(Math.atan2(o.ix, o.iz) - o.heading)) > 1.2 ? 0.3 : 1);
      o.vx += (tvx - o.vx) * Math.min(1, 12 * dt); o.vz += (tvz - o.vz) * Math.min(1, 12 * dt);
      o.x += o.vx * dt; o.z += o.vz * dt;
    }
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const p = T[i], q = T[j];
      if (!p.alive || !q.alive) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), D = TK.R * 2;
      if (d < D && d > 1e-4) { const k = (D - d) / 2 / d; p.x -= dx * k; p.z -= dz * k; q.x += dx * k; q.z += dz * k; }
    }
    for (const o of T) {
      if (!o.alive) continue;
      for (const b of blocks) pushOut(o, b, TK.R);
      o.x = clamp(o.x, -TK.HX + TK.R, TK.HX - TK.R); o.z = clamp(o.z, -TK.HZ + TK.R, TK.HZ - TK.R);
    }
    // obus
    for (let k = S.shells.length - 1; k >= 0; k--) {
      const s = S.shells[k];
      s.age += dt; s.life -= dt;
      const px = s.x, pz = s.z;
      s.x += s.vx * dt; s.z += s.vz * dt;
      let gone = s.life <= 0;
      const b = hitBlock(s.x, s.z, TK.shellR);
      if (b) {
        if (s.bounces > 0) {
          s.bounces--;
          const inX = px > b.x0 - TK.shellR && px < b.x1 + TK.shellR;
          if (inX) s.vz = -s.vz; else s.vx = -s.vx;
          s.x = px; s.z = pz;
          S.events.push({ type: "bounce", x: s.x, z: s.z });
        } else { gone = true; S.events.push({ type: "spark", x: s.x, z: s.z }); }
      }
      if (!gone && (Math.abs(s.x) > TK.HX - TK.shellR || Math.abs(s.z) > TK.HZ - TK.shellR)) {
        if (s.bounces > 0) { s.bounces--; if (Math.abs(s.x) > TK.HX - TK.shellR) { s.vx = -s.vx; s.x = clamp(s.x, -TK.HX + TK.shellR, TK.HX - TK.shellR); } else { s.vz = -s.vz; s.z = clamp(s.z, -TK.HZ + TK.shellR, TK.HZ - TK.shellR); } S.events.push({ type: "bounce", x: s.x, z: s.z }); }
        else { gone = true; S.events.push({ type: "spark", x: s.x, z: s.z }); }
      }
      if (!gone) for (const o of T) {
        if (!o.alive || (o.i === s.owner && s.age < 0.15)) continue;
        if (Math.hypot(o.x - s.x, o.z - s.z) < TK.R + TK.shellR) {
          gone = true; o.hp--; o.hit = 0.35;
          const sp = Math.hypot(s.vx, s.vz); o.vx += (s.vx / sp) * 3.2; o.vz += (s.vz / sp) * 3.2;
          if (s.owner !== o.i) T[s.owner].hits++;
          S.events.push({ type: "hit", i: o.i, by: s.owner, x: s.x, z: s.z });
          if (o.hp <= 0) kill(o, s.owner);
          break;
        }
      }
      if (gone) S.shells.splice(k, 1);
    }
    if (S.endAt == null && S.t >= seconds) S.endAt = S.t;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  /** Score : 100 par char détruit, 20 par obus qui touche, 0,8 par seconde en vie, 40 si on est encore là à la fin, 100 si on est le dernier. */
  const aliveSecs = () => Math.round(Math.min(seconds, S.me.alive ? S.t : S.me.diedAt ?? S.t) * 0.8);
  const score = () => aliveSecs() + S.me.kills * 100 + S.me.hits * 20 + (S.me.alive && (S.win || S.t >= seconds) ? 40 : 0) + (S.win ? 100 : 0);
  return { S, step, score };
}
