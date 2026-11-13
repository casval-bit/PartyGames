// Trône des Mondes : collection et progression du joueur (module pur, sauvegardé dans profile.tcg).
//
//   - deck de départ choisi une fois : toutes ses cartes sont débloquées ;
//   - boosters (gagnés en montant de niveau, en quêtes, ou achetés avec des Éclats) ; cartes brillantes (foil) :
//     les cartes de coût 7 sont toujours brillantes ; les autres ne le sont jamais d'office : on les rend brillantes avec des
//     jetons de brillance (gagnés en recyclant les doubles et en bonus dans chaque booster), plus il en faut que la carte coûte cher ;
//   - boutique du jour : 6 cartes au hasard parmi toutes les cartes existantes, chères (pas de brillante en vente, sauf les cartes 7) ;
//   - quêtes du jour (XP + Éclats), succès permanents, XP de fin de partie (jamais 0, même en perdant).
import { ALL, CARD, FAMILY, PLAYABLE, PLOTS, RETIRED, currentId } from "./cards/index.js";
import { starterById, validateDeck } from "./deck.js";
import { RARITY_ORDER } from "./rules.js";

export const CURRENCY = "Éclats";
/** Les cartes de coût 7 sont toujours brillantes (tous leurs exemplaires). */
export const alwaysFoil = (d) => Boolean(d) && d.type !== "plot" && d.cost >= 7;
/** Jetons de brillance pour rendre brillante une carte de coût 0 à 6 (les cartes 7 le sont d'office) : 1 jusqu'au coût 2, puis +1 par coût. */
export const shineCost = (d) => (!d || alwaysFoil(d) ? 0 : Math.max(1, Math.min(5, (d.cost || 0) - 1)));
/** Jetons rapportés par un exemplaire recyclé, selon sa rareté. */
export const JET_RECYCLE = { C: 1, U: 1, R: 2, E: 3, L: 5 };
/** Jetons en bonus dans un booster doré (1 sur 200 : que des rares ou mieux). */
export const JET_GOLDEN = 10;
const clone = (o) => JSON.parse(JSON.stringify(o));
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickW = (r, table) => { let x = r() * table.reduce((s, [, w]) => s + w, 0); for (const [v, w] of table) { x -= w; if (x <= 0) return v; } return table[table.length - 1][0]; };

/* ------------------------------ profil vide ------------------------------ */
export const emptyTcg = () => ({ v: 1, starter: null, ec: 0, xp: 0, jet: 0, coll: {}, foil: {}, decks: [], sel: null, packs: {}, quests: null, shop: null, games: [],
  st: { games: 0, wins: 0, packs: 0, bought: 0, fams: [], chal: 0, kills: 0, dom: 0, played: 0 }, ms: {}, av: null, fr: "bronze", frSeen: ["bronze"], seed: Math.random().toString(36).slice(2, 10) });

