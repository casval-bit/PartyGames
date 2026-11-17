// Trône des Mondes : règles de construction des decks, decks de départ et scénarios conseillés.
import { CARD, ALL, PLOTS, FAMILY, FAMILIES, STARTER_SPECS, hasSubs, subWords } from "./cards/index.js";
import { DECK_RULES as R, slug, copiesOf } from "./rules.js";

/** Nombre total de cartes d'un deck. */
export const deckSize = (deck) => Object.values(deck.cards || {}).reduce((s, n) => s + n, 0);

/**
 * Famille la plus présente d'un deck (sans compter les neutres) : sa couleur et son icône représentent le deck.
 * Elle n'a aucun effet en jeu (pas de bonus de famille). « neutre » pour un deck sans carte de famille.
 * À égalité, la première dans l'ordre des familles.
 */
export function mainFamily(cards) {
  const by = {};
  for (const [id, n] of Object.entries(cards || {})) {
    const d = CARD[id];
    if (d && d.type !== "plot" && n > 0 && d.fam !== "neutre") by[d.fam] = (by[d.fam] || 0) + n;
  }
  let best = null;
  for (const f of FAMILIES) if (by[f.id] && (!best || by[f.id] > by[best])) best = f.id;
  return best || "neutre";
}
/** Répartition d'un deck par famille : [{ fam, n }], la plus présente d'abord, les neutres à la fin. */
export function familyMix(cards) {
  const by = {};
  for (const [id, n] of Object.entries(cards || {})) { const d = CARD[id]; if (d && d.type !== "plot" && n > 0) by[d.fam] = (by[d.fam] || 0) + n; }
  const order = Object.fromEntries(FAMILIES.map((f, i) => [f.id, i]));
  return Object.entries(by).map(([fam, n]) => ({ fam, n }))
    .sort((a, b) => (a.fam === "neutre") - (b.fam === "neutre") || b.n - a.n || order[a.fam] - order[b.fam]);
}

/**
 * Vérifie un deck. Les familles se mélangent librement : seules comptent les règles de construction (DECK_RULES).
 * Renvoie { ok, errors: [texte…], counts, fam (famille la plus présente), mix (répartition par famille) }.
 * `owned` (facultatif) : { idCarte: nombre possédé } — vérifie que le joueur a bien les cartes.
 */
export function validateDeck(deck, owned = null) {
  const errors = [];
  const entries = Object.entries((deck && deck.cards) || {}).filter(([, n]) => n > 0);
  const counts = { total: 0, chars: 0, locs: 0, objEvt: 0, c7: 0, c6: 0, c5: 0 };
  const byKey = {};
  for (const [id, n] of entries) {
    const d = CARD[id];
    if (!d || d.type === "plot") { errors.push("Carte inconnue dans le deck."); continue; }
    counts.total += n;
    if (n > copiesOf(d)) errors.push(d.cost >= 7 ? `${d.name} (7) est unique : un seul exemplaire par deck.` : `${d.name} : ${R.maxCopies} exemplaires au maximum.`);
    if (owned && (owned[id] || 0) < n) errors.push(`Il te manque ${n - (owned[id] || 0)} × ${d.name}.`);
    if (d.type === "char") counts.chars += n;
    else if (d.type === "loc") counts.locs += n;
    else counts.objEvt += n;
    if (d.cost >= 7) counts.c7 += n; else if (d.cost === 6) counts.c6 += n; else if (d.cost === 5) counts.c5 += n;
    (byKey[d.key] = byKey[d.key] || new Set()).add(d.id);
  }
  for (const set of Object.values(byKey)) {
    if (set.size > 1) {
      const names = [...set].map((id) => `${CARD[id].name} (${CARD[id].cost})`);
      errors.push(`Une seule version par personnage : ${names.join(" et ")} ne peuvent pas être dans le même deck.`);
    }
  }
  if (counts.total !== R.size) errors.push(`Le deck doit contenir exactement ${R.size} cartes (actuellement ${counts.total}).`);
  if (counts.c7 > R.cost7) errors.push(`Au plus ${R.cost7} cartes de coût 7 ou plus (actuellement ${counts.c7}).`);
  if (counts.c6 > R.cost6) errors.push(`Au plus ${R.cost6} cartes de coût 6 (actuellement ${counts.c6}).`);
  if (counts.c5 > R.cost5) errors.push(`Au plus ${R.cost5} cartes de coût 5 (actuellement ${counts.c5}).`);
  if (counts.chars < R.minChars) errors.push(`Au moins ${R.minChars} personnages (actuellement ${counts.chars}).`);
  if (counts.objEvt > R.maxObjEvt) errors.push(`Au plus ${R.maxObjEvt} objets et événements (actuellement ${counts.objEvt}).`);
  if (counts.locs > R.maxLocs) errors.push(`Au plus ${R.maxLocs} lieux (actuellement ${counts.locs}).`);
  const plots = (deck && deck.plots) || [];
  if (plots.length !== R.plots || new Set(plots).size !== R.plots || plots.some((id) => !CARD[id] || CARD[id].type !== "plot")) errors.push(`Choisis ${R.plots} scénarios différents.`);
  return { ok: errors.length === 0, errors: [...new Set(errors)], counts, fam: mainFamily(deck && deck.cards), mix: familyMix(deck && deck.cards) };
}

