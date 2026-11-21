// Trône des Mondes : constantes de règles, mots-clés et petits outils de texte. Module pur (pas de React).
//
// Le jeu reprend la structure du Trône de Fer JCE 2e édition : 7 phases par round, trois types de défis,
// revendication, Domination, Pouvoir à accumuler. Les familles remplacent les maisons de Westeros.
// Comme dans le jeu de base, la famille d'un deck n'apporte aucun effet (la carte de faction n'en a pas) ; contrairement à lui,
// un deck mélange librement toutes les familles : seules comptent les règles de construction (DECK_RULES).

/** Nom du jeu de cartes, affiché partout (un seul endroit à changer). Ancien nom : « Trône des Mondes ». */
export const GAME_NAME = "Heavy is the Crown";

export const TYPES = ["combat", "ruse", "influence"];
export const TYPE_NAME = { combat: "Combat", ruse: "Ruse", influence: "Influence" };
export const TYPE_ICON = { combat: "sword", ruse: "mask", influence: "crown" };
/** « de Combat », « de Ruse », « d'Influence » (élision devant la voyelle). */
export const deType = (t) => (t === "influence" ? "d'Influence" : `de ${TYPE_NAME[t]}`);
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

/**
 * Les titres de la Mêlée (Trône de Fer JCE, 2e édition) : seulement à 3 joueurs ou plus. Pendant la phase Scénario, une fois les
 * scénarios révélés, on mélange les 6 titres et on en retire au hasard (2 à 3 joueurs, 1 à 4 ou 5) ; chacun en choisit un, dans
 * l'ordre du tour, en secret ; ils se révèlent ensemble et repartent à la Taxe.
 *   supports : on ne peut pas lancer de défi contre le joueur qui a ce titre (on le soutient) ;
 *   rivals : gagner un défi (en attaquant ou en défendant) contre le joueur qui a ce titre rapporte 1 Pouvoir, une fois par
 *            round et par rival ;
 *   type : +1 force au total du joueur dans ses défis de ce type, s'il y a au moins un personnage.
 */
export const TITLES = [
  { id: "main", name: "La Main du Roi", short: "Main du Roi", icon: "crown", type: "influence", supports: ["justicier"], rivals: ["argentier", "navires"],
    text: "Un défi d'Influence de plus pendant la phase des défis, contre un autre adversaire que le premier." },
  { id: "chuchoteurs", name: "Le Maître des chuchoteurs", short: "Chuchoteurs", icon: "mask", type: "ruse", supports: ["main"], rivals: ["justicier", "argentier"],
    text: "Quand tu gagnes un défi de Ruse en attaquant, sa revendication touche autant d'adversaires que tu veux." },
  { id: "navires", name: "Le Maître des navires", short: "Navires", icon: "anchor", type: "combat", supports: ["chuchoteurs"], rivals: ["justicier", "main"],
    text: "Revendication +1 quand tu attaques un de tes rivaux en Combat." },
  { id: "argentier", name: "Le Grand Argentier", short: "Argentier", icon: "coins", supports: ["navires"], rivals: ["main", "chuchoteurs"],
    text: "+2 or de revenu à chaque Recrutement." },
  { id: "justicier", name: "Le Grand Justicier", short: "Justicier", icon: "scroll", supports: ["argentier"], rivals: ["chuchoteurs", "navires"],
    text: "Une carte de plus à la Pioche, et Réserve +1." },
  { id: "regent", name: "Le Régent de la Couronne", short: "Régent", icon: "castle", supports: [], rivals: [],
    text: "Une fois ce round, détourne un défi : l'attaquant doit choisir un autre adversaire. +2 force pour la Domination." },
];
export const TITLE = Object.fromEntries(TITLES.map((t) => [t.id, t]));
/** Le texte complet d'un titre (son effet et sa force dans les défis de son type). */
export const titleText = (t) => t.text + (t.type ? ` +1 force à ton total dans tes défis de ${TYPE_NAME[t.type]} (si tu y as un personnage).` : "");
/** Les titres jouent à partir de 3 joueurs (Mêlée). */
export const TITLES_FROM = 3;

export const CARD_TYPES = { char: "Personnage", loc: "Lieu", obj: "Objet", evt: "Événement", plot: "Scénario" };

export const KEYWORDS = {
  // les 13 mots-clés du Trône de Fer JCE 2e édition (Célèbre = Renown, Discret = Stealth, Génie = Insight, Pillard = Pillage,
  // Embuscade = Ambush, Assaut = Assault, Don = Bestow, Ombre = Shadow, Mise à prix = Prized…), plus Duel, propre à ce jeu
  celebre: { name: "Célèbre", text: "Quand vous gagnez un défi auquel il participe, ce personnage gagne 1 Pouvoir." },
  discret: { name: "Discret", text: "Quand il attaque, choisissez un personnage adverse sans Discret : il ne peut pas défendre pendant ce défi." },
  intimidation: { name: "Intimidation", text: "Quand vous gagnez un défi où il attaque, agenouillez un personnage du perdant dont la force ne dépasse pas l'écart (une seule Intimidation par défi)." },
  genie: { name: "Génie", text: "Quand vous gagnez un défi auquel il participe, piochez 1 carte." },
  pillard: { name: "Pillard", text: "Quand vous gagnez un défi auquel il participe, le perdant défausse la carte du dessus de son deck." },
  assaut: { name: "Assaut", text: "Quand il attaque, choisissez un lieu du défenseur de coût inférieur au sien : ce lieu perd son texte jusqu'à la fin du défi, et s'agenouille si vous gagnez (un seul lieu par défi)." },
  duel: { name: "Duel", text: "S'il attaque seul, le défenseur ne peut déclarer qu'un seul défenseur." },
  embuscade: { name: "Embuscade", text: "Pendant les défis, vous pouvez le mettre en jeu depuis votre main en payant le coût d'Embuscade." },
  ombre: { name: "Ombre", text: "Pendant le Recrutement, payez 2 or pour la poser face cachée dans votre ombre. Plus tard, en action, payez son coût d'Ombre pour la mettre en jeu (un événement se joue depuis l'ombre pour ce coût)." },
  don: { name: "Don", text: "Quand cette carte entre en jeu, vous pouvez poser dessus jusqu'à X or de votre or. Ses capacités utilisent cet or, perdu si elle quitte le jeu." },
  prime: { name: "Mise à prix", text: "Quand cette carte quitte le jeu, chaque adversaire gagne X Pouvoir." },
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
};
/**
 * Bonus de famille (effet permanent de la famille du deck, et de son type, sa région, sa maison…) : désactivés, comme dans le
 * Trône de Fer où la carte de faction n'a aucun effet. Les textes restent dans cards/*.js (meta.passive, types[].bonus) au cas où.
 */
export const FAMILY_BONUSES = false;

/** Exemplaires d'une carte autorisés dans un deck : 2, ou 1 pour une carte de coût 7 (unique). */
export const copiesOf = (d) => (d && d.type !== "plot" && d.cost >= 7 ? DECK_RULES.max7 : DECK_RULES.maxCopies);

export const DEFAULT_GOAL = 15;
export const SETUP_GOLD = 8;
export const HAND_START = 7;
export const MAX_ROUNDS = 20;

/** Version texte (sans balisage) d'un texte de carte, pour les journaux et les tests. */
export const plain = (s) => String(s || "").replace(/\{(combat|ruse|influence)\}/g, (_, t) => TYPE_NAME[t]).replace(/\*([^*]+)\*/g, "$1");

export const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
