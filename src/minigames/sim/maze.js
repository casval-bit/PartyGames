// Labyrinthe des gloutons (façon Pac-Man à 4) : on glisse dans un labyrinthe tiré au hasard, on mange les pastilles, trois fantômes chassent (le plus proche, le meneur, un joueur au hasard).
// Une grosse pastille rend invincible quelques secondes : on mange les fantômes et on vole des pastilles aux autres. Attrapé : on perd des pastilles, qui retournent dans le labyrinthe.
// Simulation pure : `step(dt, input)` ; le décor 3D lit `S` (toutes les positions sont en cases : x vers la droite, z vers le bas).
import { rng } from "./util.js";

export const MZ = { W: 13, H: 15, speed: 3.8, ghost: 3.55, fright: 2.2, eaten: 7.5, power: 5.5, inv: 2.0 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Labyrinthe parfait (un seul chemin entre deux cases) auquel on perce des boucles et des impasses, avec une loge de fantômes au centre. */
export function makeMaze(r) {
  const { W, H } = MZ, g = Array.from({ length: H }, () => Array(W).fill(1));
  const stack = [[1, 1]]; g[1][1] = 0;
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const opts = DIRS.map(([dx, dz]) => [x + dx * 2, z + dz * 2, dx, dz]).filter(([nx, nz]) => nx > 0 && nz > 0 && nx < W - 1 && nz < H - 1 && g[nz][nx] === 1);
    if (!opts.length) { stack.pop(); continue; }
    const [nx, nz, dx, dz] = opts[Math.floor(r() * opts.length)];
    g[z + dz][x + dx] = 0; g[nz][nx] = 0; stack.push([nx, nz]);
  }
  const open = (x, z) => x >= 0 && z >= 0 && x < W && z < H && g[z][x] === 0;
  const deg = (x, z) => DIRS.reduce((n, [dx, dz]) => n + (open(x + dx, z + dz) ? 1 : 0), 0);
  // impasses : on rouvre presque toujours un mur (jamais le bord)
  for (let z = 1; z < H; z += 2) for (let x = 1; x < W; x += 2) {
    if (deg(x, z) !== 1 || r() > 0.85) continue;
    const walls = DIRS.filter(([dx, dz]) => !open(x + dx, z + dz) && x + dx * 2 > 0 && z + dz * 2 > 0 && x + dx * 2 < W - 1 && z + dz * 2 < H - 1);
    if (walls.length) { const [dx, dz] = walls[Math.floor(r() * walls.length)]; g[z + dz][x + dx] = 0; }
  }
  // quelques boucles de plus : sans elles, on se fait coincer
  for (let k = 0, n = 0; k < 80 && n < 9; k++) {
    const x = 1 + Math.floor(r() * (W - 2)), z = 1 + Math.floor(r() * (H - 2));
    if ((x + z) % 2 === 0 || g[z][x] === 0) continue;
    const a = x % 2 === 1 ? [[x, z - 1], [x, z + 1]] : [[x - 1, z], [x + 1, z]];
    if (a.every(([ax, az]) => open(ax, az))) { g[z][x] = 0; n++; }
  }
  g[7][6] = 0;                                                          // la loge, entre deux couloirs
  return g;
}

