// Loup-garou version Stranger Things : les rôles des Loups-Garous de Thiercelieux (jeu de base, Nouvelle Lune, Personnages,
// Le Village) et quelques rôles fanmade très joués en ligne (Wolfy, Loups-Garous en ligne), chacun incarné par un personnage.
// Les règles sont celles du jeu officiel ; seuls les noms et l'ambiance changent : les loups-garous sont les créatures
// du Monde à l'envers, les villageois les habitants de Hawkins.
//
// box : base | nl (Nouvelle Lune) | pers (Personnages) | village (Le Village) | fan (fanmade)
// tcg : carte du Trône des Mondes du même personnage (son illustration est réutilisée, y compris l'image importée par le joueur)
// group : nombre de cartes du rôle quand il est en jeu (Deux Sœurs, Trois Frères)

export const CAMPS = {
  village: { id: "village", name: "Hawkins", tag: "Hawkins", long: "Les habitants de Hawkins", color: "#5ee1ff", goal: "Éliminer toutes les créatures du Monde à l'envers (et les solitaires dangereux)." },
  loups: { id: "loups", name: "Le Monde à l'envers", tag: "Créature", long: "Les créatures du Monde à l'envers", color: "#ff4458", goal: "Éliminer tous les habitants de Hawkins." },
  solo: { id: "solo", name: "Solitaire", tag: "Solitaire", long: "En solitaire", color: "#ffb347", goal: "Remplir son propre objectif, seul contre tous." },
};

export const BOXES = [
  { id: "base", name: "Jeu de base", note: "Voyante, Sorcière, Chasseur, Cupidon, Petite Fille, Voleur" },
  { id: "nl", name: "Nouvelle Lune", note: "Salvateur, Ancien, Idiot, Bouc émissaire, Joueur de flûte" },
  { id: "pers", name: "Personnages", note: "Renard, Montreur d'ours, Chevalier, Juge bègue, Chien-loup, Enfant sauvage, Loup blanc…" },
  { id: "village", name: "Le Village", note: "Corbeau" },
  { id: "fan", name: "Fanmade", note: "Rôles en ligne : Mentaliste, Fossoyeur, Dictateur, Chaperon rouge, Loup bavard…" },
];

