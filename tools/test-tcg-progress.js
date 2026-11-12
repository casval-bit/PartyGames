// Tests de la collection du Trône des Mondes : deck de départ, boosters, boutique, quêtes, niveaux, vues réseau.
// Lancer : node tools/test-tcg-progress.js
import * as P from "../src/tcg/progress.js";
import { CARD } from "../src/tcg/cards/index.js";
import { starters, validateDeck } from "../src/tcg/deck.js";
import { Game } from "../src/tcg/engine.js";
import { publicView, privateView } from "../src/tcg/view.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };
const st = starters();

let t = P.normalizeTcg(null);
ok(t.ec === 0 && !t.starter && t.decks.length === 0, "profil de cartes vide");
const r1 = P.chooseStarter(t, "leg-gryf");
ok(!r1.error && r1.t.starter === "leg-gryf", "choix du deck de départ Gryfenfer");
t = r1.t;
ok(t.coll["legendaires-gryfenfer-7"] === 2 && t.coll["legendaires-shimy-4"] === 2, "Gryfenfer 7 et Shimy 4 (exclusive) débloqués");
ok(validateDeck(t.decks[0], P.owned(t)).ok, "le deck de départ est jouable avec la collection");
ok(P.playableDeck(t) && P.playableDeck(t).id === t.decks[0].id, "il est sélectionné pour jouer");
ok(t.ec === P.START_GIFT.ec && t.packs.multi === 3, "cadeau de départ : 300 Éclats et 3 boosters");
ok(P.chooseStarter(t, "lyoko-xana").error, "impossible de choisir un second deck de départ");

// boosters
let rolls = 0, foils = 0, excl = 0, rare = 0;
for (let i = 0; i < 3000; i++) { const p = P.rollPack("multi"); rolls += p.length; foils += p.filter((c) => c.foil).length; excl += p.filter((c) => CARD[c.id].st).length; rare += p.some((c) => ["R", "E", "L"].includes(CARD[c.id].r)) ? 1 : 0; }
ok(rolls === 15000, "un booster contient 5 cartes");
ok(excl === 0, "les cartes exclusives aux decks de départ ne sortent jamais des boosters");
ok(rare === 3000, "au moins une rare (ou mieux) par booster");
ok(foils > 300 && foils < 1100, `cartes brillantes : ${(100 * foils / rolls).toFixed(1)} % des cartes`);
const fam = P.rollPack("fam:pokemon");
ok(fam.every((c) => CARD[c.id].fam === "pokemon"), "booster de famille : uniquement cette famille");
ok(P.rollPack("arsenal").every((c) => CARD[c.id].type !== "char") && P.rollPack("heros").every((c) => CARD[c.id].type === "char"), "boosters Arsenal (sans personnage) et Héros (que des personnages)");
const before = Object.values(t.coll).reduce((s, n) => s + n, 0);
const op = P.openPack(t, "multi");
ok(!op.error && op.cards.length === 5 && op.t.packs.multi === 2, "ouvrir un booster consomme le booster");
t = op.t;
ok(Object.values(t.coll).reduce((s, n) => s + n, 0) + Object.values(t.foil).reduce((s, n) => s + n, 0) === before + 5, "les 5 cartes rejoignent la collection");
ok(P.openPack({ ...t, packs: {} }, "multi").error, "pas de booster : refusé");
ok(P.buyPack({ ...t, ec: 10 }, "multi").error && !P.buyPack({ ...t, ec: 500 }, "multi").error, "acheter un booster : il faut assez d'Éclats");

// boutique
const offers = P.shopOffers(t, "2026-11-09");
ok(offers.length === 6 && JSON.stringify(offers) === JSON.stringify(P.shopOffers(t, "2026-11-09")), "boutique : 6 cartes, les mêmes toute la journée");
ok(JSON.stringify(offers) !== JSON.stringify(P.shopOffers(t, "2026-11-10")), "la boutique change le lendemain");
ok(offers.every((o) => o.price >= P.PRICE[CARD[o.id].r]), "prix selon la rareté (brillante = ×3)");
ok(["E", "L"].includes(CARD[offers[5].id].r), "la carte vedette est épique ou légendaire");
const rich = { ...t, ec: 100000 };
const b1 = P.buyOffer(rich, 0, "2026-11-09");
ok(!b1.error && b1.t.ec === 100000 - offers[0].price, "achat d'une carte de la boutique");
ok(P.buyOffer(b1.t, 0, "2026-11-09").error, "chaque offre ne s'achète qu'une fois par jour");

