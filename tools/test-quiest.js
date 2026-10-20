// Qui est-ce ?, côté moteur : modes de tirage (mixte / tout au hasard / choisi par un adversaire).
import { HostEngine } from "../src/net/hostEngine.js";
import { CATEGORIES } from "../src/data/categories.js";
import { CARD_BY_ID } from "../src/data/cards.js";
let bad = 0;
const eq = (n, g, w) => { if (JSON.stringify(g) !== JSON.stringify(w)) { bad++; console.log("ECHEC", n, JSON.stringify(g), "attendu", JSON.stringify(w)); } else console.log("ok   :", n); };
const mk = (n = 2, mode) => {
  const e = new HostEngine({ roomId: "r", name: "T", host: { id: "h", name: "Hôte" }, emit: () => {} });
  const ids = ["h", "b", "c", "d"].slice(0, n);
  ids.slice(1).forEach((id) => e.addPlayer({ id, name: id.toUpperCase() }));
  e.setSettings("h", { game: "quiest", ...(mode ? { qeMode: mode } : {}) });
  return e;
};
const stop = (e) => { e.clearTimers(); };

{
  const e = mk(2);
  eq("mode par défaut = mixte", e.S.settings.qeMode, "mixed");
  e.setSettings("h", { qeMode: "nimporte" }); eq("mode inconnu refusé", e.S.settings.qeMode, "mixed");
  e.setSettings("b", { qeMode: "all" }); eq("seul le créateur règle", e.S.settings.qeMode, "mixed");
  e.setSettings("h", { qeMode: "all" }); eq("mode all", e.S.settings.qeMode, "all");
  e.start("h"); eq("tout au hasard : pas de phase de choix", e.S.phase, "qe_tap"); stop(e);
}
{
  const e = mk(2, "choose");
  eq("2 équipes de 1", [...new Set(e.S.players.map((p) => p.team))].length, 2);
  e.start("h");
  eq("phase de choix", e.S.phase, "qe_pick");
  const pk = e.S.qe.pick;
  eq("2 choix, chacun pour l'autre équipe", [pk.pairs.length, pk.pairs.every((x) => e.player(x.picker).team !== x.team)], [2, true]);
  const [p1, p2] = pk.pairs;
  e.qePick("zzz", "pokemon"); eq("inconnu ignoré", pk.done.length, 0);
  e.qePick(p1.picker, "nimporte"); eq("catégorie inconnue refusée", pk.done.length, 0);
  e.qePick(p1.picker, "pokemon"); eq("1er choix enregistré", [pk.done.length, e.S.phase], [1, "qe_pick"]);
  e.qePick(p1.picker, "film"); eq("pas de 2e choix du même joueur", [pk.done.length, e.qePicks[p1.team].cat], [1, "pokemon"]);
  eq("le choix reste secret dans l'état public", JSON.stringify(e.S.qe.pick).includes("pokemon"), false);
  e.qePick(p2.picker, "film");
  eq("tous ont choisi : on passe à la suite", e.S.phase, "qe_tap");
  await new Promise((r) => setTimeout(r, 60)); // résolution des cartes (sans réseau : premier candidat)
  e.startCount(true); stop(e);
  const c1 = e.qeCards[p1.team], c2 = e.qeCards[p2.team];
  eq("carte de la catégorie choisie", [c1.cats.includes("pokemon"), c2.cats.includes("film")], [true, true]);
  eq("qui a choisi est noté", [e.S.qe.t[p1.team].by, e.S.qe.t[p2.team].by], [p1.picker, p2.picker]);
}
{
  // 4 joueurs / 4 équipes ne sont pas possibles (max 4 équipes de 1 : on force 4 équipes)
  const e = mk(4, "choose"); e.setSettings("h", { teamCount: 4 });
  e.S.players.forEach((p, i) => { p.team = i; });
  const seen = new Set();
  for (let r = 0; r < 12; r++) {
    e.S.qe = { round: 0, total: 99, t: {}, order: [], gain: {}, scores: {} }; e.qePicks = {};
    e.startPick();
    const pairs = e.S.qe.pick.pairs;
    const targets = pairs.map((x) => x.team).sort(), pickers = pairs.map((x) => x.picker);
    eq("4 équipes : chacune est ciblée une fois, personne ne choisit pour soi, un choix par joueur", [targets, new Set(pickers).size, pairs.every((x) => e.player(x.picker).team !== x.team)], [[0, 1, 2, 3], 4, true]);
    seen.add(pairs.map((x) => x.picker + ">" + x.team).join());
    stop(e);
  }
  eq("la répartition change d'une manche à l'autre", seen.size > 1, true);
}
{
  // personne ne choisit : à la fin du temps, catégorie au hasard et la partie continue
  const e = mk(2, "choose"); e.start("h");
  e.endPick();
  eq("temps écoulé : on continue", e.S.phase, "qe_tap");
  eq("catégories au hasard par défaut", Object.values(e.qePicks).map((x) => x.cat), ["random", "random"]);
  stop(e);
}
{
  const e = mk(2, "all"); e.start("h"); stop(e);
  const cats = new Set(); const q = new Set();
  const { drawPack } = await import("../src/data/cards.js");
  for (let i = 0; i < 40; i++) for (const d of drawPack("mixtes", q, 5, { flat: true }).cards) { cats.add(d.cat); }
  eq("tirage à plat : cartes valides, plusieurs catégories", [cats.size > 5, [...q].every((id) => CARD_BY_ID[id])], [true, true]);
  eq("200 cartes distinctes", q.size, 200);
}
console.log(bad ? `${bad} échec(s)` : "TOUT EST OK");
process.exit(bad ? 1 : 0);
