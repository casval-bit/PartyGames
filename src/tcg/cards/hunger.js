import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "hunger", name: "Hunger Games", short: "Hunger Games", color: "#ff7b00", color2: "#3d1300", icon: "flame", motif: "embers",
  desc: "Les tributs, le Capitole et la rébellion : la mort rôde, mais chaque perte rend plus fort.",
  passive: "fKillDraw:1@Puisse le sort vous être favorable",
};

export const cards = [
  ch("Katniss Everdeen", "Tribut volontaire", 3, 3, "C", "Tribut|District 12", "", "winDraw:combat,1@La fille du feu", "R"),
  ch("Katniss Everdeen", "Le Geai moqueur", 7, 6, "CRI", "Tribut|District 12|Rebelle|Geai moqueur", "celebre|discret", "aura:Rebelle,1@Symbole de la révolte ; winPower:influence,1@L'étincelle", "L"),
  ch("Peeta Mellark", "Le garçon des pains", 3, 2, "RI", "Tribut|District 12", "", "enterDraw:1@Camouflage", "U"),
  ch("Peeta Mellark", "Les amants maudits", 5, 4, "RI", "Tribut|District 12|Rebelle", "", "ifName:Katniss Everdeen,2@Les amants du district 12", "R"),
  ch("Gale Hawthorne", "Le chasseur", 4, 4, "C", "District 12|Rebelle", "", "winKill:combat,2@Pièges", "R"),
  ch("Haymitch Abernathy", "Le mentor", 4, 2, "RI", "Mentor|District 12", "", "actBuff:Tribut,2@Conseils de survie", "R"),
  ch("Effie Trinket", "L'hôtesse", 2, 1, "I", "Capitole", "", "income:1", "U"),
  ch("Cinna", "Le styliste", 3, 1, "I", "Capitole|Rebelle", "", "enterBuff:Tribut,1@La fille du feu", "R"),
  ch("Rue", "District 11", 2, 2, "R", "Tribut|District 11", "discret", "", "U"),
  ch("Primrose Everdeen", "Petite sœur", 1, 1, "I", "District 12", "", "", "C"),
  ch("Finnick Odair", "District 4", 5, 5, "CI", "Tribut|District 4|Rebelle", "celebre", "", "R"),
  ch("Johanna Mason", "District 7", 4, 4, "C", "Tribut|District 7|Rebelle", "", "ifAtk:1@La hache", "U"),
  ch("Beetee", "District 3", 3, 1, "RI", "Tribut|District 3|Rebelle", "genie", "actDraw:1@Électricité", "U"),
  ch("Mags", "District 4", 1, 1, "I", "Tribut|District 4", "", "sacSave:Tribut@Sacrifice", "C"),
  ch("Cato", "Le tribut de carrière", 5, 5, "C", "Tribut|Carrière|District 2", "intimidation", "winKill:combat,3@Brutalité", "R"),
  ch("Clove", "Lanceuse de couteaux", 3, 3, "C", "Tribut|Carrière|District 2", "", "ifWith:Carrière,1", "U"),
  ch("Glimmer", "District 1", 2, 2, "C", "Tribut|Carrière|District 1", "", "", "C"),
  ch("Tête de renard", "District 5", 2, 1, "R", "Tribut|District 5", "discret", "winSteal:ruse,1@Rusée", "U"),
  ch("Thresh", "District 11", 4, 5, "C", "Tribut|District 11", "", "", "U"),
  ch("Coriolanus Snow", "Le jeune mentor", 4, 3, "RI", "Capitole|Mentor", "", "actKneel:3@Ambition", "R", { key: "hunger-snow" }),
  ch("Président Snow", "Maître du Capitole", 7, 5, "RI", "Capitole|Président", "intimidation", "enterKill:3@Les roses blanches ; aura:Capitole,1@Panem", "L", { key: "hunger-snow" }),
  ch("Caesar Flickerman", "Le présentateur", 2, 1, "I", "Capitole", "", "domDraw:1@Interview", "C"),
  ch("Seneca Crane", "Haut Juge", 3, 1, "RI", "Capitole", "", "actKneel:3@L'arène se referme", "U"),
  ch("Plutarch Heavensbee", "Le double jeu", 4, 2, "RI", "Capitole|Rebelle", "discret", "enterSearch:Rebelle@Le plan", "R"),
  ch("Présidente Coin", "District 13", 5, 3, "RI", "District 13|Rebelle|Président", "", "aura:District 13,1@Discipline", "U"),
  ch("Lucy Gray Baird", "La chanteuse", 4, 3, "RI", "Tribut|District 12", "", "winDraw:influence,1@La ballade", "R"),
  ch("Boggs", "Soldat du 13", 3, 3, "C", "District 13|Rebelle", "", "guard:Rebelle@Protéger le Geai", "U"),
  ch("Pacificateurs", "Ordre du Capitole", 2, 2, "C", "Capitole|Pacificateur", "", "", "C", { uni: false }),
  // --- les vainqueurs (coût 7)
  ch("Finnick Odair", "Le vainqueur du district 4", 7, 6, "CI", "Tribut|District 4|Rebelle", "", "winFreeze:combat@Le filet ; domi:2@Le chouchou du Capitole", "L"),
  ch("Peeta Mellark", "Le garçon aux pains", 7, 5, "CI", "Tribut|District 12|Rebelle", "celebre", "winPowerSteal:influence,1@Charmer le public ; ifName:Katniss Everdeen,2@Les amants maudits", "L"),
  // --- lieux
  loc("Le Capitole", "Capitale de Panem", 3, "Capitole", "", "reserve:1 ; income:1", "R"),
  loc("Le District 12", "La Veine", 1, "District", "limite", "income:1", "C"),
  loc("La Corne d'abondance", "Au centre de l'arène", 2, "Arène", "", "reduce:Tribut,1@Ravitaillement", "U"),
  loc("Le District 13", "Souterrain", 3, "District 13", "", "defAura:1", "U"),
  // --- objets
  obj("L'arc de Katniss", "Flèches", 2, "Arme", "", "attStr:2", "U", { req: "District 12" }),
  obj("La broche du geai moqueur", "Le symbole", 1, "Symbole", "", "attKw:celebre", "R", { uni: true }),
  obj("Trident", "Arme du District 4", 2, "Arme", "", "attStr:2", "C"),
  obj("Parachute de sponsor", "Cadeau du ciel", 1, "Sponsor", "", "attSave", "U"),
  // --- événements
  ev("Je me porte volontaire !", "À sa place", 1, "Moisson", "evSave", "U"),
  ev("Cadeau des sponsors", "Un parachute", 2, "Sponsor", "evDraw:2", "U"),
  ev("Les trois doigts", "Le salut", 2, "Rébellion", "evStandAll:Rebelle", "R"),
  ev("Bain de sang", "À la Corne d'abondance", 3, "Arène", "evKillAll:1", "R"),
  ev("Baies sanguinaires", "Ensemble ou rien", 1, "Arène", "evMinus:3", "U"),
  ch("Katniss Everdeen", "La fille du feu", 7, 6, "CR", "Tribut|District 12|Rebelle", "celebre", "atkKneel:5@La flèche dans le champ de force ; escape@Elle survit à l'arène", "L"),
];

export const starters = [
  { id: "hg-rebellion", name: "La Rébellion", leader: "hunger-katniss-everdeen-7", like: ["Rebelle", "District 12", "District 13", "Tribut"], avoid: ["Carrière", "Président"], desc: "Katniss, Peeta, Gale et le District 13 : survivre, puis renverser le Capitole." },
  { id: "hg-capitole", name: "Le Capitole", leader: "hunger-president-snow-7", like: ["Capitole", "Carrière", "Pacificateur"], avoid: ["Rebelle"], desc: "Snow, les juges et les tributs de carrière : les Jeux sont faits pour qu'ils gagnent." },
];
