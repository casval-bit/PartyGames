import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "citesdor", name: "Les Mystérieuses Cités d'or", short: "Cités d'or", color: "#ffb703", color2: "#6b3500", icon: "sun", motif: "sun",
  desc: "Les Enfants du Soleil, les marins espagnols et les peuples anciens à la recherche des Cités d'or.",
  passive: "fWinStand:ruse@Les Élus ; fFirstGold:1@Le Grand Condor",
};

export const cards = [
  ch("Esteban", "Enfant du Soleil", 3, 3, "CR", "Enfant du Soleil|Espagnol", "", "winDraw:ruse,1@Le médaillon du Soleil", "R"),
  ch("Esteban", "Fils d'Atanos", 7, 7, "CRI", "Enfant du Soleil|Atlante", "celebre", "enterSearch:*@Faire se lever le soleil ; aura:Enfant du Soleil,1@Les trois Élus", "L"),
  ch("Zia", "Fille de l'Inca", 3, 3, "RI", "Enfant du Soleil|Inca", "", "actDraw:1@Lire le quipu", "R"),
  ch("Zia", "Élue du Soleil", 6, 5, "RI", "Enfant du Soleil|Inca", "genie", "winPower:ruse,1@Médaillon de la Lune", "E"),
  ch("Tao", "Dernier descendant de Mu", 3, 2, "RI", "Enfant du Soleil|Mu", "genie", "", "U"),
  ch("Tao", "Héritier de l'empire de Mu", 5, 4, "CRI", "Enfant du Soleil|Mu", "genie", "enterSearch:Mu@Le livre de Mu", "R"),
  ch("Mendoza", "Marin espagnol", 3, 3, "C", "Espagnol|Marin|Bretteur", "", "", "U"),
  ch("Mendoza", "Le navigateur", 5, 5, "CR", "Espagnol|Marin|Bretteur", "duel", "winGold:combat,1@Chercheur d'or", "E"),
  ch("Sancho", "Le marin bavard", 2, 2, "C", "Espagnol|Marin", "", "ifName:Pedro,1@Inséparables", "C"),
  ch("Pedro", "Le marin maigre", 2, 2, "R", "Espagnol|Marin", "", "winSteal:ruse,1@Toujours l'or en tête", "C"),
  ch("Pichu", "Le perroquet de Tao", 1, 1, "R", "Animal", "discret", "", "C"),
  ch("Gomez", "Commandant espagnol", 5, 5, "C", "Espagnol|Conquistador", "intimidation", "winSteal:combat,1@Pillage", "R"),
  ch("Gaspard", "Capitaine de la garde", 4, 4, "C", "Espagnol|Conquistador", "", "ifName:Gomez,1@Aux ordres", "U"),
  ch("Pizarro", "Le gouverneur", 6, 6, "CI", "Espagnol|Conquistador", "intimidation", "enterKneel:4@Conquête", "E"),
  ch("Menator", "Chef des Olmèques", 6, 5, "RI", "Olmèque", "intimidation", "actKneel:4@Le bouclier ardent", "E"),
  ch("Calmèque", "Chef de guerre olmèque", 4, 4, "C", "Olmèque", "", "winKneel:combat@Traîtrise", "U"),
  ch("Guerriers olmèques", "Sous la montagne", 1, 1, "C", "Olmèque", "", "", "C", { uni: false }),
  ch("Papacamayo", "Chef maya", 3, 3, "RI", "Maya", "", "actStand:Enfant du Soleil@Le Village du Nouveau Soleil", "U"),
  ch("Atanos", "Le Grand Prêtre", 5, 4, "RI", "Atlante", "genie", "actDraw:1@La Grande Bibliothèque", "R"),
  ch("Zarès", "L'alchimiste", 5, 4, "RI", "Alchimiste", "discret", "winDiscard:ruse,1@Grimoire", "R", { key: "citesdor-zares" }),
  ch("Ambrosius", "Le mage noir", 6, 5, "RI", "Alchimiste", "discret|intimidation", "atkKneel:4@Magie noire", "E", { key: "citesdor-zares" }),
  ch("Isabella Laguerra", "La bretteuse", 4, 4, "CR", "Espagnol|Bretteur", "duel", "ifName:Mendoza,1@Rivale de cœur", "R"),
  ch("Fernando Laguerra", "Le Docteur", 3, 2, "R", "Espagnol", "", "winKill:ruse,2@Poisons", "U"),
  ch("Marinche", "La conseillère", 2, 1, "RI", "Inca", "", "actKneel:2@Manipulation", "U"),
  ch("Tetiola", "Le garde du corps", 3, 4, "C", "Inca", "", "guard:*@Protéger Marinche", "U"),
  ch("La Reine des Amazones", "Souveraine sage", 4, 3, "CI", "Amazone", "", "aura:Amazone,1@Les guerrières", "R"),
  ch("Guerrières amazones", "Gardiennes", 2, 2, "C", "Amazone", "", "", "C", { uni: false }),
  // --- les légendes (coût 7)
  ch("Zia", "La fille du Soleil", 7, 5, "RI", "Enfant du Soleil|Inca", "genie", "ifName:Esteban,2@Les Enfants du Soleil ; winStandAll:ruse@La lumière des Cités d'or", "L"),
  ch("Mendoza", "Le navigateur légendaire", 7, 7, "CR", "Espagnol|Marin|Bretteur", "duel", "guard:Enfant du Soleil@Il veille sur les enfants ; winSteal:*,2@L'or des Cités", "L"),
  // --- lieux
  loc("La Cité d'or", "Enfin trouvée", 3, "Cité|Mu", "limite", "income:2", "R"),
  loc("Le Grand Condor", "L'oiseau d'or", 2, "Véhicule|Mu", "", "reduce:*,1@Envol", "U"),
  loc("La Grande Bibliothèque", "Savoir d'Atlantis", 2, "Atlante", "", "actDraw:1@Les archives", "U"),
  loc("Barcelone", "Le port", 1, "Ville", "limite", "income:1", "C"),
  // --- objets
  obj("Le Médaillon du Soleil", "Moitié du disque", 1, "Médaillon", "", "attKw:celebre", "R", { req: "Enfant du Soleil", uni: true }),
  obj("Le quipu d'or", "Nœuds sacrés", 1, "Mu", "", "attKw:genie", "U"),
  obj("L'épée de Mendoza", "Lame de Tolède", 1, "Arme", "", "attStr:2", "C", { req: "Bretteur" }),
  obj("Le Solaris", "Navire de Mu", 2, "Mu|Véhicule", "", "attStand", "U"),
  // --- événements
  ev("Faire se lever le soleil", "Les médaillons réunis", 2, "Mu", "evStandAll:Enfant du Soleil", "R"),
  ev("Fièvre de l'or", "Tout pour l'or", 0, "Or", "evSteal:2", "C"),
  ev("La prophétie", "Les Élus", 2, "Mu", "evDraw:2", "U"),
  ev("Tempête en mer", "Avis de gros temps", 2, "Mer", "evKneel:3", "U"),
];

export const starters = [
  { id: "cdo-enfants", name: "Les Enfants du Soleil", leader: "citesdor-esteban-7", like: ["Enfant du Soleil", "Marin", "Mu", "Maya", "Atlante"], avoid: ["Conquistador", "Alchimiste"], desc: "Esteban, Zia, Tao et Mendoza : explorer, piocher et faire se lever le soleil." },
  { id: "cdo-conquete", name: "La Conquête", leader: "citesdor-pizarro-6", like: ["Conquistador", "Olmèque", "Alchimiste"], avoid: ["Enfant du Soleil"], desc: "Pizarro, Gomez, les Olmèques et Ambrosius : prendre l'or par la force." },
];