/** Les cartes d'un deck de départ (bots) de cette famille : la famille (et son sous-groupe) et les neutres. */
export function legalPool(fam, pt) {
  const subs = hasSubs(fam);
  return ALL.filter((d) => d.fam === "neutre" || (d.fam === fam && (!subs || !d.pt.length || !pt || d.pt.includes(pt))));
}

/** Le deck de départ le plus proche d'un deck : même famille (et même sous-groupe si possible), le plus de cartes en commun. */
export function starterFor(deck) {
  const fam = deck.fam && FAMILY[deck.fam] && deck.fam !== "neutre" ? deck.fam : mainFamily(deck.cards);
  const all = starters().filter((s) => s.fam === fam);
  const same = all.filter((s) => (s.pt || null) === (deck.pt || null));
  let best = null, bv = -1;
  for (const s of same.length ? same : all) {
    let v = 0;
    for (const [id, n] of Object.entries(deck.cards || {})) v += Math.min(n, s.cards[id] || 0);
    if (v > bv) { best = s; bv = v; }
  }
  return best;
}

const RARITY_RANK = { L: 4, E: 3, R: 2, U: 1, C: 0 };
/**
 * Complète un deck jusqu'à R.size cartes sans enfreindre les règles : une version par personnage, R.maxCopies exemplaires au plus
 * (1 pour une carte 7), plafonds des coûts 5, 6 et 7, des lieux, des objets et événements, assez de personnages. Les cartes du deck de
 * départ le plus proche passent en premier, puis celles de la famille la plus présente, les neutres et enfin les autres familles.
 *   owned : { id: n } possédés (un exemplaire déjà dans le deck n'est plus libre) ;
 *   extra : s'il n'y a pas assez de cartes possédées, on en prend d'autres (renvoyées dans `granted`, à offrir au joueur) ;
 *   upTo : nombre de cartes visé (R.size par défaut ; moins pour ne remplacer que quelques cartes perdues).
 * Renvoie { cards, added: { id: n }, granted: { id: n }, missing } (missing > 0 : il manque encore des cartes).
 */
