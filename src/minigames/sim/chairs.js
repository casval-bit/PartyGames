// Plateformes musicales (les chaises musicales) : tant que la musique joue, on tourne dans l'arène.
// « STOP ! » : il apparaît une plateforme de moins que de joueurs ; le premier dessus la garde. Celui qui reste sans plateforme est éliminé.
// On se bouscule (foncer) pour arriver le premier. Dernier en jeu = vainqueur.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S`.
import { rng, dist } from "./util.js";
import { makeBrawler, brawlDash, brawlMove, brawlCollide, keepInDisc } from "./brawl.js";

export const CH = { R: 6.2, padR: 0.9, musicMin: 3.2, musicMax: 6.2, grab: 5, settle: 1.3, round: 100, win: 150 };

export function createChairs(seed, { seconds = 45, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0xa11ce5);
  const P = [0, 1, 2, 3].map((i) => {
    const a = Math.PI + (i * Math.PI) / 2;
    return makeBrawler(Math.sin(a) * 3.2, Math.cos(a) * 3.2, i > 0 || autoMe, { id: i, i, skill: 0.72 + r() * 0.4, react: 0.15 + r() * 0.35, seat: -1, stun: 0, rounds: 0, out: false, outT: 0, wa: a, wait: 0, tgt: -1 });
  });
  if (autoMe) P[0].bot = true;
  const S = { t: 0, seconds, P, me: P[0], phase: "music", timer: 0, pads: [], round: 1, winner: -1, events: [], done: false, endT: 0 };
  S.timer = CH.musicMin + r() * (CH.musicMax - CH.musicMin);
  const alive = () => P.filter((o) => o.alive);

  function placePads(n) {
    const pads = [];
    for (let tries = 0; pads.length < n && tries < 400; tries++) {
      const a = r() * Math.PI * 2, d = 1.2 + Math.sqrt(r()) * (CH.R - 2.4);
      const x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (pads.every((p) => dist(p.x, p.z, x, z) > 2.4)) pads.push({ x, z, owner: -1, t: 0 });
    }
    return pads;
  }
  /** Bot : pendant la musique il tourne autour du centre ; au STOP il vise la plateforme libre où il a le plus d'avance. */
  function think(o, dt) {
    o.ix = o.iz = 0;
    if (o.seat >= 0 || o.stun > 0) return;
    if (S.phase === "music") {
      o.wa += dt * (0.55 + o.skill * 0.25) * (o.i % 2 ? 1 : -1);
      const rad = 3 + Math.sin(S.t * 0.7 + o.i) * 1.2, tx = Math.sin(o.wa) * rad, tz = Math.cos(o.wa) * rad;
      const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz) || 1;
      const k = Math.min(1, d / 1.2) * 0.75; o.ix = (dx / d) * k; o.iz = (dz / d) * k;
      return;
    }
    if (S.phase !== "scramble") return;
    o.wait -= dt;
    if (o.wait > 0) return;
    const free = S.pads.map((p, k) => [p, k]).filter(([p]) => p.owner < 0);
    if (!free.length) return;
    let best = null, bs = 1e9;
    for (const [p, k] of free) {
      const mine = dist(o.x, o.z, p.x, p.z);
      const rival = Math.min(99, ...P.filter((q) => q !== o && q.alive && q.seat < 0).map((q) => dist(q.x, q.z, p.x, p.z)));
      const sc = mine - Math.min(rival, mine + 1.5) * 0.6 + (k === o.tgt ? -0.5 : 0) + rb() * 0.3;
      if (sc < bs) { bs = sc; best = [p, k]; }
    }
    const [p, k] = best; o.tgt = k;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || 1;
    o.ix = dx / d; o.iz = dz / d;
    if (o.cd <= 0 && d > 2.2 && rb() < dt * 4 * o.skill) { if (brawlDash(o, { speed: 12, dur: 0.26, cd: 1.5 })) S.events.push({ type: "dash", i: o.i }); }
    else if (o.cd <= 0) {
      const foe = P.find((q) => q !== o && q.alive && q.seat < 0 && dist(o.x, o.z, q.x, q.z) < 1.8);
      if (foe && rb() < dt * 3 * o.skill) { o.face = Math.atan2(foe.x - o.x, foe.z - o.z); if (brawlDash(o, { speed: 12, dur: 0.26, cd: 1.5 })) S.events.push({ type: "dash", i: o.i }); }
    }
  }
  function endRound() {
    const losers = alive().filter((o) => o.seat < 0);
    for (const o of losers) { o.alive = false; o.out = true; o.outT = 0; S.events.push({ type: "out", i: o.i, x: o.x, z: o.z }); }
    for (const o of alive()) { o.rounds++; o.seat = -1; o.tgt = -1; }
    S.pads = [];
    const left = alive();
    if (left.length <= 1) {
      S.phase = "over"; S.winner = left.length ? left[0].i : -1; S.endT = 1.6;
      if (left.length) S.events.push({ type: "win", i: left[0].i });
      return;
    }
    S.round++; S.phase = "music"; S.timer = CH.musicMin + r() * (CH.musicMax - CH.musicMin);
    S.events.push({ type: "music", round: S.round });
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot && me.alive && me.seat < 0) {
      me.ix = me.stun > 0 ? 0 : inp.x; me.iz = me.stun > 0 ? 0 : inp.y;
      if (inp.act && me.stun <= 0 && brawlDash(me, { speed: 12, dur: 0.26, cd: 1.5 })) S.events.push({ type: "dash", i: 0 });
    }
    S.timer -= dt;
    if (S.phase === "music" && S.timer <= 0) {
      S.phase = "scramble"; S.timer = CH.grab;
      S.pads = placePads(alive().length - 1);
      for (const o of alive()) o.wait = o.react * (1.1 - o.skill * 0.3);
      S.events.push({ type: "stop", n: S.pads.length });
    } else if (S.phase === "scramble" && (S.timer <= 0 || S.pads.every((p) => p.owner >= 0))) {
      S.phase = "settle"; S.timer = CH.settle;
    } else if (S.phase === "settle" && S.timer <= 0) endRound();
    else if (S.phase === "over") { S.endT -= dt; if (S.endT <= 0) S.done = true; }

    const movers = [];
    for (const o of P) {
      o.stun = Math.max(0, o.stun - dt);
      if (o.out) { o.outT += dt; continue; }
      if (o.seat >= 0) { const p = S.pads[o.seat]; if (p) { o.x += (p.x - o.x) * Math.min(1, dt * 12); o.z += (p.z - o.z) * Math.min(1, dt * 12); } o.vx = o.vz = 0; continue; }
      if (o.bot) think(o, dt);
      brawlMove(o, dt, { cap: o.bot ? 5.4 * o.skill + 0.7 : 6.2, accel: 32 });
      keepInDisc(o, CH.R - 0.45, 0.5);
      movers.push(o);
    }
    const hits = brawlCollide(movers, { radius: 0.6, kick0: 1.3, dashKick: 7 });
    for (const h of hits) { h.victim.stun = 0.45; S.events.push({ type: "hit", i: h.victim.i, by: h.hitter.i, x: h.victim.x, z: h.victim.z }); }
    // les joueurs assis sont des obstacles fixes
    for (const o of movers) for (const q of P) {
      if (q.seat < 0 || !q.alive) continue;
      const dx = o.x - q.x, dz = o.z - q.z, d = Math.hypot(dx, dz), D = 1.15;
      if (d < D && d > 0.001) { o.x = q.x + (dx / d) * D; o.z = q.z + (dz / d) * D; }
    }
    if (S.phase === "scramble") {
      for (const o of movers) {
        if (o.stun > 0) continue;
        const k = S.pads.findIndex((p) => p.owner < 0 && dist(o.x, o.z, p.x, p.z) < CH.padR);
        if (k >= 0) { S.pads[k].owner = o.i; o.seat = k; o.vx = o.vz = 0; o.dash = 0; S.events.push({ type: "seat", i: o.i, k, x: S.pads[k].x, z: S.pads[k].z }); }
      }
    }
    for (const p of S.pads) p.t += dt;
    if (S.t >= seconds && S.phase !== "over") { S.phase = "over"; S.endT = 0.01; S.winner = -1; }
  }
  const pts = (o) => o.rounds * CH.round + (S.winner === o.i ? CH.win : 0);
  const score = () => pts(S.me);
  return { S, step, score, pts };
}
