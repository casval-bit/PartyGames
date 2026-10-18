import { FAST } from "../config.js";
// Pour ajouter une catégorie : une ligne ici, puis utilise son "id" dans la 2e colonne de cards.csv.
// Les couleurs sont calculées automatiquement (teinte répartie sur le cercle chromatique).

const BASE = [
  ["acteur", "Acteur·rice"],
  ["auteur", "Auteur"],
  ["realisateur", "Réalisateur"],
  ["chanteur", "Chanteur·se"],
  ["emission", "Émission"],
  ["serie", "Série TV"],
  ["fictif", "Personnage fictif"],
  ["jeuvideo", "Personnage de jeu vidéo"],
  ["cycliste", "Cycliste"],
  ["sportif", "Sportif·ve"],
  ["footballeur", "Footballeur"],
  ["politique", "Politique"],
  ["compositeur", "Compositeur"],
  ["film", "Nom de film"],
  ["album", "Titre d'album"],
  ["peintre", "Peintre"],
  ["tableau", "Nom de tableau"],
  ["plante", "Plante"],
  ["pays", "Pays"],
  ["histoire", "Personnage historique"],
  ["evenement", "Événement historique"],
  ["kpop", "K-pop"],
  ["francais", "Personnalité française"],
  ["internet", "Personnalité internet"],
  ["anime", "Anime"],
  ["manga", "Manga"],
  ["dessinanime", "Dessin animé"],
  ["rappeur", "Rappeur·se"],
  ["animal", "Animal"],
  ["mythologie", "Mythologie"],
  ["marque", "Marque"],
];

export const CATEGORIES = BASE.map(([id, label], i) => ({
  id,
  label,
  special: false,
  hue: Math.round((i * 360) / BASE.length + 8) % 360,
  color: `hsl(${Math.round((i * 360) / BASE.length + 8) % 360} 78% 62%)`,
}));

export const SPECIALS = [
  { id: "random", label: "Random", note: "Une catégorie au hasard", special: true, color: "conic-gradient(from 20deg,#ff6b6b,#ffd23f,#7bd88f,#4cc9f0,#b388ff,#ff6b6b)" },
  { id: "mixtes", label: "Mixtes", note: "Cartes au hasard", special: true, color: "repeating-linear-gradient(135deg,#fff4dc 0 8px,#e9d9b4 8px 16px)" },
];

export const ALL_VOTE_OPTIONS = [...CATEGORIES, ...SPECIALS];
export const BY_ID = Object.fromEntries(ALL_VOTE_OPTIONS.map((c) => [c.id, c]));
export const CARDS_PER_VOTE = 4;
export const VOTES_PER_PLAYER = 3;
// Règles des boosters selon la variante de Time's Up : votes par joueur × cartes par vote.
export const VARIANT_RULES = {
  classic: { votes: VOTES_PER_PLAYER, cards: CARDS_PER_VOTE },
  bonus: { votes: 2, cards: FAST ? 3 : 10 }, // (FAST = tests automatiques seulement)
};
export const rulesFor = (settings) => VARIANT_RULES[settings && settings.game === "timesup" && settings.variant === "bonus" ? "bonus" : "classic"];
