import { ch, loc, obj, ev } from "./build.js";

// JoJo's Bizarre Adventure : neuf parties, une lignée (les Joestar, l'étoile sur l'épaule) et leurs ennemis.
// Les versions d'un même personnage (même nom) sont des alternatives : une seule par deck (Dio Brando OU Dio Brando « New Body »).
// Josuke Higashikata (JoJolion) est un autre personnage que Josuke Higashikata : il a son propre nom, donc sa propre clé.
// Les images gardent les noms envoyés par Brice : option art quand ils diffèrent de « Nom Coût » (« Dio Brando (New Body) 7 »).
// L'ordre compte pour les identifiants : deux versions de même nom et même coût prennent -2 dans l'ordre du fichier
// (Dio Brando 7 « Le vampire » = jojo-dio-brando-7, « New Body » = jojo-dio-brando-7-2).
export const meta = {
  id: "jojo", name: "JoJo's Bizarre Adventure", short: "JoJo", color: "#c45cff", color2: "#2a0b45", icon: "sparkle", motif: "menacing",
  desc: "La lignée des Joestar et ses ennemis, du Hamon aux Stands : des combats singuliers où chaque pouvoir est bizarre.",
  passive: "fSoloDraw:*,1@Un contre un",
};

export const cards = [
  // --- Phantom Blood : Jonathan, Dio et le Hamon
  ch("Jonathan Joestar", "Le gentleman du Hamon", 7, 6, "CI", "Joestar|Hamon|Gentleman", "celebre", "winKill:combat,3@Sunlight Yellow Overdrive ; sacSave:*@Il se sacrifie pour les siens", "L"),
  ch("Dio Brando", "Le vampire", 7, 6, "CRI", "Vampire", "intimidation", "winFreeze:combat@Vaporisation glaciale ; dieReturn@Il survit en tête", "L"),
  ch("Robert E. O. Speedwagon", "Le gentleman des bas-fonds", 4, 3, "RI", "Allié|Gentleman", "", "income:1 ; guard:Joestar@Speedwagon s'interpose", "R"),
  ch("Erina Pendleton", "La fiancée de Jonathan", 1, 1, "I", "Joestar|Gentleman", "", "enterStand:Joestar@Elle soigne Jonathan", "C"),
  ch("Danny", "Le chien de Jonathan", 1, 1, "C", "Animal|Joestar", "", "dieDraw:1@Le fidèle Danny", "C"),
  ch("Straizo", "Le maître devenu vampire", 1, 1, "C", "Hamon|Vampire", "", "atkKneel:1@Space Ripper Stingy Eyes", "C"),
  // --- Battle Tendency : Joseph, Lisa Lisa, Caesar et les Hommes du Pilier
  ch("Joseph Joestar", "Le roi de la ruse", 7, 6, "CRI", "Joestar|Hamon", "genie", "escape@Nigerundayo ! Fuyons, Smokey ! ; winDiscard:ruse,2@Ton prochain mot sera…", "L"),
  ch("Lisa Lisa", "La maîtresse du Hamon", 6, 5, "CI", "Hamon|Maître", "", "aura:Hamon,1@Le souffle du Hamon ; defStand@L'écharpe de soie", "E"),
  ch("Caesar Zeppeli", "Le Hamon des bulles", 5, 4, "CR", "Hamon|Zeppeli", "", "ifWith:Hamon,1@Bubble Launcher ; dieDraw:2@Le dernier souffle de Caesar", "E", { art: "Ceasar 5" }),
  ch("Esidisi", "L'Homme du Pilier qui pleure", 2, 2, "C", "Homme du Pilier", "", "loseStand@Il pleure pour se calmer", "U"),
  ch("Kars", "La forme de vie ultime", 5, 5, "CR", "Homme du Pilier", "", "winKill:combat,3@Les lames de lumière", "E"),
  // --- Stardust Crusaders : Jotaro, les Croisés et les serviteurs de DIO
  ch("Jotaro Kujo", "Yare yare daze", 7, 6, "CR", "Joestar|Stand|Croisé", "intimidation", "defStand@Yare yare daze ; winKill:combat,4@Ora ora ora !", "L"),
  ch("Jotaro Kujo", "Star Platinum", 7, 6, "CR", "Joestar|Stand|Croisé", "", "atkKneelAll:2@Star Platinum : The World ; ifAlone:2@La précision de Star Platinum", "L", { art: "Jotaro Kujo (Star Platinum) 7" }),
  ch("Dio Brando", "New Body", 7, 6, "CR", "Vampire|Stand", "", "atkKneelAll:3@ZA WARUDO ! Le temps s'arrête ; foeDiePower:1@Muda muda muda !", "L", { art: "Dio Brando (New Body) 7" }),
  ch("Noriaki Kakyoin", "Hierophant Green", 3, 3, "RI", "Stand|Croisé", "", "actMinus:2@Emerald Splash", "R"),
  ch("Jean-Pierre Polnareff", "Silver Chariot", 3, 3, "C", "Stand|Croisé", "duel", "ifAlone:1@L'épée de Silver Chariot", "R"),
  ch("Mohammed Avdol", "Magician's Red", 3, 3, "CR", "Stand|Croisé", "", "winKill:combat,2@Crossfire Hurricane", "U", { art: "Avdol 3" }),
  ch("Iggy", "The Fool", 1, 1, "R", "Stand|Croisé|Animal", "discret", "escape@The Fool se fond dans le sable", "U"),
  ch("Rubber Soul", "Yellow Temperance", 1, 1, "R", "Stand|Serviteur de DIO", "discret", "", "C"),
  ch("Steely Dan", "Lovers", 1, 1, "R", "Stand|Serviteur de DIO", "", "dieKill:1@Lovers : la douleur décuplée", "C"),
  // --- Diamond is Unbreakable : Josuke et Morioh
  ch("Josuke Higashikata", "Crazy Diamond", 7, 6, "CRI", "Joestar|Stand|Morioh", "", "guard:*@Crazy Diamond répare tout ; winStand:combat@Dora dora dora !", "L"),
  ch("Okuyasu Nijimura", "The Hand", 1, 1, "C", "Stand|Morioh", "", "winRaze:combat@The Hand efface l'espace", "C"),
  ch("Koichi Hirose", "Echoes", 2, 1, "RI", "Stand|Morioh", "", "enterFreeze:2@Echoes Act 3 : Three Freeze", "U"),
  ch("Rohan Kishibe", "Le mangaka", 2, 1, "RI", "Stand|Morioh|Mangaka", "", "winDraw:ruse,1@Heaven's Door lit votre livre", "U"),
  ch("Rohan Kishibe", "Heaven's Door", 6, 5, "CRI", "Stand|Morioh|Mangaka", "genie", "actSilence:5@« Tu ne peux pas m'attaquer »", "E"),
  ch("Yoshikage Kira", "Killer Queen", 6, 5, "CR", "Stand|Tueur", "discret", "enterKill:3@La première bombe ; escape@Another One Bites the Dust", "E"),
  ch("Akira Otoishi", "Red Hot Chili Pepper", 1, 1, "R", "Stand|Morioh", "", "enterGold:1@Il vole l'électricité", "C"),
  ch("Keicho Nijimura", "Bad Company", 1, 1, "C", "Stand|Morioh", "", "enterSearch:Stand@L'Arc et la Flèche", "U"),
  ch("Yukako Yamagishi", "Love Deluxe", 0, 1, "I", "Stand|Morioh", "", "ifName:Koichi Hirose,2@Love Deluxe : tout pour Koichi", "U"),
  ch("Anjuro Katagiri", "Aqua Necklace", 1, 1, "C", "Stand|Tueur", "embuscade:1", "", "C"),
  // --- Golden Wind : Giorno, l'équipe de Bucciarati et le Boss
  ch("Giorno Giovanna", "Gold Experience", 7, 6, "CRI", "Joestar|Stand|Passione", "", "enterRevive:3@Gold Experience donne la vie ; aura:Passione,1@J'ai un rêve", "L"),
  ch("Giorno Giovanna", "Golden Wind", 7, 6, "CRI", "Joestar|Stand|Passione", "", "saveAny:*@Gold Experience Requiem : retour à zéro", "L", { art: "Giorno Giovanna (Golden Wind) 7" }),
  ch("Bruno Bucciarati", "Sticky Fingers", 6, 5, "CRI", "Stand|Passione|Chef", "", "pack:Passione,1@Le chef d'équipe ; escape@Sticky Fingers ouvre une fermeture", "E"),
  ch("Guido Mista", "Sex Pistols", 2, 2, "C", "Stand|Passione", "", "atkKneel:1@Les six balles de Sex Pistols", "U"),
  ch("Narancia Ghirga", "Aerosmith", 4, 3, "C", "Stand|Passione", "", "ifAtk:2@Volare via ! (Aerosmith)", "R"),
  ch("Pannacotta Fugo", "Purple Haze", 1, 1, "R", "Stand|Passione", "", "actSacKill:2@Le virus de Purple Haze", "U"),
  ch("Leone Abbacchio", "Moody Blues", 1, 1, "R", "Stand|Passione", "", "enterRecall:Passione@Moody Blues rejoue le passé", "C"),
  ch("Trish Una", "Spice Girl", 4, 3, "RI", "Stand|Passione", "", "guard:Passione@Spice Girl amortit le choc", "R"),
  ch("Diavolo", "King Crimson", 5, 5, "CR", "Stand|Passione|Boss", "discret", "claimCancel@King Crimson efface le temps", "E"),
  ch("Vinegar Doppio", "L'autre Diavolo", 4, 3, "CR", "Stand|Passione", "", "loseDraw:1@Epitaph prédit la défaite", "R"),
  ch("Risotto Nero", "Metallica", 2, 2, "C", "Stand|Passione|La Squadra", "", "winKill:combat,1@Metallica", "U"),
  // --- Stone Ocean : Jolyne et la prison de Green Dolphin Street
  ch("Jolyne Cujoh", "La prisonnière", 7, 6, "CRI", "Joestar|Stand|Prisonnier", "", "noKneel:combat@Ora ora ora ! ; escape@Elle se défait en fils", "L"),
  ch("Jolyne Cujoh", "Stone Free", 7, 6, "CRI", "Joestar|Stand|Prisonnier", "", "atkKneel:4@Les fils de Stone Free ; winStandAll:combat@Les fils relient tout", "L", { art: "Jolyne Cujoh Stone Free 7" }),
  ch("Enrico Pucci", "Whitesnake", 5, 4, "CRI", "Stand|Prêtre", "", "winDiscard:ruse,2@Whitesnake vole les disques", "E"),
  ch("Narciso Anasui", "Diver Down", 3, 2, "CR", "Stand|Prisonnier", "", "ifName:Jolyne Cujoh,2@Il veut épouser Jolyne", "U"),
  ch("Weather Report", "Heavy Weather", 4, 3, "CRI", "Stand|Prisonnier", "", "enterKneel:3@Pluie d'escargots", "R"),
  ch("Foo Fighters", "F.F.", 5, 5, "CRI", "Stand|Prisonnier", "", "selfSave:1@Elle se reforme dans l'eau", "R"),
  ch("Emporio Alnino", "Burning Down the House", 1, 1, "R", "Stand|Prisonnier|Enfant", "", "escape@La chambre fantôme", "C"),
  ch("Ermes Costello", "Kiss", 1, 1, "C", "Stand|Prisonnier", "", "enterDraw:1@Les autocollants de Kiss", "C"),
  ch("Gwess", "Goo Goo Dolls", 1, 1, "R", "Stand|Prisonnier", "", "enterKneel:1@Goo Goo Dolls rapetisse", "C"),
  // --- Steel Ball Run : Johnny, Gyro et la course à travers l'Amérique
  ch("Johnny Joestar", "Le jockey", 7, 6, "CRI", "Joestar|Stand|Cavalier|Spin", "", "ifBehind:2@Repartir de zéro ; atkKneel:3@Tusk Act 2", "L"),
  ch("Johnny Joestar", "Tusk", 7, 7, "CRI", "Joestar|Stand|Cavalier|Spin", "duel", "winSlay:combat@Tusk Act 4 : la rotation infinie", "L", { art: "Johnny Joestar (Tusk) 7" }),
  ch("Gyro Zeppeli", "Les boules d'acier", 5, 4, "CR", "Cavalier|Spin|Zeppeli", "", "atkKneel:3@La rotation de l'acier ; winStand:combat@Nyo-ho ho !", "E"),
  ch("Gyro Zeppeli", "Ball Breaker", 6, 6, "CR", "Cavalier|Spin|Zeppeli|Stand", "duel", "winKill:combat,4@Ball Breaker", "E"),
  ch("Diego Brando", "Scary Monsters", 5, 4, "CR", "Stand|Cavalier", "intimidation", "atkTerror:3@Les dinosaures de Scary Monsters", "R"),
  ch("Funny Valentine", "D4C", 6, 5, "CRI", "Stand|Président", "", "immune@D4C Love Train ; domi:2@Le Président des États-Unis", "E"),
  ch("Lucy Steel", "La gardienne du Saint", 4, 2, "RI", "Allié", "", "enterSearch:Relique@Le Corps du Saint", "R"),
  ch("Steven Steel", "L'organisateur de la course", 2, 1, "I", "Allié", "", "domi:1@Le grand prix de la Steel Ball Run", "U"),
  ch("Pocoloco", "Hey Ya !", 3, 2, "CR", "Stand|Cavalier", "", "winGold:*,2@Le gros lot de Hey Ya !", "R"),
  ch("Sandman", "In a Silent Way", 1, 1, "C", "Stand|Cavalier", "", "noKneel:combat@Il court plus vite que les chevaux", "C"),
  ch("Mountain Tim", "Oh! Lonesome Me", 4, 3, "CI", "Stand|Cavalier|Cow-boy", "", "winBounce:combat,3@Le lasso d'Oh! Lonesome Me", "R"),
  ch("Hot Pants", "Cream Starter", 5, 5, "CRI", "Stand|Cavalier", "", "ifDef:2@Cream Starter referme les plaies ; enterStand:*@Le spray de chair", "R"),
  ch("Ringo Roadagain", "Mandom", 2, 2, "CR", "Stand|Duelliste", "duel", "loseStand@Mandom : six secondes en arrière", "U"),
  ch("Sugar Mountain", "La source", 2, 1, "I", "Stand", "", "enterGold:2@Les richesses de la source", "U"),
  // --- JoJolion : le nouveau Morioh et les Higashikata
  ch("Josuke Higashikata (JoJolion)", "Soft & Wet", 7, 6, "CRI", "Joestar|Stand|Morioh", "", "winSteal:*,2@Les bulles de Soft & Wet volent tout ; atkKneel:4@Go Beyond", "L"),
  ch("Yasuho Hirose", "Paisley Park", 3, 2, "RI", "Stand|Morioh", "", "enterSearch:*@Paisley Park montre le chemin", "R"),
  ch("Rai Mamezuku", "Doggy Style", 2, 2, "C", "Stand|Morioh", "", "atkKneel:2@Doggy Style s'étire en fil", "U"),
  ch("Jobin Higashikata", "Speed King", 6, 5, "CR", "Stand|Higashikata", "intimidation", "winKneel:combat@La chaleur de Speed King", "E"),
  ch("Toru", "Wonder of U", 4, 3, "RI", "Stand|Homme-roche", "", "dieKill:4@Wonder of U : la calamité", "R"),
  ch("Norisuke Higashikata IV", "King Nothing", 2, 1, "I", "Stand|Higashikata", "", "income:1@Les fruits Higashikata", "U"),
  ch("Tsurugi Higashikata", "Paper Moon King", 1, 1, "R", "Stand|Higashikata|Enfant", "discret", "", "C"),
  ch("Daiya Higashikata", "California King Bed", 3, 2, "RI", "Stand|Higashikata", "", "enterDiscard:1@California King Bed vole un souvenir", "U"),
  // --- The JOJOLands : Jodio, son gang et la Howler Company
  ch("Jodio Joestar", "November Rain", 7, 6, "CRI", "Joestar|Stand|Gang", "", "enterGold:3@Le mécanisme pour devenir riche ; atkTerror:3@November Rain", "L"),
  ch("Dragona Joestar", "Smooth Operators", 4, 3, "RI", "Joestar|Stand|Gang", "", "ifWith:Joestar,2@Le grand frère de Jodio", "R"),
  ch("Usagi Alohaoe", "THE MATTEKUDASAI", 2, 1, "R", "Stand|Gang", "", "actGold:1@Il devient ce qu'on lui demande", "U"),
  ch("Paco Laburantes", "THE HUSTLE", 2, 2, "C", "Stand|Gang", "", "ifAtk:1@THE HUSTLE", "U"),
  ch("Charming Man", "Big Mouth Strikes Again", 1, 1, "R", "Stand", "discret", "", "C"),
  ch("Hacca Howler", "Eclipse Eight", 3, 3, "RI", "Stand|Howler", "", "enterKneelAll:1@La brume d'Eclipse Eight", "R"),

  // --- lieux, objets, événements (images à venir)
  loc("La demeure Joestar", "Le manoir de Jonathan", 2, "Joestar", "", "income:1", "U"),
  loc("L'île d'Air Supplena", "L'école de Lisa Lisa", 1, "Hamon", "", "reduce:Hamon,1", "C"),
  loc("Le manoir de DIO", "Au Caire", 2, "Vampire", "", "domi:2", "U"),
  loc("Morioh", "La ville tranquille", 2, "Morioh", "", "reduce:Morioh,1", "C"),
  loc("Naples", "Le territoire de Passione", 2, "Passione", "", "reduce:Passione,1", "C"),
  loc("Green Dolphin Street", "La prison de Floride", 2, "Prisonnier", "", "reserve:1 ; domi:1", "U"),
  obj("Le masque de pierre", "Il fait des vampires", 2, "Relique", "", "attStr:2 ; attKw:intimidation", "R"),
  obj("L'Arc et la Flèche", "Elle éveille les Stands", 1, "Relique", "", "attStr:1 ; attIcon:ruse", "U"),
  obj("Les boules d'acier", "La technique Zeppeli", 1, "Relique|Spin", "", "attStr:1 ; attKw:duel", "U"),
  obj("Le Corps du Saint", "Les reliques sacrées", 2, "Relique", "", "attSave ; attStr:1", "R"),
  obj("Le fruit Rokakaka", "L'échange équivalent", 1, "Relique", "", "attStand", "U"),
  ev("ORA ORA ORA !", "La rafale de Star Platinum", 1, "Stand", "evBuff:3", "U"),
  ev("MUDA MUDA MUDA !", "La rafale de The World", 1, "Stand", "evMinus:2", "C"),
  ev("ZA WARUDO !", "Le temps s'arrête", 2, "Stand", "evKneel:4", "R"),
  ev("Fuyons, Smokey !", "Nigerundayo !", 1, "Joestar", "evSave:Joestar", "U"),
  ev("Ton prochain mot sera…", "La prédiction de Joseph", 1, "Joestar", "evDiscard:1", "C"),
  ev("Arrivederci", "L'adieu de Bucciarati", 3, "Passione", "evKill:4", "R"),
  ev("To Be Continued", "La suite au prochain épisode", 1, "Destin", "evCancel", "R"),
  ev("Sunlight Yellow Overdrive", "Le Hamon de Jonathan", 1, "Hamon", "evZap:2,4,Jonathan Joestar", "R"),
];

