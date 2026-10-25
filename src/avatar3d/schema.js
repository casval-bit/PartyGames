// Avatar 3D (façon Fall Guys) : catalogue de toutes les pièces personnalisables (données pures, sans three.js — utilisable par le réseau et par les tests).
// UNE SEULE PEAU : le haricot. Sa taille et ses proportions ne changent jamais, avec ou sans costume. Tout le reste (couleurs, motifs, costumes d'animaux,
// vêtements, accessoires) ne change que l'apparence. Les emplacements « build » et « size » sont gardés (invisibles, une seule option) pour que les anciennes chaînes restent lisibles.
// L'apparence 3D d'un joueur tient dans UNE chaîne : un caractère (base 36) par « emplacement » (SLOTS), dans l'ordre ci-dessous.
// RÈGLE : on n'ajoute des options qu'à la FIN d'une liste et des emplacements qu'à la FIN de SLOTS, sinon les anciens profils changeraient d'apparence.
// rule : null = gratuit · { lv } = niveau minimum · { ach } = succès à obtenir (mêmes règles que le reste du profil).
import { ANIMALS, ANIMAL_IDS } from "./animals.js";
const L = (n) => ({ lv: n });
const A = (id) => ({ ach: id });
const o = (id, name, rule) => ({ id, name, rule: rule || null });
const c = (hex, name, rule) => ({ id: hex.slice(1), name, hex, rule: rule || null });

/* ------------------------------ palettes ------------------------------ */
export const BODYC = [
  c("#ff6fae", "Rose bonbon"), c("#ff9f1c", "Orange"), c("#ffd23a", "Jaune"), c("#b6e43a", "Citron vert"), c("#2fcf63", "Vert"), c("#3ee0b0", "Menthe"),
  c("#22c8d8", "Turquoise"), c("#4fb6ff", "Bleu ciel"), c("#3478f6", "Bleu"), c("#5a4fe0", "Indigo"), c("#9b5cf0", "Violet"), c("#e03fc0", "Magenta"),
  c("#f0373f", "Rouge"), c("#ff7a66", "Corail"), c("#ffcfa8", "Pêche"), c("#f1d9b5", "Beige"), c("#c98a57", "Caramel"), c("#8a5a38", "Brun"),
  c("#5a3825", "Chocolat"), c("#f6f3ec", "Blanc"), c("#aab0bd", "Gris"), c("#4d4f5c", "Anthracite"), c("#1f1d27", "Noir"),
  c("#7dff4a", "Vert néon", L(5)), c("#ff3df2", "Rose néon", L(5)), c("#cfd6e2", "Argent", L(8)), c("#e8f4ff", "Fantôme", L(7)), c("#ff5a1f", "Lave", L(12)), c("#f2c230", "Or", L(15)),
  c("#2f8f4a", "Vert forêt"), c("#b8342a", "Brique"), c("#1c2a5a", "Bleu nuit"), c("#5b2d8e", "Prune"), c("#e0c48a", "Sable"), c("#8c9a3a", "Olive"), c("#ffc4d6", "Rose pâle"),
];
export const HAIRC = [
  c("#1a1a1f", "Noir"), c("#3a2315", "Brun foncé"), c("#6a4125", "Châtain"), c("#a2432a", "Auburn"), c("#dc6a2c", "Roux"), c("#e9c66c", "Blond"),
  c("#f4eacb", "Platine"), c("#9b9ba6", "Gris"), c("#f5f5f5", "Blanc"), c("#d82a3a", "Rouge", L(2)), c("#ff6fae", "Rose", L(2)), c("#8b4bd8", "Violet", L(4)),
  c("#2f7de1", "Bleu", L(4)), c("#1fc3b0", "Turquoise", L(6)), c("#5bd05b", "Vert", L(6)), c("#f6f23a", "Jaune fluo", L(8)), c("#ff8f1f", "Orange vif", L(8)),
];
export const CLOTH = [
  c("#e23a3a", "Rouge"), c("#ff8a1f", "Orange"), c("#ffc933", "Jaune"), c("#9bd934", "Citron vert"), c("#2fb860", "Vert"), c("#18b5a0", "Sarcelle"),
  c("#39b8e8", "Cyan"), c("#2f6fe0", "Bleu"), c("#4a46c8", "Indigo"), c("#8a4ad8", "Violet"), c("#d441b0", "Magenta"), c("#ff8fb8", "Rose"),
  c("#f6f1e4", "Blanc"), c("#b9b4c2", "Gris clair"), c("#585266", "Gris foncé"), c("#1d1a24", "Noir"), c("#7a4a2a", "Marron"), c("#d9c39a", "Beige"),
  c("#1c2a5a", "Marine"), c("#e6b33a", "Or", L(10)),
];
export const EYEC = [
  c("#1d1d24", "Noir"), c("#4a2c16", "Marron"), c("#2f86e0", "Bleu"), c("#3ea34a", "Vert"), c("#a8742a", "Noisette"), c("#8c93a6", "Gris"),
  c("#9a4fe0", "Violet", L(3)), c("#e0303a", "Rouge", L(5)), c("#ff6fae", "Rose", L(7)), c("#f2c200", "Or", L(9)),
];
/** Teinte de la « plaque » du visage (la zone claire où sont les yeux). */
export const FACEC = [
  c("#fff0dc", "Crème"), c("#ffffff", "Blanc"), c("#ffd9c4", "Pêche"), c("#ffd0dc", "Rose pâle"), c("#d6ecff", "Bleu pâle"), c("#d3f3e2", "Menthe pâle"),
  c("#e5dcff", "Lilas"), c("#f6e7a8", "Beurre"), c("#f1d9b5", "Beige"), c("#e8b98a", "Hâlé"), c("#c98a57", "Caramel"), c("#8a5a38", "Brun"), c("#5a3825", "Chocolat"),
  c("#1b2733", "Écran sombre"), c("#2a2140", "Nuit"),
  { id: "body", name: "Comme le corps", hex: null, rule: null },
];
const SHOEC = CLOTH.slice(0, 19);
/** Couleur « d'origine » : le costume garde ses couleurs naturelles (banane jaune, requin gris-bleu…). */
const AUTO = { id: "auto", name: "Origine", hex: null, rule: null };
const SUITC = [AUTO, ...CLOTH];

