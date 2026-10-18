// Tests : profil, niveaux, stats, succès, déblocages. Lancer : node tools/test-profile.js
import * as P from "../src/data/profile.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

// --- catalogue
ok(new Set(P.AVATARS.map((a) => a.id)).size === P.AVATARS.length, "identifiants d'avatars uniques");
ok(P.AVATARS.every((a) => /^M[-\d.\sMmLlHhVvAaZzCcQqSs,]+$/.test(a.d)), "tracés SVG bien formés (caractères autorisés)");
for (const list of [P.AVATARS, P.BORDERS, P.COLORS]) ok(list.filter((x) => x.rule && x.rule.ach).every((x) => P.ACH_BY[x.rule.ach]), "règles de succès valides (" + list.length + ")");
ok(P.AVATARS.filter((a) => !a.rule).length >= 5 && P.BORDERS.some((b) => !b.rule) && P.COLORS.filter((c) => !c.rule).length >= 4, "assez d'éléments gratuits au départ");
ok(P.ACHIEVEMENTS.every((a) => P.rewardsOf(a.id).length > 0 || ["first", "games10", "games50"].includes(a.id)), "chaque succès important débloque un élément");

// --- apparence venant du réseau
ok(JSON.stringify(P.cleanLook({ a: "<script>", b: 5, c: null, lv: 9999 })) === JSON.stringify({ a: "smile", b: "plain", c: "violet", lv: 99 }), "apparence piégée : remplacée par les valeurs par défaut");
ok(P.cleanLook({ a: "crown", b: "gold", c: "galaxy", lv: 12 }).a === "crown", "apparence valide conservée");
ok(P.cleanLook(null).a === "smile" && P.cleanLook("x").lv === 1, "apparence absente ou invalide");
ok(P.randomFreeLook().a && !P.AV_BY[P.randomFreeLook().a].rule, "apparence aléatoire : éléments gratuits seulement");

// --- niveaux
ok(P.levelOf(0) === 1 && P.levelOf(99) === 1 && P.levelOf(100) === 2, "niveau 2 à 100 XP");
ok(P.levelOf(P.xpAt(10)) === 10 && P.levelOf(P.xpAt(10) - 1) === 9, "seuils de niveau cohérents");
ok(P.levelOf(1e9) === P.MAX_LEVEL && P.progressOf(1e9).max, "niveau maximum plafonné");
const pr = P.progressOf(150); ok(pr.lv === 2 && pr.into === 50 && pr.need === 130, "progression dans le niveau");

// --- profil corrompu
ok(P.normalizeProfile({ xp: "abc", stats: { played: "x", bt: { full: 7, fastest: 2500 } }, look: { a: "nope" }, ach: { fake: 1, first: 5 } }).stats.bt.fastest === 2500, "profil abîmé : valeurs valides gardées");
ok(P.normalizeProfile({ xp: "abc" }).xp === 0 && P.normalizeProfile(undefined).look.a === "smile", "profil abîmé : valeurs invalides remplacées");
ok(!("fake" in P.normalizeProfile({ ach: { fake: 1 } }).ach), "succès inconnu supprimé");

// --- résumé des fins de partie
const players = [{ id: "a", name: "A", team: 0 }, { id: "b", name: "B", team: 1 }, { id: "c", name: "C", team: 1 }];
const tuRoom = { id: "r1", gameNo: 1, phase: "done", settings: { variant: "bonus" }, players, tu: { teamScores: { 0: 12, 1: 9 } }, pstats: { a: { found: 7, passed: 2, turns: 3 } } };
let s = P.summarize(tuRoom, "a");
ok(s.game === "timesup" && s.result === "win" && s.rank === 1 && s.of === 2 && s.bonus && s.tu.cards === 7, "Time's Up : victoire d'équipe + stats perso");
ok(P.summarize(tuRoom, "b").result === "loss", "Time's Up : défaite de l'autre équipe");
ok(P.summarize({ ...tuRoom, tu: { teamScores: { 0: 9, 1: 9 } } }, "a").result === "draw", "Time's Up : égalité");
ok(P.summarize({ ...tuRoom, phase: "tu_play" }, "a") === null, "pas de résumé hors fin de partie");
const qeRoom = { id: "r1", gameNo: 2, phase: "qe_final", settings: {}, players, qe: { scores: { a: 4, b: 9, c: 9 } }, pstats: { b: { rounds: 5, found: 4, firsts: 2, msSum: 12000, msN: 4, fastest: 1800 } } };
s = P.summarize(qeRoom, "b"); ok(s.result === "draw" && s.qe.fastest === 1800, "Qui est-ce : égalité en tête");
ok(P.summarize(qeRoom, "a").result === "loss" && P.summarize(qeRoom, "a").rank === 3, "Qui est-ce : rang 3 = défaite");
const btSolo = { id: "r1", gameNo: 3, phase: "bt_final", settings: {}, players, bt: { teams: false, scores: { a: 900, b: 1500, c: 100 } }, pstats: { b: { songs: 5, full: 5, half: 0, msSum: 20000, msN: 5, fastest: 2900, bestStreak: 5 } } };
s = P.summarize(btSolo, "b"); ok(s.result === "win" && s.bt.full === 5 && s.bt.bestStreak === 5, "Blind test solo : victoire");
const btTeams = { ...btSolo, bt: { teams: true, scoring: "shared", scores: { t0: 500, t1: 800 } } };
ok(P.summarize(btTeams, "c").result === "win" && P.summarize(btTeams, "a").result === "loss", "Blind test équipes (score partagé)");
const btSum = { ...btSolo, bt: { teams: true, scoring: "sum", scores: { a: 700, b: 300, c: 300 } } };
ok(P.summarize(btSum, "a").result === "win" && P.summarize(btSum, "b").result === "loss", "Blind test équipes (somme)");
ok(P.summarize({ ...btSolo, players: [players[0]], bt: { teams: false, scores: { a: 10 } } }, "a").result === "solo", "joueur seul : ni victoire ni défaite");