export function fillDeck(deck, { owned = {}, extra = false, upTo = R.size } = {}) {
  const cards = {};
  for (const [id, n] of Object.entries(deck.cards || {})) if (n > 0 && CARD[id] && CARD[id].type !== "plot") cards[id] = n;
  const added = {}, granted = {};
  let need = Math.min(R.size, upTo) - deckSize({ cards });
  if (need <= 0) return { cards, added, granted, missing: 0 };
  const main = deckSize({ cards }) ? mainFamily(cards) : deck.fam && FAMILY[deck.fam] ? deck.fam : "neutre"; // famille la plus présente
  const c = { ...validateDeck({ ...deck, cards }).counts };
  const keyOwner = {};
  for (const id of Object.keys(cards)) keyOwner[CARD[id].key] = id;
  const st = starterFor({ ...deck, cards });
  const rank = new Map(Object.keys((st && st.cards) || {}).map((id, i) => [id, i]));
  const free = (d) => (owned[d.id] || 0) - (cards[d.id] || 0);
  // toutes les familles se mélangent : n'importe quelle carte possédée peut compléter le deck
  const base = ALL.filter((d) => !d.st || rank.has(d.id) || free(d) > 0);
  const near = (d) => (d.fam === main ? 0 : d.fam === "neutre" ? 1 : 2);
  // ordre : deck de départ, la famille la plus présente, puis les neutres, puis les autres familles, personnages d'abord ;
  // les meilleures cartes possédées, les plus simples à offrir
  const order = (best) => [...base].sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 1e6) - (rank.has(b.id) ? rank.get(b.id) : 1e6)
    || near(a) - near(b) || (a.type === "char" ? 0 : 1) - (b.type === "char" ? 0 : 1)
    || (best ? RARITY_RANK[b.r] - RARITY_RANK[a.r] : RARITY_RANK[a.r] - RARITY_RANK[b.r]) || a.cost - b.cost || a.id.localeCompare(b.id));
  const fits = (d) => {
    if ((cards[d.id] || 0) >= copiesOf(d)) return false;
    if (keyOwner[d.key] && keyOwner[d.key] !== d.id) return false;
    if (d.cost >= 7 ? c.c7 >= R.cost7 : d.cost === 6 ? c.c6 >= R.cost6 : d.cost === 5 ? c.c5 >= R.cost5 : false) return false;
    if (d.type === "loc" ? c.locs >= R.maxLocs : d.type !== "char" && c.objEvt >= R.maxObjEvt) return false;
    return d.type === "char" || R.minChars - c.chars < need; // les dernières places vont aux personnages s'il en manque
  };
  const put = (d, gift) => {
    cards[d.id] = (cards[d.id] || 0) + 1; keyOwner[d.key] = d.id; need--;
    added[d.id] = (added[d.id] || 0) + 1;
    if (gift) granted[d.id] = (granted[d.id] || 0) + 1;
    if (d.type === "char") c.chars++; else if (d.type === "loc") c.locs++; else c.objEvt++;
    if (d.cost >= 7) c.c7++; else if (d.cost === 6) c.c6++; else if (d.cost === 5) c.c5++;
  };
  for (const d of order(true)) { while (need > 0 && free(d) > 0 && fits(d)) put(d, false); if (!need) break; }
  if (extra && need > 0) {
    for (const d of order(false)) {
      if (RARITY_RANK[d.r] >= RARITY_RANK.E || d.cost >= 7) continue; // on n'offre ni épique, ni légendaire, ni carte 7
      if (free(d) <= 0 && !rank.has(d.id) && near(d) > 1) continue; // ni une carte d'une autre famille qu'on n'a pas
      while (need > 0 && fits(d)) put(d, free(d) <= 0);
      if (!need) break;
    }
  }
  return { cards, added, granted, missing: need };
}

/** Valeur d'un scénario pour un deck « moyen » (revenu surtout, puis revendication, initiative et effet). */
function plotScore(p) {
  let v = p.inc * 1.0 + p.clm * 1.4 + p.ini * 0.18 + p.res * 0.15;
  for (const ab of p.abs) v += ({ plDraw: 1.4, plEachDraw: 0.6, plSearch: 1.2, plRecall: 1, plCatchUp: 1, plCheap: 1.2, plDom: 0.8, plStandOne: 0.9, plKneel: 0.9, plClaim: 0.9, plExtra: 0.9, plUnopp: 0.6, plDiscard: 0.7, plDrawMore: 0.5 })[ab.tpl] || 0.3;
  return v;
}
/** 7 scénarios conseillés : un ou deux de l'univers de la famille, puis les plus solides, avec assez de revenu. */
export function defaultPlots(fam) {
  const situational = new Set(["plNo", "plKillEach", "plNoDom", "plKillWeak", "plTrait"]);
  const all = [...PLOTS].filter((p) => !p.abs.some((ab) => situational.has(ab.tpl))).sort((a, b) => plotScore(b) - plotScore(a));
  const own = all.filter((p) => p.univ === fam && p.inc >= 3).slice(0, 2);
  const out = [...own];
  for (const p of all) { if (out.length >= R.plots) break; if (!out.includes(p) && p.univ !== fam) out.push(p); }
  return out.slice(0, R.plots).map((p) => p.id);
}

