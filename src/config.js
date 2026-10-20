export const FAST = (import.meta.env && import.meta.env.VITE_FAST) === "1"; // réservé aux tests automatiques : durées raccourcies
export const APP_NAME = "Party Hub"; // nom de travail de la plateforme ; « Time's Up » est une marque déposée, à renommer avant le Play Store

// Connexion Spotify (facultative) : identifiant PUBLIC de l'appli créée sur developer.spotify.com (ce n'est pas un secret).
export const SPOTIFY_CLIENT_ID = (import.meta.env && import.meta.env.VITE_SPOTIFY_CLIENT_ID) || "9f78b94528334c31bd44c57248bd8068";
export const SPOTIFY_REDIRECT = (import.meta.env && import.meta.env.VITE_SPOTIFY_REDIRECT) || "https://casval-bit.github.io/PartyGames/spotify.html";
export const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || "";
export const SUPABASE_KEY = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || "";
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
  { id: "blindtest", label: "Blind test", note: "Devine le titre et l'artiste d'une playlist" },
  { id: "timeline", label: "Frise", note: "Replace les chansons dans l'ordre chronologique : une frise par équipe" },
  { id: "petitbac", label: "Petit bac", note: "Une lettre, six catégories : sois le plus rapide et le plus original" },
  { id: "board", label: "Plateau", note: "Jeu de plateau : dé, cases, objets, gemmes… et un mini-jeu à chaque tour" },
  { id: "party", label: "Mini-jeux", note: "Mini-jeux sur chaque téléphone et tests d'amitié : le meilleur total gagne" },
];
export const QE_ROUNDS_OPTIONS = [5, 8, 10, 15];
export const QE_DEFAULT_ROUNDS = 8;
export const QE_TAP_SECONDS = FAST ? 8 : 25;   // si quelqu'un ne touche pas l'écran, ça démarre quand même
export const QE_COUNT_MS = 5700;    // décompte rigolo 5-4-3-2-1 + "REGARDE !"
export const QE_PLAY_SECONDS = FAST ? 12 : 45;  // temps max pour trouver
export const QE_RESULT_MS = FAST ? 3000 : 7000;   // révélation de la réponse entre deux images
export const QE_MODES = [["mixed", "Mixte"], ["all", "Tout au hasard"], ["choose", "Choisi par un adversaire"]];
export const QE_DEFAULTS = { qeMode: "mixed" };
export const QE_PICK_SECONDS = FAST ? 6 : 20;  // mode « choisi par un adversaire » : temps pour choisir la catégorie
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
export const QUIT_VOTE_MS = FAST ? 6000 : 30000; // durée du vote « quitter la partie »
export const BT_SONGS_OPTIONS = [5, 10, 15, 20, 30, 50, 100];
export const BT_GUESS_OPTIONS = [10, 15, 20, 30];      // secondes pour répondre (les extraits Deezer font 30 s)
export const BT_BREAK_SECONDS = FAST ? 3 : 15;          // révélation + scores entre deux morceaux
export const BT_MAX_SOLO = 16;                          // joueurs max sans équipes
export const BT_PREVIEW_S = 30;                         // durée d'un extrait
export const BT_DEFAULTS = { btSongs: 10, btGuess: 20, btOneGuess: false, btManual: false, btTeams: false, btScoring: "shared", btAudio: "all" };

// ---- comptes (connexion par e-mail) ----
export const MOCK_AUTH = (import.meta.env && import.meta.env.VITE_MOCK_AUTH) === "1"; // tests automatiques : faux serveur de comptes, code « 123456 »
export const ACCOUNTS = ONLINE || MOCK_AUTH;

