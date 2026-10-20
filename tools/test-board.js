// Plateau, côté moteur (sans réseau, minuteries manuelles) : règles « à la Mario Party », objets, gemmes, modes d'équipe, fin de partie.
import { HostEngine } from "../src/net/hostEngine.js";
import { BD_LAYOUT, BD_SIZE, ITEMS, ITEM_IDS, SHOP_POOL, SPACE_INFO, randomItem } from "../src/data/board.js";
let bad = 0;
let lastOk = "";
const eq = (n, g, w) => { lastOk = n; if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const realRandom = Math.random;
const dice = (n) => { Math.random = () => (n - 1) / 10 + 0.01; };   // le prochain d10 donnera n
const fixed = (v) => { Math.random = () => v; };
const seq = (...v) => { let i = 0; Math.random = () => (i < v.length ? v[i++] : 0.5); }; // valeurs successives (le premier appel est le dé)
const free = () => { Math.random = realRandom; };

const mk = (rounds = 5, bots = 0) => {
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: () => {} });
  e.addPlayer({ id: "a", name: "Anna" }); e.addPlayer({ id: "b", name: "Bob" });
  for (let i = 0; i < bots; i++) e.addBot();
  e.setSettings("h", { game: "board", bdRounds: rounds });
  const q = [];
  e.after = (ms, fn) => { const t = { ms, fn }; q.push(t); return t; };
  e.clearTimers = () => { q.length = 0; };
  e.run = (until, max = 400) => { let n = 0; while (!until() && q.length && n++ < max) q.shift().fn(); return until(); };
  e.pending = () => q.length;
  e.bdColors = () => Object.fromEntries(e.S.players.map((p) => [p.id, 0])); // par défaut : tous bleus = chacun pour soi
  return e;
};
/** Fait jouer le tour du joueur courant : (item, cible) puis attend la fin du tour. */
const turn = (e, item = -1, target = null) => { const who = e.S.bd.cur; e.bdRoll(who, item, target); e.run(() => e.S.bd.cur !== who || e.S.bd.sub === "gem" || e.S.bd.sub === "shop" || !e.S.phase.startsWith("bd_")); return who; };
const miniDone = (e, scores) => { e.run(() => e.S.phase === "mg_play"); const st = e.S.mg.step; for (const [id, s] of Object.entries(scores)) e.mgSubmit(id, st, s); };

/** Avance (mini-jeux compris) jusqu'au prochain tour « pre » d'un joueur. */
const ready = (e) => {
  for (let i = 0; i < 80; i++) {
    if (e.S.phase === "bd_turn" && e.S.bd.sub === "pre") return e.S.bd;
    if (e.S.phase === "mg_intro") e.run(() => e.S.phase === "mg_play");
    else if (e.S.phase === "mg_play") { for (const p of e.S.players) e.mgSubmit(p.id, e.S.mg.step, 5); }
    else if (e.S.phase === "mg_result") e.mgSkip("h");
    else e.run(() => false, 1);
  }
  throw new Error(`pas de tour disponible (phase ${e.S.phase}, sous-phase ${e.S.bd && e.S.bd.sub}, en attente ${e.pending()}) après « ${lastOk} »`);
};
const give = (e, id, items) => { e.S.bd.items[id] = items; };

// ---------- données
eq("32 cases, départ en case 0", [BD_SIZE, BD_LAYOUT.length, BD_LAYOUT[0]], [32, 32, "start"]);
eq("types de cases connus", BD_LAYOUT.every((t) => SPACE_INFO[t]), true);
eq("autant de rouges que possible face aux bleues (équilibre des modes)", [BD_LAYOUT.filter((t) => t === "blue").length, BD_LAYOUT.filter((t) => t === "red").length], [11, 8]);
eq("chaque objet a nom, emoji, description", Object.values(ITEMS).every((i) => i.emoji && i.name && i.desc), true);
eq("au moins 15 objets", ITEM_IDS.length >= 15, true);
eq("les boutiques ne vendent que des objets à prix", [...SHOP_POOL.a, ...SHOP_POOL.b].every((k) => ITEMS[k].price > 0), true);
eq("un tirage donne un objet connu", ITEMS[randomItem(() => 0.5)] !== undefined, true);

