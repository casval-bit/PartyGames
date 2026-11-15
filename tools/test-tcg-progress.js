// Tests de la collection du Trône des Mondes : deck de départ, boosters, boutique, quêtes, niveaux, vues réseau.
// Lancer : node tools/test-tcg-progress.js
import * as P from "../src/tcg/progress.js";
import { CARD } from "../src/tcg/cards/index.js";
import { starters, validateDeck, deckSize, fillDeck } from "../src/tcg/deck.js";
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
ok(t.foil["legendaires-gryfenfer-7"] === 1 && !t.coll["legendaires-gryfenfer-7"] && t.coll["legendaires-shimy-4"] === 2, "Gryfenfer 7 (brillante et unique, comme toutes les cartes 7 : 1 exemplaire) et Shimy 4 (exclusive) débloqués");
ok(P.normalizeTcg({ coll: { "legendaires-gryfenfer-7": 1 }, foil: { "legendaires-gryfenfer-7": 1 } }).foil["legendaires-gryfenfer-7"] === 2, "anciens exemplaires normaux d'une carte 7 : devenus brillants");
ok(Array.from({ length: 40 }, () => P.rollPack("prestige")).flat().filter((c) => CARD[c.id].cost >= 7).every((c) => c.foil), "boosters : une carte 7 est toujours brillante");
ok(P.recyclable({ coll: {}, foil: { "legendaires-gryfenfer-7": 1 } }).n === 0 && P.recyclable({ coll: {}, foil: { "legendaires-gryfenfer-7": 2 } }).gained === P.RECYCLE.L, "recyclage : une carte 7 se garde en 1 exemplaire (unique dans un deck), la deuxième se recycle au prix normal");
ok(st.every((s) => Object.entries(s.cards).every(([id, k]) => CARD[id].cost < 7 || k === 1)), "decks de départ : chaque carte 7 en un seul exemplaire");
{
  const d7 = { ...t.decks[0], cards: { ...t.decks[0].cards, "legendaires-gryfenfer-7": 2 } };
  ok(validateDeck(d7).errors.some((e) => e.includes("unique")), "deck : une carte 7 en 2 exemplaires est refusée (unique)");
  const raw = JSON.parse(JSON.stringify(t));
  raw.foil["legendaires-gryfenfer-7"] = 2;
  const k = Object.keys(raw.decks[0].cards).find((id) => CARD[id].cost < 7 && raw.decks[0].cards[id] === 2);
  raw.decks[0].cards[k] = 1; raw.decks[0].cards["legendaires-gryfenfer-7"] = 2; // ancien deck : 50 cartes dont la 7 en double
  const fixed = P.normalizeTcg(raw);
  ok(fixed.decks[0].cards["legendaires-gryfenfer-7"] === 1 && deckSize(fixed.decks[0]) === 50 && validateDeck(fixed.decks[0], P.owned(fixed)).ok, "ancien deck avec une carte 7 en double : ramenée à 1, deck complété à 50 et valide");
}
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
ok(foils > 0 && foils < 600, `seules les cartes 7 sortent brillantes des boosters (${(100 * foils / rolls).toFixed(1)} % des cartes)`);
ok(Array.from({ length: 300 }, () => P.rollPack("prestige")).flat().every((c) => c.foil === (CARD[c.id].cost >= 7)), "boosters : brillante si et seulement si c'est une carte 7");
ok(!P.PACKS.some((p) => p.fam) && Array.from({ length: 400 }, () => P.rollPack("multi")).flat().every((c) => CARD[c.id].fam !== "neutre"), "plus de booster par famille ; les cartes neutres (offertes) ne sortent pas des boosters");
ok(P.rollPack("arsenal").every((c) => CARD[c.id].type !== "char") && P.rollPack("heros").every((c) => CARD[c.id].type === "char"), "boosters Arsenal (sans personnage) et Héros (que des personnages)");
const before = Object.values(t.coll).reduce((s, n) => s + n, 0) + Object.values(t.foil).reduce((s, n) => s + n, 0);
const op = P.openPack(t, "multi");
ok(!op.error && op.cards.length === 5 && op.t.packs.multi === 2, "ouvrir un booster consomme le booster");
ok(op.jet >= 1 && op.t.jet === (t.jet || 0) + op.jet, `jetons de brillance en bonus dans le booster (+${op.jet})`);
{
  let r0 = 0; const seq = [0.001, ...Array(40).fill(0.5)]; const fake = () => seq[r0++] ?? 0.5; // premier tirage < 0,5 % : booster doré
  const gold = P.openPack({ ...t, packs: { prestige: 1 } }, "prestige", fake);
  ok(gold.golden && gold.jet >= P.JET_GOLDEN + 3 && gold.cards.every((c) => ["R", "E", "L"].includes(CARD[c.id].r)), `booster doré : rares ou mieux et ${gold.jet} jetons`);
}
t = op.t;
ok(Object.values(t.coll).reduce((s, n) => s + n, 0) + Object.values(t.foil).reduce((s, n) => s + n, 0) === before + 5, "les 5 cartes rejoignent la collection");
ok(P.openPack({ ...t, packs: {} }, "multi").error, "pas de booster : refusé");
ok(P.buyPack({ ...t, ec: 10 }, "multi").error && !P.buyPack({ ...t, ec: 500 }, "multi").error, "acheter un booster : il faut assez d'Éclats");

