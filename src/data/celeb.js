// Jeu « Célébrité » : quelles cartes de cards.csv sont des célébrités / personnages, et comment vérifier une réponse.
// UNIQUEMENT des personnes et des personnages fictifs : pas d'albums, de films, de séries, de groupes, de lieux, d'objets…
import { norm, matchForm } from "./blindtest.js";

// Catégories qui désignent des personnes ou des personnages (une seule suffit).
const STRONG = new Set(["acteur", "rappeur", "sportif", "footballeur", "politique", "histoire", "internet", "fictif", "dessinanime", "jeuvideo", "mythologie", "compositeur", "peintre", "kpop"]);
// Catégories qui ne sont jamais des personnes (œuvres, lieux, objets, animaux…) : la carte est refusée dès qu'elle en porte une.
const BAD = new Set(["film", "serie", "saga", "album", "tableau", "evenement", "pays", "marque", "plante", "animal", "pokemon", "legendaires", "citesdor", "anime", "manga"]);
// « Personnalité française » seule suffit (animateurs, humoristes…), sauf si c'est avant tout un cycliste / chanteur / auteur / réalisateur peu connu.
const FR_NOT_ENOUGH = new Set(["cycliste", "chanteur", "auteur", "realisateur"]);

// Célébrités connues d'une catégorie « large » (chanteurs, réalisateurs, auteurs) : seules celles-ci sont gardées.
const ALLOW = new Set([
  // chanteurs
  "Lenny Kravitz", "Will Smith", "Marilyn Monroe", "Michael Jackson", "Madonna", "Beyoncé", "Rihanna", "Taylor Swift", "Lady Gaga", "Elvis Presley",
  "Freddie Mercury", "Bob Marley", "Shakira", "Ed Sheeran", "Adele", "Céline Dion", "Dua Lipa", "Billie Eilish", "Bruno Mars", "The Weeknd", "Harry Styles",
  "Prince", "David Bowie", "Jacques Brel", "Angèle", "Dalida", "Joe Dassin", "Pharrell Williams", "Snoop Dogg", "Justin Bieber", "Whitney Houston",
  "Kurt Cobain", "Tina Turner", "Amy Winehouse", "Lana Del Rey", "Lorde", "Lauryn Hill", "Hayley Williams",
  "Édith Piaf", "Johnny Hallyday", "Stromae", "Mylène Farmer", "Charles Aznavour", "Serge Gainsbourg", "Christine and the Queens", "Zaz", "Vianney",
  "Louane", "Patrick Bruel", "Claude François", "Florent Pagny", "Aya Nakamura",
  // réalisateurs
  "Charlie Chaplin", "Steven Spielberg", "Quentin Tarantino", "Christopher Nolan", "Martin Scorsese", "Alfred Hitchcock", "Stanley Kubrick", "James Cameron",
  "Tim Burton", "Ridley Scott", "Peter Jackson", "George Lucas", "Francis Ford Coppola", "Hayao Miyazaki", "Greta Gerwig", "Denis Villeneuve", "Wes Anderson",
  "David Lynch", "Guillermo del Toro", "Pedro Almodóvar", "Woody Allen", "Sofia Coppola", "Spike Lee", "Zack Snyder", "Guy Ritchie", "Federico Fellini",
  "Luc Besson", "Dany Boon", "Jacques Tati", "Jean-Luc Godard", "François Truffaut", "Michel Gondry", "Costa-Gavras",
  // auteurs
  "William Shakespeare", "J. K. Rowling", "J. R. R. Tolkien", "Stephen King", "Agatha Christie", "Ernest Hemingway", "George Orwell", "Mark Twain",
  "Edgar Allan Poe", "Roald Dahl", "Dan Brown", "Jane Austen", "Oscar Wilde", "Franz Kafka", "Haruki Murakami", "Virginia Woolf", "Léon Tolstoï",
  "Fiodor Dostoïevski", "Arthur Conan Doyle", "Isaac Asimov", "H. P. Lovecraft", "George R. R. Martin", "Terry Pratchett", "Mary Shelley", "Bram Stoker",
  "Lewis Carroll", "Ian Fleming", "Stan Lee", "Hergé", "Goethe", "Johann Wolfgang von Goethe", "Platon", "Friedrich Nietzsche", "Eiichiro Oda", "Akira Toriyama",
  "Amélie Nothomb", "Guillaume Musso", "Marc Levy", "René Goscinny", "Albert Uderzo", "Alexandre Dumas", "Jules Verne", "Émile Zola", "Marcel Proust",
  "David Fincher", "Jean de La Fontaine", "Honoré de Balzac", "Guy de Maupassant", "Gustave Flaubert", "Albert Camus", "Antoine de Saint-Exupéry", "Charles Baudelaire", "Arthur Rimbaud", "Jean-Paul Sartre", "Marguerite Duras", "Bernard Werber",
  // personnages issus de plusieurs catégories (le tag « anime » les écarterait)
  "Pikachu", "Dracaufeu",
]);

