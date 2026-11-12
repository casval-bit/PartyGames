// Doudous : petites créatures rondes et douces à personnaliser (catalogue, données pures sans three.js).
// Espèces (silhouette, oreilles, queue, détails), couleurs, motifs, yeux, bouches, joues, détails du visage,
// et garde-robe : couvre-chefs, lunettes, cou, dos, tenues, chaussures.
// rule : null = gratuit · { lv } = niveau minimum · { ach } = succès à obtenir.
const L = (n) => ({ lv: n });
const A = (id) => ({ ach: id });
const o = (id, name, rule, extra) => ({ id, name, rule: rule || null, ...(extra || {}) });
const c = (hex, name, rule) => ({ id: hex.slice(1), name, hex, rule: rule || null });

/**
 * Espèces. Silhouette : H hauteur du corps, Rx/Rz rayons (largeur / profondeur), cy hauteur du ventre (fraction de H),
 * nb/nt rondeur du bas et du haut (superellipse), pear = tête plus étroite que le ventre.
 * face : hauteur des yeux (fraction de H), écart des yeux ex et taille er (en fraction de Rx), bouche my, joues bx/by.
 * ears / tail / arms / feet / extras : pièces 3D propres à l'espèce. nose : petite truffe. snout : museau clair.
 */
export const SPECIES = [
  o("chat", "Chat", null, { H: 1.16, Rx: 0.6, Rz: 0.54, cy: 0.4, nb: 3.2, nt: 2.15, pear: 0.1, ears: "cat", tail: "cat", arms: "nub", feet: "round", nose: "pink", face: { y: 0.67, ex: 0.36, er: 0.17 } }),
  o("lapin", "Lapin", null, { H: 1.12, Rx: 0.57, Rz: 0.52, cy: 0.4, nb: 3.2, nt: 2.2, pear: 0.12, ears: "bunny", tail: "pom", arms: "nub", feet: "long", nose: "pink", face: { y: 0.66, ex: 0.35, er: 0.16 } }),
  o("ours", "Ourson", null, { H: 1.12, Rx: 0.62, Rz: 0.57, cy: 0.42, nb: 3.0, nt: 2.05, pear: 0.06, ears: "bear", tail: "pom", arms: "nub", feet: "round", snout: true, nose: "dark", face: { y: 0.68, ex: 0.38, er: 0.14 } }),
  o("renard", "Renard", null, { H: 1.14, Rx: 0.58, Rz: 0.53, cy: 0.4, nb: 3.2, nt: 2.2, pear: 0.14, ears: "fox", tail: "fox", arms: "nub", feet: "round", nose: "dark", face: { y: 0.66, ex: 0.35, er: 0.155 } }),
  o("chien", "Chiot", null, { H: 1.1, Rx: 0.61, Rz: 0.56, cy: 0.42, nb: 3.0, nt: 2.1, pear: 0.06, ears: "dog", tail: "dog", arms: "nub", feet: "round", snout: true, nose: "dark", face: { y: 0.68, ex: 0.37, er: 0.15 } }),
  o("souris", "Souris", null, { H: 1.04, Rx: 0.56, Rz: 0.52, cy: 0.4, nb: 3.0, nt: 2.1, pear: 0.1, ears: "mouse", tail: "mouse", arms: "nub", feet: "round", nose: "pink", face: { y: 0.64, ex: 0.34, er: 0.16 } }),
  o("grenouille", "Grenouille", null, { H: 0.96, Rx: 0.66, Rz: 0.58, cy: 0.38, nb: 3.4, nt: 1.9, pear: -0.02, ears: null, tail: null, arms: "nub", feet: "frog", frogEyes: true, face: { y: 0.78, ex: 0.4, er: 0.13 } }),
  o("pingouin", "Pingouin", null, { H: 1.2, Rx: 0.57, Rz: 0.53, cy: 0.42, nb: 2.7, nt: 2.2, pear: 0.14, ears: null, tail: null, arms: "flipper", feet: "duck", beak: "short", belly: true, face: { y: 0.68, ex: 0.33, er: 0.135 } }),
  o("poussin", "Poussin", null, { H: 1.0, Rx: 0.58, Rz: 0.54, cy: 0.42, nb: 2.9, nt: 2.0, pear: 0.04, ears: null, tuft: true, tail: "tuft", arms: "wing", feet: "duck", beak: "short", face: { y: 0.66, ex: 0.33, er: 0.14 } }),
  o("hibou", "Hibou", L(2), { H: 1.12, Rx: 0.6, Rz: 0.55, cy: 0.42, nb: 3.0, nt: 2.2, pear: 0.04, ears: "owl", tail: null, arms: "wing", feet: "duck", beak: "hook", eyeRings: true, face: { y: 0.66, ex: 0.36, er: 0.17 } }),
  o("axolotl", "Axolotl", L(3), { H: 1.0, Rx: 0.62, Rz: 0.55, cy: 0.42, nb: 3.0, nt: 2.0, pear: 0.02, ears: null, gills: true, tail: "axo", arms: "nub", feet: "round", face: { y: 0.64, ex: 0.4, er: 0.12 } }),
  o("fantome", "Fantôme", L(4), { H: 1.24, Rx: 0.56, Rz: 0.52, cy: 0.36, nb: 1.7, nt: 2.25, pear: 0.06, ears: null, tail: null, arms: "nub", feet: null, ghost: true, float: true, face: { y: 0.66, ex: 0.34, er: 0.15 } }),
  o("dragon", "Dragon", L(5), { H: 1.14, Rx: 0.6, Rz: 0.55, cy: 0.42, nb: 3.0, nt: 2.1, pear: 0.08, ears: null, horns: true, spikes: true, tail: "dragon", arms: "nub", feet: "round", nose: "dots", face: { y: 0.66, ex: 0.36, er: 0.15 } }),
  o("slime", "Slime", L(6), { H: 0.92, Rx: 0.66, Rz: 0.6, cy: 0.3, nb: 4.2, nt: 1.75, pear: -0.06, ears: null, tail: null, arms: null, feet: null, drip: true, glossy: true, face: { y: 0.6, ex: 0.4, er: 0.14 } }),
  o("alien", "Extraterrestre", L(7), { H: 1.12, Rx: 0.58, Rz: 0.53, cy: 0.42, nb: 3.0, nt: 2.0, pear: 0.0, ears: null, antennae: true, tail: null, arms: "nub", feet: "round", face: { y: 0.64, ex: 0.4, er: 0.19 } }),
  o("robot", "Robot", L(9), { H: 1.14, Rx: 0.6, Rz: 0.55, cy: 0.45, nb: 4.5, nt: 3.4, pear: 0.0, ears: "bolt", antenna: true, tail: null, arms: "nub", feet: "round", metal: true, face: { y: 0.66, ex: 0.36, er: 0.15 } }),
];