// boutique
const offers = P.shopOffers(t, "2026-11-09");
ok(offers.length === 6 && JSON.stringify(offers) === JSON.stringify(P.shopOffers(t, "2026-11-09")), "boutique : 6 cartes, les mêmes toute la journée");
ok(JSON.stringify(offers) !== JSON.stringify(P.shopOffers(t, "2026-11-10")), "la boutique change le lendemain");
ok(offers.every((o) => o.price === P.PRICE[CARD[o.id].r] && o.foil === (CARD[o.id].cost >= 7)), "prix selon la rareté ; pas de brillante en vente (sauf les cartes 7)");
ok(["E", "L"].includes(CARD[offers[5].id].r), "la carte vedette est épique ou légendaire");
const rich = { ...t, ec: 100000 };
const b1 = P.buyOffer(rich, 0, "2026-11-09");
ok(!b1.error && b1.t.ec === 100000 - offers[0].price, "achat d'une carte de la boutique");
ok(P.buyOffer(b1.t, 0, "2026-11-09").error, "chaque offre ne s'achète qu'une fois par jour");

// recyclage
const many = { ...t, coll: { ...t.coll, "lyoko-krabe-3": 5 } };
const rc = P.recycle(many);
ok(rc.t.coll["lyoko-krabe-3"] === 2 && rc.gained >= 3 * P.RECYCLE.C, "recyclage des doubles en Éclats");
ok(rc.jet >= 3 * P.JET_RECYCLE.C && rc.t.jet === (many.jet || 0) + rc.jet && P.recyclable(many).jet === rc.jet, `recyclage : jetons de brillance aussi (+${rc.jet})`);

// jetons de brillance : rendre brillante une carte de coût 0 à 6
{
  ok(P.shineCost(CARD["lyoko-kankrelat-1"]) === 1 && P.shineCost(CARD["lyoko-blok-2"]) === 1 && P.shineCost(CARD["lyoko-krabe-3"]) === 2
    && P.shineCost(CARD["lyoko-tarentule-4"]) === 3 && P.shineCost(CARD["lyoko-megatank-5"]) === 4 && P.shineCost(CARD["lyoko-william-dunbar-6"]) === 5
    && P.shineCost(CARD["lyoko-xana-7"]) === 0, "prix en jetons : 1 jusqu'au coût 2, puis 2, 3, 4, 5 pour les coûts 3 à 6");
  const base = P.normalizeTcg({ jet: 4, coll: { "lyoko-krabe-3": 2, "lyoko-megatank-5": 1 }, foil: { "lyoko-xana-7": 1 } });
  const sh = P.shineCard(base, "lyoko-krabe-3");
  ok(!sh.error && sh.t.jet === 2 && sh.t.coll["lyoko-krabe-3"] === 1 && sh.t.foil["lyoko-krabe-3"] === 1, "Krabe 3 rendu brillant pour 2 jetons (un exemplaire normal devient brillant)");
  ok(P.shineCard(sh.t, "lyoko-megatank-5").error && P.shineCard(base, "lyoko-xana-7").error && P.shineCard(base, "lyoko-blok-2").error, "refusé : pas assez de jetons, carte 7, ou carte non possédée");
  const rich2 = P.normalizeTcg({ jet: 0, coll: { "lyoko-krabe-3": 1 }, foil: { "lyoko-krabe-3": 2 } });
  ok(P.recyclable(rich2).gained === P.RECYCLE.C, "une brillante en trop ne vaut pas plus qu'une normale au recyclage");
}

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