// ---------- réglages et départ
let e = mk(5);
eq("jeu accepté", [e.S.settings.game, e.S.settings.bdRounds], ["board", 5]);
e.setSettings("h", { bdRounds: 7 }); eq("nombre de tours invalide : ignoré", e.S.settings.bdRounds, 5);
eq("capacité sans équipes, un joueur suffit", [e.capacity, e.minPlayers], [16, 1]);
e.start("h");
let bd = e.S.bd;
eq("d'abord les dés qui décident de l'ordre", [e.S.phase, bd.sub], ["bd_turn", "order"]);
eq("ordre = du plus haut dé au plus bas", bd.order.every((id, i) => i === 0 || bd.rolls[bd.order[i - 1]] >= bd.rolls[id]), true);
bd = ready(e);
eq("phase du tour", [e.S.phase, bd.sub, bd.round, bd.total], ["bd_turn", "pre", 1, 5]);
eq("tous au départ avec 10 pièces, 0 gemme, sans objet", [Object.values(bd.pos), Object.values(bd.coins), Object.values(bd.gems), Object.values(bd.items).flat()], [[0, 0, 0], [10, 10, 10], [0, 0, 0], []]);
eq("la gemme est loin du départ", bd.gemAt >= 8 && bd.gemAt <= 24, true);
eq("une couleur par joueur", Object.values(bd.col).every((c) => c === 0 || c === 1), true);
const first = bd.cur, second = bd.order[1];

// ---------- seul le joueur dont c'est le tour joue
const other = bd.order.find((x) => x !== first);
e.bdRoll(other, -1, null); eq("pas ton tour : refusé", e.S.bd.sub, "pre");

// ---------- lancer : dé de 1 à 10, la case agit (case 3 = cadeau)
bd.gemAt = 20; dice(3);
let who = turn(e);
free();
eq("le pion a avancé de 3", e.S.bd.pos[who], 3);
eq("case cadeau : un objet reçu", e.S.bd.items[who].length, 1);
eq("tour suivant", e.S.bd.cur, second);
who = ready(e).cur; e.S.bd.gemAt = 25; dice(10); turn(e); free();
eq("le dé monte jusqu'à 10", e.S.bd.pos[who], 10);

// ---------- cases bleue (+3) et rouge (−3), couleur mémorisée, rien en passant par le départ
who = ready(e).cur; e.S.bd.pos[who] = 0; e.S.bd.gemAt = 25; let c0 = e.S.bd.coins[who]; dice(1); turn(e); free();
eq("case bleue : +3 pièces, camp bleu", [e.S.bd.coins[who] - c0, e.S.bd.col[who]], [3, 0]);
who = ready(e).cur; e.S.bd.pos[who] = 3; e.S.bd.coins[who] = 10; dice(1); turn(e); free();
eq("case rouge : −3 pièces, camp rouge", [e.S.bd.coins[who], e.S.bd.col[who], e.S.bd.pos[who]], [7, 1, 4]);
who = ready(e).cur; e.S.bd.pos[who] = 30; e.S.bd.coins[who] = 10; dice(2); turn(e); free();
eq("passer par le départ ne rapporte rien (case 0 : départ)", [e.S.bd.pos[who], e.S.bd.coins[who]], [0, 10]);
who = ready(e).cur; e.S.bd.pos[who] = 0; e.S.bd.coins[who] = 10; e.S.bd.sprint = true; dice(1); turn(e); free();
eq("sprint final : case bleue ×2", e.S.bd.coins[who], 16);
who = ready(e).cur; e.S.bd.pos[who] = 3; e.S.bd.coins[who] = 10; e.S.bd.sprint = true; dice(1); turn(e); free();
eq("sprint final : case rouge ×2", e.S.bd.coins[who], 4);
e.S.bd.sprint = false;