/* ------------------------------ pièces ------------------------------ */
/** Anciens réglages de corpulence et de taille : il n'y en a plus (même corps, même taille pour tout le monde). Une seule option, jamais affichée. */
const BUILD = [o("norm", "Normale")];
const SIZE = [o("m", "Normal")];
const PAT = [
  o("none", "Uni"), o("belly", "Ventre clair"), o("stripes", "Rayures"), o("bands", "Grosses bandes"), o("dots", "Pois"), o("tiger", "Tigre"), o("cow", "Vache"),
  o("camo", "Camouflage"), o("checker", "Damier"), o("stars", "Étoiles"), o("hearts", "Cœurs"), o("zigzag", "Zigzag"), o("grad", "Dégradé"), o("split", "Moitié-moitié"),
  o("flames", "Flammes", L(3)), o("galaxy", "Galaxie", L(6)), o("scales", "Écailles", L(2)),
];
const POSE = [o("idle", "Détendu"), o("wave", "Salut"), o("hips", "Mains sur les hanches"), o("flex", "Muscles"), o("cheer", "Victoire"), o("think", "Pensif", L(3))];

const EYES = [
  o("pill", "Classiques"), o("round", "Ronds"), o("dot", "Petits points"), o("big", "Gros yeux"), o("googly", "Yeux globuleux"), o("angry", "Furieux"), o("sleepy", "Endormis"),
  o("happy", "Joyeux"), o("wink", "Clin d'œil"), o("derp", "Louchons"), o("cross", "KO", L(2)), o("star", "Étoiles", L(3)), o("cyclops", "Cyclope"), o("three", "Trois yeux", L(3)),
  o("robot", "Robot", L(5)), o("heart", "Cœurs", L(7)), o("spiral", "Hypnotisés", L(10)), o("anime", "Brillants"),
];
const PATCH = [o("oval", "Ovale"), o("round", "Rond"), o("wide", "Large"), o("tall", "Haut"), o("band", "Masque"), o("none", "Aucune")];
const BROW = [o("none", "Aucun"), o("normal", "Normaux"), o("angry", "Froncés"), o("sad", "Tristes"), o("thick", "Épais"), o("raised", "Un levé"), o("uni", "Monosourcil")];
const MOUTH = [
  o("none", "Aucune"), o("smile", "Sourire"), o("grin", "Grand sourire"), o("open", "Ouverte"), o("tongue", "Langue"), o("derp", "Langue de côté"), o("flat", "Neutre"), o("smirk", "En coin"),
  o("fangs", "Crocs", L(2)), o("gap", "Dent manquante"), o("shock", "Surprise"), o("cat", "Chat"), o("braces", "Appareil dentaire", L(6)), o("zig", "Zigzag", L(9)), o("kiss", "Bisou"),
];
const NOSE = [
  o("none", "Aucun"), o("button", "Bouton"), o("big", "Gros nez"), o("point", "Pointu"), o("clown", "Nez rouge"), o("pig", "Groin"), o("duck", "Bec de canard", L(2)),
  o("beak", "Bec d'oiseau", L(3)), o("dog", "Truffe de chien"), o("trunk", "Trompe", L(5)), o("toucan", "Bec de toucan", L(8)), o("snout", "Museau de souris", L(4)),
];
const BEARD = [o("none", "Aucune"), o("stubble", "Barbe de 3 jours"), o("mustache", "Moustache"), o("handlebar", "Guidon"), o("goatee", "Bouc"), o("full", "Barbe"), o("long", "Barbe de sage", L(5)), o("soul", "Mouche")];
const FACE = [o("none", "Rien"), o("blush", "Joues roses"), o("freckles", "Taches de rousseur"), o("scar", "Cicatrice"), o("paint", "Peinture de guerre", L(2)), o("star", "Étoile"), o("tear", "Larme"), o("plaster", "Pansement"), o("tattoo", "Tatouage", L(8)), o("sweat", "Goutte de sueur")];

