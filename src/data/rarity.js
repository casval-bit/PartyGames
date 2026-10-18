// Rareté d'une carte = son tier de difficulté (colonne "difficulte" de cards.csv).
//   F = tout le monde connaît (commune)  …  S = très pointu (légendaire)
// Pour inverser le sens, il suffit de changer l'ordre de TIERS ci-dessous.
export const TIERS = ["F", "D", "C", "B", "A", "S"];

export const RARITY = {
  F: { label: "Commune", rank: 1 },
  D: { label: "Courante", rank: 2 },
  C: { label: "Peu commune", rank: 3 },
  B: { label: "Rare", rank: 4 },
  A: { label: "Épique", rank: 5 },
  S: { label: "Légendaire", rank: 6 },
};

// Répartition du tirage provisoire (tant que les vrais tiers ne sont pas renseignés).
const WEIGHTS = [["F", 0.3], ["D", 0.25], ["C", 0.2], ["B", 0.14], ["A", 0.08], ["S", 0.03]];

/** Tier provisoire, déterministe pour une carte donnée (même carte => même rareté sur tous les téléphones). */
export function provisionalTier(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  let x = ((h >>> 0) % 10000) / 10000;
  for (const [t, w] of WEIGHTS) { if (x < w) return t; x -= w; }
  return "F";
}
