// Liste des mini-jeux (données pures : le moteur du créateur et l'interface la lisent).
// Tous les mini-jeux donnent un score entier, PLUS HAUT = MIEUX. Tout le monde joue la même partie en même temps (graine commune).
import { FAST } from "../config.js";

const pts = (s) => `${s} pt${s > 1 ? "s" : ""}`;
export const MINIGAMES = [
  { id: "tap", title: "Tape-tape", emoji: "👆", tag: "Rapidité", rule: "Tape le plus de fois possible sur le bouton.", seconds: 8, max: 160, fmt: (s) => `${s} taps` },
  { id: "reflex", title: "Réflexe", emoji: "⚡", tag: "Rapidité", rule: "Quand l'écran devient vert, touche-le tout de suite. 3 essais. Trop tôt = raté.", seconds: 24, max: 3000, fmt: (s) => `${Math.round((3000 - s) / 3)} ms en moyenne` },
  { id: "moles", title: "Taupes", emoji: "🐹", tag: "Rapidité", rule: "Tape les taupes. Pas les bombes !", seconds: 15, max: 40, fmt: pts },
  { id: "simon", title: "Simon", emoji: "🎵", tag: "Mémoire", rule: "Regarde la suite de couleurs puis refais-la. Elle s'allonge à chaque fois.", seconds: 45, max: 30, fmt: (s) => `${s} niveau${s > 1 ? "x" : ""}` },
  { id: "stopbar", title: "Pile au centre", emoji: "🎯", tag: "Précision", rule: "Arrête le curseur au milieu. 3 essais, de plus en plus vite.", seconds: 22, max: 300, fmt: pts },
  { id: "count", title: "Compte-les !", emoji: "🔢", tag: "Coup d'œil", rule: "Des images clignotent : combien en as-tu vu ? 6 questions.", seconds: 45, max: 900, fmt: pts },
  { id: "maths", title: "Calcul mental", emoji: "➕", tag: "Réflexion", rule: "Choisis le bon résultat. Une erreur te fait perdre des points.", seconds: 25, max: 600, fmt: pts },
  { id: "stroop", title: "Couleur ou mot ?", emoji: "🌈", tag: "Réflexion", rule: "Touche la COULEUR de l'encre, pas le mot écrit !", seconds: 20, max: 80, fmt: pts },
  { id: "pairs", title: "Paires", emoji: "🃏", tag: "Mémoire", rule: "Retrouve les 8 paires le plus vite possible.", seconds: 60, max: 3000, fmt: pts },
  { id: "catch", title: "Rattrape-les", emoji: "🧺", tag: "Arcade", rule: "Glisse le panier pour attraper les fruits. Évite les bombes !", seconds: 20, max: 60, fmt: pts },
  { id: "dodge", title: "Esquive", emoji: "🚧", tag: "Arcade", rule: "Touche la gauche ou la droite de l'écran pour changer de voie. Tiens le plus longtemps.", seconds: 30, max: 320, fmt: (s) => `${(s / 10).toFixed(1).replace(".", ",")} s` },
  { id: "holdtime", title: "Chrono à l'aveugle", emoji: "⏱️", tag: "Précision", rule: "Le chrono disparaît : touche quand tu penses être à 5,00 s. 3 essais.", seconds: 34, max: 3000, fmt: pts },
  { id: "odd", title: "L'intrus", emoji: "🔍", tag: "Coup d'œil", rule: "Trouve l'image différente. La grille grandit !", seconds: 25, max: 60, fmt: pts },
  { id: "order", title: "Dans l'ordre", emoji: "🔟", tag: "Rapidité", rule: "Touche les nombres de 1 à 16, dans l'ordre, le plus vite possible.", seconds: 40, max: 3000, fmt: pts },
  { id: "target", title: "Cibles", emoji: "🔴", tag: "Précision", rule: "Touche la cible avant qu'elle ne rétrécisse. Plus tu es rapide, plus ça rapporte.", seconds: 18, max: 120, fmt: pts },
  { id: "flap", title: "Envol", emoji: "🐤", tag: "Arcade", rule: "Touche pour battre des ailes et passe entre les tuyaux.", seconds: 40, max: 40, fmt: (s) => `${s} tuyau${s > 1 ? "x" : ""}` },
  { id: "runner", title: "Saute-obstacles", emoji: "🏃", tag: "Arcade", rule: "Touche pour sauter par-dessus les obstacles.", seconds: 40, max: 60, fmt: (s) => `${s} obstacle${s > 1 ? "s" : ""}` },
  { id: "memgrid", title: "Mémo-grille", emoji: "🟦", tag: "Mémoire", rule: "Retiens les cases qui s'allument, puis touche-les.", seconds: 45, max: 20, fmt: (s) => `niveau ${s}` },
  { id: "bigger", title: "Le plus grand", emoji: "📏", tag: "Réflexion", rule: "Touche le calcul qui donne le plus grand résultat.", seconds: 20, max: 80, fmt: pts },
  { id: "arrows", title: "Flèches", emoji: "🧭", tag: "Réflexion", rule: "Touche la direction de la flèche. Si c'est écrit INVERSE, touche l'opposé !", seconds: 20, max: 80, fmt: pts },
  { id: "beat", title: "Pierre-feuille-ciseaux", emoji: "✂️", tag: "Réflexion", rule: "La machine joue : touche ce qui la bat.", seconds: 20, max: 80, fmt: pts },
  { id: "rhythm", title: "Rythme", emoji: "🥁", tag: "Précision", rule: "Touche quand le cercle touche l'anneau.", seconds: 22, max: 60, fmt: pts },
  { id: "fgrun", title: "Course de haricots", emoji: "🏃", tag: "3D", rule: "Glisse à gauche ou à droite pour changer de voie, vers le haut pour sauter. Évite les murs et saute les barres.", seconds: 30, max: 420, fmt: (s) => `${s} m` },
  { id: "hexfall", title: "Plancher fragile", emoji: "🟪", tag: "3D", rule: "Glisse pour courir : les dalles s'effondrent. Ne tombe pas !", seconds: 30, max: 400, fmt: pts },
  { id: "sumo", title: "Sumo bonbon", emoji: "💥", tag: "3D", rule: "Reste sur l'arène qui rétrécit. Pousse les autres en fonçant !", seconds: 30, max: 600, fmt: pts },
  { id: "jumpclub", title: "Barre tournante", emoji: "🌀", tag: "3D", rule: "Touche pour sauter par-dessus la barre qui tourne. Elle accélère et change de sens !", seconds: 30, max: 40, fmt: (s) => `${s} passage${s > 1 ? "s" : ""}` },
  { id: "coinchase", title: "Chasse aux pièces", emoji: "🪙", tag: "3D", rule: "Glisse pour ramasser les pièces. Évite les boulets rouges !", seconds: 25, max: 260, fmt: pts },
  { id: "tunnel", title: "Tunnel champêtre", emoji: "🌀", tag: "3D", rule: "Tourne autour du tunnel pour éviter les caisses. Plus tu avances, plus ça va vite !", seconds: 30, max: 420, fmt: (s) => `${s} m` },
  { id: "shroom", title: "Cueillette de champis", emoji: "🍄", tag: "3D", rule: "Cueille les champignons quand ils brillent en vert. Trop tôt ou trop tard : points perdus. L'or vaut le triple !", seconds: 30, max: 300, fmt: pts },
  { id: "safari", title: "Safari photo", emoji: "📸", tag: "3D", rule: "Glisse pour regarder autour, puis touche l'animal demandé pour le photographier. Attention : le modèle change !", seconds: 35, max: 300, fmt: pts },
  { id: "bowling", title: "Bowling bonbon", emoji: "🎳", tag: "3D", rule: "Touche une fois pour fixer la direction, une fois pour la puissance. 4 lancers !", seconds: 40, max: 480, fmt: pts },
];
export const MG_BY = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));
/** Durée réelle d'un mini-jeu (très courte dans les tests automatiques). */
export const playSeconds = (g) => (FAST ? Math.min(g.seconds, 6) : g.seconds);
export const MG_GRACE_S = 6; // marge de réseau avant que le créateur clôture la manche

