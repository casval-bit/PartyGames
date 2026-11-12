import { ch, loc, obj, ev } from "./build.js";

// Harry Potter : un deck choisit UNE maison de Poudlard (comme une région de League of Legends). Il joue les sorciers de
// cette maison, plus ceux qui vont partout : les créatures, les Aurors, le Ministère, les sortilèges et les objets magiques.
// Chaque maison a son fondateur en carte 7 et son fantôme ; Harry, Voldemort et Dumbledore ont deux versions à 7.
export const meta = {
  id: "hp", name: "Harry Potter", short: "Harry Potter", color: "#d3a625", color2: "#1a1033", icon: "wand", motif: "hogwarts",
  desc: "Les sorciers de Poudlard. Choisis une maison : chacune a son bonus, ses élèves, ses professeurs et son fondateur. Les créatures, les Aurors, les sortilèges et les objets magiques vont dans toutes les maisons.",
  passive: "",
  sub: { one: "maison", One: "Maison", fem: true, ask: "Quelle maison de Poudlard ?", help: "Un deck Harry Potter ne prend que les sorciers de sa maison (et ceux qui vont partout : créatures, Aurors, sortilèges, objets) ; chaque maison donne un bonus à la famille.",
    pick: "Choisis une maison de Poudlard pour ce deck.", not: "n'est pas de la maison", starter: "hp" },
};

const G = "Gryffondor", S = "Serpentard", R = "Serdaigle", P = "Poufsouffle";

export const types = [
  { id: G, name: "Gryffondor", color: "#c0262d", bonus: "atkAura:Gryffondor,2@Le courage des Gryffondor", desc: "Les braves : vos sorciers de Gryffondor frappent bien plus fort en attaque." },
  { id: S, name: "Serpentard", color: "#2a8a4f", bonus: "fWinDiscard:ruse,1@La ruse des Serpentard", desc: "Les rusés : chaque round, un défi de Ruse gagné fait défausser une carte au perdant." },
  { id: R, name: "Serdaigle", color: "#3d6fd1", bonus: "fWinStand:ruse@L'esprit vif", desc: "Les esprits vifs : chaque round, après un défi de Ruse gagné, un de vos participants se redresse." },
  { id: P, name: "Poufsouffle", color: "#e8b923", bonus: "famEscape:Poufsouffle@La loyauté de Poufsouffle", desc: "Les loyaux : une fois par round, un sorcier de Poufsouffle qui devrait mourir retourne dans votre main à la place." },
];

/** Un sorcier : sa maison (vide = va dans toutes les maisons), puis ses traits. */
const w = (name, title, cost, str, icons, pt, traits, kw, ab, r, o = {}) => ch(name, title, cost, str, icons, traits, kw, ab, r, { pt, ...o });

