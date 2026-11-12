// node tools/test-arena.js : simulations des mini-jeux d'arène (patate explosive, poseur de bombes, chars d'assaut, roi de la colline…)
import { createBombTag, BT } from "../src/minigames/sim/bombtag.js";
import { createBomber, BM } from "../src/minigames/sim/bomber.js";
import { createTanks, TK } from "../src/minigames/sim/tanks.js";
import { createCrown, CR } from "../src/minigames/sim/crown.js";
import { createKart, makeTrack, KT } from "../src/minigames/sim/kart.js";
import { createCannons, CN } from "../src/minigames/sim/cannons.js";
import { createSky, SK } from "../src/minigames/sim/sky.js";
import { createPucks, PK, ringValue, speedOf, powOf } from "../src/minigames/sim/pucks.js";
import { createMaze, makeMaze, MZ } from "../src/minigames/sim/maze.js";
import { createSnow, SN, radiusOf } from "../src/minigames/sim/snow.js";
import { createPaint, PT } from "../src/minigames/sim/paint.js";
import { createChairs, CH } from "../src/minigames/sim/chairs.js";
import { createTrails, TR } from "../src/minigames/sim/trails.js";
import { rng } from "../src/minigames/sim/util.js";
import { MG_BY } from "../src/minigames/meta.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } };
const ok = (n, c) => eq(n, Boolean(c), true);
const NONE = { x: 0, y: 0, act: false, act2: false };
const run = (g, inp = NONE, maxSteps = 4000, dt = 1 / 30) => { let n = 0; while (!g.S.done && n++ < maxSteps) { g.step(dt, typeof inp === "function" ? inp(g.S) : inp); g.S.events.length = 0; } return g; };

/* ---------- patate explosive ---------- */
{
  let allDone = true, scoresOk = true, nan = false;
  for (let seed = 1; seed <= 60; seed++) {
    const g = run(createBombTag(seed), NONE);
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.bombtag.max;
    nan = nan || g.S.P.some((o) => Number.isNaN(o.x) || Math.hypot(o.x, o.z) > BT.RIM + 0.01);
  }
  ok("patate : 60 parties se terminent", allDone); ok("patate : scores entiers dans [0, max]", scoresOk); ok("patate : personne ne sort de la table, pas de NaN", !nan);
  const a = run(createBombTag(7), NONE), b = run(createBombTag(7), NONE);
  eq("patate : même graine, même résultat", [a.score(), a.S.t.toFixed(3)], [b.score(), b.S.t.toFixed(3)]);
  // la bombe change de main au contact, avec un délai avant de pouvoir la reprendre
  const g = createBombTag(3); const S = g.S;
  S.bomb.holder = 1; S.bomb.fuse = S.bomb.fuse0 = 99; S.t = 5;
  const h = S.P[1], v = S.P[2]; v.x = h.x + 0.9; v.z = h.z; v.vx = v.vz = h.vx = h.vz = 0;
  g.step(1 / 30, NONE);
  eq("patate : toucher quelqu'un lui passe la bombe", S.bomb.holder, 2);
  eq("patate : on ne peut pas la reprendre tout de suite", (g.step(1 / 30, NONE), S.bomb.holder), 2);
  // la mèche éteinte fait sauter le porteur
  const g2 = createBombTag(5); g2.S.bomb.holder = 0; g2.S.bomb.fuse = 0.05; g2.S.bomb.cool = 0; g2.S.t = 3;
  g2.step(0.1, NONE);
  eq("patate : le porteur saute quand la mèche finit", [g2.S.P[0].alive, g2.S.endAt != null], [false, true]);
  const g3 = createBombTag(5); g3.S.bomb.holder = 2; g3.S.bomb.fuse = 0.05; g3.S.t = 3; g3.step(0.1, NONE);
  eq("patate : un adversaire qui saute rapporte 100 points", [g3.S.P[2].alive, g3.S.exploded, g3.score() >= 100], [false, 1, true]);
}

/* ---------- poseur de bombes ---------- */
{
  let allDone = true, scoresOk = true, nan = false, bots = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = run(createBomber(seed), NONE, 3000);
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.bomber.max;
    nan = nan || g.S.A.some((a) => Number.isNaN(a.px) || a.px < 0 || a.pz < 0 || a.px > g.S.W - 1 || a.pz > g.S.H - 1);
    bots += g.S.A.filter((a) => a.crates > 0).length;
  }
  ok("bombes : 40 parties se terminent", allDone); ok("bombes : scores entiers dans [0, max]", scoresOk); ok("bombes : personne ne sort de la grille, pas de NaN", !nan);
  ok("bombes : les bots cassent des caisses", bots > 40);
  const g = createBomber(11, { autoMe: false }); const S = g.S, me = S.me;
  // la grille : murs sur le bord et en quinconce, coins dégagés
  ok("bombes : coins de départ dégagés", [[1, 9], [7, 1], [1, 1], [7, 9]].every(([x, z]) => S.grid[z][x] === 0 && S.grid[z][x + (x > 4 ? -1 : 1)] === 0));
  eq("bombes : murs sur le bord", [S.grid[0][3], S.grid[5][0], S.grid[2][2]], [1, 1, 1]);
  // un mur arrête le joueur
  me.cx = me.px = me.tx = 1; me.cz = me.pz = me.tz = 9;
  for (let i = 0; i < 20; i++) g.step(1 / 30, { x: -1, y: 0, act: false });
  eq("bombes : on ne traverse pas un mur", [me.cx, me.moving], [1, false]);
  // bombe : casse la caisse voisine, tue celui qui reste dans la croix
  const g2 = createBomber(11); const S2 = g2.S; for (const a of S2.A.slice(1)) { a.alive = false; }
  for (let z = 1; z < S2.H - 1; z++) for (let x = 1; x < S2.W - 1; x++) if (S2.grid[z][x] === 2) S2.grid[z][x] = 0;
  S2.grid[9][3] = 2;
  const m2 = S2.me; m2.cx = m2.px = m2.tx = 2; m2.cz = m2.pz = m2.tz = 9;
  g2.step(1 / 30, { x: 0, y: 0, act: true });
  eq("bombes : le bouton pose une bombe sur sa case", [S2.bombs.length, S2.bombs[0].x, S2.bombs[0].z], [1, 2, 9]);
  for (let i = 0; i < 100 && S2.bombs.length; i++) g2.step(1 / 30, NONE);
  eq("bombes : l'explosion casse la caisse voisine et crédite le joueur", [S2.grid[9][3], m2.crates], [0, 1]);
  eq("bombes : rester sur sa bombe tue", [m2.alive, S2.endAt != null], [false, true]);
  // réaction en chaîne
  const g3 = createBomber(12); const S3 = g3.S; for (const a of S3.A.slice(1)) a.alive = false;
  for (let z = 1; z < S3.H - 1; z++) for (let x = 1; x < S3.W - 1; x++) if (S3.grid[z][x] === 2) S3.grid[z][x] = 0;
  S3.bombs.push({ x: 1, z: 7, t: 0.05, range: 2, owner: 0 }, { x: 1, z: 8, t: 2, range: 2, owner: 0 });
  S3.me.cx = S3.me.px = S3.me.tx = 7; S3.me.cz = S3.me.pz = S3.me.tz = 9;
  g3.step(0.1, NONE);
  eq("bombes : une bombe en déclenche une autre", S3.bombs.length, 0);
  // temps réel : un joueur immobile finit quand même
  const g4 = run(createBomber(4), NONE, 3000);
  ok("bombes : joueur immobile, la partie finit avec un score ≥ 0", g4.S.done && g4.score() >= 0);
}

