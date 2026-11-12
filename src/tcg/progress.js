// Trône des Mondes : collection et progression du joueur (module pur, sauvegardé dans profile.tcg).
//
//   - deck de départ choisi une fois : toutes ses cartes sont débloquées ;
//   - boosters (gagnés en montant de niveau, en quêtes, ou achetés avec des Éclats), cartes brillantes (foil) ;
//   - boutique du jour : 6 cartes au hasard parmi toutes les cartes existantes, chères (surtout les brillantes) ;
//   - quêtes du jour (XP + Éclats), succès permanents, XP de fin de partie (jamais 0, même en perdant).
import { ALL, CARD, FAMILY, PLAYABLE, PLOTS } from "./cards/index.js";
import { starterById, validateDeck } from "./deck.js";
import { RARITY_ORDER } from "./rules.js";

export const CURRENCY = "Éclats";
const clone = (o) => JSON.parse(JSON.stringify(o));
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickW = (r, table) => { let x = r() * table.reduce((s, [, w]) => s + w, 0); for (const [v, w] of table) { x -= w; if (x <= 0) return v; } return table[table.length - 1][0]; };

/* ------------------------------ profil vide ------------------------------ */
export const emptyTcg = () => ({ v: 1, starter: null, ec: 0, xp: 0, coll: {}, foil: {}, decks: [], sel: null, packs: {}, quests: null, shop: null, games: [], st: { games: 0, wins: 0, packs: 0, bought: 0, fams: [] }, ms: {}, seed: Math.random().toString(36).slice(2, 10) });

/** Remet un profil lu du stockage dans une forme valide (cartes inconnues retirées, nombres vérifiés). */
export function normalizeTcg(raw) {
  const t = emptyTcg();
  if (!raw || typeof raw !== "object") return t;
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const cards = (o) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([id, v]) => CARD[id] && CARD[id].type !== "plot" && n(v) > 0).map(([id, v]) => [id, Math.min(99, n(v))]));
  t.starter = typeof raw.starter === "string" && starterById(raw.starter) ? raw.starter : null;
  t.ec = Math.min(1e7, n(raw.ec));
  t.xp = Math.min(1e8, n(raw.xp));
  t.coll = cards(raw.coll);
  t.foil = cards(raw.foil);
  t.decks = Array.isArray(raw.decks) ? raw.decks.filter((d) => d && typeof d === "object" && FAMILY[d.fam]).slice(0, 40).map((d) => ({
    id: String(d.id || Math.random().toString(36).slice(2, 9)).slice(0, 20), name: String(d.name || "Mon deck").slice(0, 32), fam: d.fam, pt: typeof d.pt === "string" ? d.pt : null,
    cards: Object.fromEntries(Object.entries(d.cards || {}).filter(([id, v]) => CARD[id] && CARD[id].type !== "plot" && n(v) > 0).map(([id, v]) => [id, Math.min(2, n(v))])),
    plots: Array.isArray(d.plots) ? d.plots.filter((id) => CARD[id] && CARD[id].type === "plot").slice(0, 7) : [],
  })) : [];
  t.sel = t.decks.some((d) => d.id === raw.sel) ? raw.sel : (t.decks[0] || {}).id || null;
  t.packs = Object.fromEntries(Object.entries(raw.packs || {}).filter(([id, v]) => packDef(id) && n(v) > 0).map(([id, v]) => [id, Math.min(999, n(v))]));
  t.quests = raw.quests && typeof raw.quests === "object" && Array.isArray(raw.quests.list) ? { day: String(raw.quests.day || ""), rr: n(raw.quests.rr), list: raw.quests.list.filter((q) => q && QUEST_BY[q.id]).slice(0, 3).map((q) => ({ id: q.id, n: n(q.n), got: Boolean(q.got), fam: typeof q.fam === "string" && FAMILY[q.fam] ? q.fam : null })) } : null;
  t.shop = raw.shop && typeof raw.shop === "object" ? { day: String(raw.shop.day || ""), bought: Array.isArray(raw.shop.bought) ? raw.shop.bought.filter((i) => Number.isInteger(i) && i >= 0 && i < 6) : [] } : null;
  t.games = Array.isArray(raw.games) ? raw.games.filter((g) => typeof g === "string").slice(-40) : [];
  const st = raw.st || {};
  t.st = { games: n(st.games), wins: n(st.wins), packs: n(st.packs), bought: n(st.bought), fams: Array.isArray(st.fams) ? [...new Set(st.fams.filter((f) => FAMILY[f]))].slice(0, 80) : [] };
  t.ms = Object.fromEntries(Object.entries(raw.ms || {}).filter(([k]) => MILESTONE_BY[k]).map(([k]) => [k, true]));
  t.seed = typeof raw.seed === "string" && raw.seed ? raw.seed.slice(0, 12) : t.seed;
  return t;
}
/** Deux téléphones, un compte : on garde la progression la plus avancée (XP, puis nombre de cartes). */
export function mergeTcg(a, b) {
  const A = normalizeTcg(a), B = normalizeTcg(b);
  const score = (t) => t.xp * 1000 + Object.values(t.coll).reduce((s, v) => s + v, 0);
  return score(A) >= score(B) ? A : B;
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
  { id: "multi", name: "Booster Multivers", price: 120, desc: "5 cartes de toutes les familles. Une rare au moins.", filter: () => true, slots: BASE, foil: 0.04 },
  { id: "heros", name: "Booster Héros", price: 140, desc: "5 personnages, sans objet ni événement.", filter: (d) => d.type === "char", slots: BASE, foil: 0.04 },
  { id: "arsenal", name: "Booster Arsenal", price: 140, desc: "5 cartes : lieux, objets et événements seulement.", filter: (d) => d.type !== "char", slots: BASE, foil: 0.05 },
  { id: "prestige", name: "Booster Prestige", price: 600, desc: "5 cartes rares ou mieux, dont une épique au moins.", filter: () => true, slots: PRESTIGE, foil: 0.1 },
  ...PLAYABLE.map((f) => ({ id: "fam:" + f.id, fam: f.id, name: `Booster ${f.short || f.name}`, price: 160, desc: `5 cartes de la famille ${f.name}.`, filter: (d) => d.fam === f.id, slots: BASE, foil: 0.04 })),
];
export function packDef(id) { return PACKS.find((p) => p.id === id) || null; }

