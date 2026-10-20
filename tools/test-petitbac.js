// Petit bac, côté moteur (sans réseau) : comparaison des réponses, manches, STOP, contestation, points, fin de partie.
import { HostEngine } from "../src/net/hostEngine.js";
import { PB_LETTERS, PB_CATS, PB_CLASSIC, core, answerKey, startsWith, filled, cleanAnswer } from "../src/data/petitbac.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const mk = (rounds = 3, extra = {}) => {
  const events = [];
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => events.push(m) });
  e.addPlayer({ id: "a", name: "Anna" }); e.addPlayer({ id: "b", name: "Bob" });
  e.setSettings("h", { game: "petitbac", ...extra });
  e.S.settings.pbRounds = rounds; // les tests utilisent 1 ou 2 manches (le réglage de l'interface propose 3, 5 ou 8)
  e.events = events;
  return e;
};
const six = (f) => PB_CLASSIC.map((_, i) => f(i));
/** Démarre, impose la lettre B et passe directement à l'écriture. */
const toPlay = (e, letter = "B") => { e.start("h"); e.S.pb.letter = letter; e.pbPlay(); };

// ---------- données et comparaison
eq("lettres : 19, sans K Q W X Y Z U", [PB_LETTERS.length, PB_LETTERS.some((l) => "KQWXYZU".includes(l))], [19, false]);
eq("catégories : identifiants uniques, 6 classiques", [new Set(PB_CATS.map((c) => c.id)).size === PB_CATS.length, PB_CLASSIC.length], [true, 6]);
eq("articles et accents ignorés", [core("L'éléphant"), core("Le  Chat"), core("une Orange")], ["elephant", "chat", "orange"]);
eq("même réponse malgré accent, article, pluriel", [answerKey("Éléphant") === answerKey("l'elephants"), answerKey("Chat") === answerKey("Chats"), answerKey("Chat") === answerKey("Chien")], [true, true, false]);
eq("lettre demandée (insensible aux accents et articles)", [startsWith("Éléphant", "E"), startsWith("l'éléphant", "E"), startsWith("Chat", "B"), startsWith("", "B"), startsWith("œuf", "O")], [true, true, false, false, true]);
eq("réponse saisie : au moins 2 lettres", [filled("a"), filled("  "), filled("Ba"), filled("1")], [false, false, true, false]);
eq("réponse nettoyée : chevrons retirés, espaces réduits", cleanAnswer("  <b>Bo</b>   bo \n"), "bBo/b bo");

// ---------- réglages et démarrage
{
  const e = mk(3);
  eq("réglages par défaut", [e.S.settings.pbRounds, e.S.settings.pbSeconds, e.S.settings.pbCats], [3, 90, "classic"]);
  e.setSettings("h", { pbRounds: 7, pbSeconds: 45, pbCats: "autre" });
  eq("valeurs hors liste refusées", [e.S.settings.pbRounds, e.S.settings.pbSeconds, e.S.settings.pbCats], [3, 90, "classic"]);
  e.setSettings("a", { pbRounds: 8 });
  eq("seul le créateur règle", e.S.settings.pbRounds, 3);
  e.setSettings("h", { pbRounds: 5, pbSeconds: 120, pbCats: "mix" });
  eq("réglages valides", [e.S.settings.pbRounds, e.S.settings.pbSeconds, e.S.settings.pbCats], [5, 120, "mix"]);
  eq("capacité 16, minimum 2 joueurs", [e.capacity, e.minPlayers], [16, 2]);
  const solo = new HostEngine({ roomId: "s", name: "S", host: { id: "h", name: "H" }, emit: () => {} });
  solo.setSettings("h", { game: "petitbac" }); solo.start("h");
  eq("un seul joueur : pas de partie", solo.S.phase, "lobby");
  e.start("a");
  eq("seul le créateur lance", e.S.phase, "lobby");
  e.start("h");
  eq("démarrage : phase d'intro, lettre valide, 6 catégories différentes", [e.S.phase, PB_LETTERS.includes(e.S.pb.letter), e.S.pb.cats.length, new Set(e.S.pb.cats).size, e.S.pb.cats.every((c) => PB_CATS.some((x) => x.id === c)), e.S.pb.round, e.S.pb.total], ["pb_intro", true, 6, 6, true, 1, 5]);
  const f = mk(3); f.start("h");
  eq("partie classique : les 6 catégories de base", f.S.pb.cats, PB_CLASSIC);
  e.destroy(); f.destroy(); solo.destroy();
}