// ---------- mini-jeu après le tour de table : tous bleus = chacun pour soi, seul le gagnant empoche 10
e = mk(5); e.start("h"); bd = ready(e);
bd.gemAt = 25;
for (let i = 0; i < 3; i++) { dice(1); turn(e); free(); if (e.S.phase !== "bd_turn") break; }
eq("tous ont joué : mini-jeu", [e.S.phase, e.S.mg.kind, e.S.mg.mode], ["mg_intro", "mini", "ffa"]);
let before = { ...e.S.bd.coins };
miniDone(e, { h: 10, a: 5, b: 1 });
eq("classement du mini-jeu", e.S.mg.last.rows.map((r) => r.id), ["h", "a", "b"]);
eq("seul le gagnant gagne 10 pièces", ["h", "a", "b"].map((id) => e.S.bd.coins[id] - before[id]), [10, 0, 0]);
eq("pièces gagnées en mini-jeux suivies (gemme bonus)", e.S.bd.stat.mini.h, 10);
e.mgSkip("h");
eq("tour de table suivant", [e.S.phase, e.S.bd.round, e.S.bd.sub], ["bd_turn", 2, "pre"]);
// égalité en tête : les deux gagnent
for (let i = 0; i < 3; i++) { ready(e); dice(1); turn(e); free(); if (e.S.phase !== "bd_turn") break; }
before = { ...e.S.bd.coins }; miniDone(e, { h: 7, a: 7, b: 1 });
eq("égalité en tête : chacun empoche 10", ["h", "a", "b"].map((id) => e.S.bd.coins[id] - before[id]), [10, 10, 0]);

// ---------- modes d'équipe d'après les couleurs : 1 contre 2 (3 joueurs), 2 contre 2 et 1 contre 3 (4 joueurs)
const toMini = (x) => { ready(x); x.S.bd.gemAt = 25; for (let i = 0; i < x.S.players.length; i++) { if (x.S.phase !== "bd_turn") break; ready(x); dice(1); turn(x); free(); } };
e = mk(5); e.start("h"); e.bdColors = () => ({ h: 1, a: 0, b: 0 }); toMini(e);
eq("un joueur rouge, deux bleus : 1 contre 2", [e.S.mg.mode, e.S.mg.teams], ["1v2", { h: 1, a: 0, b: 0 }]);
before = { ...e.S.bd.coins }; miniDone(e, { h: 30, a: 10, b: 10 });
let L = e.S.mg.last;
eq("le joueur seul (rouge) gagne contre la moyenne de l'autre camp", [L.teams.map((t) => t.result), L.teams.map((t) => t.avg)], [["lose", "win"], [10, 30]]);
eq("l'équipe gagnante empoche 10 pièces chacun, l'autre rien", ["h", "a", "b"].map((id) => e.S.bd.coins[id] - before[id]), [10, 0, 0]);
e = mk(5, 1); e.start("h"); e.bdColors = () => ({ h: 0, a: 0, b: 1, [e.S.players[3].id]: 1 }); toMini(e);
eq("deux bleus, deux rouges : 2 contre 2", e.S.mg.mode, "2v2");
const bot = e.S.players[3].id; before = { ...e.S.bd.coins };
miniDone(e, { h: 4, a: 6, b: 20, [bot]: 18 }); L = e.S.mg.last;
eq("2 contre 2 : moyenne par équipe (5 contre 19), gagnants Rouges", [L.teams.map((t) => t.avg), L.teams.map((t) => t.result)], [[5, 19], ["lose", "win"]]);
eq("chacun des gagnants +10 pièces", ["h", "a", "b", bot].map((id) => e.S.bd.coins[id] - before[id]), [0, 0, 10, 10]);
eq("victoires comptées pour les gagnants seulement", [e.S.mg.wins.b, e.S.mg.wins[bot], e.S.mg.wins.h], [1, 1, undefined]);
eq("les rangs sont par équipe", L.rows.map((r) => [r.id, r.rank, r.team]), [["b", 1, 1], [bot, 1, 1], ["a", 2, 0], ["h", 2, 0]]);
e.mgSkip("h");
// 1 contre 3 + égalité
e = mk(5, 1); e.start("h"); e.bdColors = () => ({ h: 1, a: 0, b: 0, [e.S.players[3].id]: 0 }); toMini(e);
eq("un seul rouge : 1 contre 3", e.S.mg.mode, "1v3");
const bot2 = e.S.players[3].id; before = { ...e.S.bd.coins };
miniDone(e, { h: 12, a: 24, b: 0, [bot2]: 12 }); L = e.S.mg.last;
eq("égalité de moyennes (12 contre 12) : 5 pièces chacun", [L.teams.map((t) => t.result), ["h", "a", "b", bot2].map((id) => e.S.bd.coins[id] - before[id])], [["tie", "tie"], [5, 5, 5, 5]]);
// tous du même camp = chacun pour soi
e = mk(5); e.start("h"); e.bdColors = () => ({ h: 1, a: 1, b: 1 }); toMini(e);
eq("tous rouges : chacun pour soi", e.S.mg.mode, "ffa");

