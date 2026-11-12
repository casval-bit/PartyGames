// Liste des mini-jeux (données pures : le moteur du créateur et l'interface la lisent).
// Tous les mini-jeux donnent un score entier, PLUS HAUT = MIEUX. Tout le monde joue la même partie en même temps (graine commune).
import { FAST } from "../config.js";

const pts = (s) => `${s} pt${s > 1 ? "s" : ""}`;
export const MINIGAMES = [
  { id: "bombtag", title: "Patate explosive", icon: "bomb", tag: "Arène", rule: "Une bombe passe de main en main : touche quelqu'un pour la refiler ! Celui qui la tient quand la mèche s'éteint saute. Dernier debout gagne.", seconds: 40, max: 560, fmt: pts },
  { id: "bomber", title: "Poseur de bombes", icon: "flame", tag: "Arène", rule: "Pose des bombes pour casser les caisses et faire sauter les autres. Ne reste pas dans la croix de flammes ! Ramasse les objets : flamme plus longue, bombe en plus.", seconds: 60, max: 1000, fmt: pts },
  { id: "tanks", title: "Chars d'assaut", icon: "crosshair", tag: "Arène", rule: "Pilote ton petit char : il tire dans la direction où il regarde. Tes obus rebondissent une fois sur les murs. 3 touches et un char saute !", seconds: 45, max: 600, fmt: pts },
  { id: "crown", title: "Roi de la colline", icon: "crown", tag: "Arène", rule: "Reste seul dans la zone dorée pour marquer. Pousse les autres dehors en fonçant ! La zone change de place : suis-la.", seconds: 35, max: 500, fmt: pts },
  { id: "kart", title: "Grand Prix de karts", icon: "car", tag: "Course", rule: "Course de karts : tourne avec les flèches (ou en glissant le doigt), l'accélérateur est automatique. Passe sur les flèches vertes pour un turbo, prends les boîtes : champignon pour foncer, banane pour piéger les autres.", seconds: 40, max: 650, fmt: pts },
  { id: "cannons", title: "Canons en cercle", icon: "anchor", tag: "Survie", rule: "Les canons visent : un couloir rouge s'allume, puis le boulet traverse l'arène. Esquive ou saute par-dessus ! 3 cœurs. Ramasse les gemmes pour des points.", seconds: 32, max: 520, fmt: pts },
  { id: "sky", title: "Pilotes de l'extrême", icon: "plane", tag: "Course", rule: "Pilote ton avion dans le ciel : traverse un maximum d'anneaux (pile au centre = bonus), évite les mines, ramasse les boules bleues pour le turbo.", seconds: 36, max: 900, fmt: pts },
  { id: "pucks", title: "Palets glacés", icon: "target", tag: "Adresse", rule: "Lance tes palets vers la cible : glisse vers où tu vises, plus tu pousses plus ça va loin, relâche pour tirer. Chasse les palets adverses hors du plateau !", seconds: 40, max: 250, fmt: pts },
  { id: "maze", title: "Labyrinthe des gloutons", icon: "ghost", tag: "Collecte", rule: "Glisse dans le labyrinthe et mange un maximum de pastilles. Trois fantômes chassent ! La grosse boule rose te rend invincible : mange les fantômes et vole les pastilles des autres.", seconds: 45, max: 700, fmt: pts },
  { id: "snow", title: "Boules de neige géantes", icon: "snow", tag: "Arène", rule: "Roule ta boule sur la neige fraîche pour la faire grossir. Les grosses boules écrasent les petites : pousse les adversaires hors du plateau pour leur voler de la neige !", seconds: 38, max: 350, fmt: pts },
  { id: "hexfall", title: "Plancher fragile", icon: "hexagon", tag: "Survie", rule: "Les dalles s'effondrent sous tes pieds : cours, saute d'un étage à l'autre et sois le dernier à tomber !", seconds: 30, max: 400, fmt: pts },
  { id: "sumo", title: "Sumo de l'arène", icon: "shield", tag: "Arène", rule: "Reste sur l'arène qui rétrécit. Pousse les autres dehors en fonçant !", seconds: 30, max: 600, fmt: pts },
  { id: "coinchase", title: "Chasse aux pièces", icon: "coins", tag: "Collecte", rule: "Ramasse un maximum de pièces. Évite les boulets rouges : ils t'étourdissent !", seconds: 25, max: 260, fmt: pts },
  { id: "jumpclub", title: "Barre tournante", icon: "repeat", tag: "Survie", rule: "Saute par-dessus la barre qui tourne. Elle accélère et change de sens : le dernier debout gagne !", seconds: 30, max: 40, fmt: (s) => `${s} passage${s > 1 ? "s" : ""}` },
  { id: "paint", title: "Guerre de peinture", icon: "palette", tag: "Arène", rule: "Repeins le sol à ta couleur en marchant dessus. Fonce pour peindre large et bousculer les autres, ramasse le rouleau pour une traînée géante. Le plus de dalles à ta couleur gagne !", seconds: 35, max: 576, fmt: pts },
  { id: "chairs", title: "Plateformes musicales", icon: "music", tag: "Survie", rule: "Tourne dans l'arène tant que la musique joue. Au « STOP ! », fonce sur une plateforme : il en manque toujours une. Sans plateforme, tu es éliminé. Bouscule les autres pour passer devant !", seconds: 45, max: 450, fmt: pts },
  { id: "trails", title: "Traînées de lumière", icon: "bolt", tag: "Survie", rule: "Ta planche laisse un mur de lumière. Glisse pour tourner à angle droit, Turbo pour accélérer. Ne touche ni le bord ni une traînée : fais s'écraser les autres sur la tienne !", seconds: 32, max: 560, fmt: pts },
  { id: "fgrun", title: "Course d'obstacles", icon: "steps", tag: "Course", rule: "Glisse à gauche ou à droite pour changer de voie, vers le haut pour sauter. Évite les murs et saute les barres.", seconds: 30, max: 420, fmt: (s) => `${s} m` },
];
export const MG_BY = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));
/** Poids de tirage : tous les jeux sont au même niveau (un jeu peut demander plus ou moins avec `w`). */
export const gameWeight = (g) => g.w || 1;
/**
 * Tirage pondéré des mini-jeux : renvoie `draw()`. Un jeu qui vient de sortir ne revient pas avant `cool` autres tirages (pas de répétition).
 * `rnd` = générateur aléatoire (injectable pour les tests), `list` = jeux possibles.
 */
export function makeDraw(rnd = Math.random, cool = 6, list = MINIGAMES) {
  if (!list || !list.length) list = MINIGAMES;
  const recent = [];
  return () => {
    const free = list.filter((g) => !recent.includes(g.id)), pool = free.length ? free : list;
    let t = pool.reduce((a, g) => a + gameWeight(g), 0) * rnd(), pick = pool[pool.length - 1];
    for (const g of pool) { t -= gameWeight(g); if (t < 0) { pick = g; break; } }
    recent.push(pick.id); while (recent.length > Math.min(cool, list.length - 1)) recent.shift();
    return pick.id;
  };
}
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
  { id: 0, name: "Bleus", color: "#4aa8ff", ink: "#04203f" },
  { id: 1, name: "Rouges", color: "#ff5d73", ink: "#3a0610" },
];
/** Liste des jeux choisis par le créateur du lobby (vide = tous). Au moins 3 jeux pour garder de la variété. */
export function pickList(ids) {
  const ok = Array.isArray(ids) ? [...new Set(ids.filter((id) => MG_BY[id]))] : [];
  return ok.length >= 3 ? ok.map((id) => MG_BY[id]) : MINIGAMES;
}
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