// ---------- écriture : réponses secrètes, progression, STOP
{
  const e = mk(3);
  toPlay(e);
  eq("phase d'écriture", e.S.phase, "pb_play");
  e.handle({ t: "pbans", from: "a", a: ["Bruno", "Baleine", "Belgique", "Boulanger", "Banane", "Ballon"] });
  eq("les réponses n'apparaissent pas dans l'état diffusé", JSON.stringify(e.publicState()).includes("Baleine"), false);
  eq("progression visible (6/6 pour Anna)", e.S.pb.prog.a, 6);
  e.handle({ t: "pbans", from: "b", a: ["Bob", "Chat", "", "Boucher", "x", "Bateau"] });
  eq("progression : seules les réponses valides comptent (Bob : prénom, métier, objet)", e.S.pb.prog.b, 3);
  e.pbStop("b");
  eq("STOP refusé si tout n'est pas rempli", e.S.pb.stop, null);
  const before = e.deadline;
  e.pbStop("a");
  eq("STOP accepté : annoncé à tous", e.S.pb.stop && e.S.pb.stop.by, "a");
  eq("STOP : les autres n'ont plus que quelques secondes", [e.deadline < before, e.deadline - Date.now() <= 8100], [true, true]);
  const d2 = e.deadline; e.pbStop("h");
  eq("un seul STOP par manche", [e.S.pb.stop.by, e.deadline], ["a", d2]);
  e.handle({ t: "pbans", from: "zzz", a: ["B", "B", "B", "B", "B", "B"] });
  eq("joueur inconnu ignoré", Object.keys(e.pbAns).sort(), ["a", "b"]);
  e.destroy();
}
{
  // une réponse reçue pendant l'intro ou la contestation est ignorée
  const e = mk(3);
  e.start("h"); e.S.pb.letter = "B";
  e.handle({ t: "pbans", from: "a", a: ["Bruno", "", "", "", "", ""] });
  eq("pas de réponse pendant l'intro", e.pbAns.a, undefined);
  e.pbPlay(); e.pbEndPlay();
  e.handle({ t: "pbans", from: "a", a: ["Bruno", "", "", "", "", ""] });
  eq("pas de réponse après la fin du chrono", e.pbAns.a, undefined);
  e.destroy();
}

