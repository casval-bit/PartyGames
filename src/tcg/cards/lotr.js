import { ch, loc, obj, ev } from "./build.js";

// Le Seigneur des Anneaux : un deck choisit UN camp de la Terre du Milieu (Hobbits, Elfes, Nains, Gondor, Rohan, Mordor, Isengard).
// Les membres de la Communauté et les alliés des Peuples libres (Gandalf, les Aigles, Beorn…) vont dans tous les camps du bien ;
// Gandalf, Aragorn et Sauron ont deux versions à 7.
export const meta = {
  id: "lotr", name: "Le Seigneur des Anneaux", short: "Seigneur des Anneaux", color: "#d4af37", color2: "#16200f", icon: "mountain", motif: "middleearth",
  desc: "Un Anneau pour les gouverner tous. Choisis un camp de la Terre du Milieu : les Peuples libres (Hobbits, Elfes, Nains, Gondor, Rohan) ou l'Ombre (Mordor, Isengard).",
  passive: "",
  sub: { one: "camp", One: "Camp", fem: false, ask: "Quel camp de la Terre du Milieu ?", help: "Un deck Seigneur des Anneaux ne prend que les personnages de son camp (et ceux qui vont partout) ; chaque camp donne un bonus à la famille.",
    pick: "Choisis un camp de la Terre du Milieu pour ce deck.", not: "n'est pas du camp", starter: "lotr" },
};

const HO = "Hobbits", EL = "Elfes", NA = "Nains", GO = "Gondor", RO = "Rohan", MO = "Mordor", IS = "Isengard";
const LIB = `${HO}|${EL}|${NA}|${GO}|${RO}`, OMBRE = `${MO}|${IS}`;

export const types = [
  { id: HO, name: "Hobbits", color: "#7fb069", bonus: "kwAura:Hobbits,discret@Personne ne fait attention aux Hobbits", desc: "Les Hobbits sont surprenants : vos Hobbits ont Discret." },
  { id: EL, name: "Elfes", color: "#b8c9e0", bonus: "fWinStand:*@La grâce des Eldar ; defAuraT:Elfes,1@Les archers elfiques", desc: "Les Premiers-Nés : vos Elfes défendent plus fort, et chaque round, après un défi gagné, un participant se redresse." },
  { id: NA, name: "Nains", color: "#c27a3a", bonus: "income:1@Les trésors de Khazad-dûm", desc: "Les mineurs et les forgerons : +1 revenu à chaque round." },
  { id: GO, name: "Gondor", color: "#dfe6ee", bonus: "defAuraT:Gondor,1@Minas Tirith tient bon", desc: "La Cité blanche : vos personnages du Gondor défendent plus fort." },
  { id: RO, name: "Rohan", color: "#5f9a3c", bonus: "xtraCh:combat@La charge des Rohirrim", desc: "Les seigneurs des chevaux : vous pouvez lancer un défi de Combat supplémentaire." },
  { id: MO, name: "Mordor", color: "#c0381c", bonus: "kwAura:Mordor,intimidation@L'Œil de Sauron", desc: "L'Ombre s'étend : vos personnages du Mordor ont Intimidation." },
  { id: IS, name: "Isengard", color: "#6b6f78", bonus: "income:1@Les forges d'Isengard ; kwAura:Uruk-hai,intimidation@La race des combattants", desc: "Une nouvelle puissance se lève : +1 revenu par round, et vos Uruk-hai ont Intimidation." },
];

const l = (name, title, cost, str, icons, pt, traits, kw, ab, r, o = {}) => ch(name, title, cost, str, icons, traits, kw, ab, r, { pt, ...o });