/* ------------------------------ decks de départ ------------------------------ */
const RAR = { C: 0, U: 0.3, R: 0.6, E: 0.8, L: 1 };
function scoreFor(spec, d) {
  let s = 0;
  for (const t of spec.like || []) if (d.traitSet.has(t.toLowerCase())) s += 3;
  for (const t of spec.avoid || []) if (d.traitSet.has(t.toLowerCase())) s -= 6;
  s += RAR[d.r] || 0;
  return s;
}
/**
 * Construit un deck de départ jouable (40 cartes, règles respectées) à partir d'une description :
 * { id, name, fam, pt?, leader: idCarte, like: [traits], avoid: [traits], excl: [idCartes], maxChars? }.
 */
export function buildStarter(spec) {
  if (spec.cards) { // deck à thème : liste faite à la main (cards/themes.js), prise telle quelle
    for (const id of Object.keys(spec.cards)) if (!CARD[id] || CARD[id].type === "plot") throw new Error(`Deck de départ ${spec.id} : carte inconnue ${id}`);
    return { id: spec.id, name: spec.name, fam: spec.fam, pt: spec.pt || null, desc: spec.desc || "", leader: spec.leader, cards: { ...spec.cards }, plots: spec.plots || defaultPlots(spec.fam), theme: Boolean(spec.theme) };
  }
  const fam = spec.fam;
  const pool = legalPool(fam, spec.pt).filter((d) => d.fam === fam && (!d.st || d.st === spec.id));
  const cards = {};
  const keys = new Set();
  const counts = { c7: 0, c6: 0, c5: 0, chars: 0, locs: 0, oe: 0, total: 0 };
  const can = (d, n) => {
    if (keys.has(d.key) && !cards[d.id]) return false;
    if ((cards[d.id] || 0) + n > copiesOf(d)) return false;
    if (d.type === "char" && spec.maxChars && counts.chars + n > spec.maxChars) return false; // option : laisse de la place aux objets et événements
    if (d.cost >= 7 && counts.c7 + n > R.cost7) return false;
    if (d.cost === 6 && counts.c6 + n > 5) return false;
    if (d.cost === 5 && counts.c5 + n > 7) return false;
    return counts.total + n <= R.size;
  };
  const add = (d, n) => {
    if (!d || !can(d, n)) return false;
    cards[d.id] = (cards[d.id] || 0) + n; keys.add(d.key);
    if (d.cost >= 7) counts.c7 += n; else if (d.cost === 6) counts.c6 += n; else if (d.cost === 5) counts.c5 += n;
    if (d.type === "char") counts.chars += n; else if (d.type === "loc") counts.locs += n; else counts.oe += n;
    counts.total += n;
    return true;
  };
  const two = (d) => Math.min(2, copiesOf(d)); // 2 exemplaires, ou 1 pour une carte 7 (unique)
  const leader = CARD[spec.leader];
  if (leader) add(leader, two(leader));
  for (const id of spec.excl || []) if (CARD[id]) add(CARD[id], two(CARD[id]));
  // une version par personnage : la mieux notée, les moins chères d'abord à note égale (sauf le chef)
  const best = {};
  for (const d of pool) {
    if (d.type !== "char" || keys.has(d.key)) continue;
    const sc = scoreFor(spec, d) - (d.cost >= 6 ? 1.5 : 0) - (d.cost >= 7 ? 4 : 0);
    if (!best[d.key] || sc > best[d.key].sc) best[d.key] = { d, sc };
  }
  const chars = Object.values(best).filter((x) => x.sc > -3).sort((a, b) => b.sc - a.sc || a.d.cost - b.d.cost).map((x) => x.d);
  const curve = (d) => (d.cost <= 2 ? 0 : d.cost <= 4 ? 1 : 2);
  const want = [6, 6, 4]; const got = [0, 0, 0];
  for (const d of chars) { const c = curve(d); if (got[c] < want[c] && add(d, two(d))) got[c]++; }
  for (const d of chars) { if (counts.chars >= 30) break; add(d, two(d)); }
  const picked = Object.keys(cards).map((id) => CARD[id]).filter((d) => d.type === "char");
  const share = (t) => picked.filter((d) => d.traitSet.has(String(t).toLowerCase())).length / Math.max(1, picked.length);
  const util = (d) => {
    let u = scoreFor(spec, d);
    for (const ab of d.abs) {
      if (ab.tpl === "income") u += 6;
      else if (ab.tpl === "reduce") u += !ab.args[0] || ab.args[0] === "*" ? 3 : share(ab.args[0]) >= 0.5 ? 3 : -9;
      else if (/^(aura|atkAura|defAuraT|kwAura|iconAura)$/.test(ab.tpl)) u += ab.args[0] === "*" || share(ab.args[0]) >= 0.4 ? 2 : -9;
      else if (/^(evBuffTrait|evStandAll|evStand|evSave|evRecall|evPutPlay)$/.test(ab.tpl)) u += !ab.args[0] || ab.args[0] === "*" || share(ab.args[0]) >= 0.4 ? 1 : -9;
      else if (ab.tpl === "actDraw" || ab.tpl === "evDraw") u += 2;
    }
    if (d.req && share(d.req) < 0.3) u -= 9;
    return u;
  };
  const support = pool.filter((d) => d.type !== "char").map((d) => ({ d, sc: util(d) })).filter((x) => x.sc > -5).sort((a, b) => b.sc - a.sc).map((x) => x.d);
  for (const d of support.filter((x) => x.type === "loc")) { if (counts.locs >= 8) break; add(d, two(d)); }
  for (const d of support.filter((x) => x.type !== "loc")) { if (counts.oe >= 12) break; add(d, two(d)); }
  // complément neutre
  // (seulement les cartes neutres de remplissage : pas les personnages venus d'autres univers, option fill: false)
  const neutral = ALL.filter((d) => d.fam === "neutre" && d.fill).sort((a, b) => (a.type === "char" ? -1 : 0) - (b.type === "char" ? -1 : 0) || a.cost - b.cost);
  for (const d of neutral) { if (counts.total >= R.size) break; if (d.type === "char" || counts.chars >= R.minChars) add(d, Math.min(two(d), R.size - counts.total)); }
  for (const d of chars) { if (counts.total >= R.size) break; if (!cards[d.id]) add(d, Math.min(two(d), R.size - counts.total)); else if (cards[d.id] === 1) add(d, 1); }
  for (const d of neutral) { if (counts.total >= R.size) break; add(d, 1); }
  return { id: spec.id, name: spec.name, fam, pt: spec.pt || null, desc: spec.desc || "", leader: spec.leader, cards, plots: defaultPlots(fam) };
}