// ---------- gemme à 20 pièces : passage sans assez d'argent, puis achat
e = mk(5); e.start("h");
bd = ready(e); who = bd.cur;
bd.pos[who] = 5; bd.gemAt = 7; bd.coins[who] = 19; dice(4);
turn(e); free();
eq("19 pièces : pas de proposition, le pion continue", [e.S.bd.sub === "gem", e.S.bd.pos[who]], [false, 9]);
bd = ready(e); who = bd.cur; bd.pos[who] = 5; bd.gemAt = 7; bd.coins[who] = 20; dice(4);
who = turn(e); free();
eq("20 pièces : le pion s'arrête sur la gemme et on propose", [e.S.bd.sub, e.S.bd.pos[who]], ["gem", 7]);
e.bdGem("zzz", true); eq("quelqu'un d'autre ne peut pas répondre", e.S.bd.sub, "gem");
e.bdGem(who, true);
eq("gemme achetée : −20 pièces, +1 gemme", [e.S.bd.gems[who], e.S.bd.coins[who] < 20], [1, true]);
eq("la gemme a changé de case, loin de l'ancienne", [e.S.bd.gemAt !== 7, Math.min((e.S.bd.gemAt - 7 + 32) % 32, (7 - e.S.bd.gemAt + 32) % 32) >= 8], [true, true]);
e.run(() => e.S.bd.cur !== who);
bd = ready(e); who = bd.cur; bd.pos[who] = 5; bd.gemAt = 7; bd.coins[who] = 30; dice(2);
who = turn(e); free();
e.bdGem(who, false);
eq("gemme refusée : rien payé", [e.S.bd.gems[who], e.S.bd.coins[who]], [0, 30]);
e.run(() => e.S.bd.cur !== who);