// outils du compte testeur
{
  const g = P.testerGift(P.normalizeTcg({ ec: 5 }), { ec: 10000, jet: 50, packs: { multi: 10, prestige: 5, inconnu: 3 } });
  ok(g.ec === 10005 && g.jet === 50 && g.packs.multi === 10 && g.packs.prestige === 5 && !g.packs.inconnu, "testeur : Éclats, jetons et boosters ajoutés (booster inconnu ignoré)");
  const u = P.unlockCards(P.normalizeTcg({ coll: { "lyoko-krabe-3": 1 } }), ["lyoko-krabe-3", "lyoko-xana-7", "inconnue"]);
  ok(u.added === 2 && u.t.coll["lyoko-krabe-3"] === 2 && u.t.foil["lyoko-xana-7"] === 1, "testeur : cartes illustrées débloquées en 2 exemplaires (les 7 : une, brillante)");
}

// cartes renommées, remplacées et retirées : les anciennes sauvegardes suivent
{
  const old = {
    ec: 100, av: "lyoko-franz-hopper-7",
    coll: { "lyoko-aelita-stones-4": 2, "lyoko-spectre-de-xana-2": 1, "lyoko-le-clone-de-william-3": 2, "lyoko-anthea-hopper-3": 1 },
    foil: { "lyoko-franz-hopper-7": 1, "lyoko-spectre-polymorphe-evt": 1, "lyoko-anthea-hopper-3": 1 },
    decks: [{ id: "d1", name: "Lyoko", fam: "lyoko", cards: { "lyoko-aelita-stones-4": 2, "lyoko-spectre-polymorphe-evt": 2, "lyoko-franz-hopper-7": 1, "lyoko-krabe-3": 2 } }],
  };
  const m = P.normalizeTcg(old);
  ok(m.coll["lyoko-aelita-hopper-4"] === 2 && !m.coll["lyoko-aelita-stones-4"], "Aelita Stones 4 devient Aelita Hopper 4 (L'elfe de Lyoko)");
  ok(m.coll["lyoko-ninjas-de-tyron-2"] === 1 && m.foil["lyoko-champ-de-force-evt"] === 1, "Spectre de XANA → Ninjas de Tyron, Spectre polymorphe → Champ de Force (brillante gardée)");
  const d = m.decks[0].cards;
  ok(d["lyoko-aelita-hopper-4"] === 2 && d["lyoko-champ-de-force-evt"] === 2 && !d["lyoko-franz-hopper-7"] && d["lyoko-krabe-3"] === 2, "decks : cartes renommées suivies, cartes retirées enlevées");
  const want = 100 + 2 * P.RECYCLE.U + 1 * P.RECYCLE.U + 1 * P.RECYCLE.L + 3 * P.RECYCLE.U;
  ok(m.ec === want, `cartes retirées remboursées en Éclats (${m.ec} = ${want})`);
  ok(P.normalizeTcg(m).ec === m.ec, "remboursement une seule fois (sauvegarde déjà à jour)");
  ok(m.av === null, "photo d'une carte retirée : abandonnée");
  ok(P.normalizeTcg({ coll: { "lyoko-aelita-hopper-4": 1, "lyoko-aelita-stones-4": 1 } }).coll["lyoko-aelita-hopper-4"] === 2, "ancien et nouvel identifiant : les exemplaires s'additionnent");
  const own7 = P.owned(m), put = Object.keys(d).filter((id) => !["lyoko-aelita-hopper-4", "lyoko-champ-de-force-evt", "lyoko-krabe-3"].includes(id));
  ok(deckSize(m.decks[0]) === 7 && put.length === 1 && (own7[put[0]] || 0) >= d[put[0]] && m.coll["lyoko-ninjas-de-tyron-2"] === 1,
    `deck : la carte retirée est remplacée (autant de cartes qu'avant), par une carte possédée libre (${put[0]}, rien d'offert)`);
  ok(P.normalizeTcg({ coll: { "lyoko-aelita-hopper-4-2": 1 } }).coll["lyoko-aelita-hopper-4"] === 1, "Aelita Hopper 4 « Gardienne » (version de test) devient L'elfe de Lyoko");
}