// Un deck principal : Jotaro et Giorno avec leurs alliés de plusieurs parties. Pour changer de style, on remplace leurs
// cartes 7 par les autres versions (Star Platinum, Golden Wind…) ou par d'autres JoJo (Jonathan, Joseph, Jolyne, Johnny, Jodio).
export const starters = [
  {
    id: "jojo-joestar", name: "La lignée des Joestar", leader: "jojo-jotaro-kujo-7",
    excl: [
      "jojo-giorno-giovanna-7", "jojo-bruno-bucciarati-6", "jojo-lisa-lisa-6", "jojo-caesar-zeppeli-5", "jojo-robert-e-o-speedwagon-4",
      "jojo-narancia-ghirga-4", "jojo-trish-una-4", "jojo-noriaki-kakyoin-3", "jojo-jean-pierre-polnareff-3", "jojo-mohammed-avdol-3",
      "jojo-koichi-hirose-2", "jojo-guido-mista-2", "jojo-iggy-1", "jojo-okuyasu-nijimura-1", "jojo-erina-pendleton-1",
      "jojo-la-demeure-joestar-loc", "jojo-naples-loc", "jojo-le-manoir-de-dio-loc", "jojo-ora-ora-ora-evt", "jojo-za-warudo-evt",
      "jojo-fuyons-smokey-evt", "jojo-arrivederci-evt", "jojo-to-be-continued-evt", "jojo-l-arc-et-la-fleche-obj", "jojo-le-corps-du-saint-obj",
    ],
    like: ["Joestar", "Croisé", "Morioh", "Passione", "Hamon"], avoid: ["Vampire", "Homme du Pilier", "Serviteur de DIO", "Tueur", "Homme-roche", "Higashikata", "Howler"],
    desc: "Jotaro, Giorno et leurs alliés : des duels de Stands, des amis qui se protègent et la ruse des Joestar. Remplace leurs cartes 7 par d'autres versions (Star Platinum, Golden Wind…) pour changer de style.",
  },
];
