// Poseur de bombes (façon Bomberman) : 4 joueurs dans une grille de murs et de caisses, on pose des bombes en croix pour casser les caisses et faire sauter les autres.
// Simulation pure : le décor 3D lit `S` ; les bots choisissent leur route case par case (fuite, caisses, adversaires).
import { rng } from "./util.js";

export const BM = { W: 9, H: 11, bombT: 2.3, flameT: 0.55, speed: 4.3 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function createBomber(seed, { seconds = 60, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x51ed270b);
  const { W, H } = BM;
  const grid = Array.from({ length: H }, () => Array(W).fill(0));      // 0 vide, 1 mur, 2 caisse
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (x === 0 || z === 0 || x === W - 1 || z === H - 1 || (x % 2 === 0 && z % 2 === 0)) grid[z][x] = 1;
  const spawns = [[1, H - 2], [W - 2, 1], [1, 1], [W - 2, H - 2]];       // le joueur en bas à gauche
  const nearSpawn = (x, z) => spawns.some(([sx, sz]) => Math.abs(sx - x) + Math.abs(sz - z) <= 2);
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (grid[z][x] === 0 && !nearSpawn(x, z) && r() < 0.66) grid[z][x] = 2;
  const A = spawns.map(([x, z], i) => ({ i, bot: i > 0 && true, cx: x, cz: z, tx: x, tz: z, px: x, pz: z, moving: false, face: 0, alive: true, range: 2, maxB: 1, placed: 0, speed: BM.speed, kills: 0, crates: 0, items: 0, idle: 0, wait: 0.8 + r() * 1.4, flee: 0, skill: 0.85 + r() * 0.3 }));
  if (autoMe) A[0].bot = true;
  const S = { t: 0, seconds, grid, W, H, A, me: A[0], bombs: [], flames: [], items: [], events: [], win: false, done: false, endAt: null };
  const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < H;
  const bombAt = (x, z) => S.bombs.find((b) => b.x === x && b.z === z);
  const walkable = (x, z) => inb(x, z) && grid[z][x] === 0 && !bombAt(x, z);

  /** Cases touchées par une bombe : en croix, arrêtée par un mur, et par la première caisse (qu'elle casse). */
  function blast(x, z, range) {
    const cells = [[x, z]];
    for (const [dx, dz] of DIRS) for (let k = 1; k <= range; k++) {
      const nx = x + dx * k, nz = z + dz * k;
      if (!inb(nx, nz) || grid[nz][nx] === 1) break;
      cells.push([nx, nz]);
      if (grid[nz][nx] === 2 || bombAt(nx, nz)) break;
    }
    return cells;
  }
  /** Carte de danger : temps avant d'être touché (Infinity = sûr). Les réactions en chaîne comptent. */
  function dangerMap(extra) {
    const D = Array.from({ length: H }, () => Array(W).fill(Infinity));
    for (const f of S.flames) D[f.z][f.x] = 0;
    const bs = S.bombs.map((b) => ({ x: b.x, z: b.z, range: b.range, t: b.t }));
    if (extra) bs.push(extra);
    for (let pass = 0; pass < 4; pass++) for (const b of bs) for (const [x, z] of blast(b.x, b.z, b.range)) {
      D[z][x] = Math.min(D[z][x], b.t);
      const o = bs.find((q) => q.x === x && q.z === z && q !== b);
      if (o && o.t > b.t) o.t = b.t;
    }
    return D;
  }
  /** Premier pas vers la plus proche case qui vérifie `goal` (recherche en largeur) ; `avoid(x,z)` interdit des cases. */
  function bfs(a, goal, avoid, maxD = 30) {
    const seen = new Map([[a.cz * W + a.cx, null]]);
    let q = [[a.cx, a.cz, 0, null]];
    while (q.length) {
      const nq = [];
      for (const [x, z, d, first] of q) {
        if (d > 0 && goal(x, z, d)) return { step: first, d, x, z };
        if (d >= maxD) continue;
        for (const dir of DIRS) {
          const nx = x + dir[0], nz = z + dir[1], key = nz * W + nx;
          if (seen.has(key) || !walkable(nx, nz) || (avoid && avoid(nx, nz, d + 1))) continue;
          seen.set(key, 1); nq.push([nx, nz, d + 1, first || dir]);
        }
      }
      q = nq;
    }
    return null;
  }
  const enemies = (a) => A.filter((o) => o !== a && o.alive);
  const lineClear = (x1, z1, x2, z2) => {
    if (x1 !== x2 && z1 !== z2) return false;
    const dx = Math.sign(x2 - x1), dz = Math.sign(z2 - z1);
    for (let x = x1 + dx, z = z1 + dz; x !== x2 || z !== z2; x += dx, z += dz) if (grid[z][x] !== 0) return false;
    return true;
  };
  /** Cette case sera-t-elle en flammes quand j'y passerai (à `d` cases d'ici) ? */
  const burning = (a, D, x, z, d) => { const T = d / a.speed, t = D[z][x]; return t < Infinity && T > t - 0.4 && T < t + BM.flameT + 0.3; };
  const exits = (x, z) => DIRS.reduce((n, [dx, dz]) => n + (walkable(x + dx, z + dz) ? 1 : 0), 0);
  function escapeExists(a, extra) {
    const D = dangerMap(extra);
    return bfs(a, (x, z) => D[z][x] === Infinity && exits(x, z) >= 2, (x, z, d) => burning(a, D, x, z, d), 8) !== null;
  }
  /** Intelligence des bots, appelée quand un bot est au centre d'une case. Renvoie { dir, bomb }. */
  function botDecide(a) {
    const D = dangerMap();
    const res = { dir: null, bomb: false };
    if (D[a.cz][a.cx] < Infinity) {                                  // en danger : on file vers une case sûre
      const f = bfs(a, (x, z) => D[z][x] === Infinity && exits(x, z) >= 2, (x, z, d) => burning(a, D, x, z, d), 12) || bfs(a, (x, z) => D[z][x] === Infinity, (x, z, d) => burning(a, D, x, z, d), 12) || bfs(a, (x, z) => D[z][x] === Infinity, (x, z) => D[z][x] === 0, 12);
      res.dir = f && f.step; return res;
    }
    const ens = enemies(a);
    const near = (dx, dz) => inb(a.cx + dx, a.cz + dz) && grid[a.cz + dz][a.cx + dx] === 2;
    const crateAdj = DIRS.some(([dx, dz]) => near(dx, dz));
    const foe = ens.find((e) => (lineClear(a.cx, a.cz, e.cx, e.cz) && Math.abs(e.cx - a.cx) + Math.abs(e.cz - a.cz) <= a.range) || Math.abs(e.cx - a.cx) + Math.abs(e.cz - a.cz) <= 1);
    if (a.placed < a.maxB && (crateAdj || foe) && !bombAt(a.cx, a.cz) && rb() < (foe ? 0.9 : 0.75) * a.skill && escapeExists(a, { x: a.cx, z: a.cz, range: a.range, t: BM.bombT })) { res.bomb = true; return res; }
    // où aller : objet proche > case collée à une caisse > adversaire
    const safe = (x, z, d) => burning(a, D, x, z, d) || (D[z][x] < Infinity && D[z][x] < 0.9);
    const ok = (x, z) => D[z][x] === Infinity;
    let f = bfs(a, (x, z) => ok(x, z) && S.items.some((it) => it.x === x && it.z === z), safe, 7);
    if (!f && ens.length && rb() < 0.38) f = bfs(a, (x, z) => ok(x, z) && ens.some((e) => Math.abs(e.cx - x) + Math.abs(e.cz - z) <= 1 || (lineClear(x, z, e.cx, e.cz) && Math.abs(e.cx - x) + Math.abs(e.cz - z) <= a.range)), safe, 12);
    if (!f) f = bfs(a, (x, z) => ok(x, z) && DIRS.some(([dx, dz]) => inb(x + dx, z + dz) && grid[z + dz][x + dx] === 2), safe, 20);
    if (!f && ens.length) f = bfs(a, (x, z) => ok(x, z) && ens.some((e) => Math.abs(e.cx - x) + Math.abs(e.cz - z) <= 1), safe, 30);
    res.dir = f && f.step;
    return res;
  }

  const cellNear = (a) => (a.moving && Math.abs(a.px - a.cx) + Math.abs(a.pz - a.cz) > 0.5 ? [a.tx, a.tz] : [a.cx, a.cz]);
  function placeBomb(a) {
    if (!a.alive || a.placed >= a.maxB) return false;
    const [x, z] = cellNear(a);
    if (bombAt(x, z) || grid[z][x] !== 0) return false;
    S.bombs.push({ x, z, t: BM.bombT, range: a.range, owner: a.i });
    a.placed++; S.events.push({ type: "place", x, z, i: a.i });
    return true;
  }
  function explode(b0) {
    const queue = [b0], done = new Set();
    while (queue.length) {
      const b = queue.pop();
      if (done.has(b)) continue;
      done.add(b);
      S.bombs.splice(S.bombs.indexOf(b), 1);
      const own = A[b.owner]; if (own) own.placed = Math.max(0, own.placed - 1);
      const cells = blast(b.x, b.z, b.range);
      S.events.push({ type: "boom", x: b.x, z: b.z, cells: cells.map(([x, z]) => [x, z]), i: b.owner });
      for (const [x, z] of cells) {
        S.flames.push({ x, z, t: BM.flameT, owner: b.owner });
        if (grid[z][x] === 2) {
          grid[z][x] = 0; if (own) own.crates++;
          S.events.push({ type: "crate", x, z, i: b.owner });
          if (r() < 0.3) S.items.push({ x, z, kind: r() < 0.5 ? "range" : "bomb", t: 0 });
        }
        const o = bombAt(x, z); if (o && !done.has(o)) queue.push(o);
        const it = S.items.findIndex((q) => q.x === x && q.z === z && q.t > 0.2);
        if (it >= 0) S.items.splice(it, 1);
      }
    }
  }
  function die(a, killer) {
    a.alive = false; a.diedAt = S.t;
    S.events.push({ type: "die", i: a.i, x: a.px, z: a.pz, by: killer });
    if (killer != null && killer !== a.i) A[killer].kills++;
    if (a === S.me) S.endAt = S.endAt == null ? S.t + 1.5 : S.endAt;
    else if (!A.slice(1).some((o) => o.alive) && S.me.alive && S.endAt == null) { S.win = true; S.endAt = S.t + 1.8; }
  }
  const dirOf = (inp) => {
    const ax = Math.abs(inp.x), az = Math.abs(inp.y);
    if (Math.max(ax, az) < 0.32) return null;
    return ax >= az ? [Math.sign(inp.x), 0] : [0, Math.sign(inp.y)];
  };

  function moveActor(a, dt, want) {
    let rem = a.speed * dt;
    for (let guard = 0; guard < 4 && rem > 1e-6; guard++) {
      if (a.moving && want && want[0] === -Math.sign(a.tx - a.cx) && want[1] === -Math.sign(a.tz - a.cz) && (want[0] || want[1])) {   // demi-tour en route
        [a.cx, a.cz, a.tx, a.tz] = [a.tx, a.tz, a.cx, a.cz];
      }
      if (!a.moving) {
        if (!want || (!want[0] && !want[1])) break;
        const nx = a.cx + want[0], nz = a.cz + want[1];
        a.face = Math.atan2(want[0], want[1]);
        if (!walkable(nx, nz)) break;
        a.moving = true; a.tx = nx; a.tz = nz;
      }
      const dx = a.tx - a.px, dz = a.tz - a.pz, d = Math.hypot(dx, dz);
      if (d <= rem + 1e-9) {
        a.px = a.tx; a.pz = a.tz; a.cx = a.tx; a.cz = a.tz; a.moving = false; rem -= d;
        const k = S.items.findIndex((q) => q.x === a.cx && q.z === a.cz);
        if (k >= 0) {
          const it = S.items.splice(k, 1)[0]; a.items++;
          if (it.kind === "range") a.range = Math.min(5, a.range + 1); else a.maxB = Math.min(3, a.maxB + 1);
          S.events.push({ type: "item", i: a.i, kind: it.kind, x: a.cx, z: a.cz });
        }
        if (a.bot) return "arrived";
      } else { a.px += (dx / d) * rem; a.pz += (dz / d) * rem; a.face = Math.atan2(dx, dz); rem = 0; }
    }
    return null;
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    for (const it of S.items) it.t += dt;
    for (const a of A) {
      if (!a.alive) continue;
      if (a.bot) {
        if (a.wait > 0) { a.wait -= dt; continue; }
        if (!a.moving) {
          if (a.idle > 0) { a.idle -= dt; continue; }
          const d = botDecide(a);
          if (d.bomb) { placeBomb(a); a.idle = 0.05; continue; }
          a.want = d.dir || null;
          if (!d.dir && rb() < 0.2) a.idle = 0.25;
        }
        moveActor(a, dt, a.want);
        if (!a.moving) a.want = null;
      } else {
        const dir = dirOf(inp);
        if (inp.act && !a._held) { placeBomb(a); }
        a._held = inp.act;
        moveActor(a, dt, dir);
      }
    }
    for (let i = S.bombs.length - 1; i >= 0; i--) {
      const b = S.bombs[i];
      if (!b) continue;
      b.t -= dt;
      if (b.t <= 0 && S.bombs.includes(b)) explode(b);
    }
    for (let i = S.flames.length - 1; i >= 0; i--) { S.flames[i].t -= dt; if (S.flames[i].t <= 0) S.flames.splice(i, 1); }
    for (const a of A) {
      if (!a.alive) continue;
      const x = Math.round(a.px), z = Math.round(a.pz), f = S.flames.find((q) => q.x === x && q.z === z);
      if (f) die(a, f.owner);
    }
    if (S.endAt == null && S.t >= seconds) S.endAt = S.t;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  /** Score : 8 par caisse, 150 par adversaire éliminé, 10 par objet, 1 par seconde en vie, 60 si on survit, 100 si on est le dernier. */
  const aliveSecs = () => Math.round(Math.min(seconds, S.me.alive ? S.t : S.me.diedAt ?? S.t));
  const score = () => aliveSecs() + S.me.crates * 8 + S.me.kills * 150 + S.me.items * 10 + (S.me.alive && (S.win || S.t >= seconds) ? 60 : 0) + (S.win ? 100 : 0);
  return { S, step, score, botDecide, dangerMap };
}
