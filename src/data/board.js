// Plateau : cases, objets, événements (données pures, partagées par le moteur du créateur et l'interface).
// Les règles suivent celles des jeux de plateau « à la Mario Party » :
//  - dé de 1 à 10 ; case bleue +3 pièces, rouge −3 ; la COULEUR de la dernière case bleue/rouge de chacun décide du mini-jeu
//    (tous pareils = chacun pour soi, 2/2 = 2 contre 2, 1/3 = 1 contre 3) ; les cases « ? » comptent au hasard ;
//  - la gemme (l'étoile) coûte 20 pièces et change de case ; 3 gemmes bonus en fin de partie ; sprint final : pièces ×2.
export const BD_SIZE = 32; // plateau en boucle ; case 0 = départ
export const BD_LAYOUT = [
  "start", "blue", "blue", "item", "red", "blue", "event", "shop",
  "red", "blue", "red", "chance", "item", "blue", "red", "blue",
  "event", "shop2", "blue", "red", "item", "blue", "boss", "red",
  "blue", "red", "event", "blue", "item", "red", "chance", "blue",
];
export const SPACE_INFO = {
  start: { emoji: "🏁", name: "Départ", desc: "Case de départ, sans effet." },
  blue: { emoji: "🔵", name: "Case bleue", desc: "Gagne 3 pièces (6 pendant le sprint final)." },
  red: { emoji: "🔴", name: "Case rouge", desc: "Perds 3 pièces (6 pendant le sprint final)." },
  item: { emoji: "🎁", name: "Case cadeau", desc: "Reçois un objet au hasard." },
  event: { emoji: "❓", name: "Case surprise", desc: "Un événement au hasard (compte pour la gemme « surprises »)." },
  shop: { emoji: "🛒", name: "Boutique", desc: "Achète des objets utiles." },
  shop2: { emoji: "🏴‍☠️", name: "Marché noir", desc: "Des objets pour embêter les autres." },
  chance: { emoji: "🎰", name: "Coup de chance", desc: "Une roulette : échange de pièces, cadeau, jackpot…" },
  boss: { emoji: "👹", name: "Le Gredin", desc: "Il peut te voler des pièces… ou te faire un cadeau." },
};
// Quelles cases comptent comme « événement » pour la gemme bonus des surprises.
export const HAPPENING = new Set(["event", "chance", "boss"]);

// price : prix en boutique ; shop : "a" boutique, "b" marché noir, null = objet rare (cases cadeau / événements seulement)
export const ITEMS = {
  double: { emoji: "🎲", name: "Double dé", desc: "Lance deux dés : avance de la somme.", price: 5, shop: "a", w: 10 },
  triple: { emoji: "🎲", name: "Triple dé", desc: "Lance trois dés : avance de la somme !", price: 10, shop: "a", w: 4 },
  speed: { emoji: "👟", name: "Bottes de vitesse", desc: "Ton dé fait forcément 8, 9 ou 10.", price: 7, shop: "a", w: 8 },
  shield: { emoji: "🛡️", name: "Bouclier", desc: "Bloque la prochaine perte de pièces, de gemme, de malédiction ou le prochain vol.", price: 6, shop: "a", w: 8 },
  trap: { emoji: "🪤", name: "Piège", desc: "Pose un piège sur ta case : le premier qui s'y arrête perd 6 pièces.", price: 6, shop: "a", w: 6 },
  warp: { emoji: "🌀", name: "Téléporteur", desc: "Échange ta place avec un joueur tiré au hasard.", price: 5, shop: "a", w: 6 },
  lamp: { emoji: "🪔", name: "Lampe magique", desc: "Un génie t'envoie directement sur la gemme (tu ne lances pas le dé).", price: 20, shop: "a", w: 2 },
  magnet: { emoji: "🧲", name: "Aimant à gemmes", desc: "La gemme saute sur une case 3 à 10 cases devant toi.", price: 10, shop: "a", w: 3 },
  bag: { emoji: "🎒", name: "Sac à surprises", desc: "Remplit tes poches avec jusqu'à 3 objets au hasard.", price: 18, shop: "a", w: 2 },
  poison: { emoji: "🍄", name: "Champignon toxique", desc: "Le prochain dé du joueur visé sera de 1 à 3.", price: 5, shop: "b", target: true, w: 7 },
  reverse: { emoji: "↩️", name: "Dé à l'envers", desc: "Le joueur visé reculera à son prochain lancer.", price: 5, shop: "b", target: true, w: 6 },
  thief: { emoji: "🦹", name: "Voleur", desc: "Vole jusqu'à 5 pièces à un joueur.", price: 8, shop: "b", target: true, w: 7 },
  swap: { emoji: "🔄", name: "Échange", desc: "Échange ta place avec le joueur de ton choix.", price: 8, shop: "b", target: true, w: 6 },
  plunder: { emoji: "🧰", name: "Coffre pilleur", desc: "Vole un objet au hasard à un joueur.", price: 10, shop: "b", target: true, w: 4 },
  phone: { emoji: "📞", name: "Téléphone du Gredin", desc: "Appelle le Gredin chez le joueur visé : il subit son événement.", price: 10, shop: "b", target: true, w: 3 },
  suit: { emoji: "🦖", name: "Costume de monstre", desc: "Ce tour-ci, vole 3 pièces à chaque joueur que tu dépasses.", price: 10, shop: "b", w: 4 },
  ghost: { emoji: "👻", name: "Fantôme voleur", desc: "Vole une gemme au joueur visé (rien s'il n'en a pas).", price: 30, shop: "b", target: true, w: 1 },
  watch: { emoji: "⌛", name: "Sablier", desc: "Déclenche le sprint final tout de suite : pièces ×2 pour tout le monde.", price: 0, shop: null, w: 2 },
  barter: { emoji: "🔁", name: "Troc", desc: "Échange tous tes objets avec ceux d'un joueur.", price: 0, shop: null, target: true, w: 2 },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const SHOP_POOL = { a: ITEM_IDS.filter((k) => ITEMS[k].shop === "a"), b: ITEM_IDS.filter((k) => ITEMS[k].shop === "b") };
/** Tirage pondéré d'un objet (cases cadeau, événements) ; les objets rares sont inclus. */
export function randomItem(rnd = Math.random) {
  const tot = ITEM_IDS.reduce((a, k) => a + ITEMS[k].w, 0);
  let r = rnd() * tot;
  for (const k of ITEM_IDS) { r -= ITEMS[k].w; if (r < 0) return k; }
  return ITEM_IDS[0];
}