// ---------- points : unique 10, doublon 5, rien 0 ; contestation à la majorité des autres
{
  const e = mk(3);
  toPlay(e);
  e.handle({ t: "pbans", from: "h", a: ["Bruno", "Baleine", "Belgique", "Boulanger", "Banane", "Ballon"] });
  e.handle({ t: "pbans", from: "a", a: ["bruno", "Blaireau", "Brésil", "Boucher", "Banane", "Cadeau"] });
  e.handle({ t: "pbans", from: "b", a: ["Bob", "Baleine", "", "Boucher", "Bananes", "Bateau"] });
  e.pbEndPlay();
  eq("passage à la contestation", e.S.phase, "pb_vote");
  const st = (c, id) => e.S.pb.rows[c].items.find((i) => i.id === id);
  eq("prénom : Bruno ×2 (accents/casse ignorés) = 5 pts chacun, Bob unique = 10", [st(0, "h").pts, st(0, "a").pts, st(0, "b").pts, st(0, "h").st, st(0, "b").st], [5, 5, 10, "dup", "ok"]);
  eq("animal : Baleine ×2 = 5, Blaireau seul = 10", [st(1, "h").pts, st(1, "b").pts, st(1, "a").pts], [5, 5, 10]);
  eq("pays : vide = 0 (empty), mauvaise lettre impossible ici", [st(2, "b").st, st(2, "b").pts, st(2, "h").pts, st(2, "a").pts], ["empty", 0, 10, 10]);
  eq("objet : mauvaise lettre = 0 (letter)", [st(5, "a").st, st(5, "a").pts], ["letter", 0]);
  eq("fruit : Banane / Bananes = doublon (pluriel ignoré)", [st(4, "a").pts, st(4, "b").pts, st(4, "h").pts], [5, 5, 5]);
  // contestation : 3 joueurs → il faut les 2 autres
  e.handle({ t: "pbrej", from: "a", c: 2, p: "h", v: true });
  eq("une contestation sur deux autres joueurs ne suffit pas", [st(2, "h").st, st(2, "h").pts, e.S.pb.rej["2:h"]], ["ok", 10, ["a"]]);
  e.handle({ t: "pbrej", from: "h", c: 2, p: "h", v: true });
  eq("on ne conteste pas sa propre réponse", e.S.pb.rej["2:h"], ["a"]);
  e.handle({ t: "pbrej", from: "b", c: 2, p: "h", v: true });
  eq("la majorité des autres refuse la réponse", [st(2, "h").st, st(2, "h").pts], ["out", 0]);
  e.handle({ t: "pbrej", from: "b", c: 2, p: "h", v: false });
  eq("retirer sa contestation la rétablit", [st(2, "h").st, st(2, "h").pts], ["ok", 10]);
  e.handle({ t: "pbrej", from: "b", c: 2, p: "b", v: true });
  e.handle({ t: "pbrej", from: "a", c: 5, p: "a", v: true });
  e.handle({ t: "pbrej", from: "b", c: 5, p: "a", v: true });
  eq("rien à contester sur une réponse déjà refusée (mauvaise lettre) ou vide", [e.S.pb.rej["2:b"], e.S.pb.rej["5:a"]], [undefined, undefined]);
  // refus d'un doublon : l'autre devient unique
  e.handle({ t: "pbrej", from: "b", c: 0, p: "a", v: true });
  e.handle({ t: "pbrej", from: "h", c: 0, p: "a", v: true });
  eq("« bruno » d'Anna refusé : celui de l'hôte redevient unique (10)", [st(0, "a").st, st(0, "h").st, st(0, "h").pts], ["out", "ok", 10]);
  e.handle({ t: "pbrej", from: "zzz", c: 0, p: "a", v: true });
  e.handle({ t: "pbrej", from: "a", c: 9, p: "h", v: true });
  e.handle({ t: "pbrej", from: "a", c: 0, p: "zzz", v: true });
  eq("contestations invalides ignorées (inconnu, catégorie hors limites, cible inconnue)", Object.keys(e.S.pb.rej).sort(), ["0:a", "2:h"]);
  e.pbOk("h"); e.pbOk("a");
  eq("on attend tout le monde", e.S.phase, "pb_vote");
  e.pbOk("a");
  eq("toujours en attente (doublon ignoré)", [e.S.phase, e.S.pb.ok], ["pb_vote", ["h", "a"]]);
  e.pbOk("b");
  eq("tous ont validé : résultat de la manche", e.S.phase, "pb_result");
  // h : prénom 10 + animal 5 + pays 10 + métier 5 (Boulanger seul = 10, finalement) ...
  const pts = (id) => e.S.pb.rows.reduce((s, r) => s + r.items.find((i) => i.id === id).pts, 0);
  eq("points de la manche = somme des réponses", [e.S.pb.last.gain.h, e.S.pb.last.gain.a, e.S.pb.last.gain.b], [pts("h"), pts("a"), pts("b")]);
  eq("scores cumulés", [e.S.pb.scores.h, e.S.pb.scores.a, e.S.pb.scores.b], [pts("h"), pts("a"), pts("b")]);
  // métier : Boulanger (h) seul = 10 ; Boucher ×2 (a, b) = 5
  eq("détail : hôte 10+5+10+10+5+10 = 50", pts("h"), 50);
  eq("détail : Anna 0+10+10+5+5+0 = 30", pts("a"), 30);
  eq("détail : Bob 10+5+0+5+5+10 = 35", pts("b"), 35);
  eq("statistiques de profil", [e.S.pstats.h.pbRounds, e.S.pstats.h.pbValid, e.S.pstats.h.pbUnique, e.S.pstats.b.pbUnique], [1, 6, 4, 2]);
  eq("manche 1 sur 3", [e.S.pb.round, e.S.pb.total], [1, 3]);
  e.destroy();
}

// ---------- enchaînement des manches, fin de partie, retour au lobby
{
  const e = mk(2);
  toPlay(e);
  e.handle({ t: "pbans", from: "a", a: ["Bruno", "Baleine", "Belgique", "Boulanger", "Banane", "Ballon"] });
  const letter1 = e.S.pb.letter;
  e.pbEndPlay(); e.pbOk("h"); e.pbOk("a"); e.pbOk("b");
  eq("résultat de la manche 1", e.S.phase, "pb_result");
  e.pbNext("a");
  eq("seul le créateur passe la pause", e.S.phase, "pb_result");
  e.pbNext("h");
  eq("manche 2 : nouvelle lettre, tout est remis à zéro", [e.S.phase, e.S.pb.round, e.S.pb.letter !== letter1, e.S.pb.rows, e.S.pb.prog, e.S.pb.stop, e.pbAns], ["pb_intro", 2, true, null, {}, null, {}]);
  e.S.pb.letter = "C"; e.pbPlay();
  e.handle({ t: "pbans", from: "h", a: ["Camille", "Chat", "Chine", "Coiffeur", "Cerise", "Crayon"] });
  e.handle({ t: "pbans", from: "a", a: ["Camille", "Cheval", "Chine", "Chef", "Citron", "Clé"] });
  e.pbEndPlay(); e.pbOk("h"); e.pbOk("a"); e.pbOk("b");
  eq("résultat de la manche 2", e.S.phase, "pb_result");
  e.pbNext("h");
  eq("fin de partie : classement avec rangs", [e.S.phase, e.S.pb.final.map((r) => r.id), e.S.pb.final.map((r) => r.rank)], ["pb_final", ["a", "h", "b"], [1, 2, 3]]);
  eq("scores finaux = somme des manches (Anna 60 + 50, hôte 0 + 50, Bob 0)", e.S.pb.final.map((r) => r.pts), [110, 50, 0]);
  e.backToLobby("a");
  eq("seul le créateur ramène au lobby", e.S.phase, "pb_final");
  e.backToLobby("h");
  eq("retour au lobby : état vidé", [e.S.phase, e.S.pb], ["lobby", null]);
  e.destroy();
}
{
  // égalité : mêmes points, même rang
  const e = mk(1);
  toPlay(e);
  e.handle({ t: "pbans", from: "h", a: ["Bruno", "", "", "", "", ""] });
  e.handle({ t: "pbans", from: "a", a: ["Bernard", "", "", "", "", ""] });
  e.handle({ t: "pbans", from: "b", a: ["", "", "", "", "", ""] });
  e.pbEndPlay(); e.pbOk("h"); e.pbOk("a"); e.pbOk("b"); e.pbNext("h");
  eq("égalité : rang commun", e.S.pb.final.map((r) => [r.pts, r.rank]), [[10, 1], [10, 1], [0, 3]]);
  e.destroy();
}

