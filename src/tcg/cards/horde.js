import { ch, loc, obj, ev } from "./build.js";

// La 34e Horde du Contrevent (Alain Damasio) : 23 hordiers qui remontent le vent vers l'Extrême-Amont.
export const meta = {
  id: "horde", name: "La Horde du Contrevent", short: "La Horde", color: "#b8c4cc", color2: "#2b3740", icon: "wind", motif: "wind",
  desc: "Vingt-trois hordiers en formation contre le vent : chaque échec les rend plus tenaces.",
  passive: "atkAura:Hordier,1@En formation",
};

const H = "Hordier";
export const cards = [
  ch("Golgoth", "Le Traceur", 7, 7, "CRI", `${H}|Traceur|Pack`, "celebre|intimidation", "atkBuff:Hordier,1@Ouvrir la trace ; noKneel:combat@Tête de la Horde", "L"),
  ch("Golgoth", "Le jeune traceur", 4, 4, "C", `${H}|Traceur|Pack`, "intimidation", "", "R"),
  ch("Pietro Della Rocca", "Le Prince", 5, 3, "RI", `${H}|Prince|Pack`, "", "domi:2 ; actStand:Hordier@Tenir la Horde unie", "E"),
  ch("Sov Strochnis", "Le Scribe", 3, 2, "RI", `${H}|Scribe|Pack`, "genie", "actDraw:1@Le Livre de la Horde", "R"),
  ch("Caracole", "Le Troubadour", 4, 3, "RI", `${H}|Troubadour`, "discret", "winDiscard:ruse,1@Joute verbale ; escape@Le carachrone", "E"),
  ch("Erg Machaon", "Le Combattant protecteur", 5, 5, "C", `${H}|Protecteur`, "duel", "guard:Hordier@Bouclier de la Horde", "R"),
  ch("Oroshi Melicerte", "L'Aéromaître", 4, 3, "RI", `${H}|Aéromaître|Pack`, "genie", "actKneel:3@Lire le vent", "R"),
  ch("Talweg Arcippé", "Le Géomaître", 3, 3, "RI", `${H}|Géomaître|Pack`, "", "reserve:1 ; enterDraw:1@Lire le terrain", "U"),
  ch("Firost de Toroge", "Le Pilier", 4, 5, "C", `${H}|Pilier|Pack`, "", "ifDef:1@Tenir", "U"),
  ch("Tourse", "L'autoursier", 2, 2, "CR", `${H}|Oiselier`, "", "", "C"),
  ch("Darbon", "Le fauconnier", 2, 2, "CR", `${H}|Oiselier`, "", "", "C"),
  ch("Steppe Phorehys", "Le Fleuron", 2, 1, "RI", `${H}|Fleuron`, "", "income:1", "U"),
  ch("Arval Redhamaj", "L'Éclaireur", 3, 2, "RI", `${H}|Éclaireur`, "discret", "winDraw:ruse,1@Reconnaissance", "U"),
  ch("Horst Dubka", "Ailier", 3, 3, "C", `${H}|Ailier`, "", "ifName:Karst Dubka,1@Les jumeaux", "C"),
  ch("Karst Dubka", "Ailier", 3, 3, "C", `${H}|Ailier`, "", "ifName:Horst Dubka,1@Les jumeaux", "C"),
  ch("Alme Capys", "La Soigneuse", 2, 1, "RI", `${H}|Soigneuse`, "", "actStand:Hordier@Soigner", "U"),
  ch("Aoi Nan", "Cueilleuse et sourcière", 2, 1, "RI", `${H}|Sourcière`, "", "enterDraw:1@Trouver l'eau", "U"),
  ch("Larco Scarsa", "Le Braconnier du ciel", 3, 3, "CR", `${H}|Braconnier`, "", "winGold:*,1@Prise", "U"),
  ch("Léarch", "Artisan du métal", 2, 2, "C", `${H}|Artisan`, "", "", "C"),
  ch("Callirhoé Déicoon", "La Feuleuse", 3, 3, "CR", `${H}|Feuleuse`, "", "enterGold:1@Le feu malgré le vent", "U"),
  ch("Boscavo Silamphre", "Artisan du bois", 2, 2, "C", `${H}|Artisan`, "", "", "C"),
  ch("Coriolis", "Croc", 3, 3, "CI", `${H}|Croc`, "", "ifAtk:1", "U"),
  ch("Sveziest", "Croc", 3, 3, "C", `${H}|Croc`, "", "ifAtk:1", "C"),
  ch("Barbak", "Croc", 3, 3, "CI", `${H}|Croc`, "", "ifWith:Croc,1", "C"),
  ch("Silène", "Fréole", 4, 3, "RI", "Fréole", "discret", "winDiscard:ruse,1@Charme des Fréoles", "R"),
  ch("Le Corroyeur", "Chasseur de hordes", 5, 5, "C", "Chasseur", "intimidation", "winKill:combat,2@La traque", "R"),
  ch("Nouchka", "De l'Escadre frêle", 3, 2, "CI", "Fréole", "", "", "U"),
  ch("Sélème d'Alticcio", "Tourangeau", 4, 3, "RI", "Tourangeau", "", "income:1 ; actKneel:2@Privilèges", "U"),
  // --- face au furvent (coût 7)
  ch("Erg Machaon", "Le Combattant", 7, 7, "C", `${H}|Protecteur`, "duel", "selfGuard@Inébranlable ; atkTerror:3@La lame du combattant", "L"),
  ch("Oroshi Melicerte", "Le furvent", 7, 5, "RI", `${H}|Aéromaître|Pack`, "genie", "enterKneelAll:2@Le furvent ; winDraw:ruse,1@Lire le vent", "L"),
  // --- lieux
  loc("Aberlaas", "L'Extrême-Aval", 1, "Ville", "limite", "income:1", "C"),
  loc("L'Extrême-Amont", "La source des vents", 4, "Mythe", "", "atkAura:Hordier,1", "R"),
  loc("Alticcio", "Les tours suspendues", 2, "Ville", "", "reduce:*,1@Commerce", "U"),
  loc("Le camp Bòban", "Refuge des rescapés", 3, "Refuge", "", "defAura:1", "U"),
  // --- objets
  obj("Le Livre de la Horde", "Huit siècles d'écrits", 1, "Livre", "", "attKw:genie", "R", { uni: true }),
  obj("Arbalète à répétition", "L'arme d'Erg", 2, "Arme", "", "attStr:2", "U"),
  obj("Harnais de pack", "En formation", 1, "Équipement", "", "attStr:1", "C"),
  obj("Aile de toile", "Pour l'ailier", 1, "Équipement", "", "attKw:discret", "C"),
  // --- événements (les formes du vent)
  ev("Zéfirine", "Brise légère", 0, "Vent", "evBuff:1", "C"),
  ev("Slamino", "Vent cinglant", 1, "Vent", "evKneel:2", "C"),
  ev("Stèche", "Vent sec", 1, "Vent", "evMinus:2", "U"),
  ev("Choon", "Le vent qui porte", 2, "Vent", "evDraw:2", "U"),
  ev("Crivetz", "Vent glacé", 2, "Vent", "evStandAll:Hordier", "R"),
  ev("Furvent", "Le plus fort des vents", 4, "Vent", "evKillAll:2", "E"),
];

export const starters = [
  { id: "horde-34", name: "La 34e Horde", leader: "horde-golgoth-7", like: ["Hordier", "Pack", "Croc"], avoid: ["Fréole", "Chasseur", "Tourangeau"], desc: "Golgoth en tête, la Horde avance en bloc : perdre ne fait que la rendre plus tenace." },
];