const r = (o) => o;
export const ROLES = {
  /* ------------------------------ jeu de base ------------------------------ */
  villageois: r({ name: "Simple villageois", st: "Habitant de Hawkins", sub: "Il ne demande qu'à vivre tranquille", camp: "village", box: "base", tcg: null,
    power: "Aucun pouvoir : il débat le jour et vote pour démasquer les créatures." }),
  loup: r({ name: "Loup-garou", st: "Démochien", sub: "La meute du Monde à l'envers", camp: "loups", box: "base", tcg: "stranger-demochiens-3",
    power: "Chaque nuit, la meute choisit ensemble un habitant à dévorer. Le jour, il se fait passer pour un habitant." }),
  voyante: r({ name: "Voyante", st: "Onze", sub: "Elle voit à travers le Néant", camp: "village", box: "base", tcg: "stranger-onze-7",
    power: "Chaque nuit, elle découvre le rôle d'un joueur de son choix." }),
  sorciere: r({ name: "Sorcière", st: "Dr Sam Owens", sub: "Le médecin du laboratoire", camp: "village", box: "base", tcg: "stranger-dr-sam-owens-3",
    power: "Deux potions, une seule fois chacune dans la partie : la potion de vie sauve la victime de la nuit, la potion de mort élimine un joueur. Il peut utiliser les deux la même nuit." }),
  chasseur: r({ name: "Chasseur", st: "Jim Hopper", sub: "Le shérif de Hawkins", camp: "village", box: "base", tcg: "stranger-jim-hopper-6",
    power: "Quand il meurt, dévoré ou éliminé par le village, il tire une dernière fois : le joueur de son choix meurt aussi." }),
  cupidon: r({ name: "Cupidon", st: "Murray Bauman", sub: "Il a vu juste pour Nancy et Jonathan", camp: "village", box: "base", tcg: "stranger-murray-bauman-2",
    power: "La première nuit, il désigne deux amoureux (il peut se choisir). Si l'un meurt, l'autre meurt de chagrin. Un habitant amoureux d'une créature ne gagne que s'ils restent les deux derniers." }),
  petitefille: r({ name: "Petite Fille", st: "Erica Sinclair", sub: "Elle passe par les conduits", camp: "village", box: "base", tcg: "stranger-erica-sinclair-1",
    power: "La nuit, elle espionne la meute : elle voit ses votes et ses messages, sans savoir qui écrit." }),
  voleur: r({ name: "Voleur", st: "Suzie", sub: "La hackeuse de génie", camp: "village", box: "base", tcg: null,
    power: "La première nuit, elle pirate le système : elle peut échanger son rôle contre l'une des deux cartes restées au centre. Si ce sont deux créatures, elle doit en prendre une." }),
  /* ------------------------------ Nouvelle Lune ------------------------------ */
  salvateur: r({ name: "Salvateur", st: "Steve Harrington", sub: "Le meilleur baby-sitter", camp: "village", box: "nl", tcg: "stranger-steve-harrington-5",
    power: "Chaque nuit, il protège un joueur des crocs de la meute (il peut se protéger), mais jamais le même deux nuits de suite." }),
  ancien: r({ name: "Ancien", st: "Max Mayfield", sub: "Running Up That Hill", camp: "village", box: "nl", tcg: "stranger-max-mayfield-3",
    power: "Elle survit à la première attaque de la meute : sa chanson la ramène. Si elle est éliminée par le village (vote, tir, potion de mort), tous les habitants perdent leurs pouvoirs." }),
  idiot: r({ name: "Idiot du village", st: "Argyle", sub: "Le livreur de pizza", camp: "village", box: "nl", tcg: "stranger-argyle-2",
    power: "Si le village vote contre lui, il est révélé et épargné… mais il ne vote plus jamais." }),
  bouc: r({ name: "Bouc émissaire", st: "Eddie Munson", sub: "Le coupable idéal", camp: "village", box: "nl", tcg: "stranger-eddie-munson-4",
    power: "En cas d'égalité au vote, c'est lui qui est éliminé. Il choisit alors qui aura le droit de voter le lendemain." }),
  flute: r({ name: "Joueur de flûte", st: "Papa", sub: "Le Dr Martin Brenner", camp: "solo", box: "nl", tcg: "stranger-dr-martin-brenner-5",
    power: "Chaque nuit, il prend le contrôle de deux joueurs, qui l'apprennent. Il gagne seul quand tous les survivants sont sous son contrôle." }),
  /* ------------------------------ Personnages ------------------------------ */
  villvill: r({ name: "Villageois-villageois", st: "Ted Wheeler", sub: "Il ne se doute de rien", camp: "village", box: "pers", tcg: null,
    power: "Son rôle est connu de tous dès le début : un habitant sans pouvoir, au-dessus de tout soupçon." }),
  juge: r({ name: "Juge bègue", st: "M. Clarke", sub: "Le prof de sciences", camp: "village", box: "pers", tcg: null,
    power: "Une fois dans la partie, juste après un vote, il peut déclencher un second vote immédiat, sans débat." }),
  chevalier: r({ name: "Chevalier à l'épée rouillée", st: "Lucas Sinclair", sub: "Le lance-pierre", camp: "village", box: "pers", tcg: "stranger-lucas-sinclair-3",
    power: "S'il est dévoré par la meute, la première créature assise à sa gauche meurt la nuit suivante." }),
  montreur: r({ name: "Montreur d'ours", st: "Joyce Byers", sub: "Les guirlandes de Noël", camp: "village", box: "pers", tcg: "stranger-joyce-byers-4",
    power: "Chaque matin, si l'un de ses deux voisins vivants est une créature, ses guirlandes clignotent : tout le monde le voit." }),
  renard: r({ name: "Renard", st: "Dustin Henderson", sub: "Le Cerebro capte un signal", camp: "village", box: "pers", tcg: "stranger-dustin-henderson-3",
    power: "Chaque nuit, il peut sonder un joueur et ses deux voisins. S'il y a une créature parmi eux, il garde son pouvoir ; sinon il le perd, mais sait que les trois sont innocents." }),
  soeur: r({ name: "Deux Sœurs", st: "Les mamans de Hawkins", sub: "Karen Wheeler et Claudia Henderson", group: 2, camp: "village", box: "pers", tcg: "stranger-karen-wheeler-2",
    power: "Elles se connaissent dès la première nuit et peuvent se parler en secret." }),
  frere: r({ name: "Trois Frères", st: "La police de Hawkins", sub: "Powell, Callahan et Flo", group: 3, camp: "village", box: "pers", tcg: null,
    power: "Ils se connaissent dès la première nuit et peuvent se parler en secret." }),
  servante: r({ name: "Servante dévouée", st: "Jonathan Byers", sub: "Le grand frère", camp: "village", box: "pers", tcg: "stranger-jonathan-byers-3",
    power: "Quand un joueur est éliminé par le vote, il peut prendre son rôle en secret : c'est Jonathan qui est révélé à sa place." }),
  comedien: r({ name: "Comédien", st: "Mike Wheeler", sub: "Le maître du jeu", camp: "village", box: "pers", tcg: "stranger-mike-wheeler-4",
    power: "Trois pouvoirs sont posés devant lui. Chaque nuit, il peut jouer l'un d'eux, une seule fois chacun." }),
  chienloup: r({ name: "Chien-loup", st: "Dart", sub: "Le bébé démogorgon de Dustin", camp: "village", box: "pers", tcg: null,
    power: "La première nuit, il choisit son camp pour toute la partie : rester avec Hawkins ou rejoindre la meute." }),
  enfant: r({ name: "Enfant sauvage", st: "Will Byers", sub: "Le lien avec le Flagelleur", camp: "village", box: "pers", tcg: "stranger-will-byers-4",
    power: "La première nuit, il choisit un modèle. Si son modèle meurt, le Flagelleur reprend le dessus : il rejoint la meute du Monde à l'envers." }),
  ange: r({ name: "Ange", st: "Barb", sub: "Justice pour Barb", camp: "solo", box: "pers", tcg: "stranger-barbara-holland-1",
    power: "Elle gagne seule si elle est éliminée au premier vote du village. Sinon, elle devient une simple habitante." }),
  sectaire: r({ name: "Abominable sectaire", st: "Jason Carver", sub: "Le capitaine des Tigers", camp: "solo", box: "pers", tcg: null,
    power: "Le village est coupé en deux clans : les Tigers et le Hellfire Club. Il gagne seul quand tout l'autre clan est éliminé." }),
  gml: r({ name: "Grand méchant loup", st: "Le Démogorgon", sub: "Le prédateur", camp: "loups", box: "pers", tcg: "stranger-le-demogorgon-5",
    power: "Il chasse avec la meute. Tant qu'aucune créature n'est morte, il dévore en plus une seconde victime chaque nuit." }),
  infect: r({ name: "Infect père des loups", st: "Le Flagelleur mental", sub: "L'ombre sur Hawkins", camp: "loups", box: "pers", tcg: "stranger-le-flagelleur-mental-7",
    power: "Une fois dans la partie, au lieu de tuer la victime de la meute, il la possède : elle rejoint la meute et garde ses pouvoirs." }),
  blanc: r({ name: "Loup-garou blanc", st: "Vecna", sub: "Le maître des cauchemars", camp: "solo", box: "pers", tcg: "stranger-vecna-7",
    power: "Il chasse avec la meute, qui le croit des siens. Une nuit sur deux, il peut tuer une créature. Il gagne seul s'il est le dernier survivant." }),
  /* ------------------------------ Le Village ------------------------------ */
  corbeau: r({ name: "Corbeau", st: "Nancy Wheeler", sub: "La journaliste du Hawkins Post", camp: "village", box: "village", tcg: "stranger-nancy-wheeler-5",
    power: "Chaque nuit, elle peut accuser un joueur dans un article anonyme : il aura 2 voix de plus contre lui au prochain vote." }),
  /* ------------------------------ fanmade (rôles en ligne) ------------------------------ */
  chaperon: r({ name: "Chaperon rouge", st: "Holly Wheeler", sub: "La petite sœur de Mike et Nancy", camp: "village", box: "fan", tcg: null,
    power: "Tant que le Chasseur (Hopper) est vivant, la meute ne peut pas la dévorer." }),
  mentaliste: r({ name: "Mentaliste", st: "Robin Buckley", sub: "La reine des codes", camp: "village", box: "fan", tcg: "stranger-robin-buckley-2",
    power: "Pendant chaque vote, peu avant la fin, elle apprend si le village s'apprête à éliminer une créature ou un innocent." }),
  fossoyeur: r({ name: "Fossoyeur", st: "Bob Newby", sub: "Bob, le super-héros", camp: "village", box: "fan", tcg: "stranger-bob-newby-2",
    power: "À sa mort, il désigne un joueur : son nom est annoncé avec celui d'un joueur de l'autre camp. L'un des deux est une créature." }),
  dictateur: r({ name: "Dictateur", st: "Larry Kline", sub: "Le maire de Hawkins", camp: "village", box: "fan", tcg: null,
    power: "Une fois dans la partie, à la place du vote, il décide seul qui est éliminé. Si c'est une créature, il devient capitaine ; sinon, il est éliminé lui aussi." }),
  chaman: r({ name: "Chaman", st: "Mama", sub: "Terry Ives", camp: "village", box: "fan", tcg: null,
    power: "La nuit, elle entend les morts : elle lit les messages qu'ils s'écrivent." }),
  noctambule: r({ name: "Noctambule", st: "Kali", sub: "Huit, la maîtresse des illusions", camp: "village", box: "fan", tcg: "stranger-kali-4",
    power: "Chaque nuit, elle plonge un joueur dans une illusion : son pouvoir de nuit ne marche pas." }),
  bavard: r({ name: "Loup bavard", st: "Billy Hargrove", sub: "Le possédé", camp: "loups", box: "fan", tcg: "stranger-billy-hargrove-6",
    power: "Il chasse avec la meute. Chaque jour, il reçoit un mot à glisser dans la conversation (puis il touche « Mot placé ») ; sinon, il meurt le soir." }),
  mercenaire: r({ name: "Mercenaire", st: "Grigori", sub: "L'agent russe", camp: "solo", box: "fan", tcg: null,
    power: "Le premier jour, il reçoit une cible : s'il la fait éliminer au premier vote, il gagne seul. Sinon, il devient un simple habitant." }),
};
for (const [id, d] of Object.entries(ROLES)) d.id = id;