const EARS = [
  o("none", "Aucune"), o("bear", "Oreilles d'ours"), o("cat", "Oreilles de chat"), o("bunny", "Oreilles de lapin"), o("dog", "Oreilles tombantes"), o("mouse", "Grandes oreilles rondes"),
  o("elf", "Oreilles pointues"), o("bat", "Oreilles de chauve-souris", L(3)), o("eleph", "Oreilles d'éléphant", L(5)), o("fin", "Nageoires", L(4)),
];
const CREST = [
  o("none", "Rien"), o("horns", "Petites cornes"), o("unicorn", "Corne de licorne", L(3)), o("antlers", "Bois de cerf", L(4)), o("antenna", "Antennes"), o("sprout", "Pousse de plante"),
  o("spikes", "Piques de dino", L(2)), o("comb", "Crête de coq"), o("fin", "Aileron de requin", L(6)), o("bolt", "Éclair", L(5)), o("prop", "Hélice", L(7)), o("candle", "Bougie", L(9)),
];
const HAIR = [
  o("none", "Chauve"), o("tuft", "Mèche"), o("spiky", "Hérissé"), o("mohawk", "Crête punk"), o("afro", "Afro"), o("curly", "Bouclés"), o("pompadour", "Banane"),
  o("pigtails", "Couettes"), o("bun", "Chignon"), o("long", "Longs"), o("bowl", "Au bol"), o("emo", "Frange"), o("dreads", "Dreadlocks", L(6)), o("flame", "Flammes", L(13)),
];
const HAT = [
  o("none", "Rien"), o("cap", "Casquette"), o("capback", "Casquette à l'envers"), o("beanie", "Bonnet"), o("pompom", "Bonnet à pompon"), o("tophat", "Haut-de-forme"),
  o("cowboy", "Chapeau de cowboy"), o("pirate", "Tricorne de pirate"), o("viking", "Casque viking", L(2)), o("wizard", "Chapeau de sorcier", L(2)), o("chef", "Toque de chef", L(3)),
  o("devil", "Cornes de diable", L(3)), o("cat", "Oreilles de chat", L(2)), o("bunny", "Oreilles de lapin", L(4)), o("halo", "Auréole", L(6)), o("knight", "Heaume", L(7)),
  o("party", "Chapeau de fête"), o("headband", "Bandeau"), o("tiara", "Diadème", L(6)), o("sombrero", "Sombrero", L(5)), o("beret", "Béret"), o("bike", "Casque de vélo", L(4)),
  o("headphones", "Casque audio", L(4)), o("bowler", "Chapeau melon", L(8)), o("straw", "Chapeau de paille", L(3)), o("crown", "Couronne", L(20)), o("skull", "Crâne", A("streak3")),
  o("pencil", "Crayon sur l'oreille", A("pbUnique25")), o("cone", "Cône de chantier"), o("duck", "Canard en plastique", L(2)), o("pizza", "Part de pizza", L(3)), o("ring", "Bouée", L(4)),
];
const GLASSES = [
  o("none", "Rien"), o("round", "Rondes"), o("square", "Carrées"), o("shades", "Soleil"), o("aviator", "Aviateur", L(2)), o("monocle", "Monocle", L(3)), o("patch", "Cache-œil", L(2)),
  o("goggles", "Lunettes de piscine", L(4)), o("threed", "Lunettes 3D", L(5)), o("mask", "Masque de loup", L(6)), o("heart", "Cœurs", L(7)), o("welder", "Soudeur", L(10)),
  o("lynx", "Œil de lynx", A("qeFirst10")), o("visor", "Visière futuriste", L(12)),
];