// decks de 50 cartes abîmés par les cartes retirées (Franz Hopper 7, le Clone de William, Anthea Hopper…) : réparés
{
  const cut = (sid, v) => { // deck de départ déjà réenregistré sans 2 cartes (comme après la mise à jour du 13/11), profil version v
    const t0 = P.chooseStarter(P.normalizeTcg(null), sid).t;
    const deck = t0.decks[0], gone = Object.keys(deck.cards).filter((id) => CARD[id].type === "char" && CARD[id].cost === 3)[0];
    delete deck.cards[gone]; delete t0.coll[gone];
    return { raw: { ...JSON.parse(JSON.stringify(t0)), v }, gone };
  };
  for (const sid of ["lyoko-guerriers", "lyoko-xana"]) {
    const { raw, gone } = cut(sid, 1);
    ok(deckSize(raw.decks[0]) === 48, `${sid} : deck à 48/50 (cas de Brice)`);
    const t1 = P.normalizeTcg(raw);
    ok(deckSize(t1.decks[0]) === 50 && validateDeck(t1.decks[0], P.owned(t1)).ok && P.playableDeck(t1), `${sid} : deck réparé à 50 cartes, jouable avec la collection`);
    ok(Object.entries(t1.decks[0].cards).every(([id, k]) => (P.owned(t1)[id] || 0) >= k) && (t1.coll[gone] || 0) <= 2, `${sid} : les cartes ajoutées sont dans la collection (${CARD[gone].name} rendu)`);
    ok(JSON.stringify(P.normalizeTcg(JSON.parse(JSON.stringify(t1)))) === JSON.stringify(t1), `${sid} : réparation faite une seule fois (résultat stable)`);
  }
  ok(deckSize(P.normalizeTcg(cut("lyoko-xana", 2).raw).decks[0]) === 48, "profil déjà à jour (v2) : un deck incomplet reste un brouillon");
  ok(deckSize(P.normalizeTcg(cut("leg-gryf", 1).raw).decks[0]) === 48, "ancien profil : un deck incomplet d'une autre famille n'est pas touché");
  const old = P.chooseStarter(P.normalizeTcg(null), "lyoko-guerriers").t;
  const raw = JSON.parse(JSON.stringify(old));
  const k = Object.keys(raw.decks[0].cards).find((id) => CARD[id].type === "char" && CARD[id].cost < 7);
  delete raw.decks[0].cards[k]; raw.decks[0].cards["lyoko-franz-hopper-7"] = 1; raw.decks[0].cards["lyoko-anthea-hopper-3"] = 1;
  const t2 = P.normalizeTcg(raw);
  ok(deckSize(t2.decks[0]) === 50 && validateDeck(t2.decks[0], P.owned(t2)).ok, "deck contenant encore Franz Hopper 7 et Anthea Hopper : complété dès l'ouverture");
}

// « Compléter avec mes cartes » (constructeur de deck) : seulement des cartes possédées, règles respectées
{
  const t0 = P.chooseStarter(P.normalizeTcg(null), "lyoko-xana").t;
  const deck = JSON.parse(JSON.stringify(t0.decks[0]));
  const ids = Object.keys(deck.cards).slice(-2);
  for (const id of ids) delete deck.cards[id];
  const own = P.owned(t0);
  for (const id of ids) delete own[id];
  const withNeutrals = fillDeck(deck, { owned: own });
  ok(withNeutrals.missing === 0 && Object.keys(withNeutrals.added).every((id) => CARD[id].fam === "neutre") && !Object.keys(withNeutrals.granted).length, "« Compléter avec mes cartes » : les cartes neutres (offertes) bouchent les trous");
  for (const id of Object.keys(own)) if (CARD[id].fam === "neutre") own[id] = deck.cards[id] || 0; // aucune carte neutre libre
  const r0 = fillDeck(deck, { owned: own });
  ok(deckSize({ cards: r0.cards }) === 46 && r0.missing === 4 && !Object.keys(r0.granted).length, "rien de libre dans la collection : rien d'ajouté, il manque 4 cartes");
  const own2 = { ...own };
  for (const id of ids) own2[id] = 2;
  const r1 = fillDeck(deck, { owned: own2 });
  const filled = { ...deck, cards: r1.cards };
  ok(r1.missing === 0 && deckSize(filled) === 50 && validateDeck(filled, own2).ok, "cartes possédées libres : deck complété à 50, valide");
  ok(Object.values(r1.added).reduce((s, x) => s + x, 0) === 4 && !Object.keys(r1.granted).length, "seules les places libres sont remplies, rien n'est offert");
}

