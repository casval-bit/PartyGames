// Trône des Mondes : constantes de règles, mots-clés et petits outils de texte. Module pur (pas de React).
//
// Le jeu reprend la structure du Trône de Fer JCE 2e édition : 7 phases par round, trois types de défis,
// revendication, Domination, Pouvoir à accumuler. Les familles remplacent les maisons de Westeros.

export const TYPES = ["combat", "ruse", "influence"];
export const TYPE_NAME = { combat: "Combat", ruse: "Ruse", influence: "Influence" };
export const TYPE_ICON = { combat: "sword", ruse: "mask", influence: "crown" };
/** « un défi de Combat », « un défi d'Influence », « un défi » (n'importe lequel). */
export const unDefi = (t) => (!t || t === "*" ? "un défi" : `un défi {${t}}`);

export const PHASES = [
  { id: "plot", name: "Scénario" },
  { id: "draw", name: "Pioche" },
  { id: "marshal", name: "Recrutement" },
  { id: "challenges", name: "Défis" },
  { id: "dominance", name: "Domination" },
  { id: "standing", name: "Redressement" },
  { id: "taxation", name: "Taxe" },
];
export const PHASE_NAME = Object.fromEntries(PHASES.map((p) => [p.id, p.name]));

export const CARD_TYPES = { char: "Personnage", loc: "Lieu", obj: "Objet", evt: "Événement", plot: "Scénario" };

export const KEYWORDS = {
  celebre: { name: "Célèbre", text: "Quand il gagne un défi auquel il participe, ce personnage gagne 1 Pouvoir." },
  discret: { name: "Discret", text: "Quand il attaque, choisissez un personnage adverse sans Discret : il ne peut pas défendre pendant ce défi." },
  intimidation: { name: "Intimidation", text: "Quand vous gagnez un défi où il attaque, agenouillez un personnage du perdant dont la force ne dépasse pas l'écart." },
  genie: { name: "Génie", text: "Quand vous gagnez un défi où il attaque, piochez 1 carte." },
  pillard: { name: "Pillard", text: "Quand vous gagnez un défi où il attaque, le perdant défausse la carte du dessus de son deck." },
  duel: { name: "Duel", text: "S'il attaque seul, le défenseur ne peut déclarer qu'un seul défenseur." },
  embuscade: { name: "Embuscade", text: "Pendant les défis, vous pouvez le mettre en jeu depuis votre main en payant le coût d'Embuscade." },
  fidele: { name: "Fidèle", text: "Ne peut pas être joué dans un deck d'une autre famille (alliance)." },
  limite: { name: "Limité", text: "Une seule carte Limitée peut être jouée par round." },
  terminal: { name: "Terminal", text: "Si le personnage attaché quitte le jeu, cet objet est défaussé au lieu de revenir en main." },
  sansobjet: { name: "Sans objet", text: "Ne peut recevoir aucun objet." },
};

export const RARITY = {
  C: { name: "Commune", gem: "#9aa7bd", tier: 1 },
  U: { name: "Peu commune", gem: "#5ee1ff", tier: 2 },
  R: { name: "Rare", gem: "#ffd166", tier: 3 },
  E: { name: "Épique", gem: "#c084fc", tier: 4 },
  L: { name: "Légendaire", gem: "#ff7a59", tier: 5 },
};
export const RARITY_ORDER = ["C", "U", "R", "E", "L"];

/** Règles de construction d'un deck (vérifiées par deck.js). */
export const DECK_RULES = {
  size: 50,
  plots: 7,
  maxCopies: 2,
  max7: 1,        // une carte de coût 7 est unique : un seul exemplaire par deck
  cost7: 3,       // cartes de coût 7 ou plus (différentes)
  cost6: 6,
  cost5: 8,
  minChars: 24,
  maxObjEvt: 18,
  maxLocs: 10,
  maxAlliance: 10, // cartes non Fidèles d'une seule autre famille
};

/** Exemplaires d'une carte autorisés dans un deck : 2, ou 1 pour une carte de coût 7 (unique). */
export const copiesOf = (d) => (d && d.type !== "plot" && d.cost >= 7 ? DECK_RULES.max7 : DECK_RULES.maxCopies);

export const DEFAULT_GOAL = 15;
export const SETUP_GOLD = 8;
export const HAND_START = 7;
export const MAX_ROUNDS = 20;

/** Version texte (sans balisage) d'un texte de carte, pour les journaux et les tests. */
export const plain = (s) => String(s || "").replace(/\{(combat|ruse|influence)\}/g, (_, t) => TYPE_NAME[t]).replace(/\*([^*]+)\*/g, "$1");

export const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