// ---------- objets
/** Prépare un tour : le joueur courant à `pos`, la gemme loin, des objets. */
const setup = (pos, items, gemAt = 25) => { const b = ready(e); b.pos[b.cur] = pos; b.gemAt = gemAt; give(e, b.cur, items); b.coins[b.cur] = 12; return b.cur; };
const victimOf = (id) => e.S.bd.order.find((x) => x !== id);
const finish = (id) => { free(); e.run(() => e.S.bd.cur !== id); };
e = mk(8); e.start("h"); e.S.bd.total = 99; e.S.mg.total = 99;
who = setup(0, ["thief"]); let victim = victimOf(who); e.S.bd.coins[victim] = 20;
dice(1); e.bdRoll(who, 0, who); eq("voleur sans cible valide (soi-même) : refusé, objet gardé", [e.S.bd.items[who].length, e.S.bd.sub], [1, "moving"]); finish(who);
who = setup(0, ["thief"]); victim = victimOf(who); e.S.bd.coins[victim] = 20; dice(5);
let cv = e.S.bd.coins[victim]; e.bdRoll(who, 0, victim);
eq("voleur : 5 pièces volées, objet consommé", [cv - e.S.bd.coins[victim], e.S.bd.items[who].length], [5, 0]); finish(who);
who = setup(0, ["thief"]); victim = victimOf(who); e.S.bd.coins[victim] = 20; e.S.bd.shield[victim] = true; dice(5); e.bdRoll(who, 0, victim);
eq("bouclier : vol bloqué, bouclier consommé", [e.S.bd.coins[victim], e.S.bd.shield[victim]], [20, undefined]); finish(who);
who = setup(8, ["double"], 28); dice(4); e.bdRoll(who, 0, null);
eq("double dé : 2 dés de 4", [e.S.bd.roll.dice, e.S.bd.roll.steps], [[4, 4], 8]); finish(who);
who = setup(8, ["triple"], 28); dice(3); e.bdRoll(who, 0, null);
eq("triple dé : 3 dés", [e.S.bd.roll.dice, e.S.bd.roll.steps], [[3, 3, 3], 9]); finish(who);
who = setup(8, ["speed"], 28); dice(1); e.bdRoll(who, 0, null);
eq("bottes de vitesse : dé de 8 à 10", e.S.bd.roll.steps >= 8 && e.S.bd.roll.steps <= 10, true); finish(who);
who = setup(8, ["speed"], 28); fixed(0.99); e.bdRoll(who, 0, null);
eq("bottes de vitesse : le maximum est 10", e.S.bd.roll.steps, 10); finish(who);
// échange / téléporteur
who = setup(1, ["swap"]); victim = victimOf(who); e.S.bd.pos[victim] = 15; dice(1); e.bdRoll(who, 0, victim);
eq("échange : les pions ont échangé leur place avant le déplacement", [e.S.bd.pos[victim], e.S.bd.pos[who]], [1, 15]); finish(who);
who = setup(1, ["warp"]); const others = e.S.bd.order.filter((x) => x !== who); for (const o of others) e.S.bd.pos[o] = 20; fixed(0.01); e.bdRoll(who, 0, null);
eq("téléporteur : la place d'un adversaire au hasard", [e.S.bd.pos[who] >= 20, others.some((o) => e.S.bd.pos[o] === 1)], [true, true]); finish(who);
// piège
who = setup(9, ["trap"]); dice(1); const owner = who; e.bdRoll(who, 0, null);
eq("piège posé sur la case du poseur (caché des autres)", [e.bdTraps[9], JSON.stringify(e.publicState()).includes('"traps"')], [owner, false]); finish(who);
for (let k = 0; k < 6 && ready(e).cur === owner; k++) { dice(1); turn(e); free(); }
bd = ready(e); who = bd.cur;
eq("un autre joueur arrive après le poseur", who !== owner, true);
bd.gemAt = 28; bd.pos[who] = 7; bd.coins[who] = 10; bd.shield = {}; dice(2); cv = bd.coins[who]; turn(e); free();
eq("piège : −6 pièces pour la victime, le piège disparaît", [cv - e.S.bd.coins[who], e.bdTraps[9], e.S.bd.pos[who]], [6, undefined, 9]);
// malédictions
who = setup(8, ["poison"]); victim = victimOf(who); dice(1); e.bdRoll(who, 0, victim);
eq("champignon toxique : sort posé sur la victime", e.S.bd.curse[victim], "slow"); finish(who);
{ const b = ready(e); give(e, b.cur, []); b.gemAt = 28; b.pos[b.cur] = 8; if (b.cur !== victim) { dice(1); e.bdRoll(b.cur, -1, null); finish(b.cur); } }
if (ready(e).cur !== victim) { /* ordre : on avance jusqu'à la victime */ for (let k = 0; k < 6 && ready(e).cur !== victim; k++) { dice(1); turn(e); free(); } }
{ const b = ready(e); b.pos[victim] = 8; b.gemAt = 28; fixed(0.99); e.bdRoll(victim, -1, null); eq("sous l'effet du poison : dé de 1 à 3 (même avec un très bon tirage)", [e.S.bd.roll.curse, e.S.bd.roll.steps <= 3, e.S.bd.curse[victim]], ["slow", true, undefined]); finish(victim); }
who = setup(8, ["reverse"]); victim = victimOf(who); dice(1); e.bdRoll(who, 0, victim); finish(who);
for (let k = 0; k < 6 && ready(e).cur !== victim; k++) { dice(1); turn(e); free(); }
{ const b = ready(e); b.pos[victim] = 8; b.gemAt = 28; dice(3); e.bdRoll(victim, -1, null); eq("dé à l'envers : la victime recule", [e.S.bd.roll.back, e.S.bd.pos[victim]], [true, 8]); finish(victim); eq("… de 3 cases", e.S.bd.pos[victim], 5); }
who = setup(8, ["poison"]); victim = victimOf(who); e.S.bd.shield[victim] = true; dice(1); e.bdRoll(who, 0, victim);
eq("le bouclier repousse la malédiction", [e.S.bd.curse[victim], e.S.bd.shield[victim]], [undefined, undefined]); finish(who);
// coffre pilleur, fantôme, téléphone
who = setup(8, ["plunder"]); victim = victimOf(who); give(e, victim, ["lamp"]); dice(1); e.bdRoll(who, 0, victim);
eq("coffre pilleur : l'objet change de main", [e.S.bd.items[who], e.S.bd.items[victim]], [["lamp"], []]); finish(who);
who = setup(8, ["ghost"]); victim = victimOf(who); e.S.bd.gems[victim] = 2; dice(1); e.bdRoll(who, 0, victim);
eq("fantôme : une gemme volée", [e.S.bd.gems[victim], e.S.bd.gems[who]], [1, 1]); finish(who);
who = setup(8, ["ghost"]); victim = victimOf(who); e.S.bd.gems[victim] = 0; const gw = e.S.bd.gems[who]; dice(1); e.bdRoll(who, 0, victim);
eq("fantôme : rien à voler", [e.S.bd.gems[victim], e.S.bd.gems[who] - gw], [0, 0]); finish(who);
who = setup(8, ["phone"]); victim = victimOf(who); e.S.bd.coins[victim] = 20; fixed(0.1); e.bdRoll(who, 0, victim);
eq("téléphone : le Gredin vole 10 pièces à la victime", e.S.bd.coins[victim], 10); finish(who);
// costume de monstre
who = setup(0, ["suit"]); victim = victimOf(who); e.S.bd.pos[victim] = 3; e.S.bd.coins[victim] = 10; c0 = e.S.bd.coins[who]; dice(5);
e.bdRoll(who, 0, null); finish(who);
eq("costume de monstre : 3 pièces volées en dépassant", [e.S.bd.coins[victim], e.S.bd.coins[who] >= c0 + 3 - 3], [7, true]);
// lampe magique, aimant, sac, sablier, troc
who = setup(0, ["lamp"], 12); e.S.bd.coins[who] = 25; const g0 = e.S.bd.gems[who]; e.bdRoll(who, 0, null);
e.run(() => e.S.bd.sub === "gem");
eq("lampe magique : sur la gemme, proposition d'achat", [e.S.bd.pos[who], e.S.bd.sub, e.S.bd.roll.steps], [12, "gem", 0]);
e.bdGem(who, true); e.run(() => e.S.bd.cur !== who);
eq("… gemme achetée sans lancer le dé", [e.S.bd.gems[who] - g0, e.S.bd.pos[who]], [1, 12]);
who = setup(0, ["lamp"], 12); e.S.bd.coins[who] = 5; const g1 = e.S.bd.gems[who]; e.bdRoll(who, 0, null); e.run(() => e.S.bd.cur !== who);
eq("lampe magique sans assez de pièces : la gemme reste", [e.S.bd.gems[who] - g1, e.S.bd.gemAt], [0, 12]);
who = setup(4, ["magnet"], 25); fixed(0.5); e.bdRoll(who, 0, null);
eq("aimant : la gemme saute devant le joueur (3 à 10 cases)", [(e.S.bd.gemAt - 4 + 32) % 32 >= 3, (e.S.bd.gemAt - 4 + 32) % 32 <= 10], [true, true]); finish(who);
who = setup(8, ["bag"]); dice(1); e.bdRoll(who, 0, null);
eq("sac à surprises : poches pleines (3 objets)", e.S.bd.items[who].length, 3); finish(who);
{ const n = e.S.bd.sprint; who = setup(8, ["watch"]); dice(1); e.bdRoll(who, 0, null); eq("sablier : sprint final déclenché", [n, e.S.bd.sprint, e.S.bd.forceSprint], [false, true, true]); finish(who); }
who = setup(8, ["barter"]); victim = victimOf(who); give(e, victim, ["lamp", "trap"]); dice(1); e.bdRoll(who, 0, victim);
eq("troc : les objets sont échangés", [e.S.bd.items[who], e.S.bd.items[victim]], [["lamp", "trap"], []]); finish(who);
// capacité : 3 objets (case cadeau avec poches pleines = 2 pièces)
who = setup(2, ["double", "double", "double"]); { const c = e.S.bd.coins[who]; dice(1); e.bdRoll(who, -1, null); finish(who);
  eq("trois objets au maximum : la case cadeau (3) donne 2 pièces", [e.S.bd.items[who].length, e.S.bd.coins[who] - c], [3, 2]); }