// compte testeur : recharge automatique ; fusion de deux copies à égalité : la plus récente
{
  const low = P.normalizeTcg({ ec: 12, jet: 3 });
  const f = P.testerFloor(low);
  ok(f && f.ec === P.TEST_FLOOR.ec && f.jet === P.TEST_FLOOR.jet, "testeur : Éclats et jetons rechargés");
  ok(P.testerFloor(f) === null && P.testerFloor({ ec: 2e5, jet: 900 }) === null, "testeur : rien à faire quand il y en a assez (pas de boucle)");
  ok(P.mergeTcg({ xp: 5, ec: 10, at: 100 }, { xp: 5, ec: 99999, at: 200 }).ec === 99999 && P.mergeTcg({ xp: 5, ec: 99999, at: 200 }, { xp: 5, ec: 10, at: 100 }).ec === 99999, "fusion à égalité : la copie la plus récente gagne (Éclats offerts pas perdus)");
}

// profil du jeu : photo (carte 7 possédée) et cadres à débloquer
{
  const base = P.chooseStarter(P.normalizeTcg(null), "leg-gryf").t;
  ok(P.avatarOf(base) === "legendaires-gryfenfer-7", "photo par défaut : la carte 7 du deck joué");
  ok(P.avatarChoices(base).every((d) => d.cost >= 7 && d.type === "char"), "photos possibles : seulement des cartes 7 possédées");
  ok(P.setAvatar(base, "lyoko-xana-7").error, "impossible de prendre en photo une carte 7 non possédée");
  ok(P.setAvatar(base, "legendaires-shimy-4").error, "une carte de coût 4 ne peut pas être une photo");
  const withX = P.normalizeTcg({ ...base, foil: { ...base.foil, "lyoko-xana-7": 1 } });
  const sa = P.setAvatar(withX, "lyoko-xana-7");
  ok(!sa.error && P.avatarOf(sa.t) === "lyoko-xana-7", "choisir une autre carte 7 possédée comme photo");
  ok(P.avatarOf(P.normalizeTcg({ ...sa.t, foil: {} , coll: base.coll })) !== "lyoko-xana-7", "photo d'une carte plus possédée : on revient à une carte possédée");
  ok(P.avatarOf(P.normalizeTcg(null)) === null, "aucune carte 7 : pas de photo (blason du jeu)");
  ok(P.frameOf(base) === "bronze" && P.frameUnlocked(base, P.FRAME_BY.bronze), "cadre de bronze offert");
  ok(P.setFrame(base, "or").error, "cadre d'or verrouillé au départ");
  const winner = P.normalizeTcg({ ...base, st: { ...base.st, wins: 25 } });
  ok(P.frameUnlocked(winner, P.FRAME_BY.argent) && P.frameUnlocked(winner, P.FRAME_BY.or), "25 victoires : cadres d'argent et d'or débloqués");
  const sf = P.setFrame(winner, "or");
  ok(!sf.error && P.frameOf(sf.t) === "or", "choisir le cadre d'or");
  ok(P.newFrames(winner).map((f) => f.id).join() === "argent,or" && P.newFrames(P.markFramesSeen(winner)).length === 0, "nouveaux cadres signalés jusqu'à la visite du profil");
  ok(P.frameOf(P.normalizeTcg({ ...base, fr: "or" })) === "bronze", "cadre choisi mais pas débloqué : bronze affiché");
  const rec = P.recordTcgGame(P.ensureQuests(base, "2026-11-13"), { win: true, power: 12, fam: "legendaires", won: { combat: 3, ruse: 2, influence: 1 }, kills: 2, dom: 1, unopp: 0, played: 9 }, "k1", "2026-11-13").t;
  ok(rec.st.chal === 6 && rec.st.kills === 2 && rec.st.dom === 1 && rec.st.played === 9, "compteurs à vie : défis, éliminations, dominations, cartes jouées");
  ok(P.normalizeTcg(JSON.parse(JSON.stringify(sf.t))).fr === "or", "photo et cadre gardés à la sauvegarde");
}

