// Célébrité (golf), côté moteur et données : liste des célébrités, vérification des réponses, manches, essais, pénalité, classement.
import { HostEngine } from "../src/net/hostEngine.js";
import { ALL_CARDS } from "../src/data/cards.js";
import { isCeleb, celebCheck, celebForms, celebHint, rankStrokes, golfName, CELEB_MAX_TRIES, CELEB_PENALTY, CELEB_LEVELS } from "../src/data/celeb.js";
import { CC_AFTER_FIRST_SECONDS } from "../src/config.js";
import { summarize, recordGame, emptyProfile, xpFor } from "../src/data/profile.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const by = (name) => ALL_CARDS.find((c) => c.name === name);

// ---------- la liste : uniquement des célébrités et personnages
const pool = ALL_CARDS.filter(isCeleb);
eq("liste assez grande (>= 400)", pool.length >= 400, true);
eq("Harry Potter, Spider-Man, Batman : personnages même s'ils sont aussi une saga", ["Harry Potter", "Spider-Man", "Batman", "Shrek"].map((n) => pool.some((c) => c.name === n)), [true, true, true, true]);
const NOT_PEOPLE = ["album", "film", "serie", "saga", "pays", "marque", "plante", "animal", "tableau", "evenement", "pokemon", "legendaires", "citesdor", "anime", "manga"];
eq("jamais d'album, film, série, pays, marque, plante, animal, tableau, événement (sauf personnages « fictif »)", pool.filter((c) => c.cats.some((k) => NOT_PEOPLE.includes(k)) && !c.cats.includes("fictif")).map((c) => c.name), ["Eiichiro Oda", "Akira Toriyama", "Hayao Miyazaki", "Pikachu", "Dracaufeu"]);
eq("célébrités connues dedans", ["Emmanuel Macron", "Zinédine Zidane", "Harry Potter", "Mario", "Zeus", "Taylor Swift", "Steven Spielberg", "Léonard de Vinci", "Squeezie"].map((n) => pool.some((c) => c.name === n)), Array(9).fill(true));
eq("groupes, titres et inconnus dehors", ["BTS", "Gangnam Style", "Les Simpson", "Titanic", "Star Academy", "Indochine", "Elinor Dashwood", "Pokémon GO", "Loutre", "France", "Marie Le Net"].map((n) => (by(n) ? isCeleb(by(n)) : false)), Array(11).fill(false));
eq("indice de catégorie", [celebHint(by("Zeus")), celebHint(by("Harry Potter")), celebHint(by("Emmanuel Macron")), celebHint({ cats: [] })], ["Mythologie", "Personnage fictif", "Politique", "Célébrité"]);

// ---------- vérification des réponses
const chk = (g, n) => celebCheck(g, n);
eq("nom complet, avec accents et casse", [chk("emmanuel macron", "Emmanuel Macron"), chk("EMMANUEL  MACRON", "Emmanuel Macron"), chk("Kylian Mbappe", "Kylian Mbappé")], ["full", "full", "full"]);
eq("nom de famille seul", [chk("macron", "Emmanuel Macron"), chk("c'est Macron", "Emmanuel Macron"), chk("Potter", "Harry Potter"), chk("vinci", "Léonard de Vinci")], ["full", "full", "full", "full"]);
eq("prénom seul : non", [chk("emmanuel", "Emmanuel Macron"), chk("harry", "Harry Potter")], [null, null]);
eq("un autre Smith / Jackson n'est pas le bon", [chk("jaden smith", "Will Smith"), chk("janet jackson", "Michael Jackson")], [null, null]);
eq("fautes de frappe tolérées, 'presque' au-delà", [chk("macrone", "Emmanuel Macron"), chk("zeuz", "Zeus"), chk("mbape", "Kylian Mbappé")], ["full", "close", "full"]);
eq("noms courts : exacts", [chk("zeus", "Zeus"), chk("zus", "Zeus"), chk("zs", "Zeus"), chk("ra", "Ra")], ["full", "close", null, "full"]);
eq("chiffres romains", [chk("louis 14", "Louis XIV"), chk("louis xiv", "Louis XIV"), chk("napoleon 3", "Napoléon III")], ["full", "full", "full"]);
eq("parenthèses : seul le nom compte", [chk("remy", "Rémy (Ratatouille)"), chk("ratatouille", "Rémy (Ratatouille)"), chk("minecraft", "Steve (Minecraft)"), chk("steve", "Steve (Minecraft)")], ["full", null, null, "full"]);
eq("tirets et espaces", [chk("spiderman", "Spider-Man"), chk("spider man", "Spider-Man"), chk("jean paul belmondo", "Jean-Paul Belmondo")], ["full", "full", "full"]);
eq("articles : « Le Petit Prince »", [chk("petit prince", "Le Petit Prince"), chk("le petit prince", "Le Petit Prince")], ["full", "full"]);
eq("vide ou hors sujet", [chk("", "Zeus"), chk("   ", "Zeus"), chk("banane", "Emmanuel Macron")], [null, null, null]);
eq("formes d'un nom composé", celebForms("Jean-Paul Belmondo").last, ["belmondo"]);

