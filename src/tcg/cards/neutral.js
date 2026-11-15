// Cartes neutres : jouables dans n'importe quel deck (croisements entre les univers), offertes à tout le monde (2 exemplaires
// de chacune, voir giveNeutrals dans progress.js) : elles ne sortent jamais des boosters, de la boutique ni des Portails.
import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "neutre", name: "Neutre", short: "Neutre", color: "#a9b6cc", color2: "#2a3346", icon: "globe", motif: "rings",
  desc: "Cartes sans famille, utilisables dans tous les decks.",
  passive: "",
};

export const cards = [
  ch("Mercenaire", "Lame à louer", 2, 2, "C", "Mercenaire", "", "", "C", { uni: false }),
  ch("Espion", "Informateur", 2, 1, "R", "Espion", "discret", "", "C", { uni: false }),
  ch("Diplomate", "Porte-parole", 2, 1, "I", "Noble", "", "income:1", "U", { uni: false }),
  ch("Voyageur des mondes", "Passe-portail", 3, 2, "CRI", "Voyageur", "", "", "U", { uni: false }),
  loc("Portail interdimensionnel", "Passage entre les mondes", 1, "Portail", "limite", "income:1", "C"),
  loc("Marché noir", "Tout s'achète", 2, "Commerce", "", "reduce:*,1@Bonnes affaires", "U"),
  loc("Grande bibliothèque", "Savoir des mondes", 2, "Savoir", "", "actDraw:1@Lecture", "U"),
  loc("Forteresse", "Murailles", 3, "Fortification", "", "defAura:1", "R"),
  obj("Potion de soin", "Remède", 1, "Potion", "", "attSave", "C"),
  obj("Armure", "Plaques d'acier", 2, "Armure", "", "attStr:2", "C"),
  obj("Cape d'ombre", "Tissu des ténèbres", 1, "Cape", "", "attKw:discret", "U"),
  obj("Couronne", "Symbole de pouvoir", 2, "Couronne", "", "attKw:celebre", "R"),
  obj("Chaînes", "Captif", 2, "Prison", "", "attNoStand", "U"),
  ev("Renfort", "Au bon moment", 1, "Tactique", "evBuff:2", "C"),
  ev("Coup du destin", "La chance tourne", 0, "Destin", "evWinDraw:*,1", "C"),
  ev("Trahison", "Un poignard dans le dos", 2, "Complot", "evKill:3", "U"),
  ev("Héritage", "Ce qui revient", 1, "Destin", "evRecall:*", "U"),
  ev("Fuite", "Repli stratégique", 1, "Tactique", "evBounce:3", "U"),
  ev("Parade", "Pas cette fois", 2, "Tactique", "evCancel", "R"),
  ev("Vote de confiance", "Le peuple a parlé", 3, "Politique", "evPowerSteal:1", "R"),

  // Venus d'univers trop petits pour avoir leur propre famille (jamais de carte 7). fill: false : les decks de départ
  // ne les prennent pas pour se compléter.
  // Kaamelott
  ch("Perceval", "C'est pas faux", 1, 1, "C", "Chevalier|Table ronde", "", "loseDraw:1@Il retient la leçon", "C", { fill: false }),
  ch("Karadoc", "Le gras, c'est la vie", 2, 2, "C", "Chevalier|Table ronde", "", "ifDef:2@Pas bouger", "C", { fill: false }),
  loc("La Table ronde", "Le château de Kaamelott", 2, "Château", "", "reduce:Chevalier,1@L'appel des chevaliers", "U", { fill: false }),
  // Retour vers le futur
  ch("Marty McFly", "Le voyageur de 1985", 2, 1, "RI", "Voyageur temporel", "", "escape@Retour vers le futur", "U", { fill: false }),
  ch("Doc Brown", "Nom de Zeus !", 3, 1, "R", "Génie|Voyageur temporel", "genie", "enterSearch:*@Le convecteur temporel", "R", { fill: false }),
  obj("La DeLorean", "88 miles à l'heure", 3, "Véhicule", "", "attKw:discret ; attSave", "R", { fill: false }),
  // Shrek
  ch("Shrek", "L'ogre du marais", 5, 5, "CI", "Ogre", "intimidation", "", "R", { fill: false }),
  ch("L'Âne", "Le meilleur ami", 1, 1, "I", "Animal", "", "ifWith:Ogre,2@Mon meilleur ami", "U", { fill: false }),
  ch("Le Chat Potté", "Le chat botté", 3, 2, "CR", "Animal|Bretteur", "duel", "ifAlone:1@Le regard qui tue", "U", { fill: false }),
  loc("Le marais de Shrek", "Sortez de mon marais !", 2, "Marais", "", "domi:2", "U", { fill: false }),
  // Spy x Family
  ch("Anya Forger", "Waku waku !", 1, 1, "R", "Enfant|Télépathe", "", "winDraw:ruse,1@Elle lit dans les pensées", "U", { fill: false }),
  ch("Loid Forger", "Twilight", 4, 3, "RI", "Espion", "discret", "atkKneel:2@Opération Strix", "R", { fill: false }),
  ch("Yor Forger", "La Princesse Épine", 5, 5, "C", "Assassin", "", "winKill:combat,2@Une mission à finir", "R", { fill: false }),
  // Death Note
  ch("L", "Le détective sans visage", 3, 2, "RI", "Détective|Génie", "", "winDiscard:ruse,1@La déduction", "R", { fill: false }),
  ch("Ryuk", "Le shinigami qui s'ennuie", 4, 3, "CR", "Shinigami", "", "foeDiePower:1@Les humains sont intéressants", "R", { fill: false }),
  ev("Le Death Note", "Le nom est écrit", 3, "Shinigami", "evKill:4", "R", { fill: false }),
  // Sherlock Holmes
  ch("Sherlock Holmes", "Le détective de Baker Street", 4, 3, "R", "Détective|Génie", "genie", "actMinus:2@Élémentaire, mon cher Watson", "R", { fill: false }),
  ch("Docteur Watson", "Le fidèle ami", 2, 2, "CR", "Médecin", "", "guard:Détective@Toujours à ses côtés", "U", { fill: false }),
  // Among Us, Minecraft
  ch("L'Imposteur", "Sus", 2, 1, "R", "Imposteur", "discret", "actSacKill:2@Sabotage", "U", { fill: false }),
  ch("Creeper", "Ssssss…", 1, 1, "C", "Monstre", "", "dieKill:1@Ça explose", "C", { uni: false, fill: false }),
  // Kirikou, Ratatouille
  ch("Kirikou", "Il n'est pas grand", 1, 1, "RI", "Enfant", "", "ifAlone:2@…mais il est vaillant", "U", { fill: false }),
  ch("Rémy", "Le petit chef", 1, 1, "I", "Animal|Cuisinier", "", "actGold:1@Tout le monde peut cuisiner", "U", { fill: false }),
];

export const starters = [];