// Portails (invocations) : calendrier, prix, garantie, cible, cadeau
{
  const Po = await import("../src/tcg/portals.js");
  const { PLAYABLE } = await import("../src/tcg/cards/index.js");
  const seeded = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let x = Math.imul(s ^ (s >>> 15), s | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  ok(Po.periodOf("2026-11-15") === 0 && Po.periodOf("2026-11-28") === 0 && Po.periodOf("2026-11-29") === 1 && Po.periodOf("2026-11-14") === -1, "portails : ils changent toutes les deux semaines (dimanche 15 novembre, puis 29 novembre…)");
  const p0 = Po.portalsOf("2026-11-20");
  ok(p0.monde.fam === "jojo" && p0.monde.stars.join() === "jojo-jotaro-kujo-7-2,jojo-dio-brando-7-2,jojo-giorno-giovanna-7-2" && p0.monde.sevens === 15 && p0.leg.id === "tenebres",
    "premiers portails : JoJo (3 vedettes sur ses 15 cartes 7 : Star Platinum, New Body, Golden Wind) et les Seigneurs des ténèbres");
  ok(Object.entries(Po.MONDE_STARS).every(([f, ids]) => ids.length === Math.min(3, Po.starCount(Po.famSevens(f).length)) && ids.every((id) => CARD[id] && CARD[id].fam === f && CARD[id].cost >= 7 && !CARD[id].st)
    && new Set(ids.map((id) => CARD[id].name)).size === ids.length), "vedettes du Monde à l'honneur : 3 au plus (2 pour une famille moyenne, 1 pour une petite), des personnages différents");
  ok(Po.LEGENDS.every((th) => th.stars.length === 3 && th.stars.every((id) => CARD[id] && CARD[id].cost >= 7 && !CARD[id].st) && new Set(th.stars.map((id) => CARD[id].fam)).size === 3
    && th.epics.every((id) => CARD[id] && CARD[id].r === "E" && CARD[id].cost < 7 && !CARD[id].st)), `${Po.LEGENDS.length} thèmes du Portail des Légendes : 3 cartes 7 de 3 univers, 4 épiques`);
  ok(new Set(Po.MONDES).size === PLAYABLE.length - 1 && !Po.MONDES.includes("starac") && PLAYABLE.every((f) => f.id === "starac" || Po.MONDES.includes(f.id)), "Monde à l'honneur : toutes les familles y passent (jamais Star Academy)");
  ok(Array.from({ length: 80 }, (_, k) => Po.portalsAt(k)).every((x) => x.leg.stars.length === 3 && x.monde.stars.length >= 1 && x.monde.stars.length <= 3
    && new Set(x.monde.stars.map((id) => CARD[id].name)).size === x.monde.stars.length), "chaque période a ses deux portails, jamais plus de 3 vedettes (personnages différents)");
  ok(Po.portalsAt(Po.MONDES.length).monde.stars.join() !== p0.monde.stars.join() && Po.portalsAt(Po.MONDES.length).monde.fam === "jojo", "au passage suivant de la famille, d'autres cartes 7 sont en vedette");
  ok(Po.periodDays(0).from === "2026-11-15" && Po.periodDays(0).to === "2026-11-28", "dates d'une période : du 15 au 28 novembre");
  const day = "2026-11-20";
  let pt = P.normalizeTcg({ ec: 2000, tk: 3 });
  ok(P.pullCost(pt, 1).tk === 1 && P.pullCost(pt, 1).ec === 0 && P.pullCost(pt, 10).tk === 3 && P.pullCost(pt, 10).ec === 7 * P.PULL.ec10, "prix : les tickets d'abord, puis 90 Éclats l'invocation par 10 (100 à l'unité)");
  ok(P.pullCost(P.normalizeTcg({}), 1).ec === 100 && P.pullCost(P.normalizeTcg({}), 10).ec === 900, "1 invocation = 100 Éclats, 10 = 900");
  ok(P.pull(P.normalizeTcg({ ec: 50 }), "leg", 1, day).error, "pas assez d'Éclats : refusé");
  const allU = () => 0.999; // jamais de légendaire : seulement la garantie
  let g = P.normalizeTcg({ ec: 100000 });
  const tg = P.portalTarget(g, p0.leg);
  ok(tg === "lotr-sauron-7-2", "cible par défaut : la première vedette pas encore possédée");
  for (let k = 0; k < 4; k++) g = P.pull(g, "leg", 10, day, allU).t;
  ok(g.por.leg.n === 40 && P.pityLeft(g, "leg") === 10 && !g.foil[tg], "40 invocations sans légendaire : la cible est garantie dans 10");
  const last = P.pull(g, "leg", 10, day, allU);
  ok(last.cards.some((c) => c.id === tg && c.target) && last.t.por.leg.n === 0 && last.t.foil[tg] === 1, "garantie : la cible arrive à la 50e invocation (brillante, comme toute carte 7), puis le compteur repart à zéro");
  ok(last.cards[last.cards.length - 1].id === tg, "révélation : la cible en dernier");
  ok(P.pull(P.normalizeTcg({ ec: 1000 }), "leg", 10, day, allU).cards.filter((c) => P.tierOf(CARD[c.id]) === "E").length === 1, "par 10 : une épique au moins");
  ok(P.portalTarget(last.t, p0.leg) === "sw-dark-vador-7", "cible obtenue : la cible par défaut passe à la vedette suivante");
  const aim = P.setPortalTarget(g, "monde", "jojo-dio-brando-7-2", day);
  ok(!aim.error && P.portalTarget(aim.t, p0.monde) === "jojo-dio-brando-7-2" && P.setPortalTarget(g, "monde", "lotr-sauron-7", day).error && P.setPortalTarget(g, "monde", "jojo-jotaro-kujo-7", day).error,
    "viser une vedette du Monde à l'honneur (pas une carte 7 hors vedettes ni d'une autre famille)");
  ok(P.normalizeTcg(JSON.parse(JSON.stringify({ ...aim.t, por: { ...aim.t.por, leg: { n: 999, c: "lyoko-krabe-3" } } }))).por.leg.n === P.PULL.pity - 1
    && P.normalizeTcg({ por: { leg: { c: "lyoko-krabe-3" } } }).por.leg.c === null && P.normalizeTcg(JSON.parse(JSON.stringify(aim.t))).por.monde.c === "jojo-dio-brando-7-2", "sauvegarde des portails : cible et compteur vérifiés");
  // tirages au hasard (graine fixe) : taux, famille, nouveautés
  let s = P.normalizeTcg({ ec: 1e7 });
  const rnd = seeded(42);
  let nL = 0, nE = 0, nT = 0, nPulls = 0, fam = true;
  for (let k = 0; k < 300; k++) {
    const r = P.pull(s, k % 2 ? "leg" : "monde", 10, day, rnd);
    s = r.t;
    for (const c of r.cards) { nPulls++; const tr = P.tierOf(CARD[c.id]); if (tr === "L") nL++; if (tr === "E") nE++; if (c.target) nT++; if (k % 2 === 0 && CARD[c.id].fam !== "jojo") fam = false; }
  }
  ok(fam, "Monde à l'honneur : seulement des cartes de la famille");
  ok(nL / nPulls > 0.025 && nL / nPulls < 0.06 && nE / nPulls > 0.09 && nE / nPulls < 0.16, `taux observés sur ${nPulls} invocations : légendaires ${(100 * nL / nPulls).toFixed(1)} % (avec la garantie), épiques ${(100 * nE / nPulls).toFixed(1)} %`);
  ok(nT >= nPulls / 60, `cibles obtenues : ${nT} (au moins une toutes les 50 invocations)`);
  const nNeutral = Object.keys(CARD).filter((id) => CARD[id].fam === "neutre").length * 2;
  ok(s.st.pulls === 3000 && Object.values(s.coll).reduce((a, b) => a + b, 0) + Object.values(s.foil).reduce((a, b) => a + b, 0) === 3000 + nNeutral, "chaque invocation donne une carte de la collection");
  const one = P.pull(P.normalizeTcg({ ec: 100000 }), "leg", 10, day, seeded(7));
  ok(one.cards.every((c) => c.isNew === (one.cards.findIndex((x) => x.id === c.id) === one.cards.indexOf(c))), "une carte n'est nouvelle qu'une fois dans une invocation par 10");
  const hungerDay = Po.periodDays(Po.MONDES.indexOf("hunger")).from;
  const hg = P.pull(P.normalizeTcg({ ec: 100000 }), "monde", 10, hungerDay, allU);
  ok(!hg.error && hg.cards.every((c) => CARD[c.id].fam === "hunger") && hg.cards.some((c) => CARD[c.id].r === "R"), "famille sans épique (Hunger Games) : l'épique garantie devient une rare");
  const gift = P.claimPortalGift(P.normalizeTcg({}));
  ok(gift.t.tk === P.PULL.gift && P.claimPortalGift(gift.t).error, "cadeau d'ouverture : 10 tickets, une seule fois");
  const viaTk = P.pull(gift.t, "leg", 10, day, seeded(3));
  ok(!viaTk.error && viaTk.t.tk === 0 && viaTk.t.ec === 0 && viaTk.cost.tk === 10, "10 tickets = une invocation par 10, sans Éclats");
}

// boosters : Découverte, ouverture par 5 ; cartes neutres offertes ; anciens boosters de famille remboursés
{
  const big = P.normalizeTcg({ packs: { decouverte: 3 }, coll: Object.fromEntries(Object.keys(CARD).filter((id) => CARD[id].type !== "plot" && !CARD[id].st && CARD[id].cost < 7).slice(0, 1500).map((id) => [id, 1])) });
  const before = P.owned(big);
  const dc = P.openPack(big, "decouverte");
  ok(!dc.error && dc.cards.length === 5 && dc.cards.every((c) => !before[c.id] && c.isNew), "Booster Découverte : 5 cartes que le joueur n'avait pas");
  const old = P.normalizeTcg({ ec: 10, packs: { "fam:jojo": 2, "fam:onepiece": 1, multi: 1 } });
  ok(old.ec === 10 + 3 * P.FAM_PACK_REFUND && old.packs.multi === 1 && !Object.keys(old.packs).some((k) => k.startsWith("fam:")), "anciens boosters de famille pas ouverts : remboursés 160 Éclats chacun");
  ok(P.normalizeTcg(JSON.parse(JSON.stringify(old))).ec === old.ec, "le remboursement ne compte qu'une fois");
  const neutralIds = Object.keys(CARD).filter((id) => CARD[id].fam === "neutre");
  const fresh = P.normalizeTcg(null), own0 = P.owned(fresh);
  ok(neutralIds.length >= 40 && neutralIds.every((id) => own0[id] === 2) && P.normalizeTcg({}).coll["neutre-shrek-5"] === 2, `les ${neutralIds.length} cartes neutres sont offertes à tout le monde (2 exemplaires)`);
  ok(P.normalizeTcg({ foil: { "neutre-shrek-5": 1 } }).coll["neutre-shrek-5"] === 1 && P.normalizeTcg({ coll: { "neutre-shrek-5": 3 } }).coll["neutre-shrek-5"] === 3, "cartes neutres : on garde ses brillantes et ses exemplaires en plus");
  ok(P.shopOffers(fresh, "2026-11-20").every((o) => CARD[o.id].fam !== "neutre"), "la boutique ne vend pas de cartes neutres");
  ok(st.every((s) => Object.keys(s.cards).every((id) => CARD[id].fam !== "neutre" || CARD[id].fill)), "decks de départ : jamais complétés avec les personnages venus d'autres univers (Shrek, Sherlock…)");
  const seven = P.normalizeTcg({ packs: { multi: 7 } });
  const many = P.openPacks(seven, "multi", 5);
  ok(!many.error && many.packs.length === 5 && many.t.packs.multi === 2 && many.packs.every((p) => p.cards.length === 5), "ouvrir 5 boosters d'un coup (il en reste 2)");
  ok(many.jet === many.packs.reduce((a, p) => a + p.jet, 0) && many.t.jet === many.jet && many.t.st.packs === 5, "groupe : jetons et compteur de boosters additionnés");
  const flat = many.packs.flatMap((p) => p.cards);
  ok(flat.every((c, k) => c.isNew === (flat.findIndex((x) => x.id === c.id) === k)), "groupe : une carte n'est nouvelle que la première fois");
  ok(P.openPacks(P.normalizeTcg({ packs: { multi: 2 } }), "multi", 5).packs.length === 2 && P.openPacks(P.normalizeTcg({}), "multi", 5).error, "groupe : jamais plus que les boosters possédés");
}

// quêtes : tickets, boosters, coffre du jour
{
  const q = P.normalizeTcg({ quests: { day: "2026-11-20", rr: 0, list: [{ id: "win1", n: 1 }, { id: "dom4", n: 4 }, { id: "famwin", n: 1, fam: "jojo" }] } });
  ok(!P.questBonusReady(q) && P.claimQuestBonus(q).error, "coffre du jour fermé tant que les 3 quêtes ne sont pas récupérées");
  const a = P.claimQuest(q, 0), b = P.claimQuest(a.t, 1), c = P.claimQuest(b.t, 2);
  ok(a.tk === 1 && a.t.tk === 1 && b.packs.multi === 1 && b.t.packs.multi === 1, "quêtes : un ticket de portail (Gagne une partie), un Booster Multivers (Domination)");
  ok(c.tk === 2 && c.t.tk === 3, "quête de famille : deux tickets de portail");
  ok(P.questBonusReady(c.t), "les 3 quêtes récupérées : coffre du jour prêt");
  const ch = P.claimQuestBonus(c.t);
  ok(!ch.error && ch.t.tk === 4 && ch.t.ec === c.t.ec + P.QUEST_BONUS.ec && P.claimQuestBonus(ch.t).error && P.normalizeTcg(JSON.parse(JSON.stringify(ch.t))).quests.bonus, "coffre du jour : 1 ticket et 100 Éclats, une fois");
  ok(P.QUESTS.every((d) => { const rw = P.questReward(d); return rw.ec + rw.tk * 100 + Object.keys(rw.packs).length * 120 >= 50; }), "chaque quête rapporte quelque chose en plus de l'XP");
}

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