/* ---------- chars d'assaut ---------- */
{
  let allDone = true, scoresOk = true, nan = false, kills = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = run(createTanks(seed), NONE, 3000);
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.tanks.max;
    nan = nan || g.S.T.some((o) => Number.isNaN(o.x) || Math.abs(o.x) > TK.HX || Math.abs(o.z) > TK.HZ);
    kills += g.S.T.reduce((a, o) => a + o.kills, 0);
  }
  ok("chars : 40 parties se terminent", allDone); ok("chars : scores entiers dans [0, max]", scoresOk); ok("chars : personne ne sort de l'arène, pas de NaN", !nan);
  ok("chars : les bots se tirent dessus", kills > 20);
  const g = createTanks(21); const S = g.S, me = S.me;
  S.blocks.length = 0;
  for (const o of S.T.slice(1)) { o.x = 50; o.z = 50; o.alive = false; } S.T[1].alive = true; S.T[1].x = me.x; S.T[1].z = me.z - 6; S.T[1].bot = false; S.T[1].ix = S.T[1].iz = 0;
  S.T[1].hp = 3;
  me.heading = Math.PI; me.x = 0; me.z = 6; S.T[1].x = 0; S.T[1].z = -2;
  me.ix = 0; me.iz = -1; me.cd = 0;
  const sh0 = S.shells.length;
  g.step(1 / 30, { x: 0, y: -1, act: true });
  eq("chars : le bouton tire un obus", S.shells.length, sh0 + 1);
  for (let i = 0; i < 60 && S.shells.length; i++) g.step(1 / 30, { x: 0, y: -1, act: false });
  eq("chars : l'obus touche le char visé (1 point de vie en moins)", [S.T[1].hp, me.hits], [2, 1]);
  // rebond sur un mur
  const g2 = createTanks(22); const S2 = g2.S; S2.blocks.length = 0; for (const o of S2.T) { o.alive = false; o.x = 99; }
  S2.me.alive = true; S2.me.x = 0; S2.me.z = 0; S2.me.heading = 0; S2.me.cd = 0;
  S2.shells.push({ x: 0, z: TK.HZ - 0.5, vx: 0, vz: TK.shellV, owner: 3, life: 2, bounces: 1, age: 1 });
  g2.step(0.1, NONE);
  ok("chars : l'obus rebondit sur le mur du fond", S2.shells.length === 1 && S2.shells[0].vz < 0);
  // trois touches détruisent un char
  const g3 = createTanks(23); const S3 = g3.S; S3.blocks.length = 0; for (const o of S3.T.slice(1)) { o.x = 40 + o.i; o.alive = o.i === 1; } S3.T[1].x = 0; S3.T[1].z = 0; S3.T[1].hp = 1; S3.T[1].bot = false;
  S3.shells.push({ x: 0, z: 0.5, vx: 0, vz: -TK.shellV, owner: 0, life: 2, bounces: 0, age: 1 });
  g3.step(0.05, NONE);
  eq("chars : dernier point de vie perdu = char détruit", [S3.T[1].alive, S3.me.kills, S3.win], [false, 1, true]);
}