// ---- Frise musicale ----
export const TL_GOAL_OPTIONS = FAST ? [3, 10, 15, 20] : [10, 15, 20]; // cartes à aligner pour gagner (choix du créateur)
export const TL_PLACE_SECONDS = FAST ? 14 : 60;      // temps pour placer la carte
export const TL_REVEAL_SECONDS = FAST ? 3 : 8;       // révélation de l'année entre deux tours
export const TL_MAX_OFFSET_S = 10;                  // Frise : l'extrait démarre à un point aléatoire des 10 premières secondes
export const TL_PREVIEW_S = 30;                      // durée d'un extrait
export const TL_DEFAULTS = { tlGoal: 10, tlAudio: "all", tlUncertain: false };

// ---- Mini-jeux (« Party ») ----
export const MG_ROUNDS_OPTIONS = FAST ? [2, 3, 5, 8, 10, 15] : [5, 8, 10, 15]; // manches au choix du créateur
export const MG_INTRO_MS = FAST ? 1200 : 5500;        // présentation du mini-jeu + décompte
export const MG_RESULT_MS = FAST ? 1500 : 7000;       // classement de la manche
export const MG_ASK_SECONDS = FAST ? 6 : 15;          // temps pour répondre à une question d'amitié
export const MG_QREVEAL_MS = FAST ? 1200 : 5500;      // révélation de la réponse
export const MG_FRIEND_QS = FAST ? 2 : 3;             // questions par test d'amitié
export const MG_FRIEND_EVERY = 3;                     // un test d'amitié toutes les 3 manches
export const MG_FRIEND_PTS = 3;                       // points par bonne devinette
export const MG_DEFAULTS = { mgRounds: 8 };

// ---- Plateau ----
export const BD_ROUNDS_OPTIONS = FAST ? [2, 3, 5, 8] : [5, 8, 10, 12]; // tours de table au choix du créateur
export const BD_START_COINS = 10;
export const BD_GEM_COST = 20;       // prix d'une gemme (la gemme change de case après chaque achat)
export const BD_DIE = 10;            // dé de 1 à 10, comme dans Mario Party
export const BD_COLOR_COINS = 3;     // case bleue +3, rouge −3 (doublé pendant le sprint final)
export const BD_MINI_WIN = 10;       // pièces pour le(s) gagnant(s) d'un mini-jeu
export const BD_MAX_ITEMS = 3;
export const BD_PRE_SECONDS = FAST ? 8 : 30;      // temps pour jouer son tour (sinon le dé est lancé tout seul)
export const BD_CHOICE_SECONDS = FAST ? 6 : 15;   // acheter une gemme / choisir à la boutique
export const BD_STEP_MS = FAST ? 120 : 420;       // vitesse du pion
export const BD_END_MS = FAST ? 500 : 1500;       // pause après l'effet d'une case
export const BD_ORDER_MS = FAST ? 600 : 3500;     // dés qui décident de l'ordre de jeu au début
export const BD_DEFAULTS = { bdRounds: 8 };
/** Nombre de derniers tours en « sprint final » (pièces ×2). */
export const bdSprintTurns = (total) => (total >= 10 ? 5 : total >= 8 ? 3 : 2);

// ---- Petit bac ----
export const PB_ROUNDS_OPTIONS = [3, 5, 8];
export const PB_SECONDS_OPTIONS = [60, 90, 120];
export const PB_INTRO_MS = FAST ? 1500 : 3500;      // « Lettre X ! » avant que l'écriture commence
export const PB_GRACE_MS = 1500;                    // marge de réseau : dernières réponses acceptées après la fin du chrono
export const PB_STOP_MS = FAST ? 3000 : 8000;       // temps laissé aux autres quand quelqu'un crie STOP
export const PB_VOTE_SECONDS = FAST ? 15 : 60;      // contestation des réponses
export const PB_RESULT_SECONDS = FAST ? 5 : 15;     // points de la manche
export const PB_DEFAULTS = { pbRounds: 5, pbSeconds: 90, pbCats: "classic" };
export const PB_PLAY_SECONDS = (s) => (FAST ? Math.min(s, 20) : s);