/** Couleurs du pelage (et des motifs). */
export const FUR = [
  c("#b9a3ef", "Lavande"), c("#9b7be8", "Violet"), c("#ffa8cb", "Rose bonbon"), c("#f2618d", "Framboise", L(2)), c("#ffb99c", "Pêche"), c("#ff8370", "Corail"),
  c("#ffa24f", "Orange"), c("#ffca5e", "Miel"), c("#ffe47a", "Citron"), c("#8de6c1", "Menthe"), c("#a7de71", "Pomme"), c("#3fa37a", "Sapin", L(3)),
  c("#5fd8d2", "Turquoise"), c("#8ecaff", "Ciel"), c("#5b8def", "Bleu"), c("#34508f", "Marine", L(2)), c("#f7f4ee", "Blanc"), c("#f3e1c0", "Crème"),
  c("#bcc1cc", "Gris perle"), c("#545a6b", "Anthracite", L(3)), c("#2d2b36", "Charbon", L(4)), c("#8c5c45", "Chocolat"), c("#cd8f57", "Caramel"), c("#e5494f", "Rouge", L(2)),
];
/** Couleurs des tissus et accessoires. */
export const CLOTH = [
  c("#f7f4ee", "Blanc"), c("#2d2b36", "Noir"), c("#e5494f", "Rouge"), c("#ff8fb8", "Rose"), c("#ffa24f", "Orange"), c("#ffd24a", "Jaune"),
  c("#7ad67a", "Vert"), c("#2f8f6a", "Vert sapin"), c("#5fd8d2", "Turquoise"), c("#5ea8ff", "Bleu ciel"), c("#3b5bd6", "Bleu roi"), c("#26335e", "Marine"),
  c("#9b7be8", "Violet"), c("#c9a6ff", "Lilas"), c("#8c5c45", "Brun"), c("#d9b98a", "Sable"), c("#9aa3b5", "Gris"), c("#e8b34a", "Or", L(5)),
  c("#5ee1ff", "Néon cyan", L(6)), c("#ff6aa8", "Néon rose", L(6)),
];
/** Couleurs des yeux (reflet du bas de l'œil). */
export const EYEC = [
  c("#6a55c9", "Améthyste"), c("#2c2440", "Nuit"), c("#7a4a32", "Chocolat"), c("#2f7fd6", "Océan"), c("#2f9a6a", "Forêt"), c("#d08a2a", "Ambre"),
  c("#e0508a", "Rose", L(2)), c("#d63a3a", "Rubis", L(4)), c("#2fc8d6", "Cyan", L(6)),
];