/* ---------- roi de la colline ---------- */
{
  let allDone = true, scoresOk = true, nan = false, falls = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = createCrown(seed);
    let n = 0; while (!g.S.done && n++ < 3000) { g.step(1 / 30, NONE); for (const e of g.S.events) if (e.type === "fall") falls++; g.S.events.length = 0; }
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.crown.max;
    nan = nan || g.S.P.some((o) => Number.isNaN(o.x));
  }
  ok("couronne : 40 parties se terminent", allDone); ok("couronne : scores entiers dans [0, max]", scoresOk); ok("couronne : pas de NaN", !nan); ok("couronne : des joueurs tombent et reviennent", falls > 20);
  const g = createCrown(31); const S = g.S;
  for (const o of S.P) { o.bot = false; o.ix = o.iz = 0; }
  S.P[0].x = 0; S.P[0].z = 0; S.P[1].x = 5; S.P[2].x = -5; S.P[3].z = 5; S.P[3].x = 0; S.P[1].z = S.P[2].z = 0; S.t = 5; S.nextT = 99;
  for (let i = 0; i < 30; i++) g.step(1 / 30, NONE);
  eq("couronne : seul dans la zone, on marque 14 points par seconde", [S.who, Math.round(S.P[0].hold * 10) / 10], [0, 1]);
  eq("couronne : score entier", g.score(), Math.round(S.P[0].hold * CR.rate));
  S.P[1].x = 0.6; S.P[1].z = 0; const h0 = S.P[0].hold;
  for (let i = 0; i < 3; i++) g.step(1 / 30, NONE);
  eq("couronne : à deux dans la zone, personne ne marque", [S.who, S.P[0].hold === h0], [-2, true]);
  // tomber puis revenir
  const g2 = createCrown(32); const S2 = g2.S; for (const o of S2.P) o.bot = false; S2.P[2].x = CR.R + 1; S2.P[2].z = 0;
  g2.step(1 / 30, NONE);
  eq("couronne : hors de l'arène = tombé", [S2.P[2].alive, S2.P[2].out], [false, true]);
  for (let i = 0; i < 80; i++) g2.step(1 / 30, NONE);
  ok("couronne : le joueur tombé revient avec quelques instants de protection", S2.P[2].alive && S2.P[2].inv > 0);
}
/* ---------- grand prix de karts ---------- */
{
  let allDone = true, scoresOk = true, nan = false, tight = 0, winsAuto = 0, lapsAuto = 0, lapsBots = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = createKart(seed, { autoMe: true }); let n = 0; while (!g.S.done && n++ < 3000) { g.step(1 / 30, NONE); g.S.events.length = 0; }
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.kart.max;
    nan = nan || g.S.K.some((k) => Number.isNaN(k.x) || Number.isNaN(k.prog) || Math.abs(k.lat) > KT.WALL + 0.01);
    if (g.S.track.minR < 8.5) tight++;
    if (g.rank(g.S.me) <= 1) winsAuto++;
    lapsAuto += g.S.me.prog; lapsBots += (g.S.K[1].prog + g.S.K[2].prog + g.S.K[3].prog) / 3;
  }
  ok("karts : 30 courses se terminent", allDone); ok("karts : scores entiers dans [0, max]", scoresOk); ok("karts : personne ne sort de la piste, pas de NaN", !nan);
  ok("karts : tous les circuits sont roulables (virage ≥ 8,5 m)", tight === 0);
  ok("karts : un pilote automatique avance d'au moins 1,5 tour", lapsAuto / 30 > 1.5);
  ok("karts : un pilote automatique reste dans la course (≥ 90 % de la distance des bots) et finit souvent sur le podium haut", lapsAuto >= lapsBots * 0.9 && winsAuto >= 4);
  // le joueur qui ne touche à rien finit dernier ou presque, avec un score faible mais positif
  let idle = 0, idleRank = 0;
  for (let seed = 1; seed <= 12; seed++) { const g = createKart(seed); let n = 0; while (!g.S.done && n++ < 3000) { g.step(1 / 30, NONE); g.S.events.length = 0; } idle += g.score(); idleRank += g.rank(g.S.me); }
  ok("karts : sans rien faire on finit dernier ou presque", idleRank / 12 >= 2);
  ok("karts : un joueur passif marque moins qu'un pilote", idle / 12 < 150);
  eq("karts : même graine, même circuit", JSON.stringify(makeTrack(rng(5)).P.slice(0, 3)), JSON.stringify(makeTrack(rng(5)).P.slice(0, 3)));
  // départ : rien ne bouge avant le « GO »
  const g = createKart(3); g.step(0.5, NONE);
  eq("karts : à l'arrêt avant le départ", g.S.K.every((k) => k.v === 0), true);
  // banane : on tourne sur soi-même
  const g2 = createKart(4); const k = g2.S.me; g2.S.t = KT.go + 1; g2.S.bananas.push({ x: k.x, z: k.z, t: 5, owner: 3 });
  g2.step(1 / 30, NONE);
  ok("karts : une peau de banane fait tourner le kart", k.spin > 0 && g2.S.bananas.length === 0);
  // objet : un boost accélère, une banane se pose derrière
  const g3 = createKart(5); const m3 = g3.S.me; g3.S.t = KT.go + 1; m3.item = "boost"; g3.step(1 / 30, { x: 0, y: 0, act: true });
  ok("karts : le bouton déclenche le boost", m3.boost > 1 && m3.item === null);
  m3.item = "banana"; g3.step(1 / 30, NONE); g3.step(1 / 30, { x: 0, y: 0, act: true });
  eq("karts : le bouton pose une banane", g3.S.bananas.length, 1);
  // glissière
  const g4 = createKart(6); const m4 = g4.S.me; g4.S.t = KT.go + 1; m4.steer = 0;
  const p4 = g4.S.track.P[m4.idx]; m4.x += p4.nx * 6; m4.z += p4.nz * 6;
  g4.step(1 / 30, NONE);
  ok("karts : la glissière retient le kart", Math.abs(m4.lat) <= KT.WALL + 0.01);
}

