// Mini-jeux (« Party »), côté moteur (sans réseau) : manches, classement, points, tests d'amitié, triche.
import { HostEngine } from "../src/net/hostEngine.js";
import { MINIGAMES, MG_BY, rankPoints, randomTeams, modeOf, modeLabel, teamAvg } from "../src/minigames/meta.js";
import { FRIEND_QS } from "../src/data/friendQs.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const mk = (rounds = 5, bots = 0) => {
  const events = [];
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => events.push(m) });
  e.addPlayer({ id: "a", name: "Anna" }); e.addPlayer({ id: "b", name: "Bob" });
  for (let i = 0; i < bots; i++) e.addBot();
  e.setSettings("h", { game: "party", mgRounds: rounds });
  e.events = events;
  e.mgTeams = () => null; // par défaut : chacun pour soi (les équipes ont leurs propres tests plus bas)
  return e;
};
const toPlay = async (e) => { e.mgPlay(); await wait(); };

// ---------- données
eq("22 mini-jeux, identifiants uniques", [MINIGAMES.length >= 20, new Set(MINIGAMES.map((g) => g.id)).size === MINIGAMES.length], [true, true]);
eq("chaque mini-jeu a une règle, une durée et un score max", MINIGAMES.every((g) => g.rule && g.seconds > 0 && g.max > 0 && typeof g.fmt(5) === "string"), true);
eq("questions d'amitié : 2 à 4 choix, pas de doublons", FRIEND_QS.every(([t, o]) => t && o.length >= 2 && o.length <= 4 && new Set(o).size === o.length), true);
eq("points selon le rang (4 joueurs)", [1, 2, 3, 4].map((r) => rankPoints(r, 4)), [10, 8, 5, 3]);
eq("solo : 10 points", rankPoints(1, 1), 10);

// ---------- modes d'équipe (fonctions pures)
{
  const ids = ["a", "b", "c", "d", "e"], seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  eq("moins de 3 joueurs : jamais d'équipes", [randomTeams(["a"]), randomTeams(["a", "b"], () => 0.9)], [null, null]);
  eq("3 joueurs : chacun pour soi ou 1 contre 2", [randomTeams(["a", "b", "c"], () => 0.1), modeOf(randomTeams(["a", "b", "c"], () => 0.9), ["a", "b", "c"])], [null, "1v2"]);
  eq("4 joueurs : 2 contre 2 ou 1 contre 3", [modeOf(randomTeams(ids.slice(0, 4), seq(0.5, 0.3, 0.3, 0.3, 0.3, 0.3)), ids.slice(0, 4)), modeOf(randomTeams(ids.slice(0, 4), seq(0.9, 0.3, 0.3, 0.3, 0.3, 0.3)), ids.slice(0, 4))], ["2v2", "1v3"]);
  eq("5 joueurs : équilibré 2 contre 3", modeOf(randomTeams(ids, seq(0.6, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3)), ids), "2v3");
  eq("tout le monde du même camp = chacun pour soi", [modeOf({ a: 1, b: 1 }, ["a", "b"]), modeOf(null, ["a"])], ["ffa", "ffa"]);
  eq("à deux joueurs, camps différents = un duel (chacun pour soi)", modeOf({ a: 0, b: 1 }, ["a", "b"]), "ffa");
  eq("libellés", [modeLabel("ffa"), modeLabel("2v2"), modeLabel("1v3")], ["Chacun pour soi", "2 contre 2", "1 contre 3"]);
  eq("moyenne d'équipe, 0 pour qui n'a pas fini", [teamAvg(["a", "b"], { a: 10 }), teamAvg([], {})], [5, 0]);
}

// ---------- réglages et démarrage
let e = mk(5);
eq("jeu accepté", e.S.settings.game, "party");
eq("manches acceptées", e.S.settings.mgRounds, 5);
e.setSettings("h", { mgRounds: 7 }); eq("nombre de manches invalide : ignoré", e.S.settings.mgRounds, 5);
eq("capacité sans équipes (16)", e.capacity, 16);
eq("un seul joueur suffit", e.minPlayers, 1);
e.start("h");
eq("la manche 1 est un mini-jeu (présentation)", [e.S.phase, e.S.mg.kind, e.S.mg.round, e.S.mg.total], ["mg_intro", "mini", 1, 5]);
eq("plan : un test d'amitié toutes les 3 manches", e.mgPlan.map((p) => p.kind), ["mini", "mini", "friend", "mini", "mini"]);
eq("un mini-jeu n'est pas répété dans la série", new Set(e.mgPlan.filter((p) => p.kind === "mini").map((p) => p.game)).size, 4);
const g1 = e.S.mg.game;
eq("le mini-jeu existe", Boolean(MG_BY[g1]), true);

