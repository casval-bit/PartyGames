export const FAST = import.meta.env.VITE_FAST === "1"; // réservé aux tests automatiques : durées raccourcies
export const APP_NAME = "Party Hub"; // nom de travail de la plateforme ; « Time's Up » est une marque déposée, à renommer avant le Play Store

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const ONLINE = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const TEAMS = [
  { id: 0, name: "jaune", label: "Jaune", color: "#ffd23f", ink: "#2b2100" },
  { id: 1, name: "bleue", label: "Bleue", color: "#4aa8ff", ink: "#04203f" },
  { id: 2, name: "rouge", label: "Rouge", color: "#ff5d73", ink: "#3a0610" },
  { id: 3, name: "verte", label: "Verte", color: "#5fdc8a", ink: "#032916" },
];

export const DEFAULT_PER_TEAM = 2;
export const PER_TEAM_OPTIONS = [2, 3, 4, 5, 6];
export const MAX_CELLS = 15; // barres de charge max par catégorie
export const VOTE_SECONDS = 60;
export const DISCARD_SECONDS = 60;
export const BOOSTER_SECONDS = 90;
export const SHUFFLE_MS = 6200; // mélange commun de tous les boosters + distribution
export const HAND_SIZE = FAST ? 5 : 12;    // cartes reçues par joueur après le mélange
export const PROVISIONAL_TIERS = true; // tant que cards.csv n'a pas de colonne difficulte : raretés tirées au hasard (stables par carte)
export const REVEAL_MS = 8000;
export const COUNTDOWN_MS = 4200;
export const ROUND_SECONDS_OPTIONS = [30, 45, 60, 90];
export const SHOW_BOT_BUTTON = true; // bouton "+ Bot" dans le lobby (tests en solo)

// ---- plateforme de jeux ----
export const GAMES = [
  { id: "timesup", label: "Time's Up", note: "Faire deviner en équipe, 3 manches" },
  { id: "quiest", label: "Qui est-ce ?", note: "Course à l'image : le premier qui trouve gagne" },
  { id: "blindtest", label: "Blind test", note: "Devine le titre et l'artiste d'une playlist Deezer" },
];
export const QE_ROUNDS_OPTIONS = [5, 8, 10, 15];
export const QE_DEFAULT_ROUNDS = 8;
export const QE_TAP_SECONDS = FAST ? 8 : 25;   // si quelqu'un ne touche pas l'écran, ça démarre quand même
export const QE_COUNT_MS = 5700;    // décompte rigolo 5-4-3-2-1 + "REGARDE !"
export const QE_PLAY_SECONDS = FAST ? 12 : 45;  // temps max pour trouver
export const QE_RESULT_MS = FAST ? 3000 : 7000;   // révélation de la réponse entre deux images
export const QE_HOLD_MS = 3000;     // durée d'appui pour dire "j'ai trouvé"

// ---- manches de Time's Up ----
export const TU_ROUNDS = 3;
export const TU_READY_SECONDS = 45;   // le joueur doit toucher l'écran, sinon son tour est passé
export const TU_TURNEND_MS = 4200;    // récap à la fin de chaque tour
export const TU_ROUNDEND_SECONDS = FAST ? 6 : 20; // scores entre deux manches (tout le monde "Prêt" = on enchaîne)
export const TU_MIN_CARRY_MS = 3000;  // temps restant minimum pour que le joueur rejoue en début de manche suivante
export const TU_ROUND_RULES = [
  { title: "Manche 1", rule: "Décris librement, sans dire le nom ni un mot de la carte." },
  { title: "Manche 2", rule: "Un seul mot par carte !" },
  { title: "Manche 3", rule: "Mime : aucun son, aucune parole !" },
];

// ---- variante « Bonus » de Time's Up ----
export const TU_VARIANTS = [
  { id: "classic", label: "Classique", note: "3 votes × 4 cartes, puis on défausse 2 cartes" },
  { id: "bonus", label: "Bonus", note: "2 votes × 10 cartes · chaque manche, 2 cartes bonus (+10 s ou 3 points)" },
];
export const BONUS_SECONDS = FAST ? 25 : 75;   // temps pour placer ses bonus (au bout, ce qui est posé compte)
export const BONUS_SLOTS = 2;                // nombre de cartes bonus par joueur et par manche
export const TIME_BONUS_S = 10;              // bonus « temps » : secondes ajoutées au tour
export const TIME_BONUS_MS = TIME_BONUS_S * 1000;
export const SCORE_BONUS_PTS = 3;            // bonus « score » : points rapportés par la carte (au lieu de 1)

// ---- Blind test ----
export const BT_SONGS_OPTIONS = [5, 10, 15, 20, 30];
export const BT_GUESS_OPTIONS = [10, 15, 20, 30];      // secondes pour répondre (les extraits Deezer font 30 s)
export const BT_BREAK_SECONDS = FAST ? 3 : 15;          // révélation + scores entre deux morceaux
export const BT_MAX_SOLO = 16;                          // joueurs max sans équipes
export const BT_PREVIEW_S = 30;                         // durée d'un extrait
export const BT_DEFAULTS = { btSongs: 10, btGuess: 20, btOneGuess: false, btManual: false, btTeams: false, btScoring: "shared", btAudio: "all" };
