import csv from "./cards.csv?raw";
import images from "./images.json";
import { CATEGORIES, CARDS_PER_VOTE } from "./categories.js";
import { parseCards } from "./parseCards.js";
import { COUNTRIES } from "./countries.js";
import { shuffle, pick } from "../lib/util.js";
import { provisionalTier } from "./rarity.js";
import { PROVISIONAL_TIERS } from "../config.js";

const ids = new Set(CATEGORIES.map((c) => c.id));
export const { cards: ALL_CARDS, warnings: CARD_WARNINGS } = parseCards(csv, ids, COUNTRIES);
// images.json est généré par tools/fetch-images.js (Wikipédia) ; une colonne "image" dans cards.csv a la priorité.
for (const c of ALL_CARDS) {
  c.image = c.image || images[c.id]?.url || "";
  if (!c.tier && PROVISIONAL_TIERS) { c.tier = provisionalTier(c.id); c.provisional = true; }
}
if (CARD_WARNINGS.length) console.warn("[cards.csv]", CARD_WARNINGS);

export const CARD_BY_ID = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));
export const IMAGE_COUNT = ALL_CARDS.filter((c) => c.image).length;

const byCat = {};
for (const c of CATEGORIES) byCat[c.id] = [];
for (const card of ALL_CARDS) for (const cat of card.cats) byCat[cat].push(card);

export const countByCategory = Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length]));

/**
 * Tire `n` cartes jamais tirées (set `used`), pour un choix de vote.
 * - catégorie normale : cartes de cette catégorie, complétées en "mixtes" si elle est épuisée
 * - "random" : une catégorie au hasard (qui a assez de cartes restantes)
 * - "mixtes" : cartes au hasard, chacune avec une de ses catégories
 * Un nom présent dans plusieurs catégories n'est tiré qu'une fois (set `used` partagé par toute la partie).
 * @returns {{choice:string, resolved:string, cards:{id:string,name:string,cat:string}[]}}
 */
export function drawPack(choice, used, n = CARDS_PER_VOTE, opts = {}) {
  // opts.preferImage (Qui est-ce ?) : on tire d'abord des cartes AVEC image — dans la catégorie, puis dans toutes les
  // catégories — et on ne prend une carte sans image qu'en tout dernier recours.
  const img = opts.preferImage;
  const free = (list) => list.filter((x) => !used.has(x.id) && (!img || x.image));
  let resolved = choice;
  if (choice === "random") {
    const ok = CATEGORIES.filter((c) => free(byCat[c.id]).length >= n);
    resolved = ok.length ? pick(ok).id : "mixtes";
  }
  const out = [];
  const take = (card, cat) => {
    used.add(card.id);
    out.push({ id: card.id, name: card.name, cat, tier: card.tier || "F" });
  };
  const fill = (list, catOf) => {
    for (const card of shuffle(list)) {
      if (out.length >= n) break;
      if (!used.has(card.id)) take(card, catOf(card));
    }
  };
  if (resolved !== "mixtes") fill(free(byCat[resolved]), () => resolved);
  if (out.length < n) fill(free(ALL_CARDS), (c) => pick(c.cats));
  if (out.length < n && img) fill(ALL_CARDS, (c) => pick(c.cats)); // plus aucune image disponible : tant pis
  return { choice, resolved, cards: out };
}