// ---------- classement (le moins de coups gagne, égalités = même rang)
eq("classement croissant avec égalités", rankStrokes([{ id: "a", total: 30 }, { id: "b", total: 12 }, { id: "c", total: 30 }, { id: "d", total: 41 }]).map((r) => [r.id, r.rank]), [["b", 1], ["a", 2], ["c", 2], ["d", 4]]);
eq("noms golf", [golfName(1), golfName(3), golfName(4), golfName(6), golfName(CELEB_PENALTY), golfName(null)], ["Trou en un !", "Birdie", "Par", "Double bogey", "Hors limite", ""]);
eq("niveaux de pixellisation croissants", CELEB_LEVELS.every((n, i) => i === 0 || n > CELEB_LEVELS[i - 1]) && CELEB_MAX_TRIES === CELEB_LEVELS.length && CELEB_PENALTY > CELEB_MAX_TRIES, true);

// ---------- le moteur : on donne une photo à toutes les célébrités (pas de réseau en test)
for (const c of pool) c.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/x/" + encodeURIComponent(c.id) + ".jpg";
const mk = (rounds = 2, n = 2, extra = {}) => {
  const events = [];
  const e = new HostEngine({ roomId: "r", name: "Test", host: { id: "h", name: "Hôte" }, emit: (m) => events.push(m) });
  if (n >= 2) e.addPlayer({ id: "a", name: "Anna" });
  if (n >= 3) e.addPlayer({ id: "b", name: "Bob" });
  e.setSettings("h", { game: "celeb", ...extra });
  e.S.settings.ccRounds = rounds; // le réglage de l'interface propose 5, 10 ou 15
  e.events = events;
  return e;
};
/** Démarre et attend la photo de la 1re manche. */
const play = async (e) => { e.start("h"); for (let i = 0; i < 40 && e.S.phase !== "cc_play"; i++) await wait(10); };
const ans = (e) => e.ccCard.name;