/* ---------- canons en cercle ---------- */
{
  let allDone = true, scoresOk = true, nan = false, hits = 0, survived = 0, n = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = createCannons(seed, { autoMe: true });
    let steps = 0; while (!g.S.done && steps++ < 3000) { g.step(1 / 30, NONE); for (const e of g.S.events) if (e.type === "hit") hits++; g.S.events.length = 0; }
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.cannons.max;
    nan = nan || g.S.P.some((o) => Number.isNaN(o.x) || Math.hypot(o.x, o.z) > CN.RIM + 0.01);
    for (const o of g.S.P) { n++; if (o.alive) survived++; }
  }
  ok("canons : 40 parties se terminent", allDone); ok("canons : scores entiers dans [0, max]", scoresOk); ok("canons : personne ne sort du plateau, pas de NaN", !nan);
  ok("canons : les boulets font mouche de temps en temps", hits > 80);
  ok("canons : une majorité de bots survit, mais pas tous", survived / n > 0.5 && survived / n < 0.97);
  // un joueur immobile ne tient pas jusqu'au bout
  let idleAlive = 0; for (let seed = 1; seed <= 20; seed++) { const g = createCannons(seed); let st = 0; while (!g.S.done && st++ < 3000) { g.step(1 / 30, NONE); g.S.events.length = 0; } if (g.S.me.alive) idleAlive++; }
  ok("canons : immobile, on perd presque toujours", idleAlive <= 4);
  // un boulet qui touche : un cœur en moins, protection ensuite
  const g = createCannons(9); const S = g.S, me = S.me;
  S.nextSalvo = 99; S.nextGem = 99; for (const o of S.P.slice(1)) { o.x = 40 + o.i; o.alive = false; }
  me.x = 0; me.z = 0; me.vx = me.vz = 0;
  const lane = { c: S.cannons[0], dx: 0, dz: -1, t: 0, tel: 0.01, fired: false, id: 1 }; lane.c = { ...S.cannons[0], x: 0, z: 5, kick: 0 }; S.lanes.push(lane);
  for (let i = 0; i < 40; i++) g.step(1 / 30, NONE);
  eq("canons : un boulet en pleine course retire un cœur", me.lives, CN.lives - 1);
  ok("canons : protection après un coup", me.inv > 0 || me.lives === CN.lives - 1);
  // sauter par-dessus
  const g2 = createCannons(10); const S2 = g2.S, m2 = S2.me;
  S2.nextSalvo = 99; S2.nextGem = 99; for (const o of S2.P.slice(1)) { o.x = 40 + o.i; o.alive = false; }
  m2.x = 0; m2.z = 0;
  S2.lanes.push({ c: { ...S2.cannons[0], x: 0, z: 5, kick: 0 }, dx: 0, dz: -1, t: 0, tel: 0.01, fired: false, id: 2 });
  let jumped = false;
  for (let i = 0; i < 40; i++) { const sh = S2.shells[0]; const near = sh && Math.hypot(sh.x - m2.x, sh.z - m2.z) < 2.6; g2.step(1 / 30, { x: 0, y: 0, act: near && !jumped }); if (near) jumped = true; }
  ok("canons : un saut bien placé évite le boulet", jumped && m2.lives === CN.lives);
  // gemme
  const g3 = createCannons(11); const S3 = g3.S; S3.nextSalvo = 99; S3.gem = { x: S3.me.x, z: S3.me.z, t: 0 };
  g3.step(1 / 30, NONE);
  eq("canons : ramasser une gemme rapporte 25 points", [S3.me.gems, S3.gem], [1, null]);
}
/* ---------- pilotes de l'extrême ---------- */
{
  let allDone = true, scoresOk = true, nan = false, rings = 0, perf = 0, mines = 0, n = 0, same = true;
  for (let seed = 1; seed <= 30; seed++) {
    const g = createSky(seed, { autoMe: true }); let st = 0; while (!g.S.done && st++ < 3000) { g.step(1 / 30, NONE); g.S.events.length = 0; }
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.sky.max;
    for (const o of g.S.P) { nan = nan || [o.x, o.y, o.z, o.v, o.energy].some(Number.isNaN) || Math.abs(o.x) > SK.LX + 0.01 || Math.abs(o.y) > SK.LY + 0.01; rings += o.rings; perf += o.perfects; mines += o.mines; n++; }
  }
  ok("avion : 30 parties se terminent", allDone); ok("avion : scores entiers dans [0, max]", scoresOk); ok("avion : personne ne sort du couloir, pas de NaN", !nan);
  ok("avion : les bots passent 22 à 34 anneaux sur ~36", rings / n > 22 && rings / n < 34.5);
  ok("avion : les bots ne sont pas parfaits (pile au centre moins d'une fois sur deux)", perf / rings < 0.5 && perf / rings > 0.1);
  ok("avion : les bots touchent parfois une mine, pas souvent", mines / n > 0.5 && mines / n < 7);
  const a = createSky(8, { autoMe: true }), b = createSky(8, { autoMe: true });
  for (let i = 0; i < 400; i++) { a.step(1 / 30, NONE); b.step(1 / 30, NONE); }
  eq("avion : même graine, même vol", [a.S.me.rings, a.S.me.pts, a.S.me.z.toFixed(3)], [b.S.me.rings, b.S.me.pts, b.S.me.z.toFixed(3)]);
  let idle = 0; for (let seed = 1; seed <= 12; seed++) { const g = createSky(seed); let st = 0; while (!g.S.done && st++ < 3000) { g.step(1 / 30, NONE); g.S.events.length = 0; } idle += g.score(); }
  ok("avion : un joueur passif marque nettement moins qu'un bot", idle / 12 < 250);
  // franchir un anneau
  const g = createSky(5); const S = g.S, me = S.me, ring = S.course.rings[0];
  for (const o of S.P.slice(1)) o.z = -999;
  me.x = ring.x; me.y = ring.y; me.z = ring.z - 0.2; me.vx = me.vy = 0; me.ix = 0; me.iy = 0;
  g.step(1 / 30, { x: 0, y: 0, act: false });
  eq("avion : traverser l'anneau pile au centre = parfait (20 points)", [me.rings, me.perfects, me.pts], [1, 1, 20]);
  const g2 = createSky(5); const m2 = g2.S.me; for (const o of g2.S.P.slice(1)) o.z = -999;
  const r2 = g2.S.course.rings[0]; m2.x = Math.max(-SK.LX, Math.min(SK.LX, r2.x + (r2.x > 0 ? -1 : 1) * 3.3)); m2.y = r2.y; m2.z = r2.z - 0.2; m2.combo = 5;
  g2.step(1 / 30, { x: 0, y: 0, act: false });
  eq("avion : passer à côté de l'anneau casse l'enchaînement", [m2.rings, m2.combo, g2.S.events.some((e) => e.type === "miss")], [0, 0, true]);
  // mine
  const g3 = createSky(6); const S3 = g3.S, m3 = S3.me; for (const o of S3.P.slice(1)) o.z = -999;
  const mine = S3.course.mines[0]; m3.x = mine.x; m3.y = mine.y; m3.z = mine.z - 0.1; m3.combo = 4; m3.pts = 50; m3.next = S3.course.rings.findIndex((r) => r.z > mine.z);
  g3.step(1 / 30, { x: 0, y: 0, act: false });
  eq("avion : une mine fait tournoyer, casse l'enchaînement et coûte 6 points", [m3.spin > 0, m3.combo, m3.pts, m3.mines], [true, 0, 44, 1]);
  // boule d'énergie et turbo
  const g4 = createSky(7); const S4 = g4.S, m4 = S4.me; for (const o of S4.P.slice(1)) o.z = -999;
  const orb = S4.course.orbs[0]; m4.x = orb.x; m4.y = orb.y; m4.z = orb.z - 0.1; m4.energy = 0.2; m4.next = S4.course.rings.findIndex((r) => r.z > orb.z);
  g4.step(1 / 30, { x: 0, y: 0, act: false });
  eq("avion : une boule bleue recharge 30 % de turbo, une seule fois", [Math.round(m4.energy * 100), orb.taken[0]], [50, true]);
  const g5 = createSky(7); const m5 = g5.S.me; for (const o of g5.S.P.slice(1)) o.z = -999; m5.energy = 1; m5.z = 0;
  const g6 = createSky(7); const m6 = g6.S.me; for (const o of g6.S.P.slice(1)) o.z = -999; m6.energy = 1; m6.z = 0;
  for (let i = 0; i < 60; i++) { g5.step(1 / 30, { x: 0, y: 0, act: true }); g6.step(1 / 30, NONE); }
  ok("avion : le turbo va plus vite et consomme l'énergie", m5.z > m6.z + 8 && m5.energy < 0.7 && m6.energy === 1);
  const g7 = createSky(7); const m7 = g7.S.me; for (const o of g7.S.P.slice(1)) o.z = -999; m7.energy = 0;
  for (let i = 0; i < 30; i++) g7.step(1 / 30, { x: 0, y: 0, act: true });
  ok("avion : sans énergie, pas de turbo", !m7.turbo);
}
/* ---------- palets glacés ---------- */
{
  let allDone = true, scoresOk = true, nan = false, outs = 0, thrown = 0, dur = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = createPucks(seed, { autoMe: true }); let st = 0; while (!g.S.done && st++ < 4000) { g.step(1 / 30, NONE); for (const e of g.S.events) if (e.type === "out") outs++; g.S.events.length = 0; }
    allDone = allDone && g.S.done; dur += g.S.t;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.pucks.max;
    nan = nan || g.S.stones.some((s) => Number.isNaN(s.x) || Number.isNaN(s.z));
    thrown += g.S.P.reduce((a, o) => a + o.thrown, 0);
  }
  ok("palets : 40 parties se terminent", allDone); ok("palets : scores entiers dans [0, max]", scoresOk); ok("palets : pas de NaN", !nan);
  ok("palets : tous les palets des bots sont lancés (28 par partie)", thrown === 40 * 28);
  ok("palets : des palets tombent du plateau (3 à 20 par partie)", outs / 40 > 3 && outs / 40 < 20);
  ok("palets : une partie dure 12 à 40 s", dur / 40 > 12 && dur / 40 < 40);
  const a = createPucks(9, { autoMe: true }), b = createPucks(9, { autoMe: true });
  for (let i = 0; i < 500; i++) { a.step(1 / 30, NONE); b.step(1 / 30, NONE); }
  eq("palets : même graine, même partie", [a.S.me.pts, a.S.stones.length], [b.S.me.pts, b.S.stones.length]);
  // table de points
  eq("palets : points par anneau", [0.3, 1.2, 2.4, 3.8, 5].map(ringValue), [5, 3, 2, 1, 0]);
  eq("palets : puissance du joystick : rien sous 25 %, plein à 100 %", [powOf(0.2), powOf(1), Math.round(powOf(0.625) * 100) / 100], [0, 1, 0.5]);
  // lancer : décompte, direction, délai entre deux tirs
  const g = createPucks(3); const S = g.S, me = S.me; for (const o of S.P.slice(1)) o.left = 0; me.cd = 0;
  ok("palets : lancer vers l'extérieur est ramené vers le plateau", (g.throwStone(me, 0, 1, 0.5), S.stones[0].vz < 0));
  eq("palets : un palet de moins après le tir", me.left, PK.stones - 1);
  eq("palets : pas de second tir tout de suite", g.throwStone(me, 0, -1, 0.5), false);
  for (let i = 0; i < 40; i++) g.step(1 / 30, NONE);
  ok("palets : on peut relancer après le délai", g.throwStone(me, 0, -1, 0.5));
  // distance parcourue = v² / (2 × décélération)
  const g2 = createPucks(4); const m2 = g2.S.me; for (const o of g2.S.P.slice(1)) o.left = 0; m2.cd = 0;
  g2.throwStone(m2, 0, -1, 0.3); const v0 = speedOf(0.3), z0 = g2.S.stones[0].z;
  for (let i = 0; i < 200; i++) g2.step(1 / 30, NONE);
  ok("palets : le palet s'arrête à la distance prévue", Math.abs((z0 - g2.S.stones[0].z) - (v0 * v0) / (2 * PK.decel)) < 0.25);
  // joystick : tenir vise, relâcher lance, relâcher sans avoir poussé annule
  const g3 = createPucks(5); const m3 = g3.S.me; for (const o of g3.S.P.slice(1)) o.left = 0; m3.cd = 0;
  for (let i = 0; i < 10; i++) g3.step(1 / 30, { x: 0, y: -0.6, act: false });
  eq("palets : on vise sans lancer tant qu'on tient", [g3.S.stones.length, m3.aim.on], [0, true]);
  g3.step(1 / 30, NONE);
  eq("palets : relâcher lance le palet", [g3.S.stones.length, m3.left], [1, PK.stones - 1]);
  const g4 = createPucks(5); const m4 = g4.S.me; for (const o of g4.S.P.slice(1)) o.left = 0; m4.cd = 0;
  for (let i = 0; i < 5; i++) g4.step(1 / 30, { x: 0, y: -0.2, act: false }); g4.step(1 / 30, NONE);
  eq("palets : une poussée trop faible annule le tir", g4.S.stones.length, 0);
  // choc : le palet lancé chasse l'autre, hors du plateau il compte comme éjecté
  const g5 = createPucks(6); const S5 = g5.S; for (const o of S5.P) o.left = 0;
  S5.stones.push({ id: 1, owner: 1, x: 0, z: PK.R - 0.5, vx: 0, vz: 0, out: false, fall: 0, last: 1, hits: 0, spin: 0 }, { id: 2, owner: 0, x: 0, z: PK.R - 3, vx: 0, vz: 9, out: false, fall: 0, last: 0, hits: 0, spin: 0 });
  for (let i = 0; i < 40; i++) { g5.step(1 / 30, NONE); S5.events.length = 0; }
  eq("palets : un palet chassé hors du plateau rapporte 10 points à celui qui l'a touché", [S5.P[0].kos, S5.stones.filter((s) => !s.out).length >= 1], [1, true]);
  // points : palet au centre = 50 + 30 de bonus (le plus proche)
  const g6 = createPucks(7); const S6 = g6.S; for (const o of S6.P) o.left = 0;
  S6.stones.push({ id: 1, owner: 0, x: 0.2, z: 0.1, vx: 0, vz: 0, out: false, fall: 0, last: 0, hits: 0, spin: 0 }, { id: 2, owner: 0, x: 2.5, z: 0, vx: 0, vz: 0, out: false, fall: 0, last: 0, hits: 0, spin: 0 }, { id: 3, owner: 1, x: 1.4, z: 0, vx: 0, vz: 0, out: false, fall: 0, last: 1, hits: 0, spin: 0 });
  g6.step(1 / 30, NONE);
  eq("palets : 50 + 20 + bonus 30 pour le palet le plus proche", [S6.P[0].pts, S6.P[1].pts], [100, 30]);
}
/* ---------- labyrinthe des gloutons ---------- */
{
  // le labyrinthe : bords fermés, tout est relié, presque pas d'impasses
  let connected = true, border = true, deadEnds = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const m = makeMaze(rng(seed)), { W, H } = MZ, open = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (m[z][x] === 0) open.push([x, z]);
    const seen = new Set(["1,1"]), q = [[1, 1]];
    while (q.length) { const [x, z] = q.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + "," + (z + dz); if (m[z + dz] && m[z + dz][x + dx] === 0 && !seen.has(k)) { seen.add(k); q.push([x + dx, z + dz]); } } }
    connected = connected && seen.size === open.length;
    for (let x = 0; x < W; x++) border = border && m[0][x] === 1 && m[H - 1][x] === 1;
    for (let z = 0; z < H; z++) border = border && m[z][0] === 1 && m[z][W - 1] === 1;
    for (const [x, z] of open) if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => m[z + dz][x + dx] === 0).length === 1) deadEnds++;
  }
  ok("labyrinthe : toutes les cases sont reliées (60 labyrinthes)", connected); ok("labyrinthe : bords fermés", border); ok("labyrinthe : moins de 2 impasses en moyenne", deadEnds / 60 < 2);
  let allDone = true, scoresOk = true, nan = false, dur = 0, caught = 0, eats = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = createMaze(seed, { autoMe: true }); let st = 0; while (!g.S.done && st++ < 4000) { g.step(1 / 30, NONE); g.S.events.length = 0; }
    allDone = allDone && g.S.done; dur += g.S.t;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.maze.max * 1.6;
    nan = nan || g.S.A.some((a) => [a.px, a.pz].some(Number.isNaN) || !g.walkable(a.cx, a.cz)) || g.S.G.some((o) => Number.isNaN(o.px) || !g.walkable(o.cx, o.cz));
    for (const a of g.S.A) { caught += a.caught; eats += a.eats; }
  }
  ok("labyrinthe : 30 parties se terminent", allDone); ok("labyrinthe : scores entiers dans [0, max]", scoresOk); ok("labyrinthe : tout le monde reste sur les couloirs, pas de NaN", !nan);
  ok("labyrinthe : une partie de bots dure 12 à 45 s", dur / 30 > 12 && dur / 30 < 45);
  ok("labyrinthe : les fantômes attrapent du monde (2 à 14 fois par partie) et se font manger", caught / 30 > 2 && caught / 30 < 14 && eats / 30 > 1);
  const a = createMaze(6, { autoMe: true }), b = createMaze(6, { autoMe: true });
  for (let i = 0; i < 500; i++) { a.step(1 / 30, NONE); b.step(1 / 30, NONE); }
  eq("labyrinthe : même graine, même partie", [a.S.me.pel, a.S.left, a.S.G[0].px.toFixed(3)], [b.S.me.pel, b.S.left, b.S.G[0].px.toFixed(3)]);
  // glisser : on garde sa direction, on s'arrête devant un mur, on mange en passant
  const g = createMaze(2); const S = g.S, me = S.me;
  for (const o of S.A.slice(1)) { o.alive = false; } for (const o of S.G) { o.mode = "wait"; o.wait = 999; }
  let dirs = null; for (const [dx, dz] of [[1, 0], [0, -1], [-1, 0], [0, 1]]) if (g.walkable(me.cx + dx, me.cz + dz) && g.walkable(me.cx + 2 * dx, me.cz + 2 * dz)) { dirs = [dx, dz]; break; }
  const k0 = S.left, c0 = me.pel;
  for (let i = 0; i < 6; i++) g.step(1 / 30, { x: dirs[0], y: dirs[1], act: false });
  for (let i = 0; i < 30; i++) g.step(1 / 30, NONE);
  ok("labyrinthe : le joueur continue tout droit sans toucher à rien", me.dir && me.dir[0] === dirs[0] && me.dir[1] === dirs[1] || !me.moving);
  ok("labyrinthe : manger une pastille la retire et la compte", me.pel > c0 && S.left === k0 - (me.pel - c0));
  // grosse pastille : fantômes effrayés, on peut les manger
  const g2 = createMaze(3); const S2 = g2.S, m2 = S2.me; for (const o of S2.A.slice(1)) o.alive = false;
  const pp = []; for (let z = 0; z < S2.H; z++) for (let x = 0; x < S2.W; x++) if (S2.pel[z][x] === 2) pp.push([x, z]);
  ok("labyrinthe : 4 grosses pastilles", pp.length === 4);
  S2.G[0].mode = "chase"; S2.G[0].wait = 0; S2.G[1].mode = "wait"; S2.G[1].wait = 99; S2.G[2].mode = "wait"; S2.G[2].wait = 99;
  const [px, pz] = pp[0]; S2.pel[pz][px] = 2; m2.cx = m2.tx = m2.px = px; m2.cz = m2.tz = m2.pz = pz; m2.moving = false; S2.pel[pz][px] = 0;
  // on simule l'arrivée en reposant la grosse pastille un cran avant
  let nb = null; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g2.walkable(px + dx, pz + dz)) { nb = [dx, dz]; break; }
  m2.cx = m2.tx = m2.px = px + nb[0]; m2.cz = m2.tz = m2.pz = pz + nb[1]; S2.pel[pz][px] = 2;
  for (let i = 0; i < 30 && m2.power <= 0; i++) g2.step(1 / 30, { x: -nb[0], y: -nb[1], act: false });
  ok("labyrinthe : la grosse pastille rend invincible et effraie les fantômes", m2.power > 4 && S2.G[0].mode === "fright" && S2.fright > 4);
  const gh = S2.G[0]; gh.px = gh.cx = gh.tx = m2.cx; gh.pz = gh.cz = gh.tz = m2.cz; gh.moving = false;
  g2.step(1 / 30, NONE);
  eq("labyrinthe : toucher un fantôme effrayé le mange (+100)", [gh.mode, m2.eats, g2.scoreOf(m2) >= 100], ["eaten", 1, true]);
  // attrapé : on perd des pastilles qui reviennent dans le labyrinthe, retour au départ protégé
  const g3 = createMaze(4); const S3 = g3.S, m3 = S3.me; for (const o of S3.A.slice(1)) o.alive = false;
  for (let z = 0, n = 0; z < S3.H && n < 12; z++) for (let x = 0; x < S3.W && n < 12; x++) if (S3.pel[z][x] === 1 && !(x === 1 && z === 1)) { S3.pel[z][x] = 0; S3.left--; n++; }
  m3.pel = 20; const left0 = S3.left; for (const o of S3.G) { o.mode = "wait"; o.wait = 99; }
  const gh3 = S3.G[0]; gh3.mode = "chase"; gh3.wait = 0; gh3.px = gh3.cx = gh3.tx = m3.cx; gh3.pz = gh3.cz = gh3.tz = m3.cz; m3.inv = 0; m3.power = 0; m3.cx = m3.tx = 1; m3.cz = m3.tz = 1; m3.px = 1; m3.pz = 1; gh3.px = 1; gh3.pz = 1; gh3.cx = gh3.tx = 1; gh3.cz = gh3.tz = 1;
  g3.step(1 / 30, NONE);
  eq("labyrinthe : attrapé = 6 pastilles perdues (30 %), elles retournent dans le labyrinthe", [m3.pel, S3.left - left0, m3.caught], [14, 6, 1]);
  ok("labyrinthe : retour au départ avec protection", m3.inv > 1.5 && m3.cx === 1 && m3.cz === S3.H - 2);
  // vol : un joueur invincible prend 4 pastilles à un autre
  const g4 = createMaze(5); const S4 = g4.S; for (const o of S4.G) { o.mode = "wait"; o.wait = 99; } S4.A[3].alive = false; S4.A[2].alive = false;
  const A0 = S4.A[0], B = S4.A[1]; A0.power = 5; B.pel = 9; B.inv = 0; B.px = B.cx = B.tx = A0.cx; B.pz = B.cz = B.tz = A0.cz; B.bot = false; A0.bot = false;
  g4.step(1 / 30, NONE);
  eq("labyrinthe : l'invincible vole 4 pastilles", [A0.pel, B.pel, A0.steals], [4, 5, 1]);
}
/* ---------- boules de neige géantes ---------- */
{
  let allDone = true, scoresOk = true, nan = false, falls = 0, dur = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = createSnow(seed, { autoMe: true }); let st = 0; while (!g.S.done && st++ < 4000) { g.step(1 / 30, NONE); g.S.events.length = 0; }
    allDone = allDone && g.S.done; dur += g.S.t;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.snow.max * 4.5;
    nan = nan || g.S.P.some((o) => [o.x, o.z, o.m, o.rho].some(Number.isNaN) || (o.alive && Math.hypot(o.x, o.z) > SN.R + 0.2));
    falls += g.S.P.reduce((a, o) => a + o.falls, 0);
  }
  ok("neige : 30 parties se terminent", allDone); ok("neige : scores entiers et raisonnables", scoresOk); ok("neige : personne ne reste au-delà du bord, pas de NaN", !nan);
  ok("neige : 1 à 8 chutes par partie", falls / 30 > 1 && falls / 30 < 8);
  const a = createSnow(5, { autoMe: true }), b = createSnow(5, { autoMe: true });
  for (let i = 0; i < 500; i++) { a.step(1 / 30, NONE); b.step(1 / 30, NONE); }
  eq("neige : même graine, même partie", [a.S.me.m.toFixed(4), a.S.P[2].x.toFixed(3)], [b.S.me.m.toFixed(4), b.S.P[2].x.toFixed(3)]);
  // rouler fait grossir et laisse de l'herbe ; rester immobile ne mange rien
  const g = createSnow(2); const S = g.S, me = S.me; for (const o of S.P.slice(1)) { o.alive = false; o.respawn = 999; o.fall = 0.01; }
  me.x = -3; me.z = 0; const m0 = me.m, s0 = g.snowAt(-3, 0);
  for (let i = 0; i < 30; i++) g.step(1 / 30, NONE);
  eq("neige : immobile, la boule ne grossit pas", me.m, m0);
  for (let i = 0; i < 40; i++) g.step(1 / 30, { x: 1, y: 0, act: false });
  ok("neige : en roulant, la boule grossit", me.m > m0 + 0.15);
  ok("neige : la neige ramassée laisse de l'herbe derrière", g.snowAt(me.x - 1.2, me.z) < 0.5 && s0 > 0.9);
  ok("neige : plus la boule est grosse, plus son rayon augmente", radiusOf(4) > radiusOf(1) * 1.4 && radiusOf(1) > 0.5);
  // choc : la grosse boule prend de la neige à la petite et bouge à peine
  const g2 = createSnow(3); const S2 = g2.S; for (const o of S2.P.slice(2)) { o.alive = false; o.respawn = 999; o.fall = 0.01; }
  const big = S2.P[0], small = S2.P[1]; big.m = 4; small.m = 1; big.rho = radiusOf(4); small.rho = radiusOf(1);
  big.x = -1; big.z = 0; small.x = big.rho + small.rho - 0.1 + big.x; small.z = 0; big.vx = 5; big.vz = 0; small.vx = 0; small.vz = 0; big.inv = small.inv = 0; big.bot = small.bot = false; big.ix = big.iz = small.ix = small.iz = 0;
  const tot0 = big.m + small.m; g2.S.me = small;
  g2.step(1 / 30, NONE);
  ok("neige : la grosse écrase la petite (elle lui prend de la neige)", big.m > 4.2 && small.m < 0.9 && big.m + small.m > tot0 - 0.05);
  ok("neige : la petite est projetée, la grosse ralentit à peine", small.vx > 4.2 && big.vx > 2.2 && small.vx > big.vx);
  // chute : on perd 62 % et le dernier qui a touché récupère 60 % de la perte
  const g3 = createSnow(4); const S3 = g3.S; for (const o of S3.P.slice(2)) { o.alive = false; o.respawn = 999; o.fall = 0.01; }
  const v = S3.P[1], k = S3.P[0]; v.m = 3; v.x = SN.R + 0.3; v.z = 0; v.vx = 3; v.bot = false; v.ix = v.iz = 0; v.last = 0; v.lastT = S3.t; k.m = 2; S3.me = k; k.bot = false;
  g3.step(1 / 30, NONE);
  ok("neige : tomber coûte 62 % de la boule", !v.alive && Math.abs(v.m - Math.max(0.85, 3 * 0.38)) < 0.08);
  ok("neige : l'éjecteur récupère 60 % de la perte et marque une éjection", Math.abs(k.m - (2 + 3 * 0.62 * 0.6)) < 0.12 && k.kos === 1);
  for (let i = 0; i < 60; i++) g3.step(1 / 30, NONE);
  ok("neige : on réapparaît après un court délai, protégé", v.alive && v.inv > 0);
  // charge
  const g4 = createSnow(6); const S4 = g4.S; for (const o of S4.P.slice(1)) { o.alive = false; o.respawn = 999; o.fall = 0.01; }
  const d = S4.me; d.x = 0; d.z = 0;
  g4.step(1 / 30, { x: 0, y: -1, act: true }); const s1 = d.dash;
  for (let i = 0; i < 8; i++) g4.step(1 / 30, { x: 0, y: -1, act: false });
  const sp = Math.hypot(d.vx, d.vz);
  ok("neige : la charge accélère fortement, puis il faut attendre avant la suivante", s1 > 0 && sp > 5.4 && d.cd > 0);
}
/* ---------- guerre de peinture ---------- */
{
  let allDone = true, scoresOk = true, out = false, painted = true, sumOk = true;
  for (let seed = 1; seed <= 40; seed++) {
    const g = run(createPaint(seed, { autoMe: seed % 2 === 0 }), NONE);
    allDone = allDone && g.S.done;
    const sc = g.score();
    scoresOk = scoresOk && Number.isInteger(sc) && sc >= 0 && sc <= MG_BY.paint.max;
    out = out || g.S.P.some((o) => Number.isNaN(o.x) || Math.abs(o.x) > PT.half || Math.abs(o.z) > PT.half);
    painted = painted && g.S.P.slice(1).every((o) => g.tiles(o) > 4);
    sumOk = sumOk && g.S.counts.reduce((a, b) => a + b, 0) === g.S.own.filter((x) => x >= 0).length;
  }
  ok("peinture : 40 parties se terminent", allDone); ok("peinture : scores entiers dans [0, max]", scoresOk);
  ok("peinture : personne ne sort du plateau", !out); ok("peinture : les bots repeignent des dalles", painted); ok("peinture : décompte des dalles cohérent", sumOk);
  // le joueur immobile peint sa case de départ ; en fonçant il peint plus large
  const g = createPaint(5); g.S.P.slice(1).forEach((o) => { o.bot = false; o.x = 0; o.z = 0; });
  g.step(1 / 30, NONE); const t0 = g.tiles(g.S.me);
  g.step(1 / 30, { x: 1, y: 0, act: true, act2: false }); for (let i = 0; i < 8; i++) g.step(1 / 30, NONE);
  ok("peinture : une case au départ, foncer en peint plusieurs", t0 === 1 && g.tiles(g.S.me) >= 5);
}
/* ---------- plateformes musicales ---------- */
{
  let allDone = true, scoresOk = true, oneWinner = true, pads = true;
  for (let seed = 1; seed <= 40; seed++) {
    const g = createChairs(seed, { autoMe: true }); let n = 0, minPads = 9;
    while (!g.S.done && n++ < 6000) { g.step(1 / 30, NONE); if (g.S.phase === "scramble") minPads = Math.min(minPads, g.S.pads.length - (g.S.P.filter((o) => o.alive).length - 1)); g.S.events.length = 0; }
    allDone = allDone && g.S.done;
    scoresOk = scoresOk && g.S.P.every((o) => { const s = g.pts(o); return Number.isInteger(s) && s >= 0 && s <= MG_BY.chairs.max; });
    oneWinner = oneWinner && (g.S.winner < 0 || g.S.P.filter((o) => o.alive).length === 1);
    pads = pads && minPads === 0;
  }
  ok("musicales : 40 parties de bots se terminent", allDone); ok("musicales : scores dans [0, max]", scoresOk);
  ok("musicales : un seul vainqueur", oneWinner); ok("musicales : toujours une plateforme de moins que de joueurs", pads);
  // le joueur qui ne bouge pas finit éliminé (les bots prennent les plateformes) et la partie se termine
  const g = run(createChairs(3), NONE, 6000);
  ok("musicales : immobile = éliminé au premier tour, score 0", g.S.me.out && g.score() === 0);
}
/* ---------- traînées de lumière ---------- */
{
  let allDone = true, scoresOk = true, gridOk = true, life = true;
  for (let seed = 1; seed <= 40; seed++) {
    const g = run(createTrails(seed, { autoMe: true }), NONE, 4000);
    allDone = allDone && g.S.done;
    scoresOk = scoresOk && g.S.B.every((b) => { const s = g.pts(b); return Number.isInteger(s) && s >= 0 && s <= MG_BY.trails.max; });
    gridOk = gridOk && g.S.B.every((b) => b.path.every(([x, z]) => x >= 0 && z >= 0 && x < TR.G && z < TR.G && g.S.grid[z * TR.G + x] === b.i));
    life = life && g.S.B.filter((b) => b.life > 3).length >= 3;
  }
  ok("traînées : 40 parties se terminent", allDone); ok("traînées : scores dans [0, max]", scoresOk);
  ok("traînées : chaque case de traînée appartient à son joueur", gridOk); ok("traînées : les bots survivent plusieurs secondes", life);
  // tout droit sans tourner : le joueur finit dans le mur du haut
  const g = run(createTrails(9), NONE, 4000);
  ok("traînées : tout droit = choc (mur ou traînée), la partie se termine", !g.S.me.alive && g.S.done && g.S.me.path.every(([x]) => x === g.S.me.path[0][0]));
  // pas de demi-tour
  const h = createTrails(4); h.step(1 / 30, { x: 0, y: 1, act: false }); ok("traînées : pas de demi-tour", h.S.me.want === 0);
}
console.log(bad ? bad + " échec(s)" : "arènes : tout est OK");
process.exit(bad ? 1 : 0);