/** Rôles qui comptent comme créatures pour la meute (le Loup blanc se fait passer pour l'une d'elles). */
export const WOLF_ROLES = ["loup", "gml", "infect", "bavard"];
/** Pouvoirs que le Comédien peut recevoir (pouvoirs de nuit à une seule cible). */
export const COMEDIEN_POWERS = ["voyante", "salvateur", "renard", "corbeau", "noctambule"];

/** Habitants de Hawkins sans pouvoir : un nom au hasard pour chaque Simple villageois. */
export const TOWNSFOLK = ["Benny Hammond", "Keith", "Chrissy Cunningham", "Fred Benson", "Patrick McKinney", "Vickie", "Gareth", "Jeff",
  "Tommy H.", "Carol", "Heather Holloway", "Doris Driscoll", "Wayne Munson", "Claudia Henderson", "Sue Sinclair", "Alexei", "Nicole", "Angela"];

/** Mots que le Loup bavard doit placer (simples, mais pas trop naturels). */
export const BAVARD_WORDS = ["gaufre", "boussole", "parapluie", "trampoline", "piscine", "glace à la cerise", "talkie-walkie", "cassette",
  "vélo", "lampe de poche", "boîte à musique", "skateboard", "arcade", "ketchup", "pizza", "grenouille", "tondeuse", "hélicoptère",
  "aspirateur", "baguette", "accordéon", "dinosaure", "spaghetti", "ananas", "téléphérique", "biscotte", "mammouth", "girafe"];

