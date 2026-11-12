// Cartes neutres : jouables dans n'importe quel deck (croisements entre les univers).
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
];

export const starters = [];