{
  const e = mk(5);
  eq("réglages par défaut", [e.S.settings.ccRounds, e.S.settings.ccHint], [5, true]);
  e.setSettings("h", { ccRounds: 7, ccHint: "non" });
  eq("valeurs hors liste refusées", [e.S.settings.ccRounds, e.S.settings.ccHint], [5, true]);
  e.setSettings("a", { ccRounds: 15 });
  eq("seul le créateur règle", e.S.settings.ccRounds, 5);
  e.setSettings("h", { ccRounds: 15, ccHint: false });
  eq("réglages valides", [e.S.settings.ccRounds, e.S.settings.ccHint], [15, false]);
  eq("capacité 16, solo autorisé", [e.capacity, e.minPlayers], [16, 1]);
  e.start("a");
  eq("seul le créateur lance", e.S.phase, "lobby");
  e.destroy();
}
{
  const e = mk(2, 1);
  await play(e);
  eq("solo : la partie démarre, photo trouvée", [e.S.phase, e.S.cc.round, e.S.cc.total, typeof e.S.cc.url, Boolean(e.S.cc.hint)], ["cc_play", 1, 2, "string", true]);
  eq("la réponse n'est pas dans l'état diffusé", JSON.stringify(e.publicState()).includes(JSON.stringify(ans(e))), false);
  eq("la carte tirée est une célébrité", isCeleb(e.ccCard), true);
  e.handle({ t: "ccguess", from: "h", text: "pas du tout" });
  eq("faux : 1 essai, rien trouvé", [e.S.cc.prog.h.tries, e.S.cc.prog.h.got, e.S.cc.prog.h.res], [1, null, "wrong"]);
  e.handle({ t: "ccguess", from: "h", text: "" });
  eq("« je sèche » compte comme un essai", [e.S.cc.prog.h.tries, e.S.cc.prog.h.res], [2, "pass"]);
  e.handle({ t: "ccguess", from: "h", text: ans(e) });
  eq("trouvé au 3e coup", [e.S.cc.prog.h.got, e.S.cc.prog.h.res], [3, "ok"]);
  e.handle({ t: "ccguess", from: "h", text: "encore" });
  eq("plus d'essai une fois trouvé", e.S.cc.prog.h.tries, 3);
  e.ccEndRound(); // (en vrai, la fin de manche suit 1,2 s après le dernier joueur)
  eq("tout le monde a fini : résultat avec la réponse et le total", [e.S.phase, e.S.cc.end.name, e.S.cc.totals.h, e.S.cc.hist.h], ["cc_result", e.S.cc.past[0].name, 3, [3]]);
  e.ccNext("h");
  for (let i = 0; i < 40 && e.S.phase !== "cc_play"; i++) await wait(10);
  eq("manche suivante : autre célébrité", [e.S.cc.round, e.S.cc.past[0].name !== ans(e)], [2, true]);
  for (let k = 0; k < CELEB_MAX_TRIES + 2; k++) e.handle({ t: "ccguess", from: "h", text: "non" });
  eq("épuisé ses essais : pénalité", [e.S.cc.prog.h.tries, e.S.cc.prog.h.got, e.S.cc.prog.h.res], [CELEB_MAX_TRIES, CELEB_PENALTY, "out"]);
  e.ccEndRound();
  e.ccNext("h");
  eq("fin : classement et total (3 + pénalité)", [e.S.phase, e.S.cc.final, e.S.cc.url], ["cc_final", [{ id: "h", total: 3 + CELEB_PENALTY, rank: 1 }], null]);
  const sum = summarize(JSON.parse(JSON.stringify({ ...e.publicState(), pstats: e.S.pstats })), "h");
  eq("résumé de profil : solo, 1 trouvée sur 2", [sum.game, sum.result, sum.cc.rounds, sum.cc.found, sum.cc.strokes, sum.cc.aces], ["celeb", "solo", 2, 1, 3, 0]);
  const rec = recordGame(emptyProfile(), sum);
  eq("profil : partie comptée, stats Célébrité", [rec.profile.stats.cc.found, rec.profile.stats.byGame.celeb.p, rec.gain.xp > 0], [1, 1, true]);
  e.backToLobby("h");
  eq("retour au lobby", [e.S.phase, e.S.cc], ["lobby", null]);
  e.destroy();
}
{
  const e = mk(1, 3);
  await play(e);
  eq("3 joueurs : chacun sa progression", Object.keys(e.S.cc.prog).sort(), ["a", "b", "h"]);
  e.handle({ t: "ccguess", from: "a", text: ans(e) });
  eq("Anna trouve du premier coup", e.S.cc.prog.a.got, 1);
  const left = e.deadline - Date.now();
  eq("quelqu'un a fini : le temps restant des autres est raccourci", left <= CC_AFTER_FIRST_SECONDS * 1000 + 50, true);
  e.handle({ t: "ccguess", from: "b", text: "Presque" });
  e.handle({ t: "ccguess", from: "b", text: ans(e).toUpperCase() });
  eq("Bob trouve au 2e coup (casse ignorée)", e.S.cc.prog.b.got, 2);
  eq("l'hôte n'a pas fini : on attend", e.S.phase, "cc_play");
  e.leave("h".repeat(0) + "b");
  eq("un joueur qui part disparaît de la manche", e.S.cc.prog.b, undefined);
  e.ccEndRound();
  eq("fin de temps : l'hôte qui n'a rien fait prend la pénalité", [e.S.cc.prog.h.got, e.S.cc.prog.h.res, e.S.cc.totals.h], [CELEB_PENALTY, "time", CELEB_PENALTY]);
  e.ccNext("h");
  eq("une seule manche : classement final, Anna devant", [e.S.phase, e.S.cc.final.map((r) => [r.id, r.total, r.rank])], ["cc_final", [["a", 1, 1], ["h", CELEB_PENALTY, 2]]]);
  const sum = summarize(JSON.parse(JSON.stringify({ ...e.publicState(), pstats: e.S.pstats })), "h");
  eq("résumé : l'hôte est 2e sur 2 (défaite)", [sum.result, sum.rank, sum.of], ["loss", 2, 2]);
  const sa = summarize(JSON.parse(JSON.stringify({ ...e.publicState(), pstats: e.S.pstats })), "a");
  eq("résumé : Anna gagne, un trou en un", [sa.result, sa.cc.aces, xpFor(sa) > xpFor(sum)], ["win", 1, true]);
  e.destroy();
}
{
  const e = mk(3, 2, { ccHint: false });
  e.addBot();
  await play(e);
  eq("sans indice : pas de catégorie affichée", e.S.cc.hint, null);
  e.ccEndRound();
  const used = new Set([e.S.cc.past[0].name]);
  for (let r = 2; r <= 3; r++) {
    e.ccNext("h");
    for (let i = 0; i < 40 && e.S.phase !== "cc_play"; i++) await wait(10);
    e.ccEndRound();
    used.add(e.S.cc.past[r - 1].name);
  }
  eq("3 manches : 3 célébrités différentes", used.size, 3);
  e.ccNext("h");
  eq("fin de partie : tout le monde classé", [e.S.phase, e.S.cc.final.length, e.S.cc.final.every((r) => r.total === 3 * CELEB_PENALTY || r.total < 3 * CELEB_PENALTY)], ["cc_final", 3, true]);
  e.destroy();
}
{
  // un bot est programmé pour jouer (ses essais arrivent plus tard, en vrai)
  const e = mk(2, 1);
  e.addBot();
  await play(e);
  eq("bot : joueur présent dans la manche, essais programmés", [Object.keys(e.S.cc.prog).length, e.timers.size >= 2], [2, true]);
  e.ccGuess("bot-nul", "x");
  const botId = e.S.players.find((p) => p.bot).id;
  for (let k = 0; k < 3; k++) e.ccGuess(botId, "zzz");
  e.ccGuess(botId, ans(e));
  eq("les essais du bot sont jugés comme ceux des autres", [e.S.cc.prog[botId].got, e.S.cc.prog[botId].res], [4, "ok"]);
  e.destroy();
}
{
  // Wikipédia injoignable et aucune photo en réserve : on réessaie puis on abandonne proprement
  const saved = pool.map((c) => c.image), realFetch = globalThis.fetch;
  for (const c of pool) c.image = "";
  globalThis.fetch = () => Promise.reject(new Error("hors ligne"));
  const e = mk(1, 1);
  const aborted = [];
  e.emit = (m) => { if (m.t === "aborted") aborted.push(m.reason); };
  e.start("h");
  eq("pas de photo : on cherche d'abord", e.S.phase, "cc_load");
  for (let i = 0; i < 100 && !aborted.length; i++) await wait(10);
  eq("3 échecs : partie annulée, retour au lobby", [aborted.length, e.S.phase, e.S.cc], [1, "lobby", null]);
  globalThis.fetch = realFetch;
  pool.forEach((c, i) => { c.image = saved[i]; });
  e.destroy();
}
console.log(bad ? `\n${bad} ECHEC(S)` : "\ntout est ok");
process.exit(bad ? 1 : 0);
