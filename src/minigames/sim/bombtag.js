// Patate explosive : une bombe passe de main en main (on la refile en touchant quelqu'un). Quand la mèche s'éteint, celui qui la tient saute.
// Dernier debout gagne. Simulation pure : `step(dt, input)` ; le décor 3D se contente de lire `S`.
import { rng, clamp, dist } from "./util.js";
import { makeBrawler, brawlDash, brawlMove, brawlCollide, keepInDisc } from "./brawl.js";

export const BT = { R: 5.8, RIM: 5.2, fuseMin: 5.5, fuseRand: 3, cool: 1.0, tagDist: 1.45 };

export function createBombTag(seed, { seconds = 40 } = {}) {
  const r = rng(seed);
  const names = ["me", "b0", "b1", "b2"];
  const P = names.map((id, i) => {
    const a = i * Math.PI / 2;                              // chacun à un coin de la table, le joueur en bas
    const o = makeBrawler(Math.sin(a + Math.PI) * 3.4, Math.cos(a + Math.PI) * 3.4, i > 0, { id, i, skill: 0.8 + r() * 0.35, wob: r() * 6.28, spin: r() < 0.5 ? 1 : -1 });
    o.face = a;
    return o;
  });
  const S = {
    t: 0, seconds, P, me: P[0], round: 1, exploded: 0, win: false, done: false, endAt: null,
    bomb: { holder: Math.floor(r() * 4), fuse: BT.fuseMin + r() * BT.fuseRand, fuse0: 0, last: -1, cool: 0 },
    events: [],                                             // { type: "tag" | "boom" | "dash", ... } lus puis vidés par l'affichage
  };
  S.bomb.fuse0 = S.bomb.fuse;
  const rb = rng(seed ^ 0x9e3779b9);                       // hasard des bots (graine à part : ne perturbe pas le déroulé commun)
  const alive = () => P.filter((o) => o.alive);

  function think(o, dt) {                                   // intelligence des bots
    const others = alive().filter((x) => x !== o);
    o.ix = o.iz = 0;
    if (S.t < 0.9) return;
    const hold = S.bomb.holder === o.i;
    const edge = Math.hypot(o.x, o.z);
    let tx = 0, tz = 0;
    if (hold) {
      // chasse la proie la plus proche (en visant un peu devant elle) ; ne retouche pas celui qui vient de la donner
      let best = null, bd = 1e9;
      for (const x of others) {
        if (S.bomb.cool > 0 && x.i === S.bomb.last) continue;
        const d = dist(o.x, o.z, x.x, x.z) - (x.bot ? 0 : 0.5);
        if (d < bd) { bd = d; best = x; }
      }
      if (best) {
        tx = best.x + best.vx * 0.28 - o.x; tz = best.z + best.vz * 0.28 - o.z;
        if (bd < 3 && o.cd <= 0 && rb() < dt * 2.6 * o.skill) { brawlDash(o); S.events.push({ type: "dash", i: o.i }); }
      }
    } else {
      const h = P[S.bomb.holder];
      if (h && h.alive) {
        const dx = o.x - h.x, dz = o.z - h.z, d = Math.hypot(dx, dz) || 1, w = clamp(7 / d, 0.3, 2.2);
        tx = (dx / d) * w; tz = (dz / d) * w;
        const px = -dz / d, pz = dx / d;                    // on contourne en cercle plutôt que de se coincer au bord
        tx += px * o.spin * 0.8; tz += pz * o.spin * 0.8;
        if (d < 2.4 && o.cd <= 0 && rb() < dt * 3 * o.skill) { brawlDash(o); S.events.push({ type: "dash", i: o.i }); }
      }
    }
    if (edge > BT.RIM - 1.1) { const k = (edge - (BT.RIM - 1.1)) * 1.4; tx -= (o.x / edge) * k * 3; tz -= (o.z / edge) * k * 3; }
    const m = Math.hypot(tx, tz) || 1;
    o.ix = tx / m; o.iz = tz / m;
  }

  function boom(o) {
    o.alive = false; o.vx *= 0.2; o.vz *= 0.2;
    S.events.push({ type: "boom", i: o.i, x: o.x, z: o.z });
    if (o !== S.me) S.exploded++;
    const left = alive();
    if (o === S.me) { S.endAt = S.t + 1.6; return; }
    if (left.length === 1 && left[0] === S.me) { S.win = true; S.endAt = S.t + 1.8; return; }
    if (left.length <= 1) { S.endAt = S.t + 1.6; return; }
    // manche suivante : la bombe va à un survivant au hasard, mèche un peu plus courte
    S.round++;
    const b = S.bomb;
    b.fuse0 = b.fuse = Math.max(4.2, BT.fuseMin - 0.25 * (S.round - 1)) + r() * BT.fuseRand;
    b.holder = left[Math.floor(r() * left.length)].i; b.last = -1; b.cool = 0.8;
    S.events.push({ type: "round", holder: b.holder });
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    me.ix = inp.x; me.iz = inp.y;
    if (inp.act && me.alive && brawlDash(me)) S.events.push({ type: "dash", i: 0 });
    for (const o of P) {
      if (!o.alive) continue;
      if (o.bot) think(o, dt);
      o.speedK = S.bomb.holder === o.i ? 1.12 : 1;            // celui qui tient la bombe court un peu plus vite
      brawlMove(o, dt, { cap: o.bot ? 5.1 * o.skill : 5.5 });
    }
    brawlCollide(P, { radius: 0.62, kick0: 1.2, dashKick: 5 });
    for (const o of P) if (o.alive) keepInDisc(o, BT.RIM);
    // la bombe
    const b = S.bomb;
    b.cool = Math.max(0, b.cool - dt);
    if (S.endAt == null) {
      b.fuse -= dt;
      const h = P[b.holder];
      if (b.cool <= 0 && h && h.alive) {
        for (const x of P) {
          if (!x.alive || x === h || (x.i === b.last && b.cool > 0)) continue;
          if (dist(h.x, h.z, x.x, x.z) < BT.tagDist) {
            b.last = h.i; b.holder = x.i; b.cool = BT.cool;
            const dx = x.x - h.x, dz = x.z - h.z, d = Math.hypot(dx, dz) || 1;
            x.vx += (dx / d) * 4; x.vz += (dz / d) * 4; h.vx -= (dx / d) * 2; h.vz -= (dz / d) * 2;
            S.events.push({ type: "tag", from: h.i, to: x.i });
            break;
          }
        }
      }
      if (b.fuse <= 0 && P[b.holder].alive) boom(P[b.holder]);
    }
    if (S.endAt == null && S.t >= seconds) S.endAt = S.t;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  /** Score : 2 points par seconde tenue, 100 par adversaire qui saute, 150 si on est le dernier, 40 si on finit en vie au bout du temps. */
  const score = () => Math.round(Math.min(S.t, seconds) * 2) + S.exploded * 100 + (S.win ? 150 : 0) + (S.me.alive && !S.win && S.t >= seconds ? 40 : 0);
  return { S, step, score };
}