/** Remet un profil lu du stockage dans une forme valide (cartes inconnues retirées, nombres vérifiés). */
export function normalizeTcg(raw) {
  const t = emptyTcg();
  if (!raw || typeof raw !== "object") return t;
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  // cartes renommées ou remplacées : l'ancien identifiant devient le nouveau (les exemplaires s'additionnent)
  const moved = (o, cap) => {
    const out = {};
    for (const [id, v] of Object.entries(o && typeof o === "object" ? o : {})) { const k = currentId(id); if (k && CARD[k].type !== "plot" && n(v) > 0) out[k] = Math.min(cap, (out[k] || 0) + n(v)); }
    return out;
  };
  const cards = (o) => moved(o, 99);
  // cartes retirées du jeu : remboursées en Éclats (valeur de recyclage, comme un double)
  let refund = 0;
  for (const [id, x] of Object.entries(RETIRED)) {
    refund += n(raw.coll && raw.coll[id]) * RECYCLE[x.r];
    refund += n(raw.foil && raw.foil[id]) * RECYCLE[x.r] * (x.seven ? 1 : 3);
  }
  t.starter = typeof raw.starter === "string" && starterById(raw.starter) ? raw.starter : null;
  t.ec = Math.min(1e7, n(raw.ec) + refund);
  t.xp = Math.min(1e8, n(raw.xp));
  t.jet = Math.min(1e6, n(raw.jet));
  t.coll = cards(raw.coll);
  t.foil = cards(raw.foil);
  for (const [id, v] of Object.entries(t.coll)) if (alwaysFoil(CARD[id])) { t.foil[id] = Math.min(99, (t.foil[id] || 0) + v); delete t.coll[id]; } // cartes 7 : toujours brillantes
  t.decks = Array.isArray(raw.decks) ? raw.decks.filter((d) => d && typeof d === "object" && FAMILY[d.fam]).slice(0, 40).map((d) => ({
    id: String(d.id || Math.random().toString(36).slice(2, 9)).slice(0, 20), name: String(d.name || "Mon deck").slice(0, 32), fam: d.fam, pt: typeof d.pt === "string" ? d.pt : null,
    cards: moved(d.cards, 2),
    plots: Array.isArray(d.plots) ? d.plots.filter((id) => CARD[id] && CARD[id].type === "plot").slice(0, 7) : [],
  })) : [];
  t.sel = t.decks.some((d) => d.id === raw.sel) ? raw.sel : (t.decks[0] || {}).id || null;
  t.packs = Object.fromEntries(Object.entries(raw.packs || {}).filter(([id, v]) => packDef(id) && n(v) > 0).map(([id, v]) => [id, Math.min(999, n(v))]));
  t.quests = raw.quests && typeof raw.quests === "object" && Array.isArray(raw.quests.list) ? { day: String(raw.quests.day || ""), rr: n(raw.quests.rr), list: raw.quests.list.filter((q) => q && QUEST_BY[q.id]).slice(0, 3).map((q) => ({ id: q.id, n: n(q.n), got: Boolean(q.got), fam: typeof q.fam === "string" && FAMILY[q.fam] ? q.fam : null })) } : null;
  t.shop = raw.shop && typeof raw.shop === "object" ? { day: String(raw.shop.day || ""), bought: Array.isArray(raw.shop.bought) ? raw.shop.bought.filter((i) => Number.isInteger(i) && i >= 0 && i < 6) : [] } : null;
  t.games = Array.isArray(raw.games) ? raw.games.filter((g) => typeof g === "string").slice(-40) : [];
  const st = raw.st || {};
  t.st = { games: n(st.games), wins: n(st.wins), packs: n(st.packs), bought: n(st.bought), fams: Array.isArray(st.fams) ? [...new Set(st.fams.filter((f) => FAMILY[f]))].slice(0, 80) : [],
    chal: n(st.chal), kills: n(st.kills), dom: n(st.dom), played: n(st.played) };
  t.ms = Object.fromEntries(Object.entries(raw.ms || {}).filter(([k]) => MILESTONE_BY[k]).map(([k]) => [k, true]));
  const av = typeof raw.av === "string" ? currentId(raw.av) : null;
  t.av = av && avatarOk(CARD[av]) ? av : null;
  t.fr = typeof raw.fr === "string" && FRAME_BY[raw.fr] ? raw.fr : "bronze";
  t.frSeen = Array.isArray(raw.frSeen) ? [...new Set(["bronze", ...raw.frSeen.filter((f) => FRAME_BY[f])])] : ["bronze"];
  t.seed = typeof raw.seed === "string" && raw.seed ? raw.seed.slice(0, 12) : t.seed;
  return t;
}
/** Deux téléphones, un compte : on garde la progression la plus avancée (XP, puis nombre de cartes). */
export function mergeTcg(a, b) {
  const A = normalizeTcg(a), B = normalizeTcg(b);
  const score = (t) => t.xp * 1000 + Object.values(t.coll).reduce((s, v) => s + v, 0);
  return score(A) >= score(B) ? A : B;
}

/** Outils de test (compte testeur, voir TESTERS dans config.js) : ajoute des Éclats et des boosters. */
export function testerGift(t0, { ec = 0, jet = 0, packs = {} } = {}) {
  const t = clone(normalizeTcg(t0));
  t.ec = Math.min(1e7, t.ec + Math.max(0, Math.floor(ec)));
  t.jet = Math.min(1e6, t.jet + Math.max(0, Math.floor(jet)));
  for (const [k, v] of Object.entries(packs)) if (packDef(k) && v > 0) t.packs[k] = Math.min(999, (t.packs[k] || 0) + Math.floor(v));
  return t;
}

/** Outil de test : chaque carte de la liste est possédée en n exemplaires au moins (les cartes 7, brillantes). Renvoie { t, added }. */
export function unlockCards(t0, ids, n = 2) {
  const t = clone(normalizeTcg(t0));
  let added = 0;
  for (const id of ids) {
    const d = CARD[id];
    if (!d || d.type === "plot") continue;
    const have = (t.coll[id] || 0) + (t.foil[id] || 0);
    if (have < n) { addCard(t, id, false, n - have); added++; }
  }
  return { t, added };
}

/* ------------------------------ niveaux ------------------------------ */
export const xpToNext = (lvl) => 200 + 60 * (lvl - 1);
export function levelOf(xp) { let l = 1, need = xpToNext(1), x = xp; while (x >= need && l < 200) { x -= need; l++; need = xpToNext(l); } return { lvl: l, cur: x, need }; }
/** Récompense d'un passage de niveau : un booster Multivers ; tous les 5 niveaux, un booster Prestige et des Éclats en plus. */
export function levelReward(lvl) {
  const packs = { multi: 1 };
  let ec = 50;
  if (lvl % 5 === 0) { packs.prestige = 1; ec += 200; }
  return { packs, ec };
}