// recyclage
const many = { ...t, coll: { ...t.coll, "lyoko-krabe-3": 5 } };
const rc = P.recycle(many);
ok(rc.t.coll["lyoko-krabe-3"] === 2 && rc.gained >= 3 * P.RECYCLE.C, "recyclage des doubles en Éclats");

// quêtes, niveaux, fin de partie
t = P.ensureQuests(t, "2026-11-09");
ok(t.quests.list.length === 3 && t.quests.day === "2026-11-09", "3 quêtes du jour");
const sum = { win: true, power: 15, won: { combat: 6, ruse: 6, influence: 6 }, kills: 5, dom: 4, unopp: 3, played: 12, fam: "legendaires", bots: false };
const g1 = P.recordTcgGame(t, sum, "salon:1", "2026-11-09");
ok(g1.gain && g1.gain.xp > 100 && g1.gain.ec >= 40, `partie gagnée : +${g1.gain.xp} XP, +${g1.gain.ec} Éclats`);
ok(P.recordTcgGame(g1.t, sum, "salon:1", "2026-11-09").gain === null, "une partie n'est comptée qu'une fois");
const lose = P.gameRewards({ win: false, power: 2, won: {}, dom: 0 });
ok(lose.xp >= 40 && lose.ec >= 20, "même en perdant on gagne de l'XP et des Éclats");
const done = g1.t.quests.list.filter((q) => q.n >= P.QUEST_BY[q.id].goal && q.id !== "famwin" && q.id !== "packs2");
ok(done.length >= 1, "les quêtes avancent avec la partie");
const qi = g1.t.quests.list.findIndex((q) => q.n >= P.QUEST_BY[q.id].goal);
if (qi >= 0) { const c = P.claimQuest(g1.t, qi); ok(!c.error && c.t.ec > g1.t.ec, "réclamer une quête terminée"); }
let lv = P.normalizeTcg({ xp: 0 }); const big = P.recordTcgGame(P.ensureQuests(lv), { ...sum }, "x", "2026-11-09");
ok(P.levelOf(5000).lvl > 10, "courbe de niveaux");
let tt = P.normalizeTcg({ xp: P.xpToNext(1) - 10 });
const up = P.recordTcgGame(tt, sum, "y", "2026-11-09");
ok(up.gain.lvlTo > up.gain.lvlFrom && up.t.packs.multi >= 1, "passer un niveau donne un booster");
ok(P.claimableMilestones(up.t).some((m) => m.id === "g1"), "succès « première partie » disponible");
void big;

// normalisation / fusion
const n = P.normalizeTcg({ ec: -5, coll: { "inconnue": 3, "lyoko-krabe-3": 2 }, decks: [{ fam: "zzz" }] });
ok(n.ec === 0 && !n.coll.inconnue && n.coll["lyoko-krabe-3"] === 2 && n.decks.length === 0, "normalisation : valeurs invalides retirées");
ok(P.mergeTcg({ xp: 10 }, { xp: 500 }).xp === 500, "fusion de comptes : on garde la progression la plus avancée");

// vues réseau
const g = new Game({ players: [{ id: "a", name: "A", deck: st[0] }, { id: "b", name: "B", bot: true, deck: st[3] }], seed: 3 });
const pv = publicView(g);
ok(pv.players.length === 2 && pv.players.every((p) => p.hand === 7) && !JSON.stringify(pv).includes('"hand":[{'), "vue publique : on voit le nombre de cartes en main, pas les cartes");
const priv = privateView(g, "a");
ok(priv.hand.length === 7 && priv.prompt && priv.prompt.kind === "mulligan", "vue privée : la main et la question en cours");
ok(JSON.stringify(pv).length < 60000, `taille de l'état public : ${JSON.stringify(pv).length} octets`);
g.answer("a", { keep: true });
const p2 = privateView(g, "a").prompt;
ok(p2 && p2.kind === "setup" && Object.keys(p2.cmap || {}).length >= 0, "mise en place demandée ensuite");

console.log(fail ? `${fail} ÉCHEC(S)` : "Collection du Trône : tout est OK");
process.exit(fail ? 1 : 0);