/** Tire le contenu d'un booster (5 cartes). `r` : fonction aléatoire. 1 chance sur 200 : booster doré (tout brillant, rares ou mieux). */
export function rollPack(packId, r = Math.random) {
  const p = packDef(packId);
  if (!p) return [];
  const pool = ALL.filter((d) => collectible(d) && p.filter(d));
  const byR = Object.fromEntries(RARITY_ORDER.map((k) => [k, pool.filter((d) => d.r === k)]));
  const golden = r() < 0.005;
  const out = [];
  for (const slot of p.slots) {
    let rar = golden ? pickW(r, [["R", 60], ["E", 30], ["L", 10]]) : pickW(r, slot);
    let i = RARITY_ORDER.indexOf(rar);
    while (!byR[RARITY_ORDER[i]].length && i > 0) i--;   // rareté absente de ce booster : on descend
    const list = byR[RARITY_ORDER[i]].filter((d) => !out.some((o) => o.id === d.id));
    const d = (list.length ? list : byR[RARITY_ORDER[i]])[Math.floor(r() * (list.length || byR[RARITY_ORDER[i]].length))];
    if (d) out.push({ id: d.id, foil: golden || r() < p.foil * (d.r === "L" ? 0.6 : 1) });
  }
  return out.sort((a, b) => RARITY_ORDER.indexOf(CARD[a.id].r) - RARITY_ORDER.indexOf(CARD[b.id].r));
}
const addCard = (t, id, foil, n = 1) => { const k = foil ? "foil" : "coll"; t[k][id] = (t[k][id] || 0) + n; };
/** Ouvre un booster possédé. Renvoie { t, cards: [{id, foil, isNew}] } ou { error }. */
export function openPack(t0, packId, r = Math.random) {
  const t = clone(normalizeTcg(t0));
  if (!(t.packs[packId] > 0)) return { error: "Tu n'as pas ce booster." };
  t.packs[packId]--; if (!t.packs[packId]) delete t.packs[packId];
  const cards = rollPack(packId, r).map((c) => ({ ...c, isNew: !t.coll[c.id] && !t.foil[c.id] }));
  for (const c of cards) addCard(t, c.id, c.foil);
  t.st.packs++;
  bumpQuest(t, "packs", 1);
  return { t, cards };
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
/** Transforme en Éclats les exemplaires en trop (au-delà de 2 normales et 1 brillante). */
export function recycle(t0) {
  const t = clone(normalizeTcg(t0));
  let gained = 0, n = 0;
  for (const [id, c] of Object.entries(t.coll)) if (c > 2) { gained += (c - 2) * RECYCLE[CARD[id].r]; n += c - 2; t.coll[id] = 2; }
  for (const [id, c] of Object.entries(t.foil)) if (c > 1) { gained += (c - 1) * RECYCLE[CARD[id].r] * 3; n += c - 1; t.foil[id] = 1; }
  t.ec += gained;
  return { t, gained, n };
}
export function recyclable(t) {
  let gained = 0, n = 0;
  for (const [id, c] of Object.entries(t.coll || {})) if (c > 2) { gained += (c - 2) * RECYCLE[CARD[id].r]; n += c - 2; }
  for (const [id, c] of Object.entries(t.foil || {})) if (c > 1) { gained += (c - 1) * RECYCLE[CARD[id].r] * 3; n += c - 1; }
  return { gained, n };
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
  for (const [id, n] of Object.entries(s.cards)) t.coll[id] = Math.max(t.coll[id] || 0, n);
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
export const FOIL_MULT = 3;
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
    const foil = r() < (i === 5 ? 0.3 : 0.08);
    out.push({ i, id: d.id, foil, price: PRICE[d.r] * (foil ? FOIL_MULT : 1), star: i === 5 });
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
  { id: "fl", text: "Obtenir une Légendaire brillante", test: (t) => Object.keys(t.foil).some((id) => CARD[id].r === "L"), ec: 1000, packs: { prestige: 1 } },
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

export { PLOTS };