export const PATTERNS = [
  o("uni", "Uni"), o("ventre", "Ventre"), o("chaussettes", "Chaussettes"), o("degrade", "Dégradé"), o("taches", "Taches"), o("rayures", "Rayures"),
  o("pois", "Pois"), o("masque", "Masque"), o("tricolore", "Tricolore", L(2)), o("etoiles", "Étoiles", L(3)), o("coeurs", "Cœurs", L(4)),
  o("circuit", "Circuit", L(6)), o("galaxie", "Galaxie", L(8)), o("arcenciel", "Arc-en-ciel", L(10)),
];
export const EYES = [
  o("ronds", "Ronds brillants"), o("ovales", "Ovales"), o("billes", "Petites billes"), o("endormis", "Endormis"), o("rieurs", "Rieurs"),
  o("etoiles", "Étoilés", L(2)), o("felins", "Félins", L(2)), o("cils", "Grands cils", L(3)), o("coeurs", "Cœurs", L(5)), o("spirales", "Spirales", L(4)), o("led", "Écran", L(6)),
];
export const MOUTHS = [
  o("chat", "Petit w"), o("sourire", "Sourire"), o("grand", "Grand sourire"), o("o", "Petit o"), o("langue", "Langue tirée"),
  o("croc", "Petit croc"), o("dents", "Dents de lapin", L(2)), o("neutre", "Sérieux"), o("bisou", "Bisou", L(3)), o("zigzag", "Gêné", L(2)),
];
export const BLUSH = [
  o("rose", "Roses", null, { hex: "#ff8fb0" }), o("aucune", "Aucune"), o("peche", "Pêche", null, { hex: "#ffae8a" }), o("rouge", "Rouges", null, { hex: "#ff5a6e" }),
  o("violet", "Violettes", null, { hex: "#c48cff" }), o("traits", "Traits rosés", L(2), { hex: "#ff7fa0" }),
];
export const DECO = [
  o("aucun", "Aucun"), o("rousseur", "Taches de rousseur"), o("moustaches", "Moustaches"), o("grain", "Grain de beauté"), o("pansement", "Pansement", L(2)),
  o("etoile", "Étoile sur la joue", L(3)), o("larme", "Larme", L(4)), o("peinture", "Peinture de guerrier", L(5)), o("lunaire", "Croissant de lune", L(7)),
];