// --- enregistrement
let prof = P.emptyProfile();
let r = P.recordGame(prof, P.summarize(tuRoom, "a")); prof = r.profile;
ok(prof.stats.played === 1 && prof.stats.wins === 1 && prof.stats.winStreak === 1, "1re partie comptée");
ok(prof.stats.tu.cards === 7 && prof.stats.tu.bonusGames === 1 && prof.stats.byGame.timesup.best === 12, "stats Time's Up cumulées");
ok(r.gain.xp >= 20 + 30 + 7 && r.gain.ach.includes("first") && prof.ach.first, "XP + succès « Baptême du feu »");
ok(P.recordGame(prof, P.summarize(tuRoom, "a")).gain === null, "même partie : jamais comptée deux fois");
ok(P.recordGame(prof, P.summarize(tuRoom, "a")).profile.stats.played === 1, "…et les stats ne bougent pas");
// série de victoires puis défaite
const win = (n) => ({ ...tuRoom, gameNo: 100 + n });
for (let i = 0; i < 4; i++) prof = P.recordGame(prof, P.summarize(win(i), "a")).profile;
ok(prof.stats.winStreak === 5 && prof.stats.bestWinStreak === 5, "série de 5 victoires");
ok(prof.ach.wins5 && prof.ach.streak3 && prof.ach.streak5, "succès victoires + séries");
ok(P.isUnlocked(prof, P.BD_BY.ember.rule) && P.isUnlocked(prof, P.AV_BY.skull.rule) && P.isUnlocked(prof, P.AV_BY.trophy.rule), "éléments liés aux succès débloqués");
r = P.recordGame(prof, P.summarize({ ...tuRoom, gameNo: 200 }, "b")); prof = r.profile;
ok(prof.stats.winStreak === 0 && prof.stats.bestWinStreak === 5 && prof.stats.losses === 1, "défaite : série remise à zéro, record gardé");
r = P.recordGame(prof, P.summarize({ ...tuRoom, gameNo: 201, tu: { teamScores: { 0: 5, 1: 5 } } }, "a")); prof = r.profile;
ok(prof.stats.draws === 1 && prof.stats.winStreak === 0, "égalité : compte à part");
// blind test
r = P.recordGame(prof, P.summarize(btSolo, "b")); prof = r.profile;
ok(prof.stats.bt.perfect === 1 && prof.ach.btPerfect && prof.ach.btFast, "blind test sans faute + record 2,9 s : succès « Sans faute » et « Éclair »");
ok(prof.stats.bt.fastest === 2900 && prof.stats.bt.bestStreak === 5 && prof.ach.btStreak5, "record de rapidité, meilleure série");
ok(r.gain.items.some((i) => i.id === "gold") && r.gain.items.some((i) => i.id === "electric"), "le gain liste les éléments débloqués");
ok(prof.ach.allgames === undefined, "« Touche-à-tout » pas encore (Qui est-ce jamais joué)");
prof = P.recordGame(prof, P.summarize(qeRoom, "b")).profile;
ok(prof.ach.allgames && P.isUnlocked(prof, P.CO_BY.galaxy.rule), "trois jeux joués : succès + couleur « Galaxie »");
ok(prof.stats.qe.fastest === 1800 && prof.stats.qe.firsts === 2, "stats Qui est-ce cumulées");
// niveaux et déblocages par niveau
ok(P.levelOf(prof.xp) >= 3 && P.isUnlocked(prof, P.AV_BY.flame.rule), "niveau 2+ : « Flamme » débloquée");
ok(!P.isUnlocked(P.emptyProfile(), P.AV_BY.crown.rule), "« Couronne » verrouillée au départ");
// apparence : un élément verrouillé est remplacé
const fresh = P.emptyProfile(); fresh.look = { a: "crown", b: "gold", c: "galaxy" };
ok(JSON.stringify(P.fixLook(fresh)) === JSON.stringify(P.DEFAULT_LOOK), "apparence verrouillée → remise par défaut");
ok(P.ruleText(P.AV_BY.crown.rule) === "Niveau 20" && P.ruleText(P.BD_BY.gold.rule).includes("Légende du salon"), "textes de condition de déblocage");
ok(P.secs(3421) === "3,4 s" && P.secs(null) === "—" && P.pct(1, 3) === 33 && P.pct(0, 0) === null, "formats secondes et pourcentage");
// historique et plafond
let big = P.emptyProfile();
for (let i = 0; i < 60; i++) big = P.recordGame(big, P.summarize({ ...tuRoom, gameNo: 1000 + i }, "a")).profile;
ok(big.history.length === 30 && big.seen.length === 40 && big.stats.played === 60, "historique plafonné à 30, 60 parties comptées");
console.log(fail ? `\n${fail} échec(s)` : "\nTout est bon.");
process.exit(fail ? 1 : 0);