// ---------- boutique, marché noir, coup de chance, Gredin, cases surprise
e = mk(8); e.start("h"); e.S.bd.total = 99; e.S.mg.total = 99; bd = ready(e); who = bd.cur; bd.gemAt = 25;
bd.pos[who] = 5; bd.coins[who] = 30; dice(2);  // case 7 = boutique
turn(e); free();
eq("boutique : 4 objets proposés (tous de la boutique)", [e.S.bd.sub, e.S.bd.shop.length, e.S.bd.shop.every((k) => SHOP_POOL.a.includes(k))], ["shop", 4, true]);
e.bdShop("zzz", 0); eq("boutique : un autre joueur ne peut pas acheter", e.S.bd.sub, "shop");
const pick0 = e.S.bd.shop[0]; e.bdShop(who, 0);
eq("achat au prix de l'objet", [e.S.bd.coins[who], e.S.bd.items[who]], [30 - ITEMS[pick0].price, [pick0]]);
e.run(() => e.S.bd.cur !== who);
bd = ready(e); who = bd.cur; bd.gemAt = 25; bd.pos[who] = 15; bd.coins[who] = 40; dice(2);  // case 17 = marché noir
turn(e); free();
eq("marché noir : objets pour embêter", [e.S.bd.sub, e.S.bd.shop.every((k) => SHOP_POOL.b.includes(k))], ["shop", true]);
e.bdShop(who, -1); eq("on peut ne rien acheter", [e.S.bd.items[who].length, e.S.bd.coins[who]], [0, 40]);
e.run(() => e.S.bd.cur !== who);
bd = ready(e); who = bd.cur; bd.pos[who] = 5; bd.coins[who] = 40; bd.items[who] = ["double", "trap", "warp"]; bd.gemAt = 25; dice(2);
turn(e); free();
eq("poches pleines : pas de boutique", e.S.bd.sub === "shop", false);
bd = ready(e); who = bd.cur; bd.pos[who] = 5; bd.coins[who] = 2; bd.gemAt = 25; dice(2); turn(e); free();
eq("trop pauvre : pas de boutique", e.S.bd.sub === "shop", false);
// coup de chance (case 11), Gredin (case 22) : 1er tirage = le dé, 2e = la roulette
bd = ready(e); who = bd.cur; bd.gemAt = 25; bd.pos[who] = 9; bd.coins[who] = 10; seq(0.11, 0.5); // dé 2 ; roulette k = 2 : jackpot
e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
eq("coup de chance : jackpot +12", [e.S.bd.pos[who], e.S.bd.coins[who]], [11, 22]);
eq("la case compte comme surprise pour la gemme bonus", e.S.bd.stat.hap[who], 1);
bd = ready(e); who = bd.cur; bd.gemAt = 25; bd.pos[who] = 20; bd.coins[who] = 30; seq(0.11, 0.1); e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
eq("Gredin : vole 10 pièces", [e.S.bd.pos[who], e.S.bd.coins[who]], [22, 20]);
bd = ready(e); who = bd.cur; bd.gemAt = 25; bd.pos[who] = 20; bd.coins[who] = 30; bd.shield[who] = true; seq(0.11, 0.1); e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
eq("Gredin repoussé par le bouclier", [e.S.bd.coins[who], e.S.bd.shield[who]], [30, undefined]);
{ // redistribution équitable
  bd = ready(e); who = bd.cur; bd.gemAt = 25; bd.pos[who] = 20; for (const p of e.S.players) bd.coins[p.id] = 0; bd.coins[who] = 30; seq(0.11, 0.5); // 0.4 ≤ r < 0.6 : partage
  e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
  eq("Gredin : tout le monde repart avec la même somme", [...new Set(e.S.players.map((p) => e.S.bd.coins[p.id]))], [10]);
}
// coup de chance : échange de pièces (k = 0), cadeau du plus riche (k = 1)
bd = ready(e); who = bd.cur; victim = victimOf(who); bd.gemAt = 25; bd.pos[who] = 9; bd.coins[who] = 4; bd.coins[victim] = 25; seq(0.11, 0.01, 0.01); e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
eq("coup de chance : échange des pièces avec un adversaire", [e.S.bd.coins[who] > 4, e.S.players.some((p) => p.id !== who && e.S.bd.coins[p.id] === 4)], [true, true]);
bd = ready(e); who = bd.cur; victim = victimOf(who); bd.gemAt = 25; bd.pos[who] = 9; for (const p of e.S.players) bd.coins[p.id] = 5; bd.coins[victim] = 25; const cw = bd.coins[who]; seq(0.11, 0.21); e.bdRoll(who, -1, null); e.run(() => e.S.bd.cur !== who); free();
eq("coup de chance : 8 pièces reçues du plus riche", [e.S.bd.coins[who] - cw, e.S.bd.coins[victim]], [8, 17]);