/* ------------------------------ garde-robe ------------------------------ */
export const HATS = [
  o("aucun", "Aucun"), o("casquette", "Casquette"), o("bonnet", "Bonnet"), o("pompon", "Bonnet à pompon", L(2)), o("beret", "Béret", L(2)),
  o("noeud", "Nœud"), o("fleur", "Fleur"), o("pousse", "Petite pousse"), o("fete", "Chapeau de fête", L(2)), o("antennes", "Serre-tête antennes", L(2)),
  o("paille", "Chapeau de paille", L(3)), o("bandeau", "Bandeau", L(3)), o("cowboy", "Chapeau de cowboy", L(4)), o("mage", "Chapeau de mage", L(5)),
  o("sorciere", "Chapeau de sorcière", L(6)), o("chef", "Toque de chef", L(7)), o("pirate", "Bicorne", L(7)), o("hautdeforme", "Haut-de-forme", L(8)),
  o("cornes", "Petites cornes", L(9)), o("tiare", "Tiare", L(10)), o("casque", "Casque audio", A("btSongs20")), o("aureole", "Auréole", A("streak5")),
  o("couronne", "Couronne", A("wins25")), o("aviateur", "Lunettes d'aviateur", L(5)),
];
export const GLASSES = [
  o("aucune", "Aucune"), o("rondes", "Rondes"), o("carrees", "Carrées"), o("soleil", "De soleil"), o("etoiles", "Étoiles", L(3)), o("coeurs", "Cœurs", L(4)),
  o("masque", "Masque de héros", L(5)), o("monocle", "Monocle", L(6)), o("visiere", "Visière holographique", L(10)),
];
export const NECKS = [
  o("aucun", "Aucun"), o("echarpe", "Écharpe"), o("papillon", "Nœud papillon"), o("bandana", "Bandana", L(2)), o("grelot", "Collier à grelot"),
  o("col", "Col marin", L(2)), o("cravate", "Cravate", L(3)), o("perles", "Collier de perles", L(4)), o("medaille", "Médaille", A("wins5")),
];
export const BACKS = [
  o("aucun", "Aucun"), o("sac", "Sac à dos"), o("cape", "Cape", L(3)), o("carquois", "Carquois", L(5)), o("fee", "Ailes de fée", L(6)),
  o("epee", "Épée", L(8)), o("chauvesouris", "Ailes de chauve-souris", L(8)), o("bouclier", "Bouclier", L(9)), o("jetpack", "Réacteur dorsal", L(12)),
  o("ange", "Ailes d'ange", L(15)),
];
/** Tenues : un vêtement (couche 3D qui suit le corps) peint d'une couleur principale et d'une couleur de détails. */
export const OUTFITS = [
  o("aucune", "Aucune"), o("tshirt", "T-shirt"), o("sweat", "Sweat à capuche"), o("salopette", "Salopette"), o("mariniere", "Marinière"),
  o("robe", "Robe"), o("pyjama", "Pyjama", L(2)), o("explorateur", "Tenue d'explorateur", L(2)), o("uniforme", "Uniforme d'écolier", L(3)),
  o("smoking", "Smoking", L(4)), o("ninja", "Tenue de ninja", L(4)), o("mage", "Robe de mage", L(5)), o("elfe", "Tunique sylvestre", L(6)),
  o("numerique", "Combinaison numérique", L(7)), o("gothique", "Robe gothique", L(7)), o("pilote", "Blouson de pilote", L(8)), o("kimono", "Kimono", L(9)),
  o("armure", "Armure", L(10)), o("heros", "Costume de héros", A("mgWins10")), o("royal", "Manteau royal", A("wins25")),
];
export const SHOES = [
  o("nus", "Pieds nus"), o("baskets", "Baskets"), o("bottes", "Bottes"), o("pantoufles", "Pantoufles"), o("pluie", "Bottes de pluie", L(2)),
  o("bottines", "Bottines", L(3)), o("patins", "Patins", L(6)),
];
