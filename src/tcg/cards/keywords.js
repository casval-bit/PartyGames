// Mots-clés donnés selon le rôle des cartes, comme dans le Trône de Fer JCE (les espions passent par l'ombre, les assassins
// surgissent en embuscade, les géants et les armées donnent l'assaut, les pirates pillent, les rois et les marchands ont de l'or
// à poser, les chefs et les criminels ont leur tête mise à prix…). Appliqués à la fabrication des cartes (build.js), en plus des
// mots-clés écrits sur la ligne de la carte. Une carte garde au plus 2 mots-clés « d'action » (Limité, Mise à prix, Terminal et
// Sans objet ne comptent pas) ; Don vient avec la capacité qui se sert de l'or posé, et seulement sur une carte qui n'a pas déjà
// deux capacités (le texte doit tenir sur la carte).
//
// Coûts : Ombre (X) = coût - 1 (au moins 1 ; un événement : coût - 1, au moins 0), en plus des 2 or pour la poser face cachée ;
// Embuscade (X) = coût ; Don (X) = 2, ou 3 à partir du coût 5 ; Mise à prix (X) = 1, ou 2 pour une carte 7.

const LOW = (a) => new Set(a.map((t) => t.toLowerCase()));
const OMBRE = LOW(["Espion", "Voleur", "Hors-la-loi", "Infiltré", "Imposteur", "Spectre", "Fantôme", "Mangemort", "Team Rocket", "Syndicat", "Faux de l'ombre", "Agent", "Ombre", "Russe", "Monde à l'envers", "District 13", "Meister", "Olmèque", "Bat-famille", "Passione", "Gang", "Esprit"]);
const EMBUSCADE = LOW(["Assassin", "Ninja", "Chasseur", "Chasseur de primes", "Loup-garou", "Vampire", "Prédateur", "Tueur", "Archer", "Sniper", "Carrière", "Commission", "Traceur"]);
const ASSAUT = LOW(["Géant", "Titan", "Dragon", "Kaiju", "Armée", "Soldat", "Orque", "Troll", "Golem", "Barbare", "Guerrier", "Monstre", "Combat", "Mobile Suit", "Uruk-hai", "Ent", "Créature", "Tekkadan", "ZAFT", "OZ", "Gjallarhorn", "Croc", "Pack", "Kryptonien", "Amazone"]);
const PILLARD = LOW(["Pirate", "Bandit", "Barbare", "Viking", "Orque", "Corsaire", "Pillard", "Hors-la-loi", "Voleur", "Chapeau de paille", "Conquistador"]);
const DON_RICHE = LOW(["Milliardaire", "Marchand", "Banquier", "Riche", "Commerce", "Capitole", "Inca"]);
const DON_ROI = LOW(["Roi", "Reine", "Empereur", "Impératrice", "Seigneur", "Zabi"]);
const DON_COUR = LOW(["Noble", "Prince", "Princesse", "Dame", "Duc", "Duchesse"]);
const PRIME = LOW(["Roi", "Reine", "Empereur", "Impératrice", "Seigneur", "Chef", "Capitaine", "Champion", "Légendaire", "Pirate", "Hors-la-loi", "Vilain", "Méchant", "Président", "Zabi"]);
const SANS_OBJET = LOW(["Animal", "Bête"]);
// traits exigés par des objets (« Scooby Snacks » : Chien, « Chapeau de shérif » : Cow-boy…) : ces cartes gardent leurs objets
const PORTEURS = LOW(["Chien", "Bretteur", "Cow-boy", "Chasseur", "Pirate", "Lyoko", "Pilote", "Gryffondor", "District 12", "Ado", "Space Ranger", "Enfant du Soleil", "Légendaire"]);
const LIEU_DON = LOW(["Château", "Palais", "Commerce", "Magasin", "Banque", "Trésor", "Royaume", "Bar"]);
const OBJ_DON = LOW(["Trésor", "Bijou", "Relique", "Artefact", "Trophée", "Luxe", "Couronne", "Médaillon"]);
const OBJ_TERMINAL = LOW(["Piège", "Poison", "Nourriture", "Fruit", "Potion", "Prison", "Cadeau", "Explosif", "Bombe", "Malédiction", "Horcruxe", "Sortilège"]);
const EVT_OMBRE = LOW(["Secret", "Complot", "Piège", "Poison", "Trahison", "Tactique", "Fuite", "Évasion", "Mission", "Enquête", "Ruse"]);
const MINOR = new Set(["limite", "prime", "terminal", "sansobjet"]);

const split = (s, sep) => String(s || "").split(sep).map((x) => x.trim()).filter(Boolean);

/** Ligne de carte (ch/loc/obj/ev de build.js) avec les mots-clés de son rôle ajoutés. Star Academy n'est pas touchée. */
export function withRoleKeywords(x, fam) {
  if (!x || x.type === "plot" || fam === "starac") return x;
  const traits = LOW(split(x.traits, "|"));
  const has = (set) => [...traits].some((t) => set.has(t));
  const kws = split(x.kw, "|");
  const ids = new Set(kws.map((k) => k.split(":")[0]));
  const major = () => [...ids].filter((k) => !MINOR.has(k)).length;
  const abs = split(x.ab, ";");
  const add = (k, v, minor = false) => {
    if (ids.has(k) || (!minor && major() >= 2)) return false;
    ids.add(k); kws.push(v === undefined ? k : `${k}:${v}`);
    return true;
  };
  const cost = x.cost || 0;
  let ab = null;
  if (x.type === "char") {
    const pokemon = traits.has("pokémon");
    if (has(EMBUSCADE) && cost >= 1 && cost <= 5) add("embuscade", cost);
    if (has(OMBRE) && cost >= 2 && cost <= 6) add("ombre", Math.max(1, cost - 1));
    if (has(ASSAUT) && cost >= 4 && (x.str || 0) >= 4) add("assaut");
    if (has(PILLARD)) add("pillard");
    if (abs.length <= 1 && cost >= 2) {
      const don = cost >= 5 ? 3 : 2;
      if (has(DON_ROI) && add("don", don)) ab = "goldStr@Le trésor du royaume";
      else if (has(DON_RICHE) && add("don", don)) ab = "actGoldBank@Ses placements";
      else if (has(DON_COUR) && add("don", don)) ab = "actGoldDraw@Les intrigues de la cour";
    }
    // Mise à prix : chefs, rois, criminels… (« Légendaire » : seulement les Pokémon légendaires, pas l'équipe des Légendaires)
    if (cost >= 5 && [...traits].some((t) => PRIME.has(t) && (t !== "légendaire" || pokemon))) add("prime", cost >= 7 ? 2 : 1, true);
    if (has(SANS_OBJET) && !pokemon && !has(PORTEURS)) add("sansobjet", undefined, true);
  } else if (x.type === "loc") {
    if (abs.some((a) => /^income:/.test(a))) add("limite", undefined, true);
    if (has(LIEU_DON) && abs.length <= 1 && add("don", cost >= 3 ? 3 : 2)) ab = "actGoldBank@Les coffres";
  } else if (x.type === "obj") {
    if (has(OBJ_TERMINAL)) add("terminal", undefined, true);
    if (has(OBJ_DON) && abs.length <= 1 && add("don", 2)) ab = "attGoldStr@Serti d'or";
  } else if (x.type === "evt") {
    if (has(EVT_OMBRE) && cost >= 1) add("ombre", Math.max(0, cost - 1));
  }
  if (kws.length === split(x.kw, "|").length && !ab) return x;
  return { ...x, kw: kws.join("|"), ab: ab ? [...abs, ab].join(" ; ") : x.ab };
}