/* ------------------------------ boosters ------------------------------ */
const BASE = [[["C", 85], ["U", 15]], [["C", 85], ["U", 15]], [["C", 85], ["U", 15]], [["U", 70], ["R", 30]], [["R", 70], ["E", 24], ["L", 6]]];
const PRESTIGE = [[["R", 70], ["E", 25], ["L", 5]], [["R", 70], ["E", 25], ["L", 5]], [["R", 70], ["E", 25], ["L", 5]], [["E", 80], ["L", 20]], [["E", 60], ["L", 40]]];
const collectible = (d) => d.type !== "plot" && !d.st;
export const PACKS = [
  { id: "multi", name: "Booster Multivers", price: 120, desc: "5 cartes de toutes les familles. Une rare au moins.", filter: () => true, slots: BASE, jet: 1 },
  { id: "heros", name: "Booster Héros", price: 140, desc: "5 personnages, sans objet ni événement.", filter: (d) => d.type === "char", slots: BASE, jet: 1 },
  { id: "arsenal", name: "Booster Arsenal", price: 140, desc: "5 cartes : lieux, objets et événements seulement.", filter: (d) => d.type !== "char", slots: BASE, jet: 1 },
  { id: "prestige", name: "Booster Prestige", price: 600, desc: "5 cartes rares ou mieux, dont une épique au moins.", filter: () => true, slots: PRESTIGE, jet: 3 },
  ...PLAYABLE.map((f) => ({ id: "fam:" + f.id, fam: f.id, name: `Booster ${f.short || f.name}`, price: 160, desc: `5 cartes de la famille ${f.name}.`, filter: (d) => d.fam === f.id, slots: BASE, jet: 1 })),
];
export function packDef(id) { return PACKS.find((p) => p.id === id) || null; }

/**
 * Tire le contenu d'un booster (5 cartes). `r` : fonction aléatoire. 1 chance sur 200 : booster doré (rares ou mieux, et
 * JET_GOLDEN jetons en bonus : info.golden). Seules les cartes 7 sortent brillantes ; les autres se rendent brillantes avec des jetons.
 */
export function rollPack(packId, r = Math.random, info = {}) {
  const p = packDef(packId);
  if (!p) return [];
  const pool = ALL.filter((d) => collectible(d) && p.filter(d));
  const byR = Object.fromEntries(RARITY_ORDER.map((k) => [k, pool.filter((d) => d.r === k)]));
  const golden = r() < 0.005;
  info.golden = golden;
  const out = [];
  for (const slot of p.slots) {
    let rar = golden ? pickW(r, [["R", 60], ["E", 30], ["L", 10]]) : pickW(r, slot);
    let i = RARITY_ORDER.indexOf(rar);
    while (!byR[RARITY_ORDER[i]].length && i > 0) i--;   // rareté absente de ce booster : on descend
    const list = byR[RARITY_ORDER[i]].filter((d) => !out.some((o) => o.id === d.id));
    const d = (list.length ? list : byR[RARITY_ORDER[i]])[Math.floor(r() * (list.length || byR[RARITY_ORDER[i]].length))];
    if (d) out.push({ id: d.id, foil: alwaysFoil(d) });
  }
  return out.sort((a, b) => RARITY_ORDER.indexOf(CARD[a.id].r) - RARITY_ORDER.indexOf(CARD[b.id].r));
}
const addCard = (t, id, foil, n = 1) => { const k = foil || alwaysFoil(CARD[id]) ? "foil" : "coll"; t[k][id] = (t[k][id] || 0) + n; };
/**
 * Ouvre un booster possédé. Renvoie { t, cards: [{id, foil, isNew}], jet, golden } ou { error }.
 * Jetons de brillance en bonus : ceux du booster (1, ou 3 pour un Prestige), 1 de plus une fois sur 4, 10 de plus si le booster est doré.
 */
export function openPack(t0, packId, r = Math.random) {
  const t = clone(normalizeTcg(t0));
  if (!(t.packs[packId] > 0)) return { error: "Tu n'as pas ce booster." };
  t.packs[packId]--; if (!t.packs[packId]) delete t.packs[packId];
  const info = {};
  const cards = rollPack(packId, r, info).map((c) => ({ ...c, isNew: !t.coll[c.id] && !t.foil[c.id] }));
  for (const c of cards) addCard(t, c.id, c.foil);
  const jet = ((packDef(packId) || {}).jet || 1) + (r() < 0.25 ? 1 : 0) + (info.golden ? JET_GOLDEN : 0);
  t.jet = Math.min(1e6, t.jet + jet);
  t.st.packs++;
  bumpQuest(t, "packs", 1);
  return { t, cards, jet, golden: Boolean(info.golden) };
}
export function buyPack(t0, packId) {
  const p = packDef(packId);
  const t = clone(normalizeTcg(t0));
  if (!p) return { error: "Booster inconnu." };
  if (t.ec < p.price) return { error: `Il te manque ${p.price - t.ec} ${CURRENCY}.` };
  t.ec -= p.price; t.packs[packId] = (t.packs[packId] || 0) + 1;
  return { t };
}