/** « Onze (Voyante) » : le personnage et son rôle officiel. */
export const roleTitle = (id) => (ROLES[id] ? `${ROLES[id].st} (${ROLES[id].name})` : "?");

/** Nombre de créatures conseillé pour n joueurs. */
export const wolvesFor = (n) => (n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 14 ? 4 : 5);

// Rôles proposés en priorité dans une composition automatique (les premiers sont les plus classiques).
const PRIORITY = ["voyante", "sorciere", "chasseur", "cupidon", "salvateur", "petitefille", "ancien", "idiot", "renard", "montreur",
  "mentaliste", "chevalier", "bouc", "juge", "fossoyeur", "corbeau", "servante", "chienloup", "enfant", "voleur", "chaperon", "comedien",
  "noctambule", "dictateur", "villvill", "chaman", "soeur", "frere"];
const SOLOS = ["flute", "blanc", "ange", "sectaire", "mercenaire"];
const SPECIAL_WOLVES = ["gml", "infect", "bavard"];

/**
 * Composition automatique pour n joueurs : `allowed` = rôles autorisés (ids), `wolves` = nombre de créatures (sinon conseillé).
 * Le Voleur ajoute 2 cartes « Simple villageois » au paquet (elles restent au centre). Renvoie une liste d'ids (n ou n + 2 cartes).
 */