export const cards = [
  // --- Hobbits
  l("Frodon Sacquet", "Le Porteur de l'Anneau", 7, 4, "RI", HO, "Hobbit|Communauté", "discret", "selfGuard@La cotte de mithril ; winPower:ruse,1@Un pas de plus vers la Montagne du Destin", "L"),
  l("Frodon Sacquet", "Le neveu de Bilbon", 3, 2, "R", HO, "Hobbit", "", "escape@L'Anneau le rend invisible", "R"),
  l("Samsagace Gamegie", "Sam le Brave", 5, 4, "C", HO, "Hobbit|Communauté", "", "guard:Hobbits@Je ne peux pas le porter, mais je peux vous porter ! ; ifName:Frodon Sacquet,1@Monsieur Frodon", "E"),
  l("Samsagace Gamegie", "Le jardinier", 2, 2, "C", HO, "Hobbit", "", "loseStand@Il ne lâche rien", "C"),
  l("Meriadoc Brandebouc", "L'écuyer du Rohan", 3, 3, "C", `${HO}|${RO}`, "Hobbit|Communauté", "", "ifName:Peregrin Touque,1@Les inséparables ; atkKneel:3@La lame des Galgals", "R"),
  l("Peregrin Touque", "Le garde de la Citadelle", 3, 2, "CR", `${HO}|${GO}`, "Hobbit|Communauté", "", "ifName:Meriadoc Brandebouc,1@Les inséparables ; enterDraw:1@Le palantír", "R"),
  l("Bilbon Sacquet", "Le Cambrioleur", 4, 3, "RI", HO, "Hobbit", "discret", "winSteal:ruse,1@Le trésor de Smaug ; escape@La fête d'anniversaire", "E"),
  l("Rosie Chaumine", "La belle de la Comté", 1, 1, "I", HO, "Hobbit", "", "domi:1@Le Dragon Vert", "C"),
  l("Hobbit de la Comté", "Les gens du Pays de Bouc", 1, 1, "C", HO, "Hobbit", "", "ifWith:Hobbit,1@La Comté", "C", { uni: false }),
  l("Fermier Maggotte", "Les champignons", 2, 2, "C", HO, "Hobbit", "", "enterGold:1@Les champignons de Maggotte", "C"),
  l("Lobelia Sacquet-de-Besace", "Les cuillères en argent", 2, 1, "I", HO, "Hobbit", "", "domi:1@Elle a tout pris", "U"),
  l("Sméagol", "Le guide", 2, 2, "R", HO, "Trapu", "", "escape@Il file entre les rochers", "U"),

  // --- Elfes
  l("Galadriel", "La Dame de la Lórien", 7, 5, "RI", EL, "Elfe|Porteur d'anneau", "genie", "actSilence:7@Tous m'aimeront et désespéreront ! ; aura:Elfes,1@Nenya", "L"),
  l("Gil-galad", "Le dernier Haut-Roi", 7, 6, "CI", EL, "Elfe|Roi|Porteur d'anneau", "celebre", "winKill:combat,4@Aeglos ; immune@La Dernière Alliance", "L"),
  l("Elrond", "Le seigneur de Fondcombe", 6, 4, "RI", EL, "Elfe|Porteur d'anneau", "", "enterPutPlay:*,3@Le Conseil d'Elrond ; domi:1@Vilya", "E"),
  l("Legolas", "Le prince de la Forêt Noire", 6, 5, "CR", EL, "Elfe|Communauté", "", "atkKneel:3@L'arc de la Lórien ; ifName:Gimli,1@Le décompte des orques", "E"),
  l("Thranduil", "Le roi de la Forêt Noire", 6, 5, "CI", EL, "Elfe|Roi", "", "domi:2@Le roi des Elfes Sylvains ; winGold:influence,1@Les gemmes blanches", "R"),
  l("Arwen", "L'Étoile du Soir", 4, 3, "RI", `${EL}|${GO}`, "Elfe", "", "enterKneelAll:2@Le flot de la Bruinen", "E"),
  l("Glorfindel", "Le seigneur de la Fleur d'Or", 5, 5, "CR", EL, "Elfe", "", "winKill:combat,3@Il a tué un Balrog", "R"),
  l("Haldir", "Le gardien de la Lórien", 4, 4, "C", `${EL}|${RO}`, "Elfe", "", "ifDef:1@Le Gouffre de Helm ; dieDraw:1@Il tombe au Gouffre", "U"),
  l("Celeborn", "Le seigneur de la Lórien", 4, 4, "RI", EL, "Elfe", "", "domi:1@Le Sage", "C"),
  l("Tauriel", "La capitaine de la garde", 3, 3, "C", EL, "Elfe", "", "atkKneel:2@Ses flèches", "U"),
  l("Círdan", "Le Charpentier", 3, 2, "RI", EL, "Elfe|Porteur d'anneau", "", "enterDraw:1@Les Havres Gris", "U"),
  l("Archer de la Lórien", "La garde de Caras Galadhon", 2, 2, "C", EL, "Elfe", "", "ifDef:1@La pluie de flèches", "C", { uni: false }),

  // --- Nains
  l("Thorin Écu-de-Chêne", "Le Roi sous la Montagne", 7, 6, "CI", NA, "Nain|Roi", "celebre", "aura:Nains,1@Le Roi sous la Montagne ; winGold:combat,1@L'Arkenstone", "L"),
  l("Dáin Pied-d'Acier", "Le seigneur des Monts de Fer", 6, 6, "C", NA, "Nain|Roi", "", "winKill:combat,3@La bataille des Cinq Armées", "E"),
  l("Gimli", "Fils de Glóin", 5, 5, "C", NA, "Nain|Communauté", "", "winKill:combat,2@Le décompte ; ifName:Legolas,1@L'amitié avec l'Elfe", "E"),
  l("Balin", "Le seigneur de la Moria", 4, 3, "RI", NA, "Nain", "", "dieDraw:2@Le tombeau de Balin", "R"),
  l("Dwalin", "Le guerrier", 4, 4, "C", NA, "Nain", "", "ifAtk:1@Les haches", "U"),
  l("Glóin", "Le père de Gimli", 3, 3, "CI", NA, "Nain", "", "enterGold:1@L'or d'Erebor", "U"),
  l("Fíli", "Le neveu de Thorin", 3, 3, "C", NA, "Nain", "", "ifName:Kíli,1@Les frères", "C"),
  l("Kíli", "L'archer", 3, 3, "CR", NA, "Nain", "", "ifName:Fíli,1@Les frères", "C"),
  l("Bombur", "Le gros", 2, 3, "C", NA, "Nain", "", "ifDef:1@Il bloque le passage", "C"),
  l("Óin", "Le guérisseur", 2, 1, "RI", NA, "Nain", "", "enterDraw:1@Le cornet acoustique", "C"),
  l("Bofur", "Le mineur", 2, 2, "C", NA, "Nain", "", "enterGold:1@La mine", "C"),
  l("Nain d'Erebor", "La garde de la Montagne", 2, 2, "C", NA, "Nain", "", "ifWith:Nain,1@Khazâd !", "C", { uni: false }),

  // --- Gondor
  l("Aragorn", "Grand-Pas", 7, 6, "CR", `${GO}|${RO}|${HO}`, "Homme|Rôdeur|Communauté", "", "winStand:combat@Le Rôdeur du Nord ; guard:Hobbits@Il veille sur les Hobbits", "L"),
  l("Aragorn", "Le Roi Elessar", 7, 6, "CRI", GO, "Homme|Roi|Communauté", "celebre", "aura:Gondor,1@Le retour du Roi ; enterRevive:5@L'Armée des morts", "L"),
  l("Boromir", "Le capitaine de Gondor", 6, 6, "C", GO, "Homme|Communauté", "", "ifAtk:1@Le fils de l'Intendant ; dieDraw:2@Le cor de Gondor", "E"),
  l("Faramir", "Le capitaine d'Ithilien", 5, 4, "CR", GO, "Homme|Rôdeur", "", "atkKneel:3@Les rôdeurs d'Ithilien", "R"),
  l("Denethor", "L'Intendant du Gondor", 5, 3, "RI", GO, "Homme|Intendant", "", "domi:2@L'Intendant ; firstDraw:1@Le palantír", "R"),
  l("Isildur", "Le vainqueur de Sauron", 6, 5, "CI", GO, "Homme|Roi", "", "winKill:combat,4@Il tranche l'Anneau", "E"),
  l("Imrahil", "Le prince de Dol Amroth", 4, 4, "CI", GO, "Homme|Prince", "", "ifAtk:1@Les chevaliers du Cygne", "U"),
  l("Beregond", "Le garde de la Citadelle", 3, 3, "C", GO, "Homme", "", "guard:Gondor@Il sauve Faramir du bûcher", "U"),
  l("Le Roi des Morts", "Le parjure de Dimholt", 5, 5, "C", GO, "Mort", "", "atkTerror:3@La peur des morts ; dieReturn@Déjà mort", "R"),
  l("Guerrier des Chemins des Morts", "L'Armée des morts", 3, 3, "C", GO, "Mort", "", "dieReturn@Déjà mort", "U", { uni: false }),
  l("Rôdeur d'Ithilien", "Les hommes de Faramir", 3, 3, "CR", GO, "Homme|Rôdeur", "", "ifWith:Rôdeur,1@L'embuscade", "C", { uni: false }),
  l("Soldat de Minas Tirith", "La garde de la Cité blanche", 2, 2, "C", GO, "Homme", "", "ifDef:1@Gondor appelle à l'aide", "C", { uni: false }),

  // --- Rohan
  l("Théoden", "Le roi du Rohan", 6, 5, "CI", RO, "Rohirrim|Roi", "", "aura:Rohan,1@Debout, cavaliers de Théoden !", "E"),
  l("Éowyn", "La Dame du Rohan", 5, 4, "C", RO, "Rohirrim|Dame", "", "winKill:combat,5@Je ne suis pas un homme !", "E"),
  l("Éomer", "Le maréchal de la Marche", 5, 5, "C", RO, "Rohirrim", "", "winStand:combat@La charge des Rohirrim", "R"),
  l("Théodred", "Le fils du roi", 4, 4, "C", RO, "Rohirrim|Prince", "", "dieDraw:1@La chute de Théodred", "U"),
  l("Háma", "Le portier", 3, 3, "C", RO, "Rohirrim", "", "ifDef:1@Le portier d'Edoras", "C"),
  l("Gamling", "Le capitaine", 3, 3, "CR", RO, "Rohirrim", "", "atkBuff:Rohirrim,1@En avant, Eorlingas !", "U"),
  l("Erkenbrand", "Le seigneur de l'Ouestfolde", 4, 4, "CI", RO, "Rohirrim", "", "ifDef:2@Le Gouffre de Helm", "U"),
  l("Gripoil", "Le seigneur des chevaux", 3, 3, "C", RO, "Cheval|Bête", "", "noKneel:combat@Le plus rapide des chevaux", "R"),
  l("Cavalier du Rohan", "Les Rohirrim", 2, 2, "C", RO, "Rohirrim", "", "ifAtk:1@La charge", "C", { uni: false }),

  // --- Mordor
  l("Sauron", "L'Œil sans paupière", 7, 5, "RI", MO, "Maia|Seigneur des Ténèbres", "intimidation", "actSilence:7@L'Œil te voit ; aura:Mordor,1@Le Seigneur des Ténèbres", "L"),
  l("Sauron", "Le Seigneur des Anneaux", 7, 7, "CI", MO, "Maia|Seigneur des Ténèbres", "", "enterKneelAll:3@La masse de Sauron ; dieReturn@Tant que l'Anneau existe", "L"),
  l("Le Roi-Sorcier d'Angmar", "Le seigneur des Nazgûl", 6, 6, "CR", MO, "Nazgûl", "", "selfGuard@Aucun homme ne peut le tuer ; atkTerror:3@Le cri des Nazgûl", "E"),
  l("Le Balrog", "Le Fléau de Durin", 7, 7, "C", MO, "Maia|Démon", "intimidation", "atkTerror:3@Ombre et Flamme ; winKill:combat,4@Le fouet de feu", "L"),
  l("Nazgûl", "Un Spectre de l'Anneau", 4, 4, "CR", MO, "Nazgûl", "", "atkKneel:2@Le cri", "U", { uni: false }),
  l("La Bouche de Sauron", "Le héraut de Barad-dûr", 4, 3, "I", MO, "Homme|Héraut", "", "winDiscard:influence,1@Ses mensonges ; domi:1@Le héraut", "U"),
  l("Gothmog", "Le lieutenant de Minas Morgul", 5, 5, "C", MO, "Orque", "", "atkBuff:Orque,1@L'heure des Orques", "R"),
  l("Arachne", "La grande araignée", 5, 6, "C", MO, "Créature", "", "winFreeze:combat@Le venin", "R"),
  l("Gollum", "Mon précieux", 3, 2, "R", MO, "Trapu", "", "winDiscard:ruse,1@Mon précieux ! ; escape@Il survit toujours", "R"),
  l("Orque du Mordor", "La horde", 1, 1, "C", MO, "Orque", "", "ifWith:Orque,1@La horde", "C", { uni: false }),
  l("Troll des cavernes", "La brute", 5, 6, "C", MO, "Troll", "", "ifAtk:1@La massue", "U", { uni: false }),
  l("Oliphant", "Le Mûmak du Harad", 6, 7, "C", MO, "Bête|Harad", "intimidation", "", "U", { uni: false }),
  l("Guerrier haradrim", "Les hommes du Sud", 2, 2, "C", MO, "Homme|Harad", "", "ifAtk:1@La charge du Harad", "C", { uni: false }),
  l("Grishnákh", "L'orque de Lugbúrz", 2, 2, "CR", OMBRE, "Orque", "", "escape@Il file avec les Hobbits", "U"),

  // --- Isengard
  l("Saroumane", "Saroumane le Blanc", 7, 5, "RI", IS, "Maia|Istari", "genie", "actSilence:6@La voix de Saroumane ; enterPutPlay:Uruk-hai,5@Une nouvelle puissance se lève", "L"),
  l("Saroumane", "Sharcoux", 3, 2, "RI", IS, "Istari", "", "winDiscard:ruse,1@Le Nettoyage de la Comté", "R"),
  l("Gríma Langue-de-Serpent", "Le conseiller du roi", 3, 1, "RI", IS, "Homme|Conseiller", "", "actKneel:4@Il murmure à l'oreille de Théoden", "R"),
  l("Lurtz", "Le premier Uruk-hai", 5, 6, "C", IS, "Uruk-hai", "", "winKill:combat,3@Il abat Boromir", "R"),
  l("Uglúk", "Le chef des Uruk-hai", 4, 4, "C", IS, "Uruk-hai", "", "atkBuff:Uruk-hai,1@La race des combattants", "U"),
  l("Uruk-hai", "La nouvelle race", 3, 3, "C", IS, "Uruk-hai", "", "ifWith:Uruk-hai,1@L'armée de Saroumane", "C", { uni: false }),
  l("Berserker uruk-hai", "La torche du Gouffre", 4, 5, "C", IS, "Uruk-hai", "", "dieKill:2@Il fait sauter la muraille", "U", { uni: false }),
  l("Chevaucheur de warg", "Les loups de l'Isengard", 3, 3, "C", IS, "Orque|Warg", "", "ifAtk:1@La meute", "C", { uni: false }),
  l("Sharku", "Le chef des chevaucheurs", 4, 4, "C", IS, "Orque|Warg", "", "atkKneel:2@L'embuscade des wargs", "U"),
  l("Homme du Pays de Dun", "Les Dunlendings", 2, 2, "C", IS, "Homme|Dunlending", "", "ifAtk:1@La vengeance des Dunlendings", "C", { uni: false }),
  l("Corbeau de Saroumane", "Les espions crebain", 1, 1, "R", OMBRE, "Bête", "", "enterDraw:1@Les crebain du Pays de Dun", "C", { uni: false }),
  l("Azog le Profanateur", "L'orque pâle", 6, 6, "CR", OMBRE, "Orque", "", "winKill:combat,3@La chasse à Thorin", "E"),
  l("Bolg", "Le fils d'Azog", 5, 5, "C", OMBRE, "Orque", "", "ifName:Azog le Profanateur,1@La lignée d'Azog", "U"),
  l("Gobelin des Monts Brumeux", "Les cavernes de la Ville des Gobelins", 1, 1, "C", OMBRE, "Orque|Gobelin", "", "ifAtk:1@En nombre", "C", { uni: false }),

  // --- les alliés des Peuples libres
  l("Gandalf", "Gandalf le Gris", 7, 5, "CRI", LIB, "Maia|Istari|Communauté", "genie", "ifDef:2@Vous ne passerez pas ! ; dieReturn@Il reviendra", "L"),
  l("Gandalf", "Gandalf le Blanc", 7, 6, "CRI", LIB, "Maia|Istari", "celebre", "enterKneelAll:3@À l'aube du cinquième jour ; immune@Plus fort que Saroumane", "L"),
  l("Radagast le Brun", "Le magicien des bêtes", 4, 2, "RI", LIB, "Maia|Istari", "", "enterDraw:1@Les oiseaux ; actStand:*@Les lapins de Rhosgobel", "R"),
  l("Gwaihir", "Le Seigneur des Vents", 5, 5, "C", LIB, "Aigle|Bête", "", "winStand:combat@Les Aigles arrivent !", "R"),
  l("Beorn", "Le changeur de peau", 5, 6, "C", LIB, "Bête|Homme", "", "ifAtk:2@L'ours", "R"),
  l("Sylvebarbe", "Le plus vieil Ent", 6, 7, "C", `${HO}|${RO}|${EL}`, "Ent", "", "winKill:combat,3@La chute de l'Isengard ; ifDef:1@Ne soyons pas pressés", "E"),
  l("Ent de Fangorn", "Les bergers des arbres", 4, 5, "C", `${HO}|${RO}|${EL}`, "Ent", "", "ifWith:Ent,1@L'Entmoot", "C", { uni: false }),
  // --- partout
  l("Tom Bombadil", "Le Maître", 5, 3, "RI", "", "Mystère", "", "immune@L'Anneau n'a aucun pouvoir sur lui ; actStand:*@Ho ! Tom Bombadil !", "E"),
  l("Prosper Poiredebeurré", "L'aubergiste du Poney Fringant", 1, 1, "I", "", "Homme", "", "enterGold:1@Le Poney Fringant", "C"),

  // --- lieux
  loc("Le Poney Fringant", "L'auberge de Bree", 1, "Auberge", "limite", "income:1", "C"),
  loc("Bree", "Le carrefour des routes", 2, "Village", "", "reduce:*,1@Les voyageurs ; reserve:1", "R"),
  loc("La Montagne du Destin", "Orodruin", 3, "Volcan", "", "domi:2 ; reserve:1", "R"),
  loc("La Comté", "Le pays des Hobbits", 2, "Pays", "", "reserve:1 ; domi:1", "U", { pt: HO }),
  loc("Fondcombe", "La dernière maison simple", 2, "Cité", "", "reserve:1 ; domi:1", "U", { pt: EL }),
  loc("Erebor", "La Montagne Solitaire", 2, "Montagne", "", "reserve:1 ; domi:1", "U", { pt: NA }),
  loc("La Moria", "Khazad-dûm", 2, "Mine", "", "reduce:Nain,1@Les anciennes mines ; reserve:1", "U", { pt: NA }),
  loc("Minas Tirith", "La Cité blanche", 2, "Cité", "", "reserve:1 ; domi:1", "U", { pt: GO }),
  loc("Edoras", "Meduseld, la salle dorée", 2, "Cité", "", "reserve:1 ; domi:1", "U", { pt: RO }),
  loc("Le Gouffre de Helm", "La forteresse du Rohan", 3, "Forteresse", "", "defAura:1@La forteresse imprenable", "R", { pt: `${RO}|${GO}` }),
  loc("Barad-dûr", "La Tour sombre", 2, "Tour", "", "reserve:1 ; domi:1", "U", { pt: MO }),
  loc("Orthanc", "La tour de Saroumane", 2, "Tour", "", "reserve:1 ; domi:1", "U", { pt: IS }),

  // --- objets
  obj("L'Anneau Unique", "Un Anneau pour les gouverner tous", 2, "Anneau", "", "attKw:discret ; attStr:2", "E"),
  obj("Un palantír", "La pierre de vision", 1, "Palantír", "", "attWinDraw:1", "U"),
  obj("Dard", "L'épée qui brille en bleu", 1, "Arme", "", "attStr:1 ; attIcon:combat", "U", { pt: HO }),
  obj("La cotte de mithril", "Plus légère qu'une plume", 2, "Armure", "", "attSave", "R", { pt: `${HO}|${NA}` }),
  obj("Andúril", "La Flamme de l'Ouest", 2, "Arme", "", "attStr:2 ; attKw:intimidation", "R", { pt: `${GO}|${RO}` }),
  obj("L'arc de la Galadhrim", "Le présent de Galadriel", 2, "Arme", "", "attStr:2", "U", { pt: EL }),
  obj("La hache de Gimli", "Une hache naine", 2, "Arme", "", "attStr:2 ; attKw:duel", "U", { pt: NA }),
  obj("Le cor du Gondor", "Le cor de Boromir", 1, "Cor", "", "attStand", "U", { pt: GO }),
  obj("La Lame de Morgul", "La blessure qui ne guérit pas", 2, "Arme maudite", "", "attNoStand", "U", { pt: MO }),

  // --- événements
  ev("Vous ne passerez pas !", "Le pont de Khazad-dûm", 1, "Magie", "evCancel", "R", { pt: LIB }),
  ev("Les Aigles arrivent !", "Le sauvetage", 2, "Aigle", "evSave:*", "R", { pt: LIB }),
  ev("Le lembas", "Le pain de route elfique", 2, "Nourriture", "evDraw:2", "U", { pt: LIB }),
  ev("La flèche noire", "La fin de Smaug", 3, "Arme", "evKill:4", "R", { pt: LIB }),
  ev("Le second petit-déjeuner", "Un Hobbit a toujours faim", 0, "Nourriture", "evGold:1", "C", { pt: HO }),
  ev("La fiole de Galadriel", "La lumière d'Eärendil", 1, "Lumière", "evMinus:3", "U", { pt: `${HO}|${EL}` }),
  ev("Khazâd aimênu !", "Les haches des Nains sont sur vous", 2, "Cri de guerre", "evBuffTrait:Nains,2", "U", { pt: NA }),
  ev("Les feux d'alarme", "Gondor appelle à l'aide", 2, "Signal", "evStandAll:Gondor", "R", { pt: GO }),
  ev("La charge des Rohirrim", "Mort ! Mort !", 2, "Charge", "evBuffTrait:Rohan,2", "U", { pt: RO }),
  ev("La marche des Ents", "La dernière marche", 3, "Ent", "evKill:4", "R", { pt: `${HO}|${RO}|${EL}` }),
  ev("Les ténèbres du Mordor", "La guerre de l'Anneau", 3, "Guerre", "evKill:4", "R", { pt: OMBRE }),
  ev("Un Anneau pour les gouverner tous", "Et dans les ténèbres les lier", 3, "Anneau", "evPowerSteal:1", "R", { pt: MO }),
  ev("Mon précieux !", "Il a volé l'Anneau", 1, "Vol", "evSteal:2", "U", { pt: MO }),
  ev("Une nouvelle puissance se lève", "Les fosses d'Isengard", 1, "Guerre", "evPutPlay:Uruk-hai,5", "R", { pt: IS }),
  ev("La voix de Saroumane", "Le pouvoir de persuasion", 1, "Magie", "evKneel:3", "U", { pt: IS }),
];