// ---------- jouer : scores, triche, classement
await toPlay(e);
eq("phase de jeu", e.S.phase, "mg_play");
const step = e.S.mg.step;
const max = MG_BY[g1].max;
e.mgSubmit("a", step + 1, 5); eq("mauvaise manche : ignoré", e.S.mg.done, []);
e.mgSubmit("zzz", step, 5); eq("joueur inconnu : ignoré", e.S.mg.done, []);
e.mgSubmit("a", step, 10 ** 9); eq("score truqué : plafonné au max du jeu", e.mgSub.a, max);
e.mgSubmit("a", step, 1); eq("un seul score par joueur", e.mgSub.a, max);
e.mgSubmit("b", step, Math.floor(max / 2));
eq("en attente du dernier", [e.S.phase, e.S.mg.done], ["mg_play", ["a", "b"]]);
e.mgSubmit("h", step, 0);
eq("tout le monde a joué : classement", e.S.phase, "mg_result");
const L = e.S.mg.last;
eq("classement trié", L.rows.map((r) => r.id), ["a", "b", "h"]);
eq("rangs et points", L.rows.map((r) => [r.rank, r.pts]), [[1, 10], [2, 7], [3, 3]]);
eq("totaux", [e.S.mg.scores.a, e.S.mg.scores.b, e.S.mg.scores.h], [10, 7, 3]);
eq("victoire comptée", [e.S.mg.wins.a, e.ps("a").mgWins, e.ps("a").mgRounds], [1, 1, 1]);
e.mgSkip("a"); eq("seul le créateur passe la pause", e.S.phase, "mg_result");
e.mgSkip("h"); eq("pause passée : manche suivante", [e.S.phase, e.S.mg.round], ["mg_intro", 2]);

// ---------- égalité et abandon
await toPlay(e);
const s2 = e.S.mg.step;
e.mgSubmit("a", s2, 20); e.mgSubmit("b", s2, 20);
e.mgPlayEnd();
const R = e.S.mg.last.rows;
eq("égalité : même rang, mêmes points; non-joueur dernier à 0", [R[0].rank, R[1].rank, R[0].pts === R[1].pts, R[2].dnf, R[2].pts], [1, 1, true, true, 0]);

// ---------- test d'amitié
e.mgSkip("h"); await wait();
eq("manche 3 = test d'amitié", [e.S.phase, e.S.mg.kind, e.S.mg.fq.n], ["mg_ask", "friend", 3]);
const q = e.S.mg.q, sub = q.subject, step3 = e.S.mg.step;
eq("la réponse n'est pas dans l'état diffusé", [JSON.stringify(e.publicState()).includes('"reveal":{'), q.reveal], [false, null]);
const others = e.S.players.filter((p) => p.id !== sub);
e.mgAnswer(others[0].id, step3, 9); eq("choix hors limites : ignoré", e.S.mg.done, []);
e.mgAnswer(sub, step3, 1);
eq("le joueur visé a répondu : sa réponse reste secrète", [e.S.mg.done, JSON.stringify(e.publicState().mg.q)], [[sub], JSON.stringify(q)]);
e.mgAnswer(others[0].id, step3, 1);  // juste
e.mgAnswer(others[1].id, step3, 0);  // faux
eq("tout le monde a répondu : révélation", e.S.phase, "mg_qreveal");
const rv = e.S.mg.q.reveal;
eq("bonne réponse = celle du joueur visé", [rv.answer, rv.right, rv.gain[others[0].id], rv.gain[sub]], [1, [others[0].id], 3, 1]);
eq("stats d'amitié", [e.ps(others[0].id).fqRight, e.ps(others[1].id).fqRight || 0, e.ps(others[1].id).fqTotal], [1, 0, 1]);
e.mgSkip("h"); await wait();
eq("question suivante, un autre joueur visé", [e.S.phase, e.S.mg.fq.i, e.S.mg.q.subject !== sub], ["mg_ask", 2, true]);
// sujet absent : question annulée
e.mgAskEnd();
eq("sans réponse du joueur visé : annulée, pas de points", [e.S.mg.q.reveal.voided, Object.keys(e.S.mg.q.reveal.gain).length], [true, 0]);
e.mgSkip("h"); await wait();
const sub3 = e.S.mg.q.subject;
e.leave(sub3 === "h" ? "b" : sub3);
eq("le joueur visé part : la question se termine", e.S.phase === "mg_qreveal" || e.S.phase === "mg_ask" || e.S.phase === "mg_intro", true);