// ---------- fin : gemmes bonus, classement, départage au dé
e = mk(5); e.start("h"); bd = ready(e);
bd.gems = { h: 1, a: 1, b: 0 }; bd.coins = { h: 5, a: 5, b: 9 };
bd.stat = { mini: { h: 20, a: 20, b: 10 }, peak: { h: 30, a: 12, b: 40 }, hap: {} };
e.bdFinish();
eq("gemmes bonus : mini-jeux (égalité = les deux), fortune, aucune surprise", e.S.bd.bonus.map((b) => [b.key, b.ids]), [["mini", ["h", "a"]], ["coins", ["b"]], ["hap", []]]);
eq("les gemmes bonus s'ajoutent", e.S.bd.gems, { h: 2, a: 2, b: 1 });
const F0 = e.S.bd.final;
eq("égalité parfaite : départagée au dé, rangs 1, 2 puis 3", [F0.map((r) => r.rank), F0[0].tb > 0, F0[0].tb !== F0[1].tb, F0[2].id], [[1, 2, 3], true, true, "b"]);
eq("phase finale", e.S.phase, "bd_final");
// solo : pas de gemme bonus
const solo = new HostEngine({ roomId: "s", name: "S", host: { id: "h", name: "Hôte" }, emit: () => {} });
solo.setSettings("h", { game: "board", bdRounds: 5 }); solo.start("h"); solo.bdFinish();
eq("seul : pas de gemmes bonus", solo.S.bd.bonus, []);
solo.destroy();