export const starters = [
  { id: "lotr-hobbits", name: "Les Hobbits", pt: HO, leader: "lotr-frodon-sacquet-7", like: [HO, HO, "Hobbit", "Communauté"], avoid: [], desc: "Frodon, Sam, Merry, Pippin, Bilbon et leurs amis : personne ne fait attention aux Hobbits, ils ont Discret." },
  { id: "lotr-elfes", name: "Les Elfes", pt: EL, leader: "lotr-galadriel-7", like: [EL, EL, "Elfe", "Porteur d'anneau"], avoid: [], desc: "Galadriel, Elrond, Legolas, Arwen, Glorfindel et les archers de la Lórien : les Elfes défendent plus fort et se relèvent après une victoire." },
  { id: "lotr-nains", name: "Les Nains", pt: NA, leader: "lotr-thorin-ecu-de-chene-7", like: [NA, NA, "Nain", "Communauté"], avoid: [], desc: "Thorin, Dáin, Gimli, Balin et la compagnie d'Erebor : les trésors de la montagne rapportent +1 or par round." },
  { id: "lotr-gondor", name: "Le Gondor", pt: GO, leader: "lotr-aragorn-7-2", like: [GO, GO, "Homme", "Rôdeur"], avoid: [], desc: "Aragorn, Boromir, Faramir, Isildur et l'Armée des morts : la Cité blanche défend plus fort." },
  { id: "lotr-rohan", name: "Le Rohan", pt: RO, leader: "lotr-theoden-6", like: [RO, RO, "Rohirrim", "Bête"], avoid: [], desc: "Théoden, Éowyn, Éomer et les Rohirrim, avec Gripoil : la charge des cavaliers donne un défi de Combat de plus." },
  { id: "lotr-mordor", name: "Le Mordor", pt: MO, leader: "lotr-sauron-7", like: [MO, MO, "Orque", "Nazgûl"], avoid: [], desc: "Sauron, le Roi-Sorcier et les Nazgûl, le Balrog, Arachne et les orques : l'Œil de Sauron donne Intimidation." },
  { id: "lotr-isengard", name: "L'Isengard", pt: IS, leader: "lotr-saroumane-7", like: [IS, IS, "Uruk-hai", "Orque"], avoid: [], desc: "Saroumane, Gríma, Lurtz, Azog et les Uruk-hai : les forges rapportent +1 or par round, et les Uruk-hai ont Intimidation." },
];