export function autoCompo(n, allowed, { wolves = 0, rng = Math.random } = {}) {
  const ok = new Set(allowed && allowed.length ? allowed : Object.keys(ROLES));
  const W = Math.max(1, Math.min(n - 1, wolves || wolvesFor(n)));
  const out = [];
  // créatures : une ou deux spéciales au plus, le reste en Démochiens
  const specials = SPECIAL_WOLVES.filter((id) => ok.has(id)).sort(() => rng() - 0.5).slice(0, W >= 3 ? 2 : W >= 2 ? 1 : 0);
  for (const id of specials) if (out.length < W && rng() < 0.75) out.push(id);
  while (out.filter((x) => ROLES[x].camp === "loups").length < W) out.push("loup");
  // solitaires : un seul (deux à partir de 12 joueurs), pas avant 6 joueurs
  const solo = SOLOS.filter((id) => ok.has(id)).sort(() => rng() - 0.5).slice(0, n >= 12 ? 2 : n >= 6 ? 1 : 0);
  for (const id of solo) if (rng() < 0.6) out.push(id);
  // habitants spéciaux : on garde environ un quart de simples villageois
  const room = n - out.length;
  const plain = Math.max(n >= 7 ? 1 : 0, Math.round(room / 4));
  let want = room - plain;
  const pool = PRIORITY.filter((id) => ok.has(id));
  // un peu de hasard : les rôles les plus classiques restent en tête, les autres changent d'une partie à l'autre
  const head = pool.slice(0, 4), tail = pool.slice(4).sort(() => rng() - 0.5);
  for (const id of [...head, ...tail]) {
    const g = ROLES[id].group || 1;
    if (want <= 0) break;
    if (g > want) continue;
    for (let i = 0; i < g; i++) out.push(id);
    want -= g;
  }
  while (out.length < n) out.push("villageois");
  if (out.includes("voleur")) out.push("villageois", "villageois");
  return out.slice(0, out.includes("voleur") ? n + 2 : n);
}

/** Vérifie une composition choisie à la main : renvoie la liste d'erreurs (vide si tout va bien). */
export function checkCompo(list, n) {
  const err = [];
  const extra = list.includes("voleur") ? 2 : 0;
  if (list.length !== n + extra) err.push(`Il faut ${n + extra} cartes pour ${n} joueurs${extra ? " (le Voleur ajoute 2 cartes)" : ""}.`);
  if (!list.some((id) => ROLES[id] && ROLES[id].camp === "loups")) err.push("Il faut au moins une créature.");
  for (const id of ["soeur", "frere"]) { const k = list.filter((x) => x === id).length; if (k && k !== ROLES[id].group) err.push(`${ROLES[id].name} : il en faut exactement ${ROLES[id].group}.`); }
  for (const [id, d] of Object.entries(ROLES)) if (!d.group && id !== "loup" && id !== "villageois" && list.filter((x) => x === id).length > 1) err.push(`${d.st} (${d.name}) ne peut être qu'une fois en jeu.`);
  return err;
}