/* ------------------------------ collection ------------------------------ */
/** Nombre d'exemplaires possédés de chaque carte (normales + brillantes). */
export function owned(t) {
  const o = { ...t.coll };
  for (const [id, n] of Object.entries(t.foil || {})) o[id] = (o[id] || 0) + n;
  return o;
}
export const RECYCLE = { C: 5, U: 15, R: 40, E: 100, L: 250 };
/** Exemplaires gardés au recyclage : 2 normales et 1 brillante ; une carte 7 (toujours brillante) se garde en 2 exemplaires,
 *  puisque les decks en acceptent 2. Un exemplaire en trop rapporte des Éclats et des jetons de brillance selon sa rareté
 *  (brillant ou pas : les brillantes se fabriquent avec des jetons, elles ne valent pas plus). */
const keepOf = (id, foil) => (foil ? (alwaysFoil(CARD[id]) ? 2 : 1) : 2);
const worthOf = (id) => RECYCLE[CARD[id].r];
const jetOf = (id) => JET_RECYCLE[CARD[id].r] || 1;
/** Transforme en Éclats et en jetons de brillance les exemplaires en trop. */
export function recycle(t0) {
  const t = clone(normalizeTcg(t0));
  let gained = 0, n = 0, jet = 0;
  for (const k of ["coll", "foil"]) for (const [id, c] of Object.entries(t[k])) {
    const keep = keepOf(id, k === "foil");
    if (c > keep) { gained += (c - keep) * worthOf(id); jet += (c - keep) * jetOf(id); n += c - keep; t[k][id] = keep; }
  }
  t.ec += gained;
  t.jet = Math.min(1e6, t.jet + jet);
  return { t, gained, n, jet };
}
export function recyclable(t) {
  let gained = 0, n = 0, jet = 0;
  for (const k of ["coll", "foil"]) for (const [id, c] of Object.entries(t[k] || {})) {
    const keep = keepOf(id, k === "foil");
    if (c > keep) { gained += (c - keep) * worthOf(id); jet += (c - keep) * jetOf(id); n += c - keep; }
  }
  return { gained, n, jet };
}
/**
 * Rend brillant un exemplaire normal d'une carte de coût 0 à 6, contre shineCost(carte) jetons de brillance.
 * Renvoie { t, cost } ou { error }.
 */
export function shineCard(t0, id) {
  const d = CARD[id];
  const t = clone(normalizeTcg(t0));
  if (!d || d.type === "plot") return { error: "Carte inconnue." };
  if (alwaysFoil(d)) return { error: "Les cartes 7 sont déjà brillantes." };
  if (!(t.coll[id] > 0)) return { error: "Il faut un exemplaire normal de cette carte." };
  const cost = shineCost(d);
  if (t.jet < cost) return { error: `Il te manque ${cost - t.jet} jeton${cost - t.jet > 1 ? "s" : ""} de brillance.` };
  t.jet -= cost;
  t.coll[id]--; if (!t.coll[id]) delete t.coll[id];
  t.foil[id] = (t.foil[id] || 0) + 1;
  return { t, cost };
}

/* ------------------------------ deck de départ ------------------------------ */
export const START_GIFT = { ec: 300, packs: { multi: 3 } };
/** Choix du deck de départ (une seule fois) : débloque toutes ses cartes et l'ajoute aux decks du joueur. */
export function chooseStarter(t0, starterId) {
  const t = clone(normalizeTcg(t0));
  const s = starterById(starterId);
  if (!s) return { error: "Deck inconnu." };
  if (t.starter) return { error: "Le deck de départ est déjà choisi." };
  t.starter = s.id;
  for (const [id, n] of Object.entries(s.cards)) { const k = alwaysFoil(CARD[id]) ? "foil" : "coll"; t[k][id] = Math.max(t[k][id] || 0, n); }
  const deck = { id: "d" + Math.random().toString(36).slice(2, 8), name: s.name, fam: s.fam, pt: s.pt || null, cards: { ...s.cards }, plots: [...s.plots] };
  t.decks.unshift(deck);
  t.sel = deck.id;
  t.ec += START_GIFT.ec;
  for (const [k, v] of Object.entries(START_GIFT.packs)) t.packs[k] = (t.packs[k] || 0) + v;
  return { t, deck };
}

