import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "marvel", name: "Marvel", short: "Marvel", color: "#e23636", color2: "#3b0d0d", icon: "shield", motif: "halftone",
  desc: "Avengers, X-Men, Gardiens de la Galaxie et grands méchants : quand les Avengers attaquent ensemble, ils frappent plus fort.",
  passive: "fWinDraw:combat,1@Héros et vilains",
};

export const cards = [
  ch("Iron Man", "Tony Stark", 5, 4, "CRI", "Avenger|Génie|Milliardaire", "genie", "income:1", "R"),
  ch("Iron Man", "Armure Mark L", 7, 7, "CRI", "Avenger|Génie|Milliardaire", "celebre", "enterSearch:Avenger@Jarvis ; actPay:2@Nanotechnologie", "L"),
  ch("Captain America", "Le premier Avenger", 5, 5, "CI", "Avenger|Soldat", "celebre", "guard:Avenger@Le bouclier", "E"),
  ch("Thor", "Dieu du tonnerre", 6, 6, "CI", "Avenger|Dieu|Asgardien", "intimidation", "winKneel:combat@Tonnerre", "E"),
  ch("Hulk", "Bruce Banner", 6, 7, "C", "Avenger|Génie", "intimidation", "ifBehind:1@Hulk écrase !", "E"),
  ch("Black Widow", "Natasha Romanoff", 3, 3, "CR", "Avenger|Espion", "discret", "winDiscard:ruse,1@Interrogatoire", "R"),
  ch("Hawkeye", "Clint Barton", 3, 3, "C", "Avenger|Archer", "", "actMinus:1@Flèche explosive", "U"),
  ch("Spider-Man", "Peter Parker", 4, 4, "CR", "Avenger|Ado", "", "winStand:combat@Sens d'araignée", "R"),
  ch("Doctor Strange", "Sorcier suprême", 5, 4, "RI", "Avenger|Sorcier", "genie", "atkKneel:4@Le temps figé", "E"),
  ch("Black Panther", "Roi du Wakanda", 5, 5, "CI", "Avenger|Wakanda|Roi", "", "winGold:combat,1@Vibranium", "R"),
  ch("Captain Marvel", "Carol Danvers", 6, 6, "CI", "Avenger|Cosmique", "celebre", "", "R"),
  ch("Scarlet Witch", "Wanda Maximoff", 6, 5, "RI", "Avenger|Sorcier|Mutant", "", "enterKneel:5@Hex", "E"),
  ch("Vision", "L'androïde", 5, 5, "RI", "Avenger|Synthézoïde", "", "ifName:Scarlet Witch,1@Wanda", "U"),
  ch("Ant-Man", "Scott Lang", 2, 2, "R", "Avenger", "discret", "", "U"),
  ch("Star-Lord", "Peter Quill", 3, 3, "CI", "Gardien de la Galaxie", "", "ifWith:Gardien de la Galaxie,1@Awesome Mix", "U"),
  ch("Gamora", "La femme la plus dangereuse", 4, 4, "C", "Gardien de la Galaxie|Assassin", "duel", "", "U"),
  ch("Rocket", "Le raton laveur", 3, 3, "CR", "Gardien de la Galaxie", "", "actPay:2@Gros calibre", "U"),
  ch("Groot", "Je s'appelle Groot", 4, 5, "C", "Gardien de la Galaxie", "", "sacSave:Gardien de la Galaxie@Nous s'appelons Groot", "R"),
  ch("Wolverine", "Logan", 5, 5, "C", "X-Men|Mutant", "", "escape@Facteur auto-guérisseur", "E"),
  ch("Professeur Xavier", "Le télépathe", 5, 2, "RI", "X-Men|Mutant", "genie", "aura:Mutant,1@Cerebro", "E"),
  ch("Tornade", "Ororo Munroe", 4, 4, "CR", "X-Men|Mutant", "", "actMinus:2@Éclair", "U"),
  ch("Deadpool", "Le mercenaire bavard", 4, 4, "C", "Mercenaire|Mutant", "", "escape@Il guérit de tout", "R"),
  ch("Loki", "Dieu de la malice", 4, 3, "RI", "Dieu|Asgardien|Vilain", "discret", "escape@Illusion", "R"),
  ch("Magneto", "Maître du magnétisme", 6, 5, "CR", "Mutant|Vilain", "intimidation", "winKill:combat,3@Champ magnétique", "E"),
  ch("Ultron", "L'intelligence artificielle", 5, 5, "C", "Robot|Vilain", "intimidation", "", "R"),
  ch("Thanos", "Le Titan fou", 7, 7, "CRI", "Vilain|Titan|Cosmique", "intimidation|celebre", "enterKill:3@Destin inéluctable ; aura:Vilain,1@Les enfants de Thanos", "L"),
  ch("Venom", "Le symbiote", 5, 5, "C", "Vilain|Symbiote", "", "ifAtk:1@Nous sommes Venom", "U"),
  ch("Le Bouffon vert", "Norman Osborn", 4, 4, "CR", "Vilain|Milliardaire", "", "actSacKill:3@Citrouille explosive", "U"),
  ch("Mystique", "La métamorphe", 3, 3, "CR", "Mutant|Vilain", "discret", "", "U"),
  ch("Dents-de-sabre", "Le prédateur", 4, 4, "C", "Mutant|Vilain", "", "ifAtk:1@Griffes", "U"),
  ch("Kingpin", "Le caïd", 4, 3, "RI", "Vilain|Milliardaire", "", "income:1", "U"),
  ch("Chitauris", "L'armée de Thanos", 2, 2, "C", "Vilain", "", "", "C", { uni: false }),
  ch("Agents d'Hydra", "Hail Hydra", 1, 1, "C", "Vilain", "", "", "C", { uni: false }),
  ch("Nick Fury", "Directeur du SHIELD", 4, 2, "RI", "SHIELD|Espion", "", "enterSearch:Avenger@L'Initiative Avengers", "R"),
  ch("Agents du SHIELD", "Sur le terrain", 2, 2, "C", "SHIELD", "", "", "C", { uni: false }),
  // --- les plus puissants (coût 7)
  ch("Thor", "Stormbreaker", 7, 7, "CI", "Avenger|Dieu|Asgardien", "intimidation", "enterKneelAll:2@Apportez-moi Thanos !", "L"),
  ch("Hulk", "Le plus fort de tous", 7, 8, "C", "Avenger|Génie", "intimidation", "winBounce:combat,4@Hulk écrase tout !", "L"),
  ch("Scarlet Witch", "La Sorcière rouge", 7, 6, "RI", "Avenger|Sorcier|Mutant", "", "enterFreeze:6@Le Darkhold ; immune@Magie du chaos", "L"),
  ch("Captain America", "Digne de Mjolnir", 7, 6, "CI", "Avenger|Soldat", "", "enterPutPlay:Avenger,4@Avengers, rassemblement ! ; defWinPower:1@Je peux faire ça toute la journée", "L"),
  ch("Doctor Strange", "Le Sorcier suprême", 7, 5, "RI", "Avenger|Sorcier", "genie", "enterRevive:5@L'Œil d'Agamotto ; winDraw:ruse,1@14 000 605 futurs", "L"),
  // --- lieux
  loc("La tour des Avengers", "QG à New York", 2, "QG", "", "reduce:Avenger,1@Recrutement", "U"),
  loc("Le Wakanda", "Royaume caché", 1, "Wakanda", "limite", "income:1", "C"),
  loc("Le Sanctum Sanctorum", "Maison de Strange", 2, "Magie", "", "actDraw:1@Grimoires", "U"),
  loc("L'école Xavier", "Pour jeunes surdoués", 2, "X-Men", "", "reduce:Mutant,1@Accueil", "U"),
  // --- objets
  obj("Mjolnir", "Le marteau de Thor", 3, "Arme|Asgardien", "", "attStr:3", "E", { uni: true }),
  obj("Le bouclier de Captain America", "Vibranium", 2, "Bouclier", "", "attSave ; attStr:1", "R", { uni: true }),
  obj("Le Gant de l'infini", "Six gemmes", 3, "Artefact|Cosmique", "", "attStr:2 ; attKw:intimidation", "E", { uni: true }),
  obj("Lance-toiles", "Fait maison", 1, "Gadget", "", "attIcon:ruse", "C"),
  // --- événements
  ev("Avengers, rassemblement !", "Tous ensemble", 3, "Avengers", "evStandAll:Avenger", "R"),
  ev("Le Claquement", "D'un claquement de doigts", 5, "Cosmique", "evKillAll:2", "E"),
  ev("Hulk, écrase !", "Smash", 2, "Rage", "evBuff:3", "U"),
  ev("Portail de Strange", "Ailleurs", 2, "Magie", "evBounce:4", "U"),
  ev("Multivers", "Une autre version", 2, "Cosmique", "evRecall:*", "U"),
];

export const starters = [
  { id: "mv-avengers", name: "Les Avengers", leader: "marvel-iron-man-7", like: ["Avenger", "SHIELD"], avoid: ["Vilain", "Mutant"], desc: "Iron Man, Captain America, Thor et les autres : quand les Avengers attaquent ensemble, ça frappe fort." },
  { id: "mv-thanos", name: "Thanos et les vilains", leader: "marvel-thanos-7", like: ["Vilain", "Mutant", "X-Men"], avoid: ["Avenger"], desc: "Thanos, Magneto, Loki et les mutants : contrôler, éliminer, équilibrer." },
];
