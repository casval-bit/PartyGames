import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "teenwolf", name: "Teen Wolf", short: "Teen Wolf", color: "#7dd3fc", color2: "#0f2238", icon: "moon", motif: "moon",
  desc: "La meute de Beacon Hills, les chasseurs Argent et les créatures surnaturelles : la pleine lune change tout.",
  passive: "kwAura:Loup-garou,intimidation@La meute",
};

export const cards = [
  ch("Scott McCall", "Le loup-garou du lycée", 4, 4, "CI", "Loup-garou|Meute|Beacon Hills", "", "winStand:combat@Rugissement", "R"),
  ch("Scott McCall", "Le True Alpha", 7, 7, "CRI", "Loup-garou|Meute|Alpha|Beacon Hills", "celebre", "aura:Meute,1@Le chef de meute ; guard:Meute@Je protège les miens", "L"),
  ch("Stiles Stilinski", "Le meilleur ami", 3, 1, "RI", "Humain|Meute|Beacon Hills", "genie", "actDraw:1@Recherches nocturnes", "R"),
  ch("Lydia Martin", "La banshee", 3, 2, "RI", "Banshee|Meute|Beacon Hills", "", "enterSearch:*@Le cri de la banshee", "R"),
  ch("Allison Argent", "La chasseuse", 4, 4, "C", "Chasseur|Argent|Meute", "", "winKill:combat,2@Flèche", "R"),
  ch("Derek Hale", "Le loup solitaire", 5, 5, "C", "Loup-garou|Hale", "", "ifAlone:2@Solitaire", "R"),
  ch("Derek Hale", "L'Alpha", 6, 6, "CI", "Loup-garou|Hale|Alpha", "celebre", "enterBuff:Loup-garou,1@La morsure", "E"),
  ch("Malia Tate", "La coyote-garou", 4, 4, "C", "Coyote-garou|Meute", "", "ifAtk:1@Instinct sauvage", "U"),
  ch("Kira Yukimura", "La kitsune", 4, 3, "CR", "Kitsune|Meute", "", "actMinus:2@Kitsune de foudre", "R"),
  ch("Isaac Lahey", "Le bêta", 3, 3, "C", "Loup-garou|Hale", "", "ifWith:Loup-garou,1", "C"),
  ch("Jackson Whittemore", "Le kanima", 4, 4, "C", "Kanima|Beacon Hills", "discret", "atkKneel:3@Venin paralysant", "U"),
  ch("Liam Dunbar", "Le bêta de Scott", 3, 3, "C", "Loup-garou|Meute", "", "ifName:Scott McCall,1@Mon alpha", "U"),
  ch("Peter Hale", "L'oncle manipulateur", 5, 4, "RI", "Loup-garou|Hale", "discret", "escape@Revenu d'entre les morts", "R"),
  ch("Chris Argent", "Le chasseur", 4, 4, "C", "Chasseur|Argent", "", "winKneel:combat@Le code", "U"),
  ch("Gerard Argent", "Le patriarche", 5, 4, "RI", "Chasseur|Argent", "intimidation", "enterKill:2@Sans pitié", "E"),
  ch("Kate Argent", "La traqueuse", 4, 4, "C", "Chasseur|Argent", "", "ifAtk:1", "U"),
  ch("Deucalion", "Le démon loup", 6, 6, "C", "Loup-garou|Alpha", "intimidation", "winKill:combat,2@Meute d'alphas", "E"),
  ch("Theo Raeken", "La chimère", 4, 3, "R", "Chimère", "discret", "winDiscard:ruse,1@Manipulation", "U"),
  ch("Le Nogitsune", "L'esprit farceur", 6, 5, "RI", "Esprit|Kitsune", "discret", "enterDiscard:1@Chaos ; atkKneel:4@Possession", "E"),
  ch("Shérif Stilinski", "Le père de Stiles", 3, 2, "I", "Humain|Police|Beacon Hills", "", "reserve:1 ; domi:1", "U"),
  ch("Melissa McCall", "L'infirmière", 2, 1, "I", "Humain|Beacon Hills", "", "actStand:Meute@Les urgences", "U"),
  ch("Alan Deaton", "Le druide", 3, 1, "RI", "Druide|Beacon Hills", "genie", "actStand:*@Conseiller", "U"),
  ch("Jordan Parrish", "Le chien de l'enfer", 4, 4, "C", "Hellhound|Police", "", "escape@Le feu", "U"),
  ch("Ethan et Aiden", "Les jumeaux alphas", 5, 4, "C", "Loup-garou|Alpha", "", "ifAtk:1@Fusion", "U"),
  ch("Erica Reyes", "La bêta", 2, 2, "C", "Loup-garou|Hale", "", "", "C"),
  ch("Vernon Boyd", "Le bêta", 2, 2, "C", "Loup-garou|Hale", "", "", "C"),
  ch("Mason Hewitt", "Le meilleur ami de Liam", 2, 1, "R", "Humain|Meute", "", "enterDraw:1@Le Bestiaire", "C"),
  // --- au sommet de leurs pouvoirs (coût 7)
  ch("Derek Hale", "Le loup évolué", 7, 7, "CI", "Loup-garou|Hale|Alpha", "intimidation", "atkTerror:3@Le hurlement ; winStand:combat@L'évolution", "L"),
  ch("Peter Hale", "Revenu d'entre les morts", 7, 6, "CR", "Loup-garou|Hale|Alpha", "intimidation", "dieReturn@Il revient toujours ; winKill:combat,3@Les griffes de l'Alpha", "L"),
  // --- lieux
  loc("Lycée de Beacon Hills", "Le terrain de crosse", 2, "Beacon Hills", "", "reduce:Meute,1@Entraînement", "U"),
  loc("Le Nemeton", "L'arbre ancestral", 3, "Surnaturel", "", "domi:2 ; reserve:1", "R"),
  loc("La clinique vétérinaire", "Le cabinet de Deaton", 2, "Beacon Hills", "", "actStand:*@Soins", "U"),
  loc("Le manoir Hale", "Ruines calcinées", 1, "Hale", "limite", "income:1", "C"),
  // --- objets
  obj("Arc d'Allison", "Arme des Argent", 2, "Arme", "", "attStr:2", "U", { req: "Chasseur" }),
  obj("Aconit tue-loup", "Poison", 2, "Poison", "", "attNeg:2", "U"),
  obj("Cendre de sorbier", "Barrière", 2, "Druide", "", "attNoAttack", "R"),
  obj("La Jeep de Stiles", "Elle tient avec du scotch", 1, "Véhicule", "", "attStand", "U", { uni: true }),
  // --- événements
  ev("Pleine lune", "Les crocs sortent", 2, "Lune", "evBuffTrait:Loup-garou,2", "U"),
  ev("Hurlement d'alpha", "Rassemblement", 2, "Meute", "evStandAll:Meute", "R"),
  ev("La morsure", "Un nouveau bêta", 2, "Meute", "evPutPlay:Loup-garou,3", "U"),
  ev("Chasse à l'homme", "Le code des Argent", 3, "Chasse", "evKill:4", "R"),
  ev("Le Bestiaire", "Savoir ancien", 1, "Savoir", "evDraw:1", "C"),
];

export const starters = [
  { id: "tw-meute", name: "La meute de Scott", leader: "teenwolf-scott-mccall-7", like: ["Meute", "Loup-garou", "Beacon Hills"], avoid: ["Alpha"], desc: "Scott, Stiles, Lydia et toute la meute : se protéger les uns les autres." },
  { id: "tw-alphas", name: "Les Alphas et les chasseurs", leader: "teenwolf-deucalion-6", like: ["Alpha", "Argent", "Hale", "Chasseur"], avoid: ["Meute"], desc: "Deucalion, les Hale et les Argent : la force brute et la traque." },
];