export const cards = [
  // --- Gryffondor
  w("Harry Potter", "Le Survivant", 7, 6, "CRI", G, "Élève|Quidditch|Armée de Dumbledore", "celebre", "dieReturn@Le garçon qui a survécu ; winBounce:combat,5@Expelliarmus", "L"),
  w("Harry Potter", "Le Maître de la Mort", 7, 6, "CI", G, "Ordre du Phénix|Relique", "", "immune@La cape d'invisibilité ; enterRevive:5@La pierre de résurrection", "L"),
  w("Harry Potter", "L'Élu", 4, 4, "CI", G, "Élève|Quidditch", "", "ifBehind:1@L'Élu ; winDraw:combat,1@L'attrapeur", "R"),
  w("Harry Potter", "Le garçon sous l'escalier", 2, 2, "C", G, "Élève", "", "loseStand@Il se relève", "C"),
  w("Hermione Granger", "La sorcière la plus brillante de son âge", 6, 5, "RI", G, "Élève|Ordre du Phénix|Armée de Dumbledore", "genie", "actSilence:6@Petrificus Totalus ; winDraw:ruse,1@Elle a tout lu", "E"),
  w("Hermione Granger", "Miss Je-sais-tout", 3, 2, "RI", G, "Élève", "genie", "enterDraw:1@La bibliothèque", "R"),
  w("Ron Weasley", "Le meilleur ami", 5, 5, "CI", G, "Élève|Weasley|Ordre du Phénix", "", "ifName:Harry Potter,1@Le trio ; winKneel:ruse@La partie d'échecs", "R"),
  w("Ron Weasley", "Le roi des échecs", 2, 2, "C", G, "Élève|Weasley", "", "ifWith:Weasley,1@La famille", "C"),
  w("Albus Dumbledore", "Le directeur de Poudlard", 7, 6, "CRI", G, "Professeur|Ordre du Phénix", "genie", "aura:Gryffondor,1@L'Ordre du Phénix ; enterSearch:*@Fumseck apporte de l'aide", "L"),
  w("Albus Dumbledore", "Le maître de la baguette de sureau", 7, 7, "CR", G, "Professeur|Ordre du Phénix|Relique", "intimidation", "enterKneelAll:3@Le duel du Ministère ; selfGuard@Un sorcier hors du commun", "L"),
  w("Minerva McGonagall", "La directrice adjointe", 6, 5, "CI", G, "Professeur|Ordre du Phénix|Animagus", "", "enterPutPlay:*,3@Piertotum Locomotor ; ifDef:1@La lionne de Gryffondor", "E"),
  w("Rubeus Hagrid", "Le gardien des clés", 5, 6, "C", G, "Professeur|Ordre du Phénix|Demi-géant", "", "enterSearch:Créature@Le soin aux créatures magiques", "R"),
  w("Sirius Black", "Le parrain", 6, 5, "CR", G, "Ordre du Phénix|Black|Animagus", "", "escape@Patmol ; ifName:Harry Potter,1@Le parrain", "E"),
  w("Remus Lupin", "Le professeur", 5, 4, "CR", G, "Professeur|Ordre du Phénix|Loup-garou", "", "ifAtk:2@La pleine lune ; winDraw:ruse,1@Riddikulus", "R"),
  w("Ginny Weasley", "La poursuiveuse", 4, 4, "C", G, "Élève|Weasley|Quidditch|Armée de Dumbledore", "", "atkKneel:3@Le maléfice de Chauve-Furie", "R"),
  w("Neville Londubat", "Le héros de la bataille de Poudlard", 5, 5, "CI", G, "Élève|Armée de Dumbledore", "", "ifBehind:2@Le vrai courage ; winKill:combat,3@L'épée de Gryffondor", "E"),
  w("Neville Londubat", "Le garçon maladroit", 2, 1, "R", G, "Élève", "", "loseStand@Il se relève toujours", "C"),
  w("Fred Weasley", "Le farceur", 3, 2, "CR", G, "Élève|Weasley", "", "ifName:George Weasley,1@Les jumeaux ; winGold:*,1@Le magasin de farces", "U"),
  w("George Weasley", "L'autre farceur", 3, 2, "CR", G, "Élève|Weasley", "", "ifName:Fred Weasley,1@Les jumeaux ; enterDiscard:1@Les Boîtes à Flemme", "U"),
  w("Molly Weasley", "La mère de famille", 4, 3, "CI", G, "Ordre du Phénix|Weasley", "", "guard:Weasley@Pas ma fille !", "R"),
  w("Arthur Weasley", "L'ami des Moldus", 3, 2, "I", G, "Ordre du Phénix|Weasley|Ministère", "", "enterDraw:1@Les objets moldus", "U"),
  w("Nick Quasi-Sans-Tête", "Le fantôme de Gryffondor", 2, 1, "I", G, "Fantôme", "", "escape@Déjà mort", "U"),
  w("Godric Gryffondor", "Le fondateur", 7, 7, "CI", G, "Fondateur", "celebre|intimidation", "aura:Gryffondor,1@L'héritage de Godric ; winStand:combat@Le courage du lion", "L"),
  w("Peter Pettigrow", "Queudver", 3, 2, "R", G, "Mangemort|Animagus", "discret", "escape@Le rat", "U"),
  w("Olivier Dubois", "Le capitaine de Quidditch", 3, 3, "C", G, "Élève|Quidditch", "", "atkBuff:Quidditch,1@Le capitaine", "U"),
  w("Seamus Finnigan", "L'artificier", 2, 2, "C", G, "Élève|Armée de Dumbledore", "", "dieDraw:1@Ça va exploser !", "C"),
  w("Dean Thomas", "Le dessinateur", 2, 2, "C", G, "Élève|Armée de Dumbledore", "", "", "C"),
  w("Élèves de Gryffondor", "La maison des braves", 1, 1, "C", G, "Élève", "", "", "C", { uni: false }),

  // --- Serpentard
  w("Lord Voldemort", "Le Seigneur des Ténèbres", 7, 7, "CRI", S, "Mangemort|Mage noir", "intimidation", "atkTerror:4@La terreur ; dieReturn@Les Horcruxes", "L"),
  w("Lord Voldemort", "Le mage noir renaissant", 7, 6, "CR", S, "Mangemort|Mage noir", "", "enterKill:4@Avada Kedavra ; aura:Mangemort,1@Les Mangemorts", "L"),
  w("Tom Jedusor", "Le jeune Tom", 4, 3, "RI", S, "Élève|Mage noir", "discret", "winDiscard:ruse,1@Le journal", "R", { key: "hp-lord-voldemort" }),
  w("Severus Rogue", "Toujours", 7, 6, "RI", S, "Professeur|Ordre du Phénix|Mangemort", "genie", "guard:*@Toujours ; immune@Occlumens", "L"),
  w("Severus Rogue", "Le Prince de Sang-Mêlé", 5, 4, "CR", S, "Professeur|Mangemort", "", "winKill:ruse,2@Sectumsempra", "R"),
  w("Drago Malefoy", "La mission", 6, 5, "CR", S, "Élève|Mangemort|Malefoy", "", "enterPutPlay:Mangemort,4@L'Armoire à disparaître", "E"),
  w("Drago Malefoy", "Le rival", 3, 3, "RI", S, "Élève|Malefoy|Quidditch", "", "winDiscard:influence,1@Mon père en entendra parler", "R"),
  w("Lucius Malefoy", "Le Mangemort fortuné", 5, 4, "RI", S, "Mangemort|Malefoy", "", "enterGold:2@La fortune des Malefoy ; winSteal:influence,1@Le conseil d'administration", "R"),
  w("Bellatrix Lestrange", "La fidèle du Seigneur des Ténèbres", 6, 6, "CR", S, "Mangemort|Black", "intimidation", "winKill:combat,3@Avada Kedavra", "E"),
  w("Narcissa Malefoy", "La mère", 4, 3, "RI", S, "Malefoy|Black", "", "guard:Malefoy@Le mensonge de Narcissa", "R"),
  w("Dolores Ombrage", "La Grande Inquisitrice", 5, 3, "RI", S, "Professeur|Ministère", "", "actSilence:5@Décret d'éducation ; domi:2@Hum, hum", "E"),
  w("Horace Slughorn", "Le collectionneur", 4, 3, "RI", S, "Professeur", "", "enterGold:2@Le Club de Slug ; enterDraw:1@Les relations", "R"),
  w("Le Basilic", "Le monstre de la Chambre des secrets", 6, 6, "C", S, "Créature|Serpent", "intimidation", "winFreeze:combat@Le regard pétrifiant", "E"),
  w("Nagini", "Le serpent de Voldemort", 4, 4, "C", S, "Créature|Serpent|Horcruxe", "", "winKill:combat,2@La morsure ; ifName:Lord Voldemort,1@Le dernier Horcruxe", "R"),
  w("Fenrir Greyback", "Le loup-garou", 4, 5, "C", S, "Mangemort|Loup-garou", "", "ifAtk:1@La pleine lune", "U"),
  w("Barty Croupton Jr", "Le faux Fol Œil", 4, 3, "CR", S, "Mangemort", "discret", "escape@Le Polynectar", "R"),
  w("Détraqueur", "Le gardien d'Azkaban", 3, 3, "C", S, "Créature|Azkaban", "", "winDiscard:*,1@Le baiser du Détraqueur", "U", { uni: false }),
  w("Vincent Crabbe", "Le garde du corps", 2, 2, "C", S, "Élève", "", "ifName:Drago Malefoy,1@Le garde du corps", "C"),
  w("Gregory Goyle", "L'autre garde du corps", 2, 2, "C", S, "Élève", "", "ifName:Drago Malefoy,1@Le garde du corps", "C"),
  w("Pansy Parkinson", "La langue de vipère", 2, 1, "I", S, "Élève", "", "domi:1@Les rumeurs", "C"),
  w("Le Baron Sanglant", "Le fantôme de Serpentard", 2, 1, "C", S, "Fantôme", "", "escape@Déjà mort", "U"),
  w("Salazar Serpentard", "Le fondateur", 7, 6, "CRI", S, "Fondateur", "celebre", "aura:Serpentard,1@L'héritage de Salazar ; enterSearch:Serpent@La Chambre des secrets", "L"),
  w("Regulus Black", "R.A.B.", 3, 2, "R", S, "Mangemort|Black", "", "dieDraw:2@Le médaillon", "U"),
  w("Élèves de Serpentard", "La maison des ambitieux", 1, 1, "R", S, "Élève", "", "", "C", { uni: false }),

  // --- Serdaigle
  w("Rowena Serdaigle", "La fondatrice", 7, 6, "RI", R, "Fondateur", "genie|celebre", "aura:Serdaigle,1@L'héritage de Rowena ; winDraw:*,1@Le diadème", "L"),
  w("Luna Lovegood", "La rêveuse", 5, 4, "RI", R, "Élève|Armée de Dumbledore", "", "immune@Les Joncheruines ; winKneel:ruse@Le Chicaneur", "E"),
  w("Luna Lovegood", "Loufoca", 2, 1, "R", R, "Élève", "discret", "", "U"),
  w("Cho Chang", "L'attrapeuse", 3, 3, "CR", R, "Élève|Quidditch|Armée de Dumbledore", "", "winDraw:combat,1@Le Vif d'or", "U"),
  w("Filius Flitwick", "Le maître des sortilèges", 4, 3, "RI", R, "Professeur|Ordre du Phénix", "", "atkKneel:3@Champion de duel ; actBuff:*,1@Sortilèges", "R"),
  w("Gilderoy Lockhart", "L'imposteur", 3, 2, "I", R, "Professeur|Célébrité", "celebre", "domi:2@Le plus beau sourire", "U"),
  w("Quirinus Quirrell", "Le professeur au turban", 4, 3, "R", R, "Professeur|Mangemort", "discret", "winDiscard:ruse,1@Sous le turban", "U"),
  w("Sibylle Trelawney", "La voyante", 3, 1, "RI", R, "Professeur", "", "firstDraw:1@La prophétie ; enterSearch:*@Le troisième œil", "R"),
  w("Garrick Ollivander", "Le fabricant de baguettes", 3, 2, "RI", R, "Artisan", "", "enterSearch:Baguette@La baguette choisit le sorcier", "U"),
  w("Xenophilius Lovegood", "L'éditeur du Chicaneur", 2, 1, "I", R, "Sorcier", "", "enterDraw:1@Le Chicaneur", "C"),
  w("La Dame grise", "Le fantôme de Serdaigle", 2, 1, "R", R, "Fantôme", "", "escape@Déjà morte", "U"),
  w("Mimi Geignarde", "Le fantôme des toilettes", 1, 1, "R", R, "Fantôme", "", "escape@Déjà morte", "C"),
  w("Padma Patil", "La préfète", 2, 1, "RI", R, "Élève", "", "domi:1@La préfète", "C"),
  w("Penelope Deauclaire", "La pétrifiée", 2, 2, "R", R, "Élève", "", "", "C"),
  w("Michael Corner", "Le membre de l'AD", 2, 2, "C", R, "Élève|Armée de Dumbledore", "", "ifWith:Armée de Dumbledore,1@L'AD", "C"),
  w("Roger Davies", "Le capitaine de Quidditch", 3, 3, "C", R, "Élève|Quidditch", "", "atkBuff:Quidditch,1@Le capitaine", "U"),
  w("Marietta Edgecombe", "La cafarde", 2, 1, "R", R, "Élève", "", "dieDraw:1@CAFARDE", "C"),
  w("Élèves de Serdaigle", "La maison des érudits", 1, 1, "R", R, "Élève", "", "", "C", { uni: false }),

  // --- Poufsouffle
  w("Helga Poufsouffle", "La fondatrice", 7, 6, "CI", P, "Fondateur", "", "aura:Poufsouffle,1@L'héritage de Helga ; guard:Poufsouffle@Elle accueille tout le monde", "L"),
  w("Cedric Diggory", "Le champion de Poudlard", 5, 5, "CI", P, "Élève|Quidditch", "", "winStand:combat@Le Tournoi des Trois Sorciers", "E"),
  w("Cedric Diggory", "L'attrapeur de Poufsouffle", 3, 3, "C", P, "Élève|Quidditch", "", "winDraw:combat,1@Le Vif d'or", "U"),
  w("Nymphadora Tonks", "La métamorphomage", 4, 4, "CR", P, "Auror|Ordre du Phénix", "discret", "escape@Métamorphomagie", "R"),
  w("Norbert Dragonneau", "Le magizoologiste", 6, 5, "CRI", P, "Magizoologiste", "", "enterPutPlay:Créature,4@La valise ; winDraw:*,1@Les animaux fantastiques", "E"),
  w("Pomona Chourave", "La professeure de botanique", 4, 3, "RI", P, "Professeur|Ordre du Phénix", "", "enterKneelAll:2@Le cri des Mandragores", "R"),
  w("Hannah Abbott", "La future aubergiste", 2, 1, "I", P, "Élève|Armée de Dumbledore", "", "enterDraw:1@Le Chaudron Baveur", "C"),
  w("Ernie Macmillan", "Le préfet", 2, 2, "C", P, "Élève|Armée de Dumbledore", "", "ifDef:1@Préfet", "C"),
  w("Justin Finch-Fletchley", "L'élève pétrifié", 2, 2, "C", P, "Élève", "", "", "C"),
  w("Susan Bones", "La nièce d'Amelia", 2, 2, "C", P, "Élève|Armée de Dumbledore", "", "", "C"),
  w("Zacharias Smith", "Le commentateur", 2, 1, "R", P, "Élève|Quidditch", "", "domi:1@Le commentateur", "C"),
  w("Le Moine gras", "Le fantôme de Poufsouffle", 2, 1, "I", P, "Fantôme", "", "escape@Déjà mort", "U"),
  w("Amos Diggory", "Le père de Cedric", 3, 2, "I", P, "Ministère", "", "ifName:Cedric Diggory,2@Mon fils", "C"),
  w("Teddy Lupin", "Le fils de Tonks et Lupin", 1, 1, "R", P, "Métamorphomage", "", "", "C"),
  w("Élèves de Poufsouffle", "La maison des loyaux", 1, 1, "C", P, "Élève", "", "", "C", { uni: false }),

  // --- partout : créatures, Aurors, Ministère
  w("Dobby", "L'elfe libre", 2, 1, "RI", "", "Elfe de maison|Créature", "", "sacSave:*@Dobby est un elfe libre", "R"),
  w("Kreattur", "L'elfe des Black", 2, 1, "R", "", "Elfe de maison|Créature", "", "actStand:*@Le service", "U"),
  w("Hedwige", "La chouette de Harry", 1, 1, "R", "", "Créature|Hibou", "", "enterDraw:1@Le courrier", "U"),
  w("Fumseck", "Le phénix de Dumbledore", 3, 2, "RI", "", "Créature|Phénix", "", "dieReturn@Renaître de ses cendres ; actStand:*@Les larmes de phénix", "E"),
  w("Buck", "L'hippogriffe", 3, 3, "C", "", "Créature", "", "escape@Il s'envole", "U"),
  w("Touffu", "Le chien à trois têtes", 4, 5, "C", "", "Créature", "", "ifDef:2@Il garde la trappe", "U"),
  w("Aragog", "L'acromentule", 4, 4, "C", "", "Créature|Araignée", "", "enterPutPlay:Créature,2@Ses enfants", "U"),
  w("Norbert", "Le dragon de Hagrid", 3, 3, "C", "", "Créature|Dragon", "", "ifAtk:1@Le souffle", "C"),
  w("Le Magyar à pointes", "Le dragon de la première tâche", 6, 6, "C", "", "Créature|Dragon", "intimidation", "winKill:combat,3@Le feu du dragon", "R"),
  w("Le Saule cogneur", "L'arbre qui frappe", 4, 5, "C", "", "Créature|Arbre", "", "ifDef:2@Il frappe tout ce qui approche", "U"),
  w("Firenze", "Le centaure", 3, 3, "CR", "", "Créature|Centaure", "", "firstDraw:1@Les étoiles", "U"),
  w("Le Niffleur", "Il aime tout ce qui brille", 1, 1, "R", "", "Créature", "", "winSteal:*,1@Tout ce qui brille", "U"),
  w("Alastor Maugrey", "Fol Œil", 5, 4, "CR", "", "Auror|Ordre du Phénix", "", "immune@Vigilance constante ! ; winKneel:combat@L'Auror", "E"),
  w("Kingsley Shacklebolt", "L'Auror", 4, 4, "CI", "", "Auror|Ordre du Phénix|Ministère", "", "ifDef:1@Le futur ministre", "U"),
  w("Cornelius Fudge", "Le ministre de la Magie", 3, 2, "I", "", "Ministère", "", "domi:2@Le Ministère", "U"),
  w("Auror du Ministère", "Les forces de l'ordre", 2, 2, "C", "", "Auror|Ministère", "", "ifWith:Auror,1@En patrouille", "C", { uni: false }),
  w("Jacob Kowalski", "Le boulanger moldu", 2, 2, "I", "", "Moldu", "", "enterGold:1@La boulangerie", "C"),

  // --- lieux
  loc("Poudlard", "L'école de sorcellerie", 2, "École", "", "reserve:1 ; domi:1", "U"),
  loc("La Grande Salle", "Le banquet", 1, "École", "limite", "income:1", "C"),
  loc("Le Chemin de Traverse", "Les boutiques des sorciers", 2, "Commerce", "", "reduce:*,1@Les emplettes ; reserve:1", "R"),
  loc("Le Ministère de la Magie", "Le cœur du monde des sorciers", 3, "Ministère", "", "domi:2 ; reserve:1", "R"),
  loc("La Forêt interdite", "Là où vivent les créatures", 2, "Forêt", "", "reduce:Créature,1@Les créatures", "U"),
  loc("La salle commune de Gryffondor", "Derrière la Grosse Dame", 2, "Salle commune", "", "reserve:1 ; domi:1", "U", { pt: G }),
  loc("La salle commune de Serpentard", "Sous le lac", 2, "Salle commune", "", "reserve:1 ; domi:1", "U", { pt: S }),
  loc("La salle commune de Serdaigle", "La tour des énigmes", 2, "Salle commune", "", "reserve:1 ; domi:1", "U", { pt: R }),
  loc("La salle commune de Poufsouffle", "Près des cuisines", 2, "Salle commune", "", "reserve:1 ; domi:1", "U", { pt: P }),

  // --- objets magiques
  obj("La baguette de sureau", "La Relique de la Mort", 3, "Relique|Baguette", "", "attStr:2 ; attKw:intimidation", "E"),
  obj("La cape d'invisibilité", "La Relique de la Mort", 2, "Relique", "", "attKw:discret ; attSave", "E"),
  obj("La baguette de houx", "Plume de phénix", 1, "Baguette", "", "attIcon:ruse", "C"),
  obj("L'Éclair de feu", "Le balai le plus rapide", 2, "Balai", "", "attStand", "U"),
  obj("La Carte du Maraudeur", "Méfait accompli", 1, "Objet magique", "", "attWinDraw:1", "U"),
  obj("L'épée de Gryffondor", "Pour le vrai Gryffondor", 2, "Arme", "", "attStr:2 ; attKw:intimidation", "R", { pt: G, req: G }),
  obj("Le médaillon de Serpentard", "Un Horcruxe", 1, "Horcruxe", "", "attNeg:2", "U", { pt: S }),
  obj("Le diadème de Serdaigle", "La sagesse sans égale", 2, "Horcruxe", "", "attIcon:ruse ; attWinDraw:1", "R", { pt: R }),
  obj("La coupe de Poufsouffle", "Le trésor de Helga", 2, "Horcruxe", "", "attKw:celebre", "R", { pt: P }),

  // --- sortilèges et potions
  ev("Expelliarmus", "Le sortilège de désarmement", 1, "Sortilège", "evMinus:3", "C"),
  ev("Stupéfix", "Le sortilège de stupéfixion", 1, "Sortilège", "evKneel:3", "U"),
  ev("Protego", "Le charme du bouclier", 1, "Sortilège", "evBuff:3", "C"),
  ev("Spero Patronum", "Le Patronus", 2, "Sortilège", "evSave:*", "R"),
  ev("Accio", "Le sortilège d'attraction", 1, "Sortilège", "evRecall:*", "U"),
  ev("Wingardium Leviosa", "Le sortilège de lévitation", 1, "Sortilège", "evBounce:3", "U"),
  ev("Oubliettes", "Le sortilège d'amnésie", 1, "Sortilège", "evDiscard:2", "U"),
  ev("Felix Felicis", "La chance liquide", 2, "Potion", "evDraw:2", "R"),
  ev("La pierre de résurrection", "La Relique de la Mort", 2, "Relique", "evRevive", "E"),
  ev("Le Retourneur de temps", "Trois tours suffiront", 1, "Objet magique", "evStand:*", "U"),
  ev("Avada Kedavra", "Le sortilège de la mort", 3, "Sortilège impardonnable", "evKill:4", "R", { pt: S }),
  ev("La Marque des Ténèbres", "Le Seigneur des Ténèbres appelle", 1, "Mangemort", "evPutPlay:Mangemort,4", "R", { pt: S }),
  ev("L'Armée de Dumbledore", "Les élèves s'entraînent", 2, "Rébellion", "evBuffTrait:Gryffondor,2", "U", { pt: G }),
  ev("L'énigme du heurtoir", "Pour entrer chez Serdaigle", 1, "Énigme", "evCancel", "R", { pt: R }),
  ev("Les fidèles de Poufsouffle", "Loyaux jusqu'au bout", 1, "Loyauté", "evSave:Poufsouffle", "U", { pt: P }),
];

