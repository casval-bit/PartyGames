import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "capes", name: "De cape et de crocs", short: "Cape & crocs", color: "#e9c46a", color2: "#5a2d0c", icon: "feather", motif: "baroque",
  desc: "Bretteurs à panache, alexandrins et pirates jusque sur la Lune : chaque duel est une scène de théâtre.",
  passive: "kwAura:Bretteur,duel@Panache",
};

export const cards = [
  ch("Don Lope de Villalobos y Sangrin", "Hidalgo", 4, 4, "C", "Loup|Bretteur|Noble", "", "winStand:combat@Por Dios !", "R"),
  ch("Don Lope de Villalobos y Sangrin", "Le loup d'Espagne", 6, 6, "CI", "Loup|Bretteur|Noble", "intimidation|celebre", "ifAlone:2@Honneur castillan", "E"),
  ch("Armand Raynal de Maupertuis", "Poète gascon", 4, 3, "CI", "Renard|Bretteur|Poète|Noble", "", "winDraw:influence,1@Alexandrins", "R"),
  ch("Armand Raynal de Maupertuis", "Le renard amoureux", 6, 5, "CRI", "Renard|Bretteur|Poète|Noble", "celebre", "ifName:Don Lope de Villalobos y Sangrin,1@Amis jusqu'au bout ; winDraw:*,1@Tirade", "E"),
  ch("Eusèbe", "Le lapin naïf", 2, 1, "R", "Lapin", "", "escape@Utilisé comme grappin", "U"),
  ch("Eusèbe", "Héros malgré lui", 4, 3, "CR", "Lapin", "discret", "loseStand@Toujours retomber sur ses pattes", "R"),
  ch("Raïs Kader", "Capitaine corsaire", 5, 5, "CI", "Corsaire|Bretteur", "duel", "winGold:combat,1@Butin du janissaire", "R"),
  ch("Hermine", "La gitane", 3, 2, "RI", "Gitane", "discret", "winSteal:ruse,1@Doigts agiles", "U"),
  ch("Séléné", "Princesse de la Lune", 3, 2, "RI", "Sélénite|Noble", "", "enterDraw:1@Pierre de lune", "U"),
  ch("Bombastus", "Savant fou", 3, 1, "RI", "Savant", "genie", "actDraw:1@Calculs astronomiques", "R"),
  ch("Andreo", "Le fils de Cénile", 2, 1, "I", "Vénitien|Comédien", "", "", "C"),
  ch("Plaisant", "Le valet", 1, 1, "R", "Vénitien|Comédien", "", "", "C"),
  ch("Le Maître d'armes", "Poète et bretteur", 7, 6, "CRI", "Bretteur|Poète|Noble", "duel|celebre", "noKneel:combat@Botte secrète ; winDraw:influence,1@Envoi", "L"),
  ch("Mendoza", "Capitaine de la galère", 5, 5, "C", "Espagnol|Bretteur|Méchant", "duel|intimidation", "winKill:combat,2@Fourberie", "E"),
  ch("Cénile Spilorcio", "L'avare de Venise", 3, 1, "I", "Vénitien|Méchant", "", "income:2", "R"),
  ch("Prince Jean sans Lune", "L'usurpateur", 6, 4, "RI", "Sélénite|Méchant|Noble", "intimidation", "enterKneel:4@Coup d'État", "E"),
  ch("Capitaine Boone", "Pirate anglais", 4, 4, "C", "Pirate|Méchant", "pillard", "ifWith:Pirate,1@Mon perroquet", "U"),
  ch("Cigognac", "Second de Boone", 1, 1, "C", "Pirate", "", "", "C"),
  ch("Fagotin", "Singe tueur", 3, 2, "C", "Méchant|Assassin", "discret", "winKill:combat,2@Coup bas", "U"),
  ch("Mademoiselle", "Espionne du prince", 4, 3, "CR", "Bretteur|Espion|Méchant", "discret", "winDiscard:ruse,1@Manigances", "R"),
  ch("Fulgence", "Le jumeau criminel", 2, 2, "R", "Lapin|Méchant", "", "", "C"),
  ch("Le duc de Limon", "Intrigant de la cour", 4, 3, "RI", "Noble|Méchant", "", "actKneel:3@Lettres de cachet", "U"),
  ch("Montmorency", "Rival d'Eusèbe", 3, 3, "CI", "Chien|Noble", "", "ifAtk:1", "C"),
  ch("Colin", "Cadet de la Lune", 2, 2, "C", "Sélénite|Cadet|Bretteur", "", "ifWith:Cadet,1@Un pour tous", "C"),
  ch("Aldrin", "Cadet de la Lune", 2, 2, "C", "Sélénite|Cadet|Bretteur", "", "ifWith:Cadet,1@Tous pour un", "C"),
  ch("Fort-à-Bras", "Cadet de la Lune", 3, 3, "C", "Sélénite|Cadet", "", "guard:Cadet@Bras solides", "U"),
  ch("Sabado", "Le sage de l'île", 2, 1, "RI", "Insulaire", "", "enterDraw:1@Señor Thatsall", "C"),
  // --- les légendes (coût 7)
  ch("Don Lope de Villalobos y Sangrin", "Le loup d'Espagne", 7, 7, "CI", "Loup|Bretteur|Noble", "duel|celebre", "atkTerror:3@Sa réputation le précède ; winBounce:combat,4@À la pointe de l'épée", "L"),
  ch("Armand Raynal de Maupertuis", "Le poète", 7, 5, "RI", "Renard|Bretteur|Poète|Noble", "celebre", "actSilence:6@Une tirade ; winDraw:influence,1@Une rime", "L"),
  // --- lieux
  loc("Venise", "La Sérénissime", 1, "Ville", "limite", "income:1", "C"),
  loc("La galère", "Aux rames !", 2, "Navire", "", "reduce:*,1@Forçats", "U"),
  loc("La Lune", "Où l'or pousse aux arbres", 3, "Lune", "", "domi:2 ; income:1", "R"),
  loc("La base de la Sérénissime", "Repaire du prince", 3, "Lune", "", "defAura:1", "U"),
  // --- objets
  obj("Rapière", "Acier de Tolède", 1, "Arme", "", "attStr:2", "C", { req: "Bretteur" }),
  obj("La pierre de lune", "Le pendentif de Séléné", 1, "Bijou", "", "attKw:celebre", "R", { uni: true }),
  obj("La carte au trésor", "Les îles Tangerines", 2, "Trésor", "", "attWinDraw:1", "U"),
  obj("La fusée de Bombastus", "Destination Lune", 2, "Machine", "", "attStand", "U"),
  // --- événements
  ev("Un, deux, trois !", "La botte", 1, "Escrime", "evBuff:2", "C"),
  ev("Tirade", "En alexandrins", 1, "Théâtre", "evWinDraw:influence,1", "C"),
  ev("À l'abordage !", "Sus aux galères", 1, "Mer", "evSteal:2", "C"),
  ev("Duel au clair de lune", "Dernier sang", 3, "Escrime", "evKill:4", "R"),
  ev("Tour de passe-passe", "Rideau", 2, "Théâtre", "evBounce:3", "U"),
];

export const starters = [
  { id: "cape-heros", name: "Don Lope et Armand", leader: "capes-le-maitre-d-armes-7", like: ["Bretteur", "Poète", "Lapin", "Cadet", "Sélénite"], avoid: ["Méchant"], desc: "Le loup, le renard, le lapin et le Maître d'armes : des duels à panache et des tirades." },
  { id: "cape-mechants", name: "Les fourbes", leader: "capes-prince-jean-sans-lune-6", like: ["Méchant", "Pirate"], avoid: ["Cadet"], desc: "Prince Jean, Mendoza, Mademoiselle et les pirates : coups bas et manigances." },
];