// ---------- partie complète avec bots + fin
e = mk(5, 2);
e.start("h"); await wait();
for (let i = 0; i < 40 && e.S.phase !== "mg_final"; i++) {
  if (e.S.phase === "mg_intro") await toPlay(e);
  if (e.S.phase === "mg_play") { for (const p of e.S.players) e.mgSubmit(p.id, e.S.mg.step, Math.random() * 50); await wait(); }
  if (e.S.phase === "mg_ask") { for (const p of e.S.players) e.mgAnswer(p.id, e.S.mg.step, 0); await wait(); }
  if (e.S.phase === "mg_result" || e.S.phase === "mg_qreveal") { e.mgSkip("h"); await wait(); }
}
eq("fin de partie", e.S.phase, "mg_final");
const F = e.S.mg.final;
eq("classement final complet et trié", [F.length, F.every((r, i) => i === 0 || F[i - 1].pts >= r.pts), F[0].rank], [e.S.players.length, true, 1]);
e.backToLobby("h");
eq("retour au lobby", [e.S.phase, e.S.mg], ["lobby", null]);

// ---------- abandon d'un joueur pendant un mini-jeu : la manche ne reste pas bloquée
e = mk(5);
e.start("h"); await toPlay(e);
const st = e.S.mg.step;
e.mgSubmit("a", st, 5); e.mgSubmit("h", st, 5);
e.leave("b");
eq("le dernier joueur part : la manche se termine", e.S.phase, "mg_result");
e.abort("test");
eq("abandon : tout est remis à zéro", [e.S.phase, e.S.mg], ["lobby", null]);
e.destroy();

// ---------- partie à un seul joueur
e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: () => {} });
e.setSettings("h", { game: "party", mgRounds: 5 }); e.start("h");
eq("solo : démarre et aucun test d'amitié", [e.S.phase, e.mgPlan.map((p) => p.kind)], ["mg_intro", ["mini", "mini", "mini", "mini", "mini"]]);
e.destroy();

// ---------- manche en équipes : 2 contre 2 (hors plateau)
{
  const e = mk(5, 1);
  const bot = e.S.players[3].id;
  e.mgTeams = () => ({ h: 0, a: 0, b: 1, [bot]: 1 });
  e.start("h");
  eq("manche en équipes annoncée", [e.S.mg.mode, e.S.mg.teams && e.S.mg.teams.h, e.S.mg.teams && e.S.mg.teams[bot]], ["2v2", 0, 1]);
  await toPlay(e);
  const st = e.S.mg.step, max = MG_BY[e.S.mg.game].max;
  e.mgSubmit("h", st, max); e.mgSubmit("a", st, 0); e.mgSubmit("b", st, Math.floor(max / 4)); e.mgSubmit(bot, st, Math.floor(max / 4));
  const L = e.S.mg.last;
  eq("équipe bleue (moyenne max/2) bat la rouge (max/4)", [L.mode, L.teams.map((t) => t.result)], ["2v2", ["win", "lose"]]);
  eq("gagnants : 10 points chacun, perdants : 0", [e.S.mg.scores.h, e.S.mg.scores.a, e.S.mg.scores.b, e.S.mg.scores[bot]], [10, 10, 0, 0]);
  eq("victoire d'équipe comptée pour chaque membre", [e.S.mg.wins.h, e.S.mg.wins.a, e.S.mg.wins.b, e.ps("a").mgWins], [1, 1, undefined, 1]);
  // un joueur d'une équipe part : l'autre équipe reste, la manche suivante est recalculée
  e.mgSkip("h");
  eq("manche suivante : nouvelle répartition demandée", e.S.phase, "mg_intro");
  e.mgTeams = () => null; e.clearTimers();
}
{ // équipes déséquilibrées par les départs : un camp vide = chacun pour soi
  const e = mk(5, 1); const bot = e.S.players[3].id;
  e.mgTeams = () => ({ h: 0, a: 0, b: 1, [bot]: 1 });
  e.start("h"); await toPlay(e);
  e.leave("b"); e.leave(bot);
  const st = e.S.mg.step;
  e.mgSubmit("h", st, 5); e.mgSubmit("a", st, 9);
  eq("les deux joueurs restants sont du même camp : chacun pour soi", [e.S.mg.last.mode, e.S.mg.last.rows.map((r) => r.id)], ["ffa", ["a", "h"]]);
}
console.log(bad ? `\n${bad} ÉCHEC(S)` : "\nTOUT BON");
process.exit(bad ? 1 : 0);