/* ------------------------------ decks ------------------------------ */
export function saveDeck(t0, deck) {
  const t = clone(normalizeTcg(t0));
  const d = { id: deck.id || "d" + Math.random().toString(36).slice(2, 8), name: String(deck.name || "Mon deck").slice(0, 32), fam: deck.fam, pt: deck.pt || null, cards: { ...deck.cards }, plots: [...(deck.plots || [])] };
  const i = t.decks.findIndex((x) => x.id === d.id);
  if (i >= 0) t.decks[i] = d; else t.decks.unshift(d);
  if (!t.sel) t.sel = d.id;
  return normalizeTcg(t);
}
export function deleteDeck(t0, id) { const t = clone(normalizeTcg(t0)); t.decks = t.decks.filter((d) => d.id !== id); if (t.sel === id) t.sel = (t.decks[0] || {}).id || null; return t; }
export function selectDeck(t0, id) { const t = clone(normalizeTcg(t0)); if (t.decks.some((d) => d.id === id)) t.sel = id; return t; }
/** Le deck choisi pour jouer (ou null s'il n'est pas valide / pas complet). */
export function playableDeck(t) {
  const d = (t.decks || []).find((x) => x.id === t.sel);
  if (!d) return null;
  return validateDeck(d, owned(t)).ok ? d : null;
}

/* ------------------------------ boutique du jour ------------------------------ */
export const PRICE = { C: 80, U: 200, R: 500, E: 1200, L: 3000 };
/** Les 6 cartes à vendre aujourd'hui (les mêmes toute la journée pour ce joueur). */
export function shopOffers(t, day = today()) {
  const r = rng(hash(`${t.seed}|${day}|boutique`));
  const pool = ALL.filter(collectible);
  const byR = Object.fromEntries(RARITY_ORDER.map((k) => [k, pool.filter((d) => d.r === k)]));
  const slots = [[["C", 40], ["U", 32], ["R", 18], ["E", 8], ["L", 2]], [["C", 40], ["U", 32], ["R", 18], ["E", 8], ["L", 2]], [["C", 30], ["U", 35], ["R", 25], ["E", 8], ["L", 2]], [["U", 50], ["R", 35], ["E", 12], ["L", 3]], [["R", 60], ["E", 30], ["L", 10]], [["E", 60], ["L", 40]]];
  const out = [];
  slots.forEach((sl, i) => {
    const rar = pickW(r, sl);
    const list = byR[rar].filter((d) => !out.some((o) => o.id === d.id));
    const d = list[Math.floor(r() * list.length)];
    r(); // (ancien tirage d'une brillante « en plus » : gardé pour que les offres du jour restent les mêmes)
    out.push({ i, id: d.id, foil: alwaysFoil(d), price: PRICE[d.r], star: i === 5 });
  });
  return out;
}
export function buyOffer(t0, i, day = today()) {
  const t = clone(normalizeTcg(t0));
  if (!t.shop || t.shop.day !== day) t.shop = { day, bought: [] };
  if (t.shop.bought.includes(i)) return { error: "Déjà acheté aujourd'hui." };
  const o = shopOffers(t, day)[i];
  if (!o) return { error: "Offre inconnue." };
  if (t.ec < o.price) return { error: `Il te manque ${o.price - t.ec} ${CURRENCY}.` };
  t.ec -= o.price; t.shop.bought.push(i); t.st.bought++;
  addCard(t, o.id, o.foil);
  return { t, offer: o };
}
/** Temps restant avant le renouvellement de la boutique et des quêtes (minuit). */
export function msToMidnight(now = new Date()) { const m = new Date(now); m.setHours(24, 0, 0, 0); return m - now; }