// Cartes qui ressemblent à des personnes par leur catégorie mais n'en sont pas (groupes, titres, duos, noms trop vagues, inconnus du grand public).
const EXCLUDE = new Set([
  "BTS", "BLACKPINK", "TWICE", "Stray Kids", "EXO", "Seventeen", "NewJeans", "aespa", "ITZY", "Girls' Generation", "ENHYPEN", "TXT", "Gangnam Style", "Dynamite (BTS)", "V (BTS)",
  "Les Simpson", "Tom et Jerry", "Les Schtroumpfs", "Les Minions", "Oggy et les cafards", "Les Totally Spies", "Roméo et Juliette", "Alice au pays des merveilles",
  "Le Phénix", "Le Kraken", "Steve", "Tom Clancy", "Sid Meier", "John Carmack", "Vince Zampella",
  // héroïnes et héros de romans peu connus visuellement
  "Elinor Dashwood", "Marianne Dashwood", "Elizabeth Bennet", "Mr Darcy", "Emma Woodhouse", "Anne Elliot", "Jane Eyre", "Edward Rochester", "Heathcliff",
  "Catherine Earnshaw", "Oliver Twist", "Ebenezer Scrooge", "David Copperfield", "Jo March", "Anne Shirley", "Tom Sawyer", "Huckleberry Finn", "Dorian Gray",
  "Capitaine Achab", "Jay Gatsby", "Holden Caulfield", "Atticus Finch", "Lisbeth Salander", "Jean Valjean", "Cosette", "Edmond Dantès", "Emma Bovary",
  "Julien Sorel", "Gavroche", "Miss Marple", "Hamlet", "Matilda Wormwood",
]);

/** Une carte (objet de ALL_CARDS : { id, name, cats }) peut-elle servir au jeu Célébrité ? */
export function isCeleb(card) {
  if (!card || !card.name) return false;
  if (EXCLUDE.has(card.name)) return false;
  if (ALLOW.has(card.name)) return true;
  const cats = card.cats || [];
  // une carte « fictif » est un personnage même si elle porte aussi « saga » / « film » (Harry Potter, Spider-Man…)
  if (cats.some((c) => BAD.has(c)) && !cats.includes("fictif")) return false;
  if (cats.some((c) => STRONG.has(c))) return true;
  return cats.includes("francais") && !cats.some((c) => FR_NOT_ENOUGH.has(c));
}

export const celebPool = (cards) => cards.filter(isCeleb);

/* ------------------------------ vérification d'une réponse ------------------------------ */
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20 };
// Mots qu'on peut ajouter devant le nom sans que ça compte comme un autre mot (« c'est Macron », « je pense que c'est … »).
const LEAD = new Set(["c", "est", "cest", "ce", "ca", "cela", "je", "pense", "dirais", "crois", "que", "qu", "peut", "etre", "ou", "alors", "mr", "m", "mme", "monsieur", "madame", "mister", "miss", "dr", "docteur", "le", "la", "les", "l", "un", "une", "the", "its", "it", "is", "this"]);
const ARTICLES = new Set(["le", "la", "les", "l", "the", "un", "une"]);