/** Points de la manche selon le rang (égalité = même rang, mêmes points). 10 points au premier. */
export function rankPoints(rank, n) {
  if (n <= 1) return 10;
  return Math.max(1, Math.round(10 * (1 - (rank - 1) / n)));
}

/* ---------------- modes d'équipe (2 contre 2, 1 contre 3, 1 contre 2…) ----------------
   Chaque joueur joue le même mini-jeu sur son téléphone ; le score d'une équipe est la MOYENNE des scores de ses membres
   (équitable quelle que soit la taille des équipes). L'équipe gagnante gagne la manche, chacun de ses membres en même temps. */
export const MG_SIDES = [
  { id: 0, name: "Bleus", color: "#4aa8ff", ink: "#04203f", emoji: "🔵" },
  { id: 1, name: "Rouges", color: "#ff5d73", ink: "#3a0610", emoji: "🔴" },
];
/** Mode (« ffa », « 2v2 », « 1v3 »…) d'après la répartition { id: 0|1 } des joueurs présents. */
export function modeOf(teams, ids) {
  if (!teams) return "ffa";
  const a = ids.filter((id) => teams[id] === 0).length, b = ids.filter((id) => teams[id] === 1).length;
  if (!a || !b || a + b < 3) return "ffa"; // à deux, c'est un duel : pas d'équipes
  return `${Math.min(a, b)}v${Math.max(a, b)}`;
}
/** Répartition au hasard (mini-jeux hors plateau). `rnd` injectable pour les tests. */
export function randomTeams(ids, rnd = Math.random) {
  const n = ids.length;
  if (n < 3) return null;
  const r = rnd();
  const p = { 3: [0.5, 1], 4: [0.4, 0.7] }[n] || [0.5, 0.85]; // [limite « chacun pour soi », limite « équilibré »] ; au-delà : 1 contre tous
  if (r < p[0]) return null;
  const order = ids.map((id) => [rnd(), id]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const small = r < p[1] ? Math.floor(n / 2) : 1; // équilibré, ou un joueur seul contre les autres
  const flip = rnd() < 0.5 ? 0 : 1;
  return Object.fromEntries(order.map((id, i) => [id, i < small ? flip : 1 - flip]));
}
export const modeLabel = (mode) => (mode === "ffa" ? "Chacun pour soi" : mode.replace("v", " contre "));
/** Score d'une équipe : moyenne des scores de ses membres (0 pour qui n'a pas fini). */
export const teamAvg = (ids, score) => (ids.length ? ids.reduce((a, id) => a + (score[id] ?? 0), 0) / ids.length : 0);