const SUIT = [
  o("none", "Aucun"), o("hotdog", "Hot-dog"), o("banana", "Banane"), o("taco", "Taco"), o("bee", "Abeille", L(3)),
  o("astro", "Astronaute", L(6)), o("ninja", "Ninja", L(6)), o("pirate", "Pirate", L(7)),
  o("knight", "Chevalier", L(8)), o("hero", "Super-héros", L(9)), o("chef", "Cuistot", L(11)),
  // costumes d'animaux (animals.js) : ajoutés à la fin de la liste, comme le veut la règle
  ...ANIMAL_IDS.map((id) => o(id, ANIMALS[id].name, ANIMALS[id].lv ? L(ANIMALS[id].lv) : null)),
];
const TOP = [
  o("none", "Rien"), o("tee", "T-shirt"), o("hoodie", "Sweat à capuche"), o("tank", "Débardeur"), o("jacket", "Blouson"), o("suit", "Costume"), o("overalls", "Salopette"),
  o("hawaii", "Chemise hawaïenne"), o("stripes", "Marinière"), o("jersey", "Maillot de foot"), o("vest", "Gilet", L(2)), o("labcoat", "Blouse de labo", L(3)),
  o("armor", "Armure", L(7)), o("toga", "Toge", L(5)), o("dress", "Robe", L(2)), o("kimono", "Kimono", L(9)), o("tux", "Smoking", L(11)), o("spiked", "Cuir à pics", L(14)),
];
const BOT = [o("none", "Rien"), o("shorts", "Short"), o("jeans", "Pantalon"), o("trunks", "Maillot de bain"), o("skirt", "Jupe"), o("tutu", "Tutu", L(2)), o("kilt", "Kilt"), o("greaves", "Jambières", L(7))];
const NECK = [o("none", "Rien"), o("scarf", "Écharpe"), o("bow", "Nœud papillon"), o("bandana", "Bandana"), o("medal", "Médaille", L(3)), o("pearls", "Perles", L(4)), o("lei", "Collier de fleurs", L(5)), o("studs", "Collier à pointes", L(8)), o("camera", "Appareil photo", A("ccFound25")), o("stetho", "Stéthoscope", L(6)), o("heartneck", "Cœur d'ami", A("friend15")), o("tube", "Bouée gonflable", L(3))];
const SHOES = [o("bare", "Jambes nues"), o("sneak", "Baskets"), o("boots", "Bottes"), o("rain", "Bottes de pluie"), o("sandal", "Sandales"), o("clown", "Chaussures de clown", L(3)), o("flip", "Palmes", L(2)), o("hightop", "Montantes", L(5)), o("roller", "Rollers", L(9)), o("slipper", "Chaussons lapin", L(4)), o("paws", "Pattes de chat", L(3)), o("hoof", "Sabots de cheval", L(6))];
const TAIL = [o("none", "Aucune"), o("cat", "Queue de chat"), o("fox", "Queue de renard", L(2)), o("dino", "Queue de dino", L(2)), o("bunny", "Pompon de lapin"), o("pig", "Queue en tire-bouchon"), o("mouse", "Queue de souris"), o("devil", "Queue de diable", L(3)), o("duck", "Plumes de canard", L(4))];
const BACK = [o("none", "Rien"), o("cape", "Cape"), o("angel", "Ailes d'ange", L(4)), o("bat", "Ailes de chauve-souris", L(4)), o("pack", "Sac à dos"), o("jet", "Jetpack", L(8)), o("quiver", "Carquois", L(3)), o("shell", "Carapace", L(6)), o("guitar", "Guitare", L(5)), o("butterfly", "Ailes de papillon", L(10)), o("tank", "Bouteille de plongée", L(4))];
const HAND = [
  o("none", "Rien"), o("sword", "Épée en mousse"), o("mallet", "Maillet"), o("balloon", "Ballon"), o("trophy", "Trophée", A("wins5")), o("pad", "Manette", A("mgWins10")), o("mic", "Micro", A("btSongs20")),
  o("lolli", "Sucette géante"), o("bomb", "Bombe", L(2)), o("flag", "Drapeau", L(3)), o("pan", "Poêle", L(3)), o("flowers", "Bouquet", L(4)), o("wand", "Baguette magique", L(5)),
  o("squirt", "Pistolet à eau", L(6)), o("banana", "Banane", L(2)), o("die", "Dé géant", L(7)), o("hourglass", "Sablier", A("tuCards50")), o("axe", "Hache", L(12)),
];