export function createMaze(seed, { seconds = 45, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x6a2c11);
  const { W, H } = MZ, grid = makeMaze(r);
  const walkable = (x, z) => x >= 0 && z >= 0 && x < W && z < H && grid[z][x] === 0;
  const spawns = [[1, H - 2], [W - 2, 1], [1, 1], [W - 2, H - 2]];
  const DEN = [6, 7];
  const mk = (x, z, o) => ({ cx: x, cz: z, tx: x, tz: z, px: x, pz: z, moving: false, dir: null, face: 0, ...o });
  const A = spawns.map(([x, z], i) => mk(x, z, { i, bot: i > 0 || autoMe, alive: true, pel: 0, power: 0, inv: 0, eats: 0, steals: 0, caught: 0, want: null, skill: 0.93 + rb() * 0.1, wob: rb() }));
  if (autoMe) A[0].bot = true;
  const G = [[5, 7, "rouge", 0.8], [7, 7, "rose", 3.2], [6, 7, "orange", 6.0]].map(([x, z, name, wait], k) => mk(x, z, { k, name, mode: "wait", wait, speed: MZ.ghost }));
  const pel = Array.from({ length: H }, () => Array(W).fill(0));
  let total = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (grid[z][x] === 0 && !spawns.some(([sx, sz]) => sx === x && sz === z) && !(z === 7 && x >= 5 && x <= 7)) { pel[z][x] = 1; total++; }
  for (const [x, z] of [[1, 7], [W - 2, 7], [7, 1], [5, H - 2]]) if (pel[z][x]) pel[z][x] = 2;
  const S = { t: 0, seconds, grid, W, H, pel, left: total, A, G, me: A[0], fright: 0, owner: -1, events: [], done: false, endAt: null, den: DEN };

  const dist = (sx, sz, avoid) => {                                     // distances en cases depuis (sx, sz)
    const D = Array.from({ length: H }, () => Array(W).fill(Infinity)); D[sz][sx] = 0;
    let q = [[sx, sz]];
    while (q.length) { const nq = []; for (const [x, z] of q) for (const [dx, dz] of DIRS) { const nx = x + dx, nz = z + dz; if (!walkable(nx, nz) || D[nz][nx] !== Infinity || (avoid && avoid(nx, nz, D[z][x] + 1))) continue; D[nz][nx] = D[z][x] + 1; nq.push([nx, nz]); } q = nq; }
    return D;
  };
  const pathStep = (a, goal, avoid, noBack) => {                       // premier pas vers la case la plus proche qui vérifie `goal`
    const seen = new Set([a.cz * W + a.cx]); let q = [[a.cx, a.cz, null, 0]];
    while (q.length) {
      const nq = [];
      for (const [x, z, first, d] of q) {
        if (d > 0 && goal(x, z, d)) return { dir: first, x, z, d };
        for (const dir of DIRS) {
          const nx = x + dir[0], nz = z + dir[1], k = nz * W + nx;
          if (seen.has(k) || !walkable(nx, nz)) continue;
          if (d === 0 && noBack && a.dir && dir[0] === -a.dir[0] && dir[1] === -a.dir[1]) continue;
          if (avoid && avoid(nx, nz, d + 1)) continue;
          seen.add(k); nq.push([nx, nz, first || dir, d + 1]);
        }
      }
      q = nq;
    }
    return null;
  };
  const vulnerable = (p) => p.alive && p.power <= 0 && p.inv <= 0;

  function scatterPellets(n) {                                          // les pastilles perdues retournent dans le labyrinthe
    const cells = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (grid[z][x] === 0 && pel[z][x] === 0 && !(z === 7 && x >= 5 && x <= 7) && !A.some((p) => p.alive && p.cx === x && p.cz === z) ) cells.push([x, z]);
    for (let k = 0; k < n && cells.length; k++) { const [x, z] = cells.splice(Math.floor(r() * cells.length), 1)[0]; pel[z][x] = 1; S.left++; S.events.push({ type: "spawnpel", x, z }); }
  }
  function arrive(a) {
    if (a.k !== undefined || !a.alive) return;
    const v = pel[a.cz][a.cx];
    if (v) {
      pel[a.cz][a.cx] = 0; S.left--; a.pel++;
      if (v === 2) { a.power = MZ.power; S.fright = MZ.power; S.owner = a.i; for (const g of G) if (g.mode === "chase") g.mode = "fright"; S.events.push({ type: "power", i: a.i, x: a.cx, z: a.cz }); }
      else S.events.push({ type: "pellet", i: a.i, x: a.cx, z: a.cz });
    }
  }

  // ---------- intelligence des joueurs-bots ----------
  function botPick(a) {
    const ghosts = G.filter((g) => g.mode === "chase" || g.mode === "wait");
    const D = a.power > 0 ? null : ghosts.map((g) => dist(g.cx, g.cz));
    const danger = (x, z, d) => !a.power && D && D.some((gd) => gd[z][x] <= d + 1.2 && gd[z][x] !== Infinity);
    const noBack = true;
    if (rb() < 0.015 * (1.3 - a.skill)) { const opts = DIRS.filter((d) => walkable(a.cx + d[0], a.cz + d[1]) && !(a.dir && d[0] === -a.dir[0] && d[1] === -a.dir[1])); if (opts.length) return opts[Math.floor(rb() * opts.length)]; }
    let res = null;
    if (a.power > 1.2) {
      const ed = G.filter((g) => g.mode === "fright");
      if (ed.length) res = pathStep(a, (x, z) => ed.some((g) => Math.abs(g.px - x) + Math.abs(g.pz - z) < 0.8), null, noBack);
      if (!res || res.d * (1 / MZ.speed) > a.power) res = null;
      if (!res) { const rivals = A.filter((p) => p !== a && vulnerable(p)); if (rivals.length) { const q = pathStep(a, (x, z) => rivals.some((p) => Math.abs(p.px - x) + Math.abs(p.pz - z) < 0.8), null, noBack); if (q && q.d < 8) res = q; } }
    }
    if (!res && !a.power && ghosts.length) {
      const near = Math.min(...ghosts.map((g) => Math.abs(g.cx - a.cx) + Math.abs(g.cz - a.cz)));
      if (near < 9) { const q = pathStep(a, (x, z, d) => pel[z][x] === 2 && d < 9, danger, noBack); if (q) res = q; }
    }
    if (!res) res = pathStep(a, (x, z) => pel[z][x] > 0, danger, noBack);
    if (!res) {                                                         // rien de sûr : on s'éloigne des fantômes
      let best = null, bs = -1;
      for (const d of DIRS) { const nx = a.cx + d[0], nz = a.cz + d[1]; if (!walkable(nx, nz) || (a.dir && d[0] === -a.dir[0] && d[1] === -a.dir[1] && DIRS.some((e) => walkable(a.cx + e[0], a.cz + e[1]) && !(e[0] === d[0] && e[1] === d[1])))) continue; const sc = D ? Math.min(...D.map((gd) => gd[nz][nx])) + rb() * 0.3 : rb(); if (sc > bs) { bs = sc; best = d; } }
      return best;
    }
    return res.dir;
  }
  // ---------- intelligence des fantômes ----------
  function ghostPick(g) {
    if (g.mode === "eaten") { const q = pathStep(g, (x, z) => x === DEN[0] && z === DEN[1]); return q ? q.dir : null; }
    if (g.mode === "fright") {
      const owner = A[S.owner] || A[0], D = dist(owner.cx, owner.cz);
      let best = null, bs = -1;
      for (const d of DIRS) { const nx = g.cx + d[0], nz = g.cz + d[1]; if (!walkable(nx, nz)) continue; if (g.dir && d[0] === -g.dir[0] && d[1] === -g.dir[1] && DIRS.filter((e) => walkable(g.cx + e[0], g.cz + e[1])).length > 1) continue; const sc = D[nz][nx] + rb() * 2.2; if (sc > bs) { bs = sc; best = d; } }
      return best;
    }
    const targets = A.filter(vulnerable);
    if (!targets.length) { const opts = DIRS.filter((d) => walkable(g.cx + d[0], g.cz + d[1]) && !(g.dir && d[0] === -g.dir[0] && d[1] === -g.dir[1])); return opts.length ? opts[Math.floor(rb() * opts.length)] : (g.dir ? [-g.dir[0], -g.dir[1]] : null); }
    let tp;
    if (g.k === 0) { const D = dist(g.cx, g.cz); tp = targets.slice().sort((p, q) => D[p.cz][p.cx] - D[q.cz][q.cx])[0]; }
    else if (g.k === 1) tp = targets.slice().sort((p, q) => q.pel - p.pel || p.i - q.i)[0];
    else { if (!g.tgt || S.t > g.tgtUntil || !targets.includes(g.tgt)) { g.tgt = targets[Math.floor(rb() * targets.length)]; g.tgtUntil = S.t + 5; } tp = g.tgt; }
    const q = pathStep(g, (x, z) => x === tp.cx && z === tp.cz, null, true);
    return q ? q.dir : null;
  }

  function advance(a, dt, speed, pick) {
    let rem = speed * dt;
    for (let guard = 0; guard < 6 && rem > 1e-6; guard++) {
      if (a.moving && a.want && a.dir && a.want[0] === -a.dir[0] && a.want[1] === -a.dir[1]) { [a.cx, a.cz, a.tx, a.tz] = [a.tx, a.tz, a.cx, a.cz]; a.dir = a.want; a.face = Math.atan2(a.dir[0], a.dir[1]); }
      if (!a.moving) {
        const d = pick(a);
        if (!d || !walkable(a.cx + d[0], a.cz + d[1])) { a.dir = null; break; }
        a.dir = d; a.moving = true; a.tx = a.cx + d[0]; a.tz = a.cz + d[1]; a.face = Math.atan2(d[0], d[1]);
      }
      const dx = a.tx - a.px, dz = a.tz - a.pz, dd = Math.hypot(dx, dz);
      if (dd <= rem + 1e-9) { a.px = a.tx; a.pz = a.tz; a.cx = a.tx; a.cz = a.tz; a.moving = false; rem -= dd; arrive(a); }
      else { a.px += (dx / dd) * rem; a.pz += (dz / dd) * rem; rem = 0; }
    }
  }
  const dirOf = (inp) => { const ax = Math.abs(inp.x), az = Math.abs(inp.y); if (Math.max(ax, az) < 0.32) return null; return ax >= az ? [Math.sign(inp.x), 0] : [0, Math.sign(inp.y)]; };

  function respawn(p) { const [x, z] = spawns[p.i]; Object.assign(p, { cx: x, cz: z, tx: x, tz: z, px: x, pz: z, moving: false, dir: null, want: null, inv: MZ.inv }); }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    S.fright = Math.max(0, S.fright - dt);
    if (S.fright <= 0) { S.owner = -1; for (const g of G) if (g.mode === "fright") g.mode = "chase"; }
    for (const a of A) {
      if (!a.alive) continue;
      a.power = Math.max(0, a.power - dt); a.inv = Math.max(0, a.inv - dt);
      if (a.bot) { a.want = null; advance(a, dt, MZ.speed * a.skill, botPick); }
      else { a.want = dirOf(inp); advance(a, dt, MZ.speed, (p) => (p.want && walkable(p.cx + p.want[0], p.cz + p.want[1]) ? p.want : (p.dir && walkable(p.cx + p.dir[0], p.cz + p.dir[1]) ? p.dir : null))); }
    }
    for (const g of G) {
      if (g.mode === "wait") { g.wait -= dt; if (g.wait <= 0) { g.mode = S.fright > 0 ? "fright" : "chase"; g.moving = false; g.dir = null; } else continue; }
      const sp = g.mode === "eaten" ? MZ.eaten : g.mode === "fright" ? MZ.fright : MZ.ghost;
      advance(g, dt, sp, ghostPick);
      if (g.mode === "eaten" && g.cx === DEN[0] && g.cz === DEN[1] && !g.moving) { g.mode = "wait"; g.wait = 1.6; g.dir = null; }
    }
    // contacts
    for (const a of A) {
      if (!a.alive) continue;
      for (const g of G) {
        if (g.mode === "wait" || g.mode === "eaten" || Math.hypot(a.px - g.px, a.pz - g.pz) > 0.72) continue;
        if (g.mode === "fright") {
          if (a.power > 0) { g.mode = "eaten"; g.dir = null; a.eats++; S.events.push({ type: "eat", i: a.i, k: g.k, x: g.px, z: g.pz }); }
        } else if (vulnerable(a)) {
          const lose = Math.min(a.pel, Math.max(3, Math.ceil(a.pel * 0.3)));
          a.pel -= lose; a.caught++; scatterPellets(lose);
          S.events.push({ type: "caught", i: a.i, k: g.k, x: a.px, z: a.pz, lost: lose });
          respawn(a);
        }
      }
    }
    for (const a of A) for (const b of A) {
      if (a === b || !a.alive || !b.alive || a.power <= 0 || !vulnerable(b) || Math.hypot(a.px - b.px, a.pz - b.pz) > 0.7) continue;
      const take = Math.min(b.pel, 4); b.pel -= take; a.pel += take; a.steals += take > 0 ? 1 : 0; b.inv = 1.0;
      S.events.push({ type: "steal", i: a.i, from: b.i, n: take, x: b.px, z: b.pz });
    }
    if (S.endAt == null && (S.t >= seconds || S.left <= 0)) S.endAt = S.t + 0.3;
    if (S.endAt != null && S.t >= S.endAt) S.done = true;
  }
  const scoreOf = (a) => a.pel * 10 + a.eats * 100 + a.steals * 40;
  const rank = (a) => A.filter((o) => scoreOf(o) > scoreOf(a)).length;
  return { S, step, score: () => scoreOf(S.me), scoreOf, rank, walkable };
}