// ---------- partie complète avec bots, fin et classement
e = mk(2, 2); e.start("h");
for (let i = 0; i < 600 && e.S.phase !== "bd_final"; i++) {
  if (e.S.phase === "bd_turn" && e.S.bd.cur === "h" && e.S.bd.sub === "pre") e.bdRoll("h", -1, null);
  else if (e.S.phase === "bd_turn" && e.S.bd.cur === "h" && e.S.bd.sub === "gem") e.bdGem("h", true);
  else if (e.S.phase === "bd_turn" && e.S.bd.cur === "h" && e.S.bd.sub === "shop") e.bdShop("h", 0);
  else if (e.S.phase === "mg_play") { for (const p of e.S.players) e.mgSubmit(p.id, e.S.mg.step, 3 + Math.random() * 10); }
  else if (!e.pending()) break;
  else e.run(() => false, 1);
}
eq("fin de partie", e.S.phase, "bd_final");
const F = e.S.bd.final;
eq("classement final : gemmes, pièces, jamais d'égalité de rang", [F.length, F.every((r, i) => i === 0 || F[i - 1].gems > r.gems || (F[i - 1].gems === r.gems && F[i - 1].coins >= r.coins)), F.map((r) => r.rank)], [4, true, [1, 2, 3, 4]]);
e.backToLobby("h"); eq("retour au lobby", [e.S.phase, e.S.bd, e.S.mg], ["lobby", null, null]);

// ---------- un joueur part pendant son tour : on passe au suivant
e = mk(5); e.start("h"); bd = ready(e); who = bd.cur;
if (who === "h") { e.bdRoll("h", -1, null); e.run(() => e.S.bd.cur !== "h"); who = e.S.bd.cur; }
e.leave(who);
eq("le joueur du tour part : au suivant", [e.S.players.some((p) => p.id === who), e.S.bd.cur !== who], [false, true]);
e.abort("test"); eq("abandon : remis à zéro", [e.S.phase, e.S.bd, e.S.mg], ["lobby", null, null]);

free();
console.log(bad ? `\n${bad} ÉCHEC(S)` : "\nTOUT BON");
process.exit(bad ? 1 : 0);