export const starters = [
  { id: "hp-gryffondor", name: "Gryffondor", pt: G, leader: "hp-harry-potter-7", like: [G, G, "Ordre du Phénix", "Armée de Dumbledore"], avoid: [], desc: "Harry, Hermione et Ron, Neville, Ginny, Hagrid, les Weasley… Les braves frappent bien plus fort en attaque." },
  { id: "hp-serpentard", name: "Serpentard", pt: S, leader: "hp-lord-voldemort-7", like: [S, S, "Mangemort", "Malefoy"], avoid: [], desc: "Voldemort et ses Mangemorts, Rogue, les Malefoy, Bellatrix, Nagini… Chaque round, un défi de Ruse gagné fait défausser l'adversaire." },
  { id: "hp-serdaigle", name: "Serdaigle", pt: R, leader: "hp-luna-lovegood-5", like: [R, R, "Professeur", "Armée de Dumbledore"], avoid: [], desc: "Luna, Cho, Flitwick, Trelawney, Ollivander et Rowena Serdaigle : après un défi de Ruse gagné, un esprit vif se redresse." },
  { id: "hp-poufsouffle", name: "Poufsouffle", pt: P, leader: "hp-norbert-dragonneau-6", like: [P, P, "Créature", "Armée de Dumbledore"], avoid: [], desc: "Norbert Dragonneau et ses créatures, Cedric, Tonks, Chourave et Helga Poufsouffle : une fois par round, un loyal Poufsouffle échappe à la mort." },
];