/* ------------------------------ quêtes ------------------------------ */
export const QUESTS = [
  { id: "win1", text: "Gagne une partie", goal: 1, key: "win", xp: 80, ec: 100 },
  { id: "play2", text: "Joue 2 parties", goal: 2, key: "games", xp: 60, ec: 60 },
  { id: "combat6", text: "Gagne 6 défis de Combat", goal: 6, key: "combat", xp: 60, ec: 80 },
  { id: "ruse6", text: "Gagne 6 défis de Ruse", goal: 6, key: "ruse", xp: 60, ec: 80 },
  { id: "infl6", text: "Gagne 6 défis d'Influence", goal: 6, key: "influence", xp: 60, ec: 80 },
  { id: "dom4", text: "Remporte 4 fois la Domination", goal: 4, key: "dom", xp: 60, ec: 80 },
  { id: "kills5", text: "Élimine 5 personnages adverses", goal: 5, key: "kills", xp: 60, ec: 80 },
  { id: "unopp3", text: "Gagne 3 défis sans opposition", goal: 3, key: "unopp", xp: 50, ec: 70 },
  { id: "cards12", text: "Joue 12 cartes", goal: 12, key: "played", xp: 50, ec: 60 },
  { id: "packs2", text: "Ouvre 2 boosters", goal: 2, key: "packs", xp: 40, ec: 50 },
  { id: "power10", text: "Termine une partie avec 10 Pouvoir ou plus", goal: 1, key: "power10", xp: 60, ec: 80 },
  { id: "famwin", text: "Gagne une partie avec un deck de la famille indiquée", goal: 1, key: "famwin", xp: 100, ec: 150, fam: true },
];
export const QUEST_BY = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
/** Les 3 quêtes du jour (tirées au hasard, les mêmes toute la journée). */
export function ensureQuests(t0, day = today()) {
  const t = clone(normalizeTcg(t0));
  if (t.quests && t.quests.day === day) return t;
  const r = rng(hash(`${t.seed}|${day}|quetes`));
  const ids = [...QUESTS].sort(() => r() - 0.5).slice(0, 3);
  t.quests = { day, rr: 0, list: ids.map((q) => ({ id: q.id, n: 0, got: false, fam: q.fam ? PLAYABLE[Math.floor(r() * PLAYABLE.length)].id : null })) };
  return t;
}
function bumpQuest(t, key, n, fam = null) {
  if (!t.quests) return;
  for (const q of t.quests.list) {
    const d = QUEST_BY[q.id];
    if (d.key !== key || q.got) continue;
    if (d.fam && q.fam !== fam) continue;
    q.n = Math.min(d.goal, q.n + n);
  }
}
export function claimQuest(t0, idx) {
  const t = clone(normalizeTcg(t0));
  const q = t.quests && t.quests.list[idx];
  if (!q) return { error: "Quête inconnue." };
  const d = QUEST_BY[q.id];
  if (q.got || q.n < d.goal) return { error: "Quête pas encore terminée." };
  q.got = true;
  const before = levelOf(t.xp).lvl;
  t.xp += d.xp; t.ec += d.ec;
  const lv = applyLevelUps(t, before);
  return { t, xp: d.xp, ec: d.ec, ...lv };
}
export function rerollQuest(t0, idx, day = today()) {
  const t = ensureQuests(t0, day);
  if (t.quests.rr >= 1) return { error: "Une seule quête peut être changée par jour." };
  const q = t.quests.list[idx];
  if (!q || q.got) return { error: "Impossible de changer cette quête." };
  const r = rng(hash(`${t.seed}|${day}|relance`));
  const pool = QUESTS.filter((x) => !t.quests.list.some((y) => y.id === x.id));
  const nq = pool[Math.floor(r() * pool.length)];
  t.quests.list[idx] = { id: nq.id, n: 0, got: false, fam: nq.fam ? PLAYABLE[Math.floor(r() * PLAYABLE.length)].id : null };
  t.quests.rr++;
  return { t };
}

/* ------------------------------ succès ------------------------------ */
export const MILESTONES = [
  { id: "g1", text: "Jouer sa première partie", test: (t) => t.st.games >= 1, ec: 100, packs: { multi: 1 } },
  { id: "w1", text: "Gagner sa première partie", test: (t) => t.st.wins >= 1, ec: 150, packs: { multi: 1 } },
  { id: "w10", text: "Gagner 10 parties", test: (t) => t.st.wins >= 10, ec: 300, packs: { prestige: 1 } },
  { id: "w50", text: "Gagner 50 parties", test: (t) => t.st.wins >= 50, ec: 1000, packs: { prestige: 2 } },
  { id: "p10", text: "Ouvrir 10 boosters", test: (t) => t.st.packs >= 10, ec: 200, packs: { heros: 1 } },
  { id: "p50", text: "Ouvrir 50 boosters", test: (t) => t.st.packs >= 50, ec: 500, packs: { prestige: 1 } },
  { id: "c100", text: "Posséder 100 cartes différentes", test: (t) => Object.keys(owned(t)).length >= 100, ec: 200, packs: { arsenal: 1 } },
  { id: "c250", text: "Posséder 250 cartes différentes", test: (t) => Object.keys(owned(t)).length >= 250, ec: 500, packs: { prestige: 1 } },
  { id: "c500", text: "Posséder 500 cartes différentes", test: (t) => Object.keys(owned(t)).length >= 500, ec: 1500, packs: { prestige: 2 } },
  { id: "f1", text: "Obtenir une carte brillante", test: (t) => Object.keys(t.foil).length >= 1, ec: 100, packs: {} },
  { id: "fl", text: "Obtenir une Épique brillante (hors cartes 7)", test: (t) => Object.keys(t.foil).some((id) => CARD[id].r === "E" && !alwaysFoil(CARD[id])), ec: 1000, packs: { prestige: 1 } },
  { id: "fam5", text: "Jouer avec 5 familles différentes", test: (t) => t.st.fams.length >= 5, ec: 300, packs: { multi: 2 } },
  { id: "fam16", text: `Jouer avec les ${PLAYABLE.length} familles`, test: (t) => PLAYABLE.every((f) => t.st.fams.includes(f.id)), ec: 1500, packs: { prestige: 2 } },
];
export const MILESTONE_BY = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));
export function claimableMilestones(t) { return MILESTONES.filter((m) => !t.ms[m.id] && m.test(t)); }
export function claimMilestone(t0, id) {
  const t = clone(normalizeTcg(t0));
  const m = MILESTONE_BY[id];
  if (!m || t.ms[id] || !m.test(t)) return { error: "Succès pas encore atteint." };
  t.ms[id] = true; t.ec += m.ec;
  for (const [k, v] of Object.entries(m.packs)) t.packs[k] = (t.packs[k] || 0) + v;
  return { t, ec: m.ec, packs: m.packs };
}

