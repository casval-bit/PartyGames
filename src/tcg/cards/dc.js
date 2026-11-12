import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "dc", name: "DC", short: "DC", color: "#4a8cff", color2: "#0d1d3d", icon: "star", motif: "skyline",
  desc: "La Ligue des Justiciers, la Bat-famille et les pires vilains de Gotham : les justiciers défendent mieux que personne.",
  passive: "defAuraT:Justicier,1@Ligue des Justiciers",
};

const J = "Justicier";
export const cards = [
  ch("Batman", "Le détective", 4, 4, "CR", `${J}|Bat-famille|Milliardaire`, "discret|genie", "", "R"),
  ch("Batman", "Le Chevalier noir", 7, 6, "CRI", `${J}|Bat-famille|Milliardaire|Ligue`, "celebre|discret|genie", "enterSearch:Bat-famille@Plan d'urgence ; winKneel:*@La peur", "L"),
  ch("Superman", "L'homme d'acier", 7, 6, "CI", `${J}|Ligue|Kryptonien`, "celebre|intimidation", "noKneel:combat@Plus rapide qu'une balle ; defStand@Bouclier humain", "L"),
  ch("Wonder Woman", "Diana de Themyscira", 5, 5, "CI", `${J}|Ligue|Amazone`, "celebre", "winStand:combat@Bracelets", "E"),
  ch("Flash", "Barry Allen", 4, 3, "C", `${J}|Ligue|Speedster`, "", "noKneel:combat@La vitesse de la lumière", "R"),
  ch("Aquaman", "Roi d'Atlantis", 5, 5, "CI", `${J}|Ligue|Atlante|Roi`, "", "income:1", "R"),
  ch("Green Lantern", "Hal Jordan", 5, 4, "CI", `${J}|Ligue|Lantern`, "", "actPay:2@Volonté", "R"),
  ch("Cyborg", "Victor Stone", 4, 3, "RI", `${J}|Ligue|Robot`, "genie", "actDraw:1@Boom tube", "U"),
  ch("Martian Manhunter", "J'onn J'onzz", 5, 5, "RI", `${J}|Ligue|Martien`, "discret", "", "U"),
  ch("Shazam", "Billy Batson", 4, 4, "CI", `${J}|Ado`, "", "", "U"),
  ch("Supergirl", "Kara Zor-El", 5, 5, "CI", `${J}|Kryptonien`, "", "ifName:Superman,1@Cousine", "U"),
  ch("Robin", "Le jeune prodige", 2, 2, "C", `${J}|Bat-famille|Ado`, "", "ifName:Batman,1@Le duo dynamique", "C"),
  ch("Nightwing", "Dick Grayson", 3, 3, "CR", `${J}|Bat-famille`, "", "winStand:combat@Acrobate", "U"),
  ch("Batgirl", "Barbara Gordon", 2, 2, "R", `${J}|Bat-famille`, "genie", "", "U"),
  ch("Alfred Pennyworth", "Le majordome", 2, 1, "RI", "Bat-famille", "", "actStand:Bat-famille@Une tasse de thé, monsieur ?", "U"),
  ch("Commissaire Gordon", "La police de Gotham", 3, 2, "I", "Police|Gotham", "", "reserve:1 ; enterDraw:1@Le signal", "U"),
  ch("Green Arrow", "Oliver Queen", 3, 3, "C", `${J}|Archer`, "", "actMinus:1@Flèche gadget", "C"),
  ch("Zatanna", "La magicienne", 3, 2, "RI", `${J}|Magie`, "", "atkKneel:3@Sortilège à l'envers", "U"),
  ch("Le Joker", "Le clown prince du crime", 6, 4, "RI", "Vilain|Gotham", "discret|intimidation", "enterKill:3@Pourquoi tant de sérieux ? ; winDiscard:ruse,1@Chaos", "E"),
  ch("Harley Quinn", "Docteur Harleen Quinzel", 3, 3, "CR", "Vilain|Gotham", "", "ifName:Le Joker,2@Puddin'", "R"),
  ch("Lex Luthor", "Le génie milliardaire", 5, 3, "RI", "Vilain|Milliardaire|Génie", "genie", "income:1 ; actKneel:4@LexCorp", "E"),
  ch("Catwoman", "Selina Kyle", 3, 3, "R", "Vilain|Gotham", "discret", "winSteal:ruse,1@Cambrioleuse", "R"),
  ch("Bane", "Le brise-dos", 5, 6, "C", "Vilain|Gotham", "intimidation", "", "U"),
  ch("Poison Ivy", "Pamela Isley", 4, 3, "R", "Vilain|Gotham", "", "enterKneel:3@Phéromones", "U"),
  ch("Deathstroke", "Le mercenaire", 5, 5, "C", "Vilain|Mercenaire", "duel", "winKill:combat,3@Contrat", "R"),
  ch("Darkseid", "Seigneur d'Apokolips", 7, 7, "CRI", "Vilain|Dieu|Apokolips", "intimidation", "enterKill:4@Rayon Oméga ; aura:Vilain,1@Anti-vie", "L"),
  ch("Le Pingouin", "Oswald Cobblepot", 3, 2, "I", "Vilain|Gotham", "", "income:1", "U"),
  ch("Double-Face", "Harvey Dent", 3, 3, "RI", "Vilain|Gotham", "", "ifBehind:2@Pile ou face", "U"),
  ch("L'Épouvantail", "Jonathan Crane", 3, 2, "R", "Vilain|Gotham", "", "atkKneel:2@Gaz de la peur", "U"),
  ch("Hommes de main", "Gotham la nuit", 1, 1, "C", "Vilain|Gotham", "", "", "C", { uni: false }),
  // --- les plus puissants (coût 7)
  ch("Wonder Woman", "La princesse des Amazones", 7, 6, "CI", `${J}|Ligue|Amazone`, "", "actSilence:6@Le lasso de vérité ; immune@Les bracelets", "L"),
  ch("Flash", "La Force Véloce", 7, 5, "CRI", `${J}|Ligue|Speedster`, "", "noKneel:*@Plus rapide que la lumière ; defStand@Toujours là à temps", "L"),
  ch("Lex Luthor", "Le président des États-Unis", 7, 4, "RI", "Vilain|Milliardaire|Génie", "genie", "oppTax:1@LexCorp ; domSteal:1@Le pouvoir politique", "L"),
  // --- lieux
  loc("La Batcave", "Sous le manoir Wayne", 2, "Bat-famille", "", "reduce:Bat-famille,1@Équipement", "U"),
  loc("Metropolis", "La cité de demain", 1, "Ville", "limite", "income:1", "C"),
  loc("Themyscira", "L'île des Amazones", 3, "Amazone", "", "defAura:1", "U"),
  loc("L'asile d'Arkham", "Pour les fous de Gotham", 2, "Gotham", "", "reduce:Vilain,1@Évasion", "U"),
  loc("La Tour de guet", "QG de la Ligue", 3, "Ligue", "", "xtraCh:influence", "R"),
  // --- objets
  obj("Le lasso de vérité", "Lasso d'Hestia", 1, "Artefact", "", "attKw:intimidation", "R", { uni: true }),
  obj("Anneau de Green Lantern", "Lumière verte", 2, "Lantern", "", "attStr:2", "U"),
  obj("Kryptonite", "La faiblesse", 2, "Minéral", "", "attNeg:3", "R"),
  obj("La Batmobile", "Le véhicule", 2, "Véhicule", "", "attStand", "R", { uni: true }),
  obj("Ceinture utilitaire", "Gadgets", 1, "Gadget", "", "attIcon:ruse", "C"),
  // --- événements
  ev("Un signal dans le ciel", "Gotham appelle", 1, "Gotham", "evStand:Justicier", "C"),
  ev("Crise", "Les mondes s'effondrent", 4, "Cosmique", "evKillAll:2", "E"),
  ev("Plan d'urgence", "Toujours prévoir", 2, "Bat-famille", "evCancel", "R"),
  ev("Rire du Joker", "Gaz hilarant", 2, "Chaos", "evKneel:4", "U"),
  ev("Justice !", "La Ligue intervient", 1, "Ligue", "evBuff:2", "C"),
];

export const starters = [
  { id: "dc-ligue", name: "La Ligue des Justiciers", leader: "dc-superman-7", like: ["Justicier", "Ligue", "Bat-famille"], avoid: ["Vilain"], desc: "Superman, Batman, Wonder Woman et la Ligue : imprenables en défense." },
  { id: "dc-gotham", name: "Les vilains de Gotham", leader: "dc-darkseid-7", like: ["Vilain", "Gotham"], avoid: ["Justicier"], desc: "Darkseid, le Joker, Luthor et les fous d'Arkham : semer le chaos." },
];
