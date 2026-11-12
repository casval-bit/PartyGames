import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "elite", name: "Élite", short: "Élite", color: "#ff5ec4", color2: "#2a0b2e", icon: "gem", motif: "marble",
  desc: "Las Encinas : fêtes, secrets, rivalités et meurtres. Ici, la Ruse fait plus de dégâts que les poings.",
  passive: "fWinDiscard:ruse,1@Secrets de Las Encinas",
};

const LE = "Élève|Las Encinas";
export const cards = [
  ch("Guzmán", "Fils de bonne famille", 4, 4, "CI", LE, "", "winStand:combat@Orgueil", "R"),
  ch("Guzmán", "Le roi du lycée", 7, 7, "CRI", LE, "celebre|intimidation", "aura:Las Encinas,1@Tout le monde le suit", "L"),
  ch("Lucrecia", "Lu, la reine des abeilles", 4, 3, "RI", LE, "", "enterDiscard:1@Langue de vipère", "R"),
  ch("Lucrecia", "Reine de Las Encinas", 6, 5, "RI", LE, "celebre", "winDiscard:ruse,1@Humiliation", "E"),
  ch("Samuel", "Le boursier", 3, 3, "CR", "Élève|Las Encinas|Boursier", "", "loseStand@Ne lâche jamais", "U"),
  ch("Samuel", "En quête de vérité", 5, 4, "CRI", "Élève|Las Encinas|Boursier", "discret", "winDraw:ruse,1@Enquête", "R"),
  ch("Nadia", "Première de la classe", 3, 2, "RI", "Élève|Las Encinas|Boursier", "genie", "", "U"),
  ch("Carla", "La marquise", 4, 3, "RI", LE, "", "income:1 ; winSteal:ruse,1@Héritage", "R"),
  ch("Carla", "Calculatrice", 6, 4, "CRI", LE, "discret", "enterKneel:5@Manipulation", "E"),
  ch("Polo", "Le fils à papa", 3, 2, "R", LE, "", "", "U"),
  ch("Christian", "Le boursier fêtard", 2, 2, "C", "Élève|Las Encinas|Boursier", "", "", "C"),
  ch("Marina", "La rebelle", 2, 1, "I", LE, "", "loseDraw:1@Les mauvaises fréquentations", "C"),
  ch("Ander", "Le fils de la directrice", 3, 3, "C", LE, "", "ifName:Omar,1@Ensemble", "U"),
  ch("Omar", "Le frère de Nadia", 2, 1, "R", "Élève|Las Encinas|Boursier", "", "ifName:Ander,1@Ensemble", "C"),
  ch("Valerio", "Le demi-frère", 3, 2, "R", LE, "discret", "", "U"),
  ch("Rebeka", "La dure à cuire", 4, 4, "C", LE, "intimidation", "", "U"),
  ch("Cayetana", "La fausse riche", 3, 2, "I", LE, "", "domDraw:1@Apparences", "U"),
  ch("Patrick", "Le prince charmant", 3, 2, "RI", LE, "", "winDraw:influence,1@Séduction", "U"),
  ch("Ari", "La fille du patron", 3, 2, "I", LE, "", "income:1", "U"),
  ch("Mencía", "La sœur rebelle", 3, 3, "CR", LE, "", "", "C"),
  ch("Philippe", "Le prince autrichien", 4, 3, "I", LE, "", "domi:2 ; reserve:1", "U"),
  ch("Isadora", "La reine de la nuit", 4, 3, "RI", LE, "", "winGold:influence,1@Soirées privées", "U"),
  ch("Iván", "Le footballeur", 3, 3, "C", LE, "", "ifAtk:1", "C"),
  ch("Joel", "Le petit ami", 2, 2, "C", LE, "", "", "C"),
  ch("Raúl", "Le dealer", 3, 3, "C", "Las Encinas", "", "", "C"),
  ch("Benjamín", "Le père de Mencía", 5, 4, "RI", "Adulte|Las Encinas", "intimidation", "actKneel:4@Pouvoir de l'argent", "R"),
  ch("Inspectrice", "L'enquête de police", 4, 3, "RI", "Adulte|Police", "", "winKill:ruse,2@Garde à vue", "U"),
  // --- au sommet (coût 7)
  ch("Samuel", "Le boursier vengeur", 7, 6, "CRI", "Élève|Las Encinas|Boursier", "discret", "winPowerSteal:ruse,1@La vérité éclate ; loseStand@Ne lâche jamais", "L"),
  ch("Lucrecia", "L'héritière", 7, 5, "RI", LE, "celebre", "actSilence:6@Humiliation publique ; domi:2@La reine de Las Encinas", "L"),
  // --- lieux
  loc("Las Encinas", "Le lycée privé", 2, "Lycée", "", "reduce:Las Encinas,1@Inscription", "U"),
  loc("La boîte de nuit", "Soirée privée", 1, "Fête", "limite", "income:1", "C"),
  loc("La piscine du lycée", "Le lieu du drame", 3, "Lycée", "", "domi:2 ; reserve:1", "R"),
  loc("Le commissariat", "Interrogatoires", 3, "Police", "", "defAura:1", "U"),
  // --- objets
  obj("Montre de luxe", "Héritage", 1, "Luxe", "", "attKw:celebre", "R"),
  obj("Téléphone volé", "Des vidéos compromettantes", 1, "Secret", "", "attIcon:ruse", "C"),
  obj("Trophée de natation", "Champion", 1, "Trophée", "", "attStr:1", "C"),
  obj("Bracelet électronique", "Assigné à résidence", 2, "Police", "", "attNoAttack", "U"),
  // --- événements
  ev("Meurtre à Las Encinas", "Qui a tué ?", 3, "Crime", "evKill:4", "R"),
  ev("Chantage", "Ou tout le monde saura", 2, "Secret", "evDiscard:2", "U"),
  ev("Rumeur", "On dit que…", 1, "Secret", "evMinus:2", "C"),
  ev("Soirée de fin d'année", "Tout le monde est invité", 2, "Fête", "evStandAll:Las Encinas", "R"),
  ev("Garde à vue", "Pour interrogatoire", 2, "Police", "evBounce:4", "U"),
];

export const starters = [
  { id: "elite-encinas", name: "Las Encinas", leader: "elite-guzman-7", like: ["Las Encinas", "Élève"], avoid: ["Police"], desc: "Guzmán, Lu, Carla, Samuel et Nadia : la Ruse et les secrets avant tout." },
];