/* ------------------------------ fin de partie ------------------------------ */
/** XP et Éclats gagnés : jamais zéro, même en perdant. sum = résumé de la partie pour ce joueur. */
export function gameRewards(sum) {
  const wonCh = (sum.won.combat || 0) + (sum.won.ruse || 0) + (sum.won.influence || 0);
  let xp = 40 + (sum.win ? 60 : 0) + 3 * Math.min(15, sum.power || 0) + 2 * Math.min(10, wonCh) + 5 * Math.min(4, sum.dom || 0);
  let ec = (sum.win ? 40 : 20) + 2 * Math.min(10, wonCh);
  if (sum.bots) { xp = Math.round(xp * 0.75); ec = Math.round(ec * 0.75); } // contre des bots seulement : un peu moins
  return { xp, ec };
}
function applyLevelUps(t, before) {
  const after = levelOf(t.xp).lvl;
  const packs = {}; let ec = 0;
  for (let l = before + 1; l <= after; l++) {
    const rw = levelReward(l);
    ec += rw.ec;
    for (const [k, v] of Object.entries(rw.packs)) { packs[k] = (packs[k] || 0) + v; t.packs[k] = (t.packs[k] || 0) + v; }
  }
  t.ec += ec;
  return { lvlFrom: before, lvlTo: after, lvlPacks: packs, lvlEc: ec };
}
/**
 * Enregistre une partie terminée (une seule fois par clé). sum = { win, power, won:{combat,ruse,influence}, kills, dom, unopp, played, fam, bots }.
 * Renvoie { t, gain } ; gain = null si la partie était déjà comptée.
 */
export function recordTcgGame(t0, sum, key, day = today()) {
  let t = ensureQuests(t0, day);
  if (key && t.games.includes(key)) return { t, gain: null };
  t = clone(t);
  if (key) t.games = [...t.games, key].slice(-40);
  const { xp, ec } = gameRewards(sum);
  const before = levelOf(t.xp).lvl;
  t.xp += xp; t.ec += ec;
  t.st.games++; if (sum.win) t.st.wins++;
  if (sum.fam && !t.st.fams.includes(sum.fam)) t.st.fams.push(sum.fam);
  t.st.chal += (sum.won.combat || 0) + (sum.won.ruse || 0) + (sum.won.influence || 0);
  t.st.kills += sum.kills || 0; t.st.dom += sum.dom || 0; t.st.played += sum.played || 0;
  bumpQuest(t, "games", 1);
  if (sum.win) { bumpQuest(t, "win", 1); bumpQuest(t, "famwin", 1, sum.fam); }
  for (const k of ["combat", "ruse", "influence"]) bumpQuest(t, k, sum.won[k] || 0);
  bumpQuest(t, "dom", sum.dom || 0); bumpQuest(t, "kills", sum.kills || 0); bumpQuest(t, "unopp", sum.unopp || 0); bumpQuest(t, "played", sum.played || 0);
  if ((sum.power || 0) >= 10) bumpQuest(t, "power10", 1);
  const lv = applyLevelUps(t, before);
  return { t, gain: { xp, ec, ...lv, win: Boolean(sum.win) } };
}

/** Résumé de fin de partie d'un joueur à partir de l'état public d'une partie terminée. */
export function summaryFromView(ag, meId) {
  if (!ag || !ag.over) return null;
  const me = ag.players.find((p) => p.id === meId);
  if (!me) return null;
  const st = (ag.st || {})[meId] || {};
  return {
    win: ag.winner === meId, power: me.power, fam: me.fam, won: st.won || {}, kills: st.kills || 0, dom: st.dom || 0, unopp: st.unopp || 0, played: st.played || 0,
    bots: ag.players.filter((p) => p.id !== meId).every((p) => p.bot),
  };
}

