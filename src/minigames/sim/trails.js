// Traînées de lumière : chacun file sur une planche lumineuse et laisse derrière lui un mur de lumière.
// On tourne à angle droit (glisser le doigt), « Turbo » accélère un instant. Toucher un mur, le bord ou une traînée = hors jeu.
// Points : temps de survie, +60 quand un adversaire s'écrase sur TA traînée, +120 au dernier en lice.
// Simulation pure sur une grille : `step(dt, input)` ; le décor 3D lit `S` (S.grid[k] = -1 vide, sinon numéro du joueur).
import { rng } from "./util.js";

export const TR = { G: 28, cell: 0.5, speed: 7, boostK: 1.65, boostDur: 1.1, boostCd: 3.2, perSec: 8, kill: 60, last: 120 };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // haut (vers -z), droite, bas, gauche

export function createTrails(seed, { seconds = 32, autoMe = false } = {}) {
  const r = rng(seed), rb = rng(seed ^ 0x7a11);
  const G = TR.G, grid = new Array(G * G).fill(-1);
  const idx = (x, z) => z * G + x;
  const free = (x, z) => x >= 0 && z >= 0 && x < G && z < G && grid[idx(x, z)] < 0;
  // départ en « moulinet » : chacun longe un côté, décalé des autres (pas de face-à-face d'entrée) ; le joueur part du bas et monte
  const starts = [[(G >> 1) - 4, G - 3, 0], [G - 3, (G >> 1) + 4, 3], [(G >> 1) + 4, 2, 2], [2, (G >> 1) - 4, 1]];
  const B = starts.map(([x, z, d], i) => ({ i, x, z, d, want: d, prog: 0, alive: true, bot: i > 0 || autoMe, boost: 0, cd: 0, kills: 0, life: 0, by: null, skill: 0.7 + r() * 0.35, think: 0, path: [[x, z]] }));
  if (autoMe) B[0].bot = true;
  for (const b of B) grid[idx(b.x, b.z)] = b.i;
  const S = { t: 0, seconds, B, me: B[0], grid, events: [], done: false, endT: -1, last: -1 };

  /** Cases libres atteignables depuis (x, z) (remplissage limité) : mesure l'espace qui reste dans une direction. */
  function room(x, z, cap = 70) {
    if (!free(x, z)) return 0;
    const seen = new Set([idx(x, z)]), q = [[x, z]];
    while (q.length && seen.size < cap) {
      const [cx, cz] = q.shift();
      for (const [dx, dz] of DIRS) { const nx = cx + dx, nz = cz + dz, k = idx(nx, nz); if (free(nx, nz) && !seen.has(k)) { seen.add(k); q.push([nx, nz]); } }
    }
    return seen.size;
  }
  function decide(b) {
    const opts = [b.d, (b.d + 1) % 4, (b.d + 3) % 4];
    let best = b.d, bs = -1e9;
    for (const d of opts) {
      const [dx, dz] = DIRS[d], nx = b.x + dx, nz = b.z + dz;
      if (!free(nx, nz)) continue;
      let run = 0; for (let k = 1; k <= 8; k++) { if (free(b.x + dx * k, b.z + dz * k)) run++; else break; }
      // un peu d'agressivité : se rapprocher de la tête d'un adversaire pour lui couper la route
      const foe = B.filter((o) => o !== b && o.alive).sort((p, q) => Math.abs(p.x - b.x) + Math.abs(p.z - b.z) - (Math.abs(q.x - b.x) + Math.abs(q.z - b.z)))[0];
      const chase = foe ? -(Math.abs(foe.x + DIRS[foe.d][0] * 3 - nx) + Math.abs(foe.z + DIRS[foe.d][1] * 3 - nz)) * 0.12 * b.skill : 0;
      // risque de face-à-face : une autre tête peut entrer dans la même case au prochain pas
      const clash = B.some((o) => o !== b && o.alive && Math.abs(o.x + DIRS[o.d][0] - nx) + Math.abs(o.z + DIRS[o.d][1] - nz) === 0) ? -25 : 0;
      const sc = room(nx, nz) * 1 + run * 0.8 + (d === b.d ? 3.2 : 0) + chase + clash + rb() * 1.1;
      if (sc > bs) { bs = sc; best = d; }
    }
    return best;
  }
  function crash(b, whoGrid) {
    b.alive = false; S.events.push({ type: "crash", i: b.i, x: b.x, z: b.z, by: whoGrid });
    if (whoGrid != null && whoGrid >= 0 && whoGrid !== b.i) { B[whoGrid].kills++; S.events.push({ type: "kill", i: whoGrid, victim: b.i }); }
  }

  function step(dt, inp) {
    if (S.done) return;
    S.t += dt;
    const me = S.me;
    if (!me.bot && me.alive) {
      const ax = Math.abs(inp.x), ay = Math.abs(inp.y);
      if (Math.max(ax, ay) > 0.35) {
        const d = ax > ay ? (inp.x > 0 ? 1 : 3) : (inp.y > 0 ? 2 : 0);
        if (d !== (me.d + 2) % 4) me.want = d;          // pas de demi-tour
      }
      if (inp.act && me.cd <= 0 && me.boost <= 0) { me.boost = TR.boostDur; me.cd = TR.boostCd; S.events.push({ type: "boost", i: 0 }); }
    }
    for (const b of B) {
      b.cd = Math.max(0, b.cd - dt); b.boost = Math.max(0, b.boost - dt);
      if (!b.alive) continue;
      b.life += dt;
      if (b.bot && b.cd <= 0 && S.t > 2 && rb() < dt * 0.35 * b.skill) {
        const [dx, dz] = DIRS[b.d]; let run = 0; for (let k = 1; k <= 10; k++) { if (free(b.x + dx * k, b.z + dz * k)) run++; else break; }
        if (run >= 9) { b.boost = TR.boostDur; b.cd = TR.boostCd + 1; S.events.push({ type: "boost", i: b.i }); }
      }
      b.prog += dt * TR.speed * (b.boost > 0 ? TR.boostK : 1);
    }
    // on avance case par case, tous ensemble (collisions de face justes)
    let guard = 0;
    while (B.some((b) => b.alive && b.prog >= 1) && guard++ < 8) {
      const moving = B.filter((b) => b.alive && b.prog >= 1);
      for (const b of moving) {
        b.prog -= 1;
        if (b.bot) b.want = decide(b);
        if (b.want !== (b.d + 2) % 4) b.d = b.want;
        const [dx, dz] = DIRS[b.d];
        b.nx = b.x + dx; b.nz = b.z + dz;
      }
      for (const b of moving) {
        const out = b.nx < 0 || b.nz < 0 || b.nx >= G || b.nz >= G;
        const head = moving.find((o) => o !== b && o.alive && o.nx === b.nx && o.nz === b.nz);
        if (out) crash(b, null);
        else if (grid[idx(b.nx, b.nz)] >= 0) crash(b, grid[idx(b.nx, b.nz)]);
        else if (head) crash(b, null);
      }
      for (const b of moving) {
        if (!b.alive) continue;
        b.x = b.nx; b.z = b.nz; grid[idx(b.x, b.z)] = b.i; b.path.push([b.x, b.z]);
        S.events.push({ type: "cell", i: b.i, x: b.x, z: b.z, d: b.d });
      }
    }
    const left = B.filter((b) => b.alive);
    if (S.endT < 0) {
      if (left.length <= 1) { S.last = left.length ? left[0].i : -1; S.endT = 1.4; if (left.length) S.events.push({ type: "win", i: left[0].i }); }
      else if (!me.alive && !me.bot) S.endT = 1.8;   // le joueur est sorti : on montre le choc puis on termine
      else if (S.t >= seconds) S.endT = 0.01;
    } else { S.endT -= dt; if (S.endT <= 0) S.done = true; }
  }
  const pts = (b) => Math.round(b.life * TR.perSec) + b.kills * TR.kill + (S.last === b.i ? TR.last : 0);
  const score = () => pts(S.me);
  /** Position monde du centre d'une case. */
  const world = (x, z) => [(x - G / 2 + 0.5) * TR.cell, (z - G / 2 + 0.5) * TR.cell];
  return { S, step, score, pts, world, DIRS };
}
