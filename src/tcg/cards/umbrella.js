import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "umbrella", name: "Umbrella Academy", short: "Umbrella", color: "#e8475f", color2: "#3a0b18", icon: "umbrella", motif: "rain",
  desc: "Une fratrie de surdoués dysfonctionnelle, la Commission et l'Apocalypse qui approche.",
  passive: "fWinDraw:*,1@Les Hargreeves",
};

export const cards = [
  ch("Luther Hargreeves", "Numéro Un", 4, 4, "CI", "Hargreeves|Académie", "", "guard:Hargreeves@Le plus costaud", "R"),
  ch("Luther Hargreeves", "Chef de l'équipe", 6, 6, "CI", "Hargreeves|Académie", "intimidation", "atkBuff:Hargreeves,1@Tous avec moi", "E"),
  ch("Diego Hargreeves", "Numéro Deux", 3, 3, "C", "Hargreeves|Académie|Justicier", "", "actMinus:2@Couteaux courbes", "U"),
  ch("Diego Hargreeves", "Le justicier", 5, 5, "CR", "Hargreeves|Académie|Justicier", "duel", "winKill:combat,2@Lancer parfait", "R"),
  ch("Allison Hargreeves", "Numéro Trois", 4, 3, "RI", "Hargreeves|Académie|Célébrité", "", "enterKneel:4@J'ai entendu une rumeur", "R"),
  ch("Klaus Hargreeves", "Numéro Quatre", 2, 1, "RI", "Hargreeves|Académie|Médium", "", "enterRecall:*@Séance avec les morts", "U"),
  ch("Klaus Hargreeves", "Le gourou immortel", 5, 4, "RI", "Hargreeves|Académie|Médium", "", "escape@Il revient toujours ; actStand:Hargreeves@Les fantômes", "R"),
  ch("Numéro Cinq", "Voyageur temporel", 4, 3, "CR", "Hargreeves|Académie|Voyageur temporel", "discret", "escape@Saut spatial", "R"),
  ch("Numéro Cinq", "Cinquante-huit ans", 6, 5, "CRI", "Hargreeves|Académie|Voyageur temporel", "discret|genie", "atkKneel:3@Saut spatial", "E"),
  ch("Ben Hargreeves", "Numéro Six", 3, 2, "C", "Hargreeves|Académie|Fantôme", "discret", "winKill:combat,2@L'Horreur", "U"),
  ch("Vanya Hargreeves", "Numéro Sept", 2, 1, "I", "Hargreeves|Académie|Musicien", "", "loseDraw:1@Ordinaire", "C", { key: "umbrella-vanya" }),
  ch("Viktor Hargreeves", "Le violon blanc", 7, 6, "CRI", "Hargreeves|Académie|Musicien", "intimidation|celebre", "enterKill:3@Onde de choc", "L", { key: "umbrella-vanya" }),
  ch("Reginald Hargreeves", "Le père", 6, 3, "RI", "Académie|Adulte", "genie", "aura:Hargreeves,1@Entraînement impitoyable", "E"),
  ch("Pogo", "Le majordome", 2, 1, "RI", "Académie|Animal", "", "actStand:Hargreeves@Thé du soir", "U"),
  ch("Grace", "Maman", 3, 2, "RI", "Académie|Robot", "", "reserve:1 ; enterDraw:1@Petit-déjeuner", "U"),
  ch("Hazel", "Tueur de la Commission", 4, 4, "C", "Commission|Tueur", "intimidation", "winKill:combat,2@Contrat", "U"),
  ch("Cha-Cha", "Tueuse de la Commission", 4, 4, "C", "Commission|Tueur", "", "ifName:Hazel,1@Duo de choc", "U"),
  ch("La Gestionnaire", "Directrice de la Commission", 5, 4, "CRI", "Commission", "", "enterKneel:4@Licenciement ; actKneel:3@Bureaucratie", "E"),
  ch("Lila Pitts", "La copieuse", 5, 4, "CR", "Commission|Voyageur temporel", "discret", "atkKneel:3@Mimétisme", "R"),
  ch("Marcus Hargreeves", "Sparrow Numéro Un", 5, 5, "CI", "Sparrow", "intimidation", "", "U"),
  ch("Fei Hargreeves", "Les corbeaux", 3, 3, "R", "Sparrow", "discret", "atkKneel:2@Nuée", "U"),
  ch("Christopher", "Le cube", 4, 3, "RI", "Sparrow", "", "enterKneel:3@Terreur cubique", "U"),
  ch("Ben Hargreeves", "Sparrow Numéro Deux", 5, 5, "CR", "Sparrow", "intimidation", "", "R", { key: "umbrella-ben-hargreeves" }),
  ch("Sloane Hargreeves", "Sparrow", 3, 3, "CI", "Sparrow", "", "", "U"),
  ch("Alphonso Hargreeves", "Sparrow", 4, 4, "C", "Sparrow", "", "ifDef:2@Encaisser", "U"),
  ch("Herb", "Analyste de la Commission", 2, 1, "RI", "Commission", "genie", "", "U"),
  ch("Dolores", "La confidente", 1, 1, "R", "Commission", "", "ifName:Numéro Cinq,2@Elle a toujours raison", "C"),
  ch("Agents de la Commission", "En costume", 2, 2, "C", "Commission", "", "", "C", { uni: false }),
  // --- au sommet de leurs pouvoirs (coût 7)
  ch("Numéro Cinq", "Le dernier homme sur Terre", 7, 6, "CR", "Hargreeves|Académie|Voyageur temporel", "discret", "enterRevive:5@Empêcher l'apocalypse ; escape@Saut spatial", "L"),
  ch("Allison Hargreeves", "La Rumeur", 7, 5, "RI", "Hargreeves|Académie|Célébrité", "celebre", "actSilence:7@J'ai entendu une rumeur… ; domi:2@Star de cinéma", "L"),
  ch("Ben Hargreeves", "L'Horreur", 7, 7, "C", "Hargreeves|Académie|Fantôme", "intimidation", "winKill:combat,3@Les tentacules ; dieReturn@Le fantôme de Ben", "L"),
  // --- lieux
  loc("L'Académie Umbrella", "Le manoir", 2, "Académie", "", "reduce:Hargreeves,1@Rentrer à la maison", "U"),
  loc("Griddy's Doughnuts", "Beignets et café", 1, "Ville", "limite", "income:1", "C"),
  loc("La Commission", "Les bureaux du temps", 3, "Commission", "", "xtraCh:ruse", "R"),
  loc("L'Hôtel Oblivion", "Lieu maudit", 3, "Ville", "", "defAura:1", "U"),
  // --- objets
  obj("Mallette temporelle", "Saut dans le temps", 2, "Temps", "", "attSave", "U"),
  obj("Couteaux de lancer", "Bien affûtés", 1, "Arme", "", "attStr:1", "C"),
  obj("Uniforme de l'Académie", "Masque et cravate", 1, "Uniforme", "", "attIcon:influence", "C"),
  obj("Le Monocle", "Souvenir de papa", 2, "Académie", "", "attKw:genie", "U", { uni: true }),
  // --- événements
  ev("Fin du monde", "L'Apocalypse", 4, "Apocalypse", "evKillAll:2", "R"),
  ev("J'ai entendu une rumeur", "Pouvoir d'Allison", 2, "Pouvoir", "evKneel:4", "U"),
  ev("Réunion de famille", "Tous les sept", 2, "Famille", "evBuffTrait:Hargreeves,1", "U"),
  ev("Saut dans le temps", "Juste à temps", 1, "Temps", "evSave", "U"),
  ev("Danse dans le salon", "Tous ensemble", 0, "Famille", "evWinDraw:*,1", "C"),
];

export const starters = [
  { id: "umb-academie", name: "L'Académie Umbrella", leader: "umbrella-viktor-hargreeves-7", like: ["Hargreeves", "Académie"], avoid: ["Commission", "Sparrow"], desc: "Les sept enfants Hargreeves : réunis, ils peuvent arrêter (ou déclencher) l'Apocalypse." },
  { id: "umb-commission", name: "La Commission", leader: "umbrella-la-gestionnaire-5", like: ["Commission", "Sparrow", "Voyageur temporel"], avoid: ["Musicien"], desc: "Tueurs, bureaucrates du temps et l'Académie Sparrow : contrôler le cours des choses." },
];