let _starters = null;
/** Tous les decks de départ (calculés une fois). */
export function starters() {
  if (_starters) return _starters;
  const specs = [...STARTER_SPECS];
  // familles à sous-groupes : un deck par type ou région qui n'a pas déjà le sien
  for (const f of FAMILIES) for (const t of f.types || []) {
    if (specs.some((s) => s.fam === f.id && s.pt === t.id)) continue;
    // le sous-groupe compte double : ses personnages d'abord (et le plus cher en tête), puis ceux qui vont partout
    const pool = ALL.filter((d) => d.fam === f.id && d.type === "char" && d.pt.includes(t.id)).sort((a, b) => b.cost - a.cost);
    if (!pool.length) continue;
    const w = subWords(f.id);
    specs.push({ id: `${w.starter || f.id}-${slug(t.id)}`, name: `${f.short || f.name} ${t.name}`, fam: f.id, pt: t.id, leader: pool[0].id, like: [t.id, t.id, ...(w.like || [])], avoid: [], desc: t.desc || `Un deck ${f.name} : ${t.name}.` });
  }
  _starters = specs.map(buildStarter);
  return _starters;
}
export const starterById = (id) => starters().find((s) => s.id === id) || null;
/** Les decks de départ qu'un nouveau joueur peut choisir : les 8 decks à thème (cards/themes.js). */
export const themeStarters = () => starters().filter((s) => s.theme);