/* ------------------------------ emplacements ------------------------------ */
// tab : onglet de l'éditeur · def : option choisie au départ · color : true = les options sont des couleurs (pastilles)
const S = (id, tab, label, opts, def = 0, extra = {}) => ({ id, tab, label, opts, def, ...extra });
export const SLOTS = [
  S("build", "hidden", "Corpulence", BUILD),
  S("size", "hidden", "Taille", SIZE),
  S("skin", "body", "Couleur principale", BODYC, 8, { color: true }),
  S("pat", "body", "Motif par-dessus", PAT),
  S("skin2", "body", "Couleur secondaire", BODYC, 19, { color: true }),
  S("pose", "body", "Pose", POSE),
  S("facec", "face", "Teinte du visage", FACEC, 0, { color: true }),
  S("patch", "face", "Forme du visage", PATCH),
  S("eyes", "face", "Yeux", EYES),
  S("eyec", "face", "Couleur des yeux", EYEC, 0, { color: true }),
  S("brow", "face", "Sourcils", BROW, 0),
  S("mouth", "face", "Bouche", MOUTH),
  S("nose", "face", "Nez, bec, museau", NOSE),
  S("beard", "face", "Barbe & moustache", BEARD),
  S("face", "face", "Détails du visage", FACE),
  S("ears", "head", "Oreilles", EARS),
  S("crest", "head", "Cornes & crêtes", CREST),
  S("hair", "head", "Cheveux", HAIR),
  S("hairc", "head", "Couleur des cheveux", HAIRC, 2, { color: true }),
  S("hat", "head", "Couvre-chef", HAT),
  S("hatc", "head", "Couleur du couvre-chef", CLOTH, 0, { color: true }),
  S("glasses", "head", "Lunettes & masques", GLASSES),
  S("glc", "head", "Couleur des lunettes", CLOTH, 15, { color: true }),
  S("suit", "costume", "Costume", SUIT),
  S("suitc", "costume", "Couleur du costume", SUITC, 0, { color: true }),
  S("suit2", "costume", "Détails du costume", SUITC, 0, { color: true }),
  S("top", "outfit", "Haut", TOP),
  S("topc", "outfit", "Couleur du haut", CLOTH, 0, { color: true }),
  S("top2", "outfit", "Couleur secondaire du haut", CLOTH, 12, { color: true }),
  S("bot", "outfit", "Bas", BOT),
  S("botc", "outfit", "Couleur du bas", CLOTH, 15, { color: true }),
  S("neck", "outfit", "Cou", NECK),
  S("neckc", "outfit", "Couleur du cou", CLOTH, 0, { color: true }),
  S("shoes", "extra", "Chaussures", SHOES),
  S("shoec", "extra", "Couleur des chaussures", SHOEC, 12, { color: true }),
  S("tail", "extra", "Queue", TAIL),
  S("back", "extra", "Dos", BACK),
  S("backc", "extra", "Couleur du dos", CLOTH, 0, { color: true }),
  S("hand", "extra", "Objet en main", HAND),
  S("handc", "extra", "Couleur de l'objet", CLOTH, 1, { color: true }),
];
export const SLOT_BY = Object.fromEntries(SLOTS.map((s, i) => [s.id, { ...s, i }]));
export const TABS = [
  { id: "body", label: "Peau", emoji: "🎨" }, { id: "costume", label: "Costume", emoji: "🦖" }, { id: "face", label: "Visage", emoji: "🤪" }, { id: "head", label: "Tête", emoji: "🎩" },
  { id: "outfit", label: "Tenue", emoji: "👕" }, { id: "extra", label: "Extras", emoji: "🎒" },
];
const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
if (SLOTS.some((s) => s.opts.length > B36.length)) throw new Error("avatar3d : trop d'options dans un emplacement (max 36)");