/* ------------------------------ profil du jeu : photo et cadres ------------------------------ */
/** Photo de profil du Trône des Mondes : une carte de coût 7 (personnage) que le joueur possède. */
export const avatarOk = (d) => Boolean(d) && d.type === "char" && d.cost >= 7;
/** Cartes 7 possédées (photos possibles), de la plus rare à la moins rare puis par nom. */
export function avatarChoices(t) {
  const own = owned(t);
  return ALL.filter((d) => avatarOk(d) && own[d.id]).sort((a, b) => RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r) || a.name.localeCompare(b.name, "fr"));
}
/** Photo affichée : celle choisie si elle est toujours possédée, sinon la carte 7 du deck joué, sinon la première carte 7 possédée. */
export function avatarOf(t) {
  const own = owned(t);
  if (t.av && own[t.av] && avatarOk(CARD[t.av])) return t.av;
  const deck = t.decks.find((d) => d.id === t.sel);
  const inDeck = deck ? Object.keys(deck.cards).filter((id) => own[id] && avatarOk(CARD[id])) : [];
  if (inDeck.length) return inDeck.sort((a, b) => RARITY_ORDER.indexOf(CARD[b].r) - RARITY_ORDER.indexOf(CARD[a].r))[0];
  const all = avatarChoices(t);
  return all.length ? all[0].id : null;
}
export function setAvatar(t0, id) {
  const t = clone(normalizeTcg(t0));
  if (!avatarOk(CARD[id]) || !owned(t)[id]) return { error: "Il faut posséder cette carte 7." };
  t.av = id;
  return { t };
}

/**
 * Cadres de la photo de profil. Chacun se débloque par une mission (sauf le bronze) ; `got(t)` donne l'avancement (0 à goal).
 * Le style de chaque cadre est dans tcg.css (.pfr.f-<id>).
 */
export const FRAMES = [
  { id: "bronze", name: "Bronze", text: "Offert", goal: 1, got: () => 1 },
  { id: "argent", name: "Argent", text: "Gagne 5 parties", goal: 5, got: (t) => t.st.wins },
  { id: "duel", name: "Duelliste", text: "Gagne 60 défis", goal: 60, got: (t) => t.st.chal },
  { id: "voyage", name: "Voyageur des mondes", text: "Joue avec 8 familles différentes", goal: 8, got: (t) => t.st.fams.length },
  { id: "bourreau", name: "Bourreau", text: "Élimine 40 personnages adverses", goal: 40, got: (t) => t.st.kills },
  { id: "emeraude", name: "Collectionneur", text: "Possède 300 cartes différentes", goal: 300, got: (t) => Object.keys(owned(t)).length },
  { id: "or", name: "Or", text: "Gagne 25 parties", goal: 25, got: (t) => t.st.wins },
  { id: "holo", name: "Holographique", text: "Possède 15 cartes brillantes", goal: 15, got: (t) => Object.keys(t.foil).length },
  { id: "dominion", name: "Dominateur", text: "Remporte 30 fois la Domination", goal: 30, got: (t) => t.st.dom },
  { id: "legende", name: "Légende", text: "Atteins le niveau 20", goal: 20, got: (t) => levelOf(t.xp).lvl },
  { id: "trone", name: "Trône", text: "Obtiens tous les succès", goal: MILESTONES.length, got: (t) => Object.keys(t.ms).length },
];
export const FRAME_BY = Object.fromEntries(FRAMES.map((f) => [f.id, f]));
export const frameProgress = (t, f) => Math.min(f.goal, Math.max(0, f.got(t) || 0));
export const frameUnlocked = (t, f) => frameProgress(t, f) >= f.goal;
/** Cadre affiché : celui choisi s'il est débloqué, sinon le bronze. */
export const frameOf = (t) => (FRAME_BY[t.fr] && frameUnlocked(t, FRAME_BY[t.fr]) ? t.fr : "bronze");
export function setFrame(t0, id) {
  const t = clone(normalizeTcg(t0));
  const f = FRAME_BY[id];
  if (!f || !frameUnlocked(t, f)) return { error: "Ce cadre n'est pas encore débloqué." };
  t.fr = id;
  return { t };
}
/** Cadres débloqués que le joueur n'a pas encore vus (pastille « nouveau » sur le profil). */
export const newFrames = (t) => FRAMES.filter((f) => frameUnlocked(t, f) && !t.frSeen.includes(f.id));
export function markFramesSeen(t0) {
  const t = clone(normalizeTcg(t0));
  t.frSeen = [...new Set([...t.frSeen, ...FRAMES.filter((f) => frameUnlocked(t, f)).map((f) => f.id)])];
  return t;
}

export { PLOTS };