/** Les formes acceptées : `full` (nom entier, avec ou sans ce qui est entre parenthèses) et `last` (nom de famille / dernier mot, seul). */
export function celebForms(name) {
  const base = String(name || "");
  const noParen = base.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
  const full = new Set(), last = new Set();
  for (const raw of [base, noParen]) {
    const withParen = raw === base && noParen !== base; // « Steve (Minecraft) » : le mot entre parenthèses n'est jamais une réponse seul
    let n = norm(raw);
    if (!n) continue;
    full.add(n);
    let toks = n.split(" ");
    if (toks.length > 1 && ARTICLES.has(toks[0])) { n = toks.slice(1).join(" "); full.add(n); toks = toks.slice(1); }
    const lastTok = toks[toks.length - 1];
    if (toks.length > 1 && ROMAN[lastTok]) full.add([...toks.slice(0, -1), String(ROMAN[lastTok])].join(" ")); // « Louis XIV » = « Louis 14 »
    else if (!withParen && toks.length > 1 && lastTok.length >= 4 && !/^\d+$/.test(lastTok)) last.add(lastTok);
  }
  return { full: [...full], last: [...last] };
}

/**
 * Compare ce que le joueur a tapé à la bonne réponse. "full" = trouvé ; "close" = presque (une faute de trop) ; null = non.
 * Le nom entier peut être noyé dans une phrase ; le nom de famille seul n'est accepté que s'il est (quasiment) tout seul :
 * « Macron » oui, « Jaden Smith » pour « Will Smith » non.
 */
export function celebCheck(text, name) {
  const g = norm(text);
  if (!g) return null;
  const { full, last } = celebForms(name);
  let res = null;
  for (const f of full) {
    const r = matchForm(g, f);
    if (r === "full") return "full";
    if (r === "close") res = "close";
  }
  const toks = g.split(" ").filter((w) => !LEAD.has(w));
  if (toks.length === 1) {
    for (const f of last) {
      const r = matchForm(toks[0], f);
      if (r === "full") return "full";
      if (r === "close") res = "close";
    }
  }
  return res;
}

/* ------------------------------ pixellisation ------------------------------ */
// Nombre de blocs sur le plus grand côté de l'image à chaque essai (essai 1 = très pixellisé). Après le dernier essai, l'image est révélée en entier.
export const CELEB_LEVELS = [5, 8, 12, 18, 28, 48];
export const CELEB_MAX_TRIES = CELEB_LEVELS.length;
export const CELEB_PENALTY = 10; // points de pénalité si on ne trouve pas (« hors limite », comme au golf)
export const CELEB_PAR = 3;

/** Nom golfique d'un score sur une manche (nombre d'essais). */
export function golfName(strokes) {
  if (strokes == null) return "";
  if (strokes >= CELEB_PENALTY) return "Hors limite";
  return ["", "Trou en un !", "Eagle", "Birdie", "Par", "Bogey", "Double bogey"][strokes] || "Bogey+";
}

/** Classement croissant (le moins de coups gagne) ; égalités = même rang. rows : [{ id, total }] → renvoie [{ id, total, rank }]. */
export function rankStrokes(rows) {
  const out = rows.map((r) => ({ ...r })).sort((a, b) => a.total - b.total);
  let rank = 0, prev = null;
  out.forEach((r, i) => { if (r.total !== prev) { rank = i + 1; prev = r.total; } r.rank = rank; });
  return out;
}

/** Indice affiché pendant la manche (type de célébrité). */
const HINT = {
  acteur: "Acteur·rice", rappeur: "Rappeur·se", sportif: "Sportif·ve", footballeur: "Footballeur", politique: "Politique", histoire: "Personnage historique",
  internet: "Personnalité internet", fictif: "Personnage fictif", dessinanime: "Dessin animé", jeuvideo: "Jeu vidéo", mythologie: "Mythologie",
  compositeur: "Compositeur", peintre: "Peintre", kpop: "K-pop", chanteur: "Chanteur·se", auteur: "Auteur·rice", realisateur: "Réalisateur·rice",
  emission: "Animateur·rice TV", francais: "Personnalité française", cycliste: "Cycliste", pokemon: "Pokémon",
};
export const celebHint = (card) => HINT[(card.cats || []).find((c) => HINT[c])] || "Célébrité";