/** Tableau d'entiers (un par emplacement) ⇄ chaîne compacte. */
export const encodeX = (arr) => SLOTS.map((s, i) => B36[Math.max(0, Math.min(s.opts.length - 1, arr[i] | 0))]).join("");
/** Chaîne reçue (réseau, stockage) → tableau valide : tout ce qui est faux ou hors liste revient à la valeur par défaut. */
export function decodeX(str) {
  const t = typeof str === "string" ? str : "";
  return SLOTS.map((s, i) => { const v = B36.indexOf(t[i]); return v >= 0 && v < s.opts.length ? v : s.def; });
}
export const defaultXArr = () => SLOTS.map((s) => s.def);
export const DEFAULT_X = encodeX(defaultXArr());
export const cleanX = (str) => encodeX(decodeX(str));
/** Valeurs lisibles : { skin: option, … } */
export const partsOf = (str) => { const a = decodeX(str); return Object.fromEntries(SLOTS.map((s, i) => [s.id, s.opts[a[i]]])); };
export const setSlot = (str, slotId, idx) => { const a = decodeX(str); a[SLOT_BY[slotId].i] = idx; return encodeX(a); };
export const getSlot = (str, slotId) => decodeX(str)[SLOT_BY[slotId].i];

/** Aléatoire : `allow(rule)` décide des pièces permises (par défaut : seulement les gratuites, pour les bots). Reste sobre : un personnage lisible vaut mieux qu'un sapin de Noël. */
export function randomX(rnd = Math.random, allow = (r) => !r) {
  const a = SLOTS.map((s) => { const ok = s.opts.map((x, k) => (allow(x.rule) ? k : -1)).filter((k) => k >= 0); return ok.length ? ok[(rnd() * ok.length) | 0] : s.def; });
  const idx = (id) => SLOT_BY[id].i;
  const mostly = (id, p, v = 0) => { if (rnd() < p) a[idx(id)] = v; };
  // visage : le plus souvent deux yeux simples, rien d'autre
  const simple = [0, 0, 0, 1, 2, 3];
  if (rnd() < 0.7) a[idx("eyes")] = simple[(rnd() * simple.length) | 0];
  mostly("mouth", 0.78); mostly("brow", 0.8); mostly("face", 0.8); mostly("nose", 0.7); mostly("beard", 0.9); mostly("patch", 0.7);
  // motif
  mostly("pat", 0.55);
  // un seul « gros » thème à la fois : costume complet OU tenue
  const suited = rnd() < 0.3;
  if (!suited) a[idx("suit")] = 0;
  else { mostly("top", 1); mostly("bot", 1); mostly("hat", 0.7); mostly("hair", 0.9); mostly("neck", 0.9); mostly("back", 0.85); mostly("tail", 0.85); mostly("crest", 0.9); mostly("ears", 0.9); mostly("hand", 0.7); mostly("glasses", 0.85); }
  if (!suited) {
    mostly("top", 0.35); mostly("bot", 0.55); mostly("hat", 0.45); mostly("hair", 0.55); mostly("neck", 0.7); mostly("back", 0.72); mostly("tail", 0.7);
    mostly("crest", 0.75); mostly("ears", 0.65); mostly("hand", 0.6); mostly("glasses", 0.7);
    if (a[idx("hat")] !== 0) { a[idx("hair")] = 0; a[idx("crest")] = 0; }
  }
  mostly("pose", 0.6);
  return encodeX(a);
}
/** Personnage d'un joueur qui n'a pas encore d'avatar 3D (vieux profils) : un haricot de la teinte la plus proche de sa couleur de fond. */
export function legacyX(hex) {
  const a = defaultXArr();
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) {
    const t = rgb(hex);
    let best = a[SLOT_BY.skin.i], bd = 1e9;
    BODYC.forEach((x, k) => { if (x.rule) return; const r = rgb(x.hex), d = (r[0] - t[0]) ** 2 + (r[1] - t[1]) ** 2 + (r[2] - t[2]) ** 2; if (d < bd) { bd = d; best = k; } });
    a[SLOT_BY.skin.i] = best;
  }
  return encodeX(a);
}
/** Toutes les pièces à condition (pour les récompenses de succès et les cadenas) : [{ kind: "part", slot, id, name, rule }] */
export const PART_ITEMS = SLOTS.flatMap((s) => s.opts.filter((x) => x.rule).map((x) => ({ kind: "part", slot: s.id, id: s.id + ":" + x.id, name: x.name, rule: x.rule })));
