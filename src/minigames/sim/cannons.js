// Canons en cercle : des canons autour de l'arène annoncent leur tir (couloir rouge au sol) puis lancent un boulet qui traverse tout le plateau.
// On l'esquive en bougeant, ou en sautant par-dessus. 3 cœurs. On ramasse des gemmes au milieu du danger. Simulation pure : le décor 3D lit `S`.
import { rng, clamp, dist } from "./util.js";
import { makeBrawler, brawlMove, brawlCollide, keepInDisc } from "./brawl.js";

export const CN = { R: 6.0, RIM: 5.45, cannonR: 7.1, shellV: 11.5, shellR: 0.5, lives: 3, jump: 0.75, jumpH: 1.45 };

export function createCannons(seed, { seconds = 32, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0xca44071);
  const cannons = Array.from({ length: 8 }, (_, k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return { k, a, x: Math.sin(a) * CN.cannonR, z: Math.cos(a) * CN.cannonR, kick: 0 }; });
  const P = [0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    return makeBrawler(Math.sin(a) * 2.6, Math.cos(a) * 2.6, i > 0 || autoMe, { id: i, i, lives: CN.lives, inv: 0, stun: 0, jy: 0, jt: 0, jcd: 0, gems: 0, born: 0, died: null, skill: 0.8 + r() * 0.35, react: 0.33 + r() * 0.3, seen: new Map(), tgt: null, wob: r() * 6.28 });
  });
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], cannons, lanes: [], shells: [], gem: null, nextGem: 1.0, nextSalvo: 1.4, events: [], done: false, endAt: null };

  function spawnGem() {
    for (let tries = 0; tries < 12; tries++) {
      const a = r() * 6.283, d = 1 + r() * 3.9, x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (!P.some((o) => o.alive && dist(o.x, o.z, x, z) < 1.2)) { S.gem = { x, z, t: 0 }; S.events.push({ type: "gem", x, z }); return; }
    }
  }
  function salvo() {
    const t = S.t, n = 1 + Math.min(4, Math.floor(t / 6)), tel = Math.max(0.55, 1.0 - t * 0.016);
    const free = cannons.filter((c) => !S.lanes.some((l) => l.c === c));
    for (let i = 0; i < n && free.length; i++) {
      const c = free.splice(Math.floor(r() * free.length), 1)[0];
      const alive = P.filter((o) => o.alive), tg = r() < 0.6 && P[0].alive ? P[0] : alive[Math.floor(r() * alive.length)];
      const jitter = (r() - 0.5) * 1.6;
      let tx = tg ? tg.x : 0, tz = tg ? tg.z : 0;
      tx += (tg ? tg.vx : 0) * 0.35 + jitter; tz += (tg ? tg.vz : 0) * 0.35 + jitter * 0.5;
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz) || 1;
      S.lanes.push({ c, dx: dx / d, dz: dz / d, t: 0, tel, fired: false, id: Math.floor(r() * 1e9) });
      S.events.push({ type: "aim", k: c.k });
    }
    S.nextSalvo = t + Math.max(0.85, 2.1 - t * 0.04) + r() * 0.45;
  }
  /** Distance latérale d'un point à un couloir (0 = pile dessus) et position le long du couloir. */
  const laneDist = (l, x, z) => { const rx = x - l.c.x, rz = z - l.c.z; return { lat: rx * l.dz - rz * l.dx, along: rx * l.dx + rz * l.dz }; };

  function think(o, dt) {                                               // esquive des bots
    o.ix = o.iz = 0;
    if (S.t < 0.9 || o.stun > 0) return;
    let ax = 0, az = 0, danger = false;
    for (const l of S.lanes) {
      if (!o.seen.has(l.id)) o.seen.set(l.id, S.t);
      if (S.t - o.seen.get(l.id) < o.react / o.skill) continue;       // il lui faut un instant pour repérer le couloir
      const { lat, along } = laneDist(l, o.x, o.z);
      let shellAhead = true;
      if (l.fired) { const sh = S.shells.find((s) => s.lane === l); shellAhead = sh ? along > laneDist(l, sh.x, sh.z).along - 0.8 : false; }
      if (Math.abs(lat) < 1.75 && shellAhead && along > 0) {
        danger = true;
        const side = Math.abs(lat) < 0.15 ? (o.wob > 3.14 ? 1 : -1) : Math.sign(lat);
        const px = l.dz * side, pz = -l.dx * side;                      // perpendiculaire au couloir
        ax += px * (2 - Math.abs(lat)); az += pz * (2 - Math.abs(lat));
        if (l.fired) { const sh = S.shells.find((s) => s.lane === l); if (sh && Math.abs(lat) < 0.9 && Math.hypot(sh.x - o.x, sh.z - o.z) < 3.2 && o.jcd <= 0 && o.jt <= 0 && rb() < dt * 9 * o.skill) { o.wantJump = true; } }
      }
    }
    if (!danger) {
      const g = S.gem;
      if (g && !S.lanes.some((l) => { const d = laneDist(l, g.x, g.z); return Math.abs(d.lat) < 1.9 && d.along > 0 && !l.done; })) { const dx = g.x - o.x, dz = g.z - o.z, d = Math.hypot(dx, dz) || 1; if (d > 0.3) { ax = dx / d; az = dz / d; } }
      else { const d = Math.hypot(o.x, o.z); if (d > 3.4) { ax = -o.x / d; az = -o.z / d; } }
    }
    const edge = Math.hypot(o.x, o.z);
    if (edge > CN.RIM - 0.9) { ax -= (o.x / edge) * 1.2; az -= (o.z / edge) * 1.2; }
    const m = Math.hypot(ax, az);
    if (m > 0.01) { o.ix = ax / Math.max(1, m); o.iz = az / Math.max(1, m); }
  }

  function hurt(o, sh) {
    o.lives--; o.inv = 1.3; o.stun = 0.55;
    const sp = Math.hypot(sh.vx, sh.vz) || 1; o.vx = (sh.vx / sp) * 6; o.vz = (sh.vz / sp) * 6;
    S.events.push({ type: "hit", i: o.i, x: o.x, z: o.z });
    if (o.lives <= 0) { o.alive = false; o.died = S.t; S.events.push({ type: "out", i: o.i, x: o.x, z: o.z }); if (o === S.me) S.endAt = S.endAt == null ? S.t + 1.5 : S.endAt; }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot) { me.ix = inp.x; me.iz = inp.y; if (inp.act) me.wantJump = true; }
    for (const o of P) {
      if (!o.alive) continue;
      if (o.bot) think(o, dt);
      o.inv = Math.max(0, o.inv - dt); o.stun = Math.max(0, o.stun - dt); o.jcd = Math.max(0, o.jcd - dt);
      if (o.wantJump && o.jt <= 0 && o.jcd <= 0 && o.stun <= 0) { o.jt = CN.jump; o.jcd = 0.35; o.wantJump = false; S.events.push({ type: "jump", i: o.i }); }
      o.wantJump = false;
      if (o.jt > 0) { o.jt = Math.max(0, o.jt - dt); const k = 1 - o.jt / CN.jump; o.jy = Math.sin(k * Math.PI) * CN.jumpH; } else o.jy = 0;
      if (o.stun > 0) { o.ix = o.iz = 0; }
      o.speedK = 1;
      brawlMove(o, dt, { accel: 44, cap: o.bot ? 5.1 * o.skill : 5.5, damp: 4.5 });
    }
    brawlCollide(P.filter((o) => o.alive), { radius: 0.6, kick0: 0.6, dashKick: 0 });
    for (const o of P) if (o.alive) keepInDisc(o, CN.RIM, 0.2);
    // salves de canons
    if (S.t >= S.nextSalvo && S.endAt == null) salvo();
    for (let i = S.lanes.length - 1; i >= 0; i--) {
      const l = S.lanes[i]; l.t += dt;
      if (!l.fired && l.t >= l.tel) {
        l.fired = true; l.c.kick = 0.25;
        const sv = CN.shellV + Math.min(3, S.t * 0.1); S.shells.push({ x: l.c.x, z: l.c.z, vx: l.dx * sv, vz: l.dz * sv, lane: l, age: 0 });
        S.events.push({ type: "fire", k: l.c.k, x: l.c.x, z: l.c.z });
      }
      if (l.fired && !S.shells.some((s) => s.lane === l)) { l.done = true; S.lanes.splice(i, 1); }
    }
    for (const c of cannons) c.kick = Math.max(0, c.kick - dt);
    for (let k = S.shells.length - 1; k >= 0; k--) {
      const s = S.shells[k]; s.age += dt; s.x += s.vx * dt; s.z += s.vz * dt;
      for (const o of P) {
        if (!o.alive || o.inv > 0 || o.jy > 0.7) continue;
        if (Math.hypot(o.x - s.x, o.z - s.z) < CN.shellR + 0.5) hurt(o, s);
      }
      if (Math.hypot(s.x, s.z) > CN.cannonR + 1.5 || s.age > 3) S.shells.splice(k, 1);
    }
    // gemmes
    if (S.gem) {
      S.gem.t += dt;
      for (const o of P) if (o.alive && dist(o.x, o.z, S.gem.x, S.gem.z) < 0.95) { o.gems++; S.events.push({ type: "pick", i: o.i, x: S.gem.x, z: S.gem.z }); S.gem = null; S.nextGem = S.t + 0.7; break; }
      if (S.gem && S.gem.t > 7) { S.gem = null; S.nextGem = S.t + 0.5; }
    } else if (S.t >= S.nextGem) spawnGem();
    if (S.endAt == null && (S.t >= seconds || !P.some((o) => o.alive))) S.endAt = S.t;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const alive = () => (S.me.alive ? Math.min(S.t, seconds) : S.me.died ?? S.t);
  /** Score : 8 points par seconde tenue, 25 par gemme, 20 par cœur restant si on finit en vie. */
  const score = () => Math.round(alive() * 8) + S.me.gems * 25 + (S.me.alive && S.t >= seconds ? S.me.lives * 20 : 0);
  return { S, step, score };
}