// ---------- fin du temps, départs, bots, abandon
{
  const e = mk(3);
  toPlay(e);
  e.handle({ t: "pbans", from: "a", a: ["Bruno", "Baleine", "Belgique", "Boulanger", "Banane", "Ballon"] });
  e.pbEndPlay();
  e.handle({ t: "pbrej", from: "h", c: 0, p: "a", v: true });
  e.handle({ t: "pbrej", from: "b", c: 0, p: "a", v: true });
  eq("avant le départ : réponse d'Anna refusée", e.S.pb.rows[0].items.find((i) => i.id === "a").st, "out");
  e.pbOk("h");
  e.leave("a");
  eq("Anna part : ses réponses et contestations disparaissent", [e.S.players.map((p) => p.id), Object.keys(e.S.pb.rej), e.S.pb.rows[0].items.length], [["h", "b"], [], 2]);
  e.pbOk("b");
  eq("les joueurs restants peuvent terminer (tous ont validé)", e.S.phase, "pb_result");
  e.leave("b");
  eq("plus assez de joueurs : retour au lobby", e.S.phase, "lobby");
  e.destroy();
}
{
  // le départ du dernier qui n'avait pas validé clôt la contestation
  const e = mk(3);
  toPlay(e); e.pbEndPlay(); e.pbOk("h"); e.pbOk("a");
  e.leave("b");
  eq("départ du dernier indécis : on passe aux résultats", e.S.phase, "pb_result");
  e.destroy();
}
{
  const e = mk(2);
  e.addBot();
  toPlay(e);
  await wait(10);
  e.pbEndPlay();
  eq("un bot joue sans bloquer la contestation (il ne valide pas)", [e.S.phase, e.S.players.length], ["pb_vote", 4]);
  e.pbOk("h"); e.pbOk("a"); e.pbOk("b");
  eq("les humains suffisent", e.S.phase, "pb_result");
  e.destroy();
}
{
  // messages réseau : validation de forme
  const e = mk(3);
  toPlay(e);
  const send = async (m) => { e.receive({ from: "a", ...m }); await wait(); };
  await send({ t: "pbans", a: ["Bruno", "Baleine", "", "", "", ""] });
  eq("réponses reçues par le réseau", e.pbAns.a, ["Bruno", "Baleine", "", "", "", ""]);
  await send({ t: "pbans", a: new Array(9).fill("B") });
  await send({ t: "pbans", a: [{ x: 1 }, "B"] });
  await send({ t: "pbans", a: "pas une liste" });
  await send({ t: "pbans", a: ["B".repeat(80)] });
  eq("formes invalides ignorées (trop long, mauvais type)", e.pbAns.a, ["Bruno", "Baleine", "", "", "", ""]);
  await send({ t: "pbrej", c: "0", p: "h", v: true });
  await send({ t: "pbstop" });
  eq("STOP sans avoir tout rempli : refusé", e.S.pb.stop, null);
  e.pbEndPlay();
  await send({ t: "pbrej", c: 0, p: "h", v: "oui" });
  eq("contestation mal formée ignorée", e.S.pb.rej, {});
  e.abort("test");
  eq("abandon : tout est remis à zéro", [e.S.phase, e.S.pb, e.pbAns], ["lobby", null, {}]);
  e.destroy();
}
{
  // fin du chrono sans STOP : le minuteur clôt l'écriture, la contestation et le résultat s'enchaînent
  const e = mk(1);
  e.start("h"); e.pbPlay();
  eq("un minuteur de fin d'écriture est armé", [e.S.phase, typeof e.pbEndT], ["pb_play", "object"]);
  e.destroy();
}

console.log(bad ? `${bad} échec(s)` : "TOUT EST OK");
process.exit(bad ? 1 : 0);
