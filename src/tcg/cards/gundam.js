import { ch, loc, obj, ev } from "./build.js";

// Gundam : un deck choisit UN univers (la Fédération ou Zeon du Siècle Universel, After Colony, Cosmic Era, Anno Domini,
// Post Disaster, Ad Stella). Les pilotes sont des personnages ; les Mobile Suits sont des objets qu'on attache à un Pilote.
// Amuro, Char et Kira ont deux versions à 7.
export const meta = {
  id: "gundam", name: "Gundam", short: "Gundam", color: "#e8ecf2", color2: "#1a2a5c", icon: "bot", motif: "gundam",
  desc: "Les pilotes et leurs Mobile Suits. Choisis un univers : la Fédération ou Zeon (Siècle Universel), After Colony, Cosmic Era, Anno Domini, Post Disaster ou Ad Stella.",
  passive: "",
  sub: { one: "univers", One: "Univers", fem: false, ask: "Quel univers de Gundam ?", help: "Un deck Gundam ne prend que les pilotes de son univers (et ce qui va partout) ; chaque univers donne un bonus à la famille.",
    pick: "Choisis un univers de Gundam pour ce deck.", not: "n'est pas de l'univers", starter: "gundam" },
};

const FE = "Fédération", ZE = "Zeon", AC = "After Colony", CE = "Cosmic Era", AD = "Anno Domini", PD = "Post Disaster", AS = "Ad Stella";

export const types = [
  { id: FE, name: "Fédération", color: "#2f6fd6", bonus: "defAuraT:Fédération,1@Les forces de défense terriennes", desc: "La Fédération terrienne : vos personnages de la Fédération défendent plus fort." },
  { id: ZE, name: "Zeon", color: "#b5262c", bonus: "income:1@Les usines Zeonic", desc: "La principauté de Zeon : les usines Zeonic rapportent +1 revenu à chaque round." },
  { id: AC, name: "After Colony", color: "#5aa2e8", bonus: "kwAura:After Colony,discret@Opération Météore", desc: "Les Gundam tombés du ciel : vos personnages After Colony ont Discret." },
  { id: CE, name: "Cosmic Era", color: "#3fbf8f", bonus: "fWinStand:*@L'éveil SEED", desc: "L'éveil SEED : chaque round, après un défi gagné, un de vos participants se redresse." },
  { id: AD, name: "Anno Domini", color: "#4fc3d9", bonus: "xtraCh:combat@L'intervention armée", desc: "Celestial Being intervient partout : vous pouvez lancer un défi de Combat supplémentaire." },
  { id: PD, name: "Post Disaster", color: "#c9a227", bonus: "atkAura:Post Disaster,1@Tekkadan", desc: "Les orphelins de Tekkadan : vos personnages Post Disaster frappent plus fort en attaque." },
  { id: AS, name: "Ad Stella", color: "#d6457a", bonus: "fWinPower:combat,1@Le duel", desc: "Les duels d'Asticassia : chaque round, le premier défi de Combat gagné rapporte 1 Pouvoir." },
];

const m = (name, title, cost, str, icons, pt, traits, kw, ab, r, o = {}) => ch(name, title, cost, str, icons, traits, kw, ab, r, { pt, ...o });

export const cards = [
  // --- Fédération (Siècle Universel)
  m("Amuro Ray", "Le Newtype de la Fédération", 7, 6, "CRI", FE, "Pilote|Newtype|White Base", "celebre", "atkKneel:5@Les réflexes d'un Newtype ; winStand:combat@Le RX-78-2", "L"),
  m("Amuro Ray", "Le héros d'Axis", 7, 6, "CR", FE, "Pilote|Newtype", "", "enterKneelAll:3@La lumière du Psycoframe ; selfGuard@Il repousse Axis", "L"),
  m("Amuro Ray", "Le jeune pilote", 3, 3, "C", FE, "Pilote|Newtype|White Base", "", "loseStand@Même mon père ne m'a jamais frappé !", "R"),
  m("Bright Noa", "Le capitaine du White Base", 5, 4, "CI", FE, "Capitaine|White Base", "", "actStandAll:Pilote,2@Branle-bas de combat", "R"),
  m("Sayla Mass", "Artesia Som Deikun", 3, 3, "CR", FE, "Pilote|White Base", "", "escape@La sœur de Char", "U"),
  m("Kai Shiden", "Le râleur", 3, 3, "C", FE, "Pilote|White Base", "", "winDraw:ruse,1@Le futur reporter", "C"),
  m("Hayato Kobayashi", "Le judoka", 2, 2, "C", FE, "Pilote|White Base", "", "ifDef:1@Le Guntank", "C"),
  m("Ryu Jose", "Le pilote du Core Fighter", 2, 3, "C", FE, "Pilote|White Base", "", "sacSave:Pilote@Il se sacrifie pour Amuro", "U"),
  m("Fraw Bow", "La voisine d'Amuro", 1, 1, "I", FE, "White Base", "", "enterDraw:1@Haro", "C"),
  m("Tem Ray", "Le père d'Amuro", 2, 1, "RI", FE, "Ingénieur", "", "enterSearch:Mobile Suit@Le circuit de Tem Ray", "U"),
  m("Kamille Bidan", "Le pilote du Zeta", 6, 5, "CR", FE, "Pilote|Newtype", "", "winKill:combat,3@Le Zeta Gundam", "E"),
  m("Judau Ashta", "Le pilote du ZZ", 5, 5, "CR", FE, "Pilote|Newtype", "", "winStand:combat@La puissance du ZZ", "R"),
  m("Banagher Links", "Le pilote de la Licorne", 6, 5, "CRI", FE, "Pilote|Newtype", "", "atkKneel:4@Le mode NT-D", "E"),
  m("Pilote de GM", "La production de masse", 2, 2, "C", FE, "Pilote", "", "ifWith:Fédération,1@La ligne de front", "C", { uni: false }),

  // --- Zeon (Siècle Universel)
  m("Char Aznable", "La Comète rouge", 7, 6, "CR", ZE, "Pilote|Newtype|Zabi", "celebre", "noKneel:combat@Trois fois plus rapide ; winKill:combat,3@Le Zaku rouge", "L"),
  m("Char Aznable", "Le chef de Néo Zeon", 7, 6, "CRI", ZE, "Pilote|Newtype", "genie", "aura:Zeon,1@Néo Zeon ; enterKneelAll:3@La chute d'Axis", "L"),
  m("Char Aznable", "Alias Quattro Bajeena", 4, 4, "CR", `${ZE}|${FE}`, "Pilote|Newtype", "", "escape@Le masque", "R"),
  m("Lalah Sune", "La Newtype de l'Elmeth", 3, 2, "RI", ZE, "Pilote|Newtype", "", "dieDraw:2@L'éclair entre deux Newtypes", "R"),
  m("Ramba Ral", "Le loup bleu", 5, 5, "C", ZE, "Pilote", "duel", "winKill:combat,2@Le Gouf", "R"),
  m("Gihren Zabi", "Le dictateur", 6, 4, "RI", ZE, "Zabi", "", "domi:3@Sieg Zeon !", "R"),
  m("Garma Zabi", "Le fils cadet", 3, 3, "CI", ZE, "Zabi|Pilote", "", "dieDraw:2@Les funérailles de Garma", "U"),
  m("Dozle Zabi", "Le géant de Solomon", 5, 6, "C", ZE, "Zabi|Pilote", "", "ifAtk:1@Le Big Zam", "U"),
  m("Kycilia Zabi", "La comploteuse", 5, 4, "RI", ZE, "Zabi", "", "winKill:ruse,3@Elle élimine ses frères", "R"),
  m("M'Quve", "Le collectionneur", 4, 3, "RI", ZE, "Pilote", "", "winGold:influence,1@Ce vase est authentique !", "U"),
  m("Haman Karn", "La régente de Néo Zeon", 6, 5, "RI", ZE, "Pilote|Newtype", "", "actSilence:6@Le Qubeley", "E"),
  m("Full Frontal", "Le Char de remplacement", 5, 5, "CR", ZE, "Pilote|Newtype", "", "noKneel:combat@La Comète rouge revient", "R"),
  m("Anavel Gato", "Le cauchemar de Solomon", 5, 5, "C", ZE, "Pilote", "", "winKill:combat,3@Le GP02", "R"),
  m("Pilote de Zaku", "Le soldat de Zeon", 2, 2, "C", ZE, "Pilote", "", "ifWith:Zeon,1@Sieg Zeon !", "C", { uni: false }),

  // --- After Colony (Gundam Wing)
  m("Heero Yuy", "Le pilote du Wing Zero", 7, 6, "CR", AC, "Pilote|Opération Météore", "", "winKill:combat,4@Le Twin Buster Rifle ; actSacKill:6@Mission : autodestruction", "L"),
  m("Heero Yuy", "Le soldat parfait", 4, 4, "CR", AC, "Pilote|Opération Météore", "", "escape@Il survit à tout", "R"),
  m("Duo Maxwell", "Le dieu de la mort", 5, 5, "CR", AC, "Pilote|Opération Météore", "discret", "winKill:combat,2@Le Deathscythe", "E"),
  m("Trowa Barton", "Le clown sans nom", 4, 4, "CR", AC, "Pilote|Opération Météore", "", "escape@Le cirque", "U"),
  m("Quatre Raberba Winner", "L'héritier des Winner", 4, 3, "RI", AC, "Pilote|Opération Météore", "", "enterGold:2@La fortune des Winner ; actStand:Pilote@Les Maganacs", "R"),
  m("Chang Wufei", "Le justicier", 4, 4, "C", AC, "Pilote|Opération Météore", "duel", "ifAlone:2@La justice de Nataku", "U"),
  m("Relena Peacecraft", "La reine de la paix totale", 3, 1, "I", AC, "Sanc", "", "domi:2@La paix totale", "R"),
  m("Zechs Merquise", "L'éclair", 6, 6, "CR", AC, "Pilote|Sanc", "", "noKneel:combat@Le Tallgeese", "E"),
  m("Treize Khushrenada", "Le gentilhomme d'OZ", 5, 4, "CI", AC, "OZ", "duel", "domi:1@L'élégance ; ifAlone:1@Le duel d'honneur", "R"),
  m("Lady Une", "La double personnalité", 3, 3, "RI", AC, "OZ", "", "winDiscard:ruse,1@L'autre Une", "U"),
  m("Pilote de Leo", "Les soldats d'OZ", 2, 2, "C", AC, "Pilote|OZ", "", "ifWith:Pilote,1@L'escadron", "C", { uni: false }),
  m("Lucrezia Noin", "La fidèle de Zechs", 4, 4, "CR", AC, "Pilote|Sanc", "", "ifName:Zechs Merquise,1@Pour Zechs", "U"),
  m("Dorothy Catalonia", "L'intrigante", 3, 2, "RI", AC, "Romefeller", "", "winDiscard:ruse,1@La guerre est belle", "U"),
  m("Rashid Kurama", "Le chef des Maganacs", 3, 4, "C", AC, "Pilote|Maganac", "", "ifName:Quatre Raberba Winner,1@Pour maître Quatre", "C"),

  // --- Cosmic Era (Gundam SEED)
  m("Kira Yamato", "Le pilote du Freedom", 7, 6, "CRI", CE, "Pilote|Coordinateur|Archangel", "", "enterKneelAll:3@Le tir multi-verrouillage ; immune@SEED", "L"),
  m("Kira Yamato", "Le pilote du Strike Freedom", 7, 7, "CRI", CE, "Pilote|Coordinateur", "celebre", "atkTerror:4@Les DRAGOONs ; winStand:*@Le Strike Freedom", "L"),
  m("Kira Yamato", "L'étudiant d'Heliopolis", 3, 3, "CR", CE, "Pilote|Coordinateur|Archangel", "", "loseStand@Il se relève", "R"),
  m("Athrun Zala", "Le pilote du Justice", 6, 6, "CR", CE, "Pilote|Coordinateur|ZAFT", "", "winKill:combat,3@Le Justice ; ifName:Kira Yamato,1@Les amis d'enfance", "E"),
  m("Lacus Clyne", "La princesse de PLANT", 4, 2, "I", CE, "Coordinateur", "", "domi:2@Le chant de Lacus ; enterStand:*@Le Freedom offert à Kira", "E"),
  m("Cagalli Yula Athha", "La princesse d'Orb", 4, 4, "CI", CE, "Pilote|Orb", "", "ifDef:1@Orb", "U"),
  m("Shinn Asuka", "Le pilote du Destiny", 6, 6, "C", CE, "Pilote|Coordinateur|ZAFT", "", "ifAtk:2@La colère de Shinn", "R"),
  m("Rau Le Creuset", "L'homme au masque", 6, 5, "CR", CE, "Pilote|ZAFT", "", "atkKneel:4@Les DRAGOONs du Providence", "E"),
  m("Mu La Flaga", "Le faucon d'Endymion", 5, 5, "CR", CE, "Pilote|Archangel", "", "sacSave:*@Il protège l'Archangel", "R"),
  m("Murrue Ramius", "La capitaine de l'Archangel", 4, 3, "CI", CE, "Capitaine|Archangel", "", "ifDef:2@Le Lohengrin", "U"),
  m("Yzak Joule", "Le rival", 4, 4, "C", CE, "Pilote|Coordinateur|ZAFT", "", "ifAtk:1@La cicatrice", "U"),
  m("Dearka Elsman", "Le tireur", 3, 3, "C", CE, "Pilote|Coordinateur|ZAFT", "", "ifDef:1@Le Buster", "C"),
  m("Pilote de ZAFT", "Les Coordinateurs", 2, 2, "C", CE, "Pilote|ZAFT", "", "ifWith:Pilote,1@L'escadron", "C", { uni: false }),
  m("Andrew Waltfeld", "Le Tigre du désert", 5, 5, "CR", CE, "Pilote|ZAFT", "", "winKill:combat,2@Le café du Tigre", "R"),
  m("Gilbert Durandal", "Le président de PLANT", 5, 3, "RI", CE, "Coordinateur", "", "domi:2@Le plan Destiny", "R"),

  // --- Anno Domini (Gundam 00)
  m("Setsuna F. Seiei", "Je suis Gundam", 7, 6, "CRI", AD, "Pilote|Meister|Celestial Being", "", "immune@Je suis Gundam ! ; winStandAll:combat@Trans-Am", "L"),
  m("Setsuna F. Seiei", "Le Meister de l'Exia", 4, 4, "CR", AD, "Pilote|Meister|Celestial Being", "", "winKill:combat,2@L'Exia", "R"),
  m("Lockon Stratos", "Le tireur d'élite", 5, 5, "CR", AD, "Pilote|Meister|Celestial Being", "", "atkKneel:4@Je vise et je tire", "E"),
  m("Allelujah Haptism", "Les deux âmes", 4, 4, "C", AD, "Pilote|Meister|Celestial Being", "", "ifAtk:1@Hallelujah", "U"),
  m("Tieria Erde", "L'Innovade", 4, 3, "RI", AD, "Pilote|Meister|Celestial Being", "", "enterDraw:1@Veda", "U"),
  m("Sumeragi Lee Noriega", "La tacticienne", 3, 2, "RI", AD, "Celestial Being", "", "firstDraw:1@Le plan de mission", "U"),
  m("Graham Aker", "Mister Bushido", 5, 5, "C", AD, "Pilote", "duel", "ifAlone:2@Je suis amoureux du Gundam !", "R"),
  m("Ali Al-Saachez", "Le mercenaire de la guerre", 5, 5, "CR", AD, "Pilote|Mercenaire", "", "winKill:combat,3@La guerre est sa vie", "R"),
  m("Ribbons Almark", "Le chef des Innovades", 6, 5, "RI", AD, "Pilote|Innovade", "", "domi:2@Le plan d'Aeolia ; actSilence:6@Veda", "E"),
  m("Marina Ismail", "La princesse d'Azadistan", 2, 1, "I", AD, "Azadistan", "", "domi:1@La chanson de la paix", "C"),
  m("Pilote de GN-X", "Les forces de l'ONU", 2, 2, "C", AD, "Pilote", "", "ifAtk:1@La riposte", "C", { uni: false }),
  m("Feldt Grace", "L'opératrice", 2, 1, "RI", AD, "Celestial Being", "", "enterDraw:1@Les données de mission", "C"),
  m("Saji Crossroad", "Le garçon ordinaire", 2, 2, "C", AD, "Pilote", "", "loseStand@Il se relève", "C"),
  m("Patrick Colasour", "L'homme qui ne meurt jamais", 3, 3, "C", AD, "Pilote", "", "escape@Il survit encore !", "U"),
  m("Ian Vashti", "Le mécanicien", 2, 1, "RI", AD, "Celestial Being|Ingénieur", "", "enterSearch:Mobile Suit@L'atelier", "U"),

  // --- Post Disaster (Iron-Blooded Orphans)
  m("Mikazuki Augus", "Le pilote du Barbatos", 6, 6, "C", PD, "Pilote|Tekkadan", "intimidation", "winKill:combat,4@Le Barbatos Lupus Rex ; ifName:Orga Itsuka,1@Pour Orga", "E"),
  m("Orga Itsuka", "Le chef de Tekkadan", 4, 3, "CI", PD, "Tekkadan", "", "aura:Tekkadan,1@La famille ; dieDraw:2@Je ne m'arrêterai jamais…", "E"),
  m("Akihiro Altland", "Le Gusion", 4, 4, "C", PD, "Pilote|Tekkadan", "", "ifDef:1@Le grand frère", "U"),
  m("Shino", "Le pilote du Ryusei-Go", 3, 3, "C", PD, "Pilote|Tekkadan", "", "ifAtk:1@Le Ryusei-Go", "C"),
  m("Atra Mixta", "La cuisinière", 1, 1, "I", PD, "Tekkadan", "", "enterGold:1@Les boulettes de riz", "C"),
  m("Kudelia Aina Bernstein", "La révolutionnaire", 3, 2, "I", PD, "Mars", "", "domi:2@La révolution martienne", "R"),
  m("McGillis Fareed", "Le pilote du Bael", 6, 5, "CR", PD, "Pilote|Gjallarhorn", "", "winKill:combat,3@L'épée de Bael", "E"),
  m("Gaelio Bauduin", "Le pilote du Vidar", 5, 5, "C", PD, "Pilote|Gjallarhorn", "", "dieReturn@Il revient sous un masque", "R"),
  m("Membre de Tekkadan", "Les orphelins", 2, 2, "C", PD, "Tekkadan", "", "ifWith:Tekkadan,1@La famille", "C", { uni: false }),
  m("Eugene Sevenstark", "Le second d'Orga", 3, 3, "CI", PD, "Pilote|Tekkadan", "", "ifName:Orga Itsuka,1@Le second", "U"),
  m("Biscuit Griffon", "Le comptable", 2, 2, "RI", PD, "Tekkadan", "", "enterGold:1@Les comptes de Tekkadan", "C"),
  m("Naze Turbine", "Le chef des Turbines", 4, 4, "CI", PD, "Pilote|Turbines", "", "ifWith:Pilote,1@Ses épouses pilotes", "U"),
  m("Lafter Frankland", "La pilote des Turbines", 3, 3, "C", PD, "Pilote|Turbines", "", "ifAtk:1@Le Hyakuren", "C"),
  m("Carta Issue", "La commandante de la flotte de Terre", 4, 4, "C", PD, "Pilote|Gjallarhorn", "duel", "ifAlone:1@Le duel d'honneur", "U"),
  m("Rustal Elion", "Le chef de Gjallarhorn", 6, 5, "RI", PD, "Gjallarhorn", "", "enterKill:4@Le Dáinsleif", "E"),

  // --- Ad Stella (The Witch from Mercury)
  m("Suletta Mercury", "La sorcière de Mercure", 6, 5, "CR", AS, "Pilote|Asticassia", "celebre", "winStand:combat@L'Aerial ; ifName:Miorine Rembran,1@Ma fiancée", "E"),
  m("Miorine Rembran", "La fiancée", 3, 2, "RI", AS, "Asticassia", "", "domi:2@La fiancée du vainqueur ; enterGold:1@Le groupe Gundam", "R"),
  m("Guel Jeturk", "Le fils de Jeturk", 4, 4, "C", AS, "Pilote|Asticassia", "", "loseStand@Il ne renonce jamais", "U"),
  m("Elan Ceres", "Le clone", 4, 4, "CR", AS, "Pilote|Asticassia", "", "dieDraw:1@Le suivant prend sa place", "U"),
  m("Shaddiq Zenelli", "Le stratège", 4, 3, "RI", AS, "Pilote|Asticassia", "", "winSteal:ruse,1@Les filles de Shaddiq", "U"),
  m("Prospera", "La mère masquée", 6, 4, "RI", AS, "Pilote", "", "actSilence:6@Quiet Zero", "E"),
  m("Chuchu", "La tête brûlée", 2, 2, "C", AS, "Pilote|Asticassia", "", "ifAtk:1@Elle cogne", "C"),
  m("Élève de la Maison de la Terre", "Asticassia", 1, 1, "C", AS, "Asticassia", "", "ifWith:Asticassia,1@La Maison de la Terre", "C", { uni: false }),
  m("Delling Rembran", "Le président de Benerit", 5, 4, "RI", AS, "Benerit", "", "domi:2@Le président", "R"),
  m("Norea Du Noc", "La sorcière de la Terre", 4, 4, "CR", AS, "Pilote|Sorcière", "", "winKill:combat,2@Le Gundam Schwarzette", "U"),
  m("Sophie Pulone", "La sorcière de Plutarch", 3, 3, "C", AS, "Pilote|Sorcière", "", "ifAtk:1@On joue ?", "U"),
  m("Nika Nanaura", "La mécanicienne", 2, 1, "RI", AS, "Asticassia|Ingénieur", "", "enterDraw:1@La Maison de la Terre", "C"),
  m("Ericht Samaya", "L'âme de l'Aerial", 3, 2, "RI", AS, "Pilote", "", "guard:Pilote@Elle protège Suletta", "R"),

  // --- partout
  m("Haro", "Haro ! Haro !", 1, 1, "R", "", "Robot", "", "enterDraw:1@Haro !", "U", { uni: false }),

  // --- lieux
  loc("La colonie spatiale", "Un cylindre O'Neill", 1, "Colonie", "limite", "income:1", "C"),
  loc("Von Braun", "La cité lunaire", 2, "Lune", "", "reduce:*,1@Les chantiers d'Anaheim ; reserve:1", "R"),
  loc("Le pont de commandement", "Feu à volonté !", 3, "Vaisseau", "", "domi:2 ; reserve:1", "R"),
  loc("Le White Base", "Le vaisseau d'Amuro", 2, "Vaisseau", "", "reserve:1 ; domi:1", "U", { pt: FE }),
  loc("A Baoa Qu", "La forteresse de Zeon", 2, "Forteresse", "", "reserve:1 ; domi:1", "U", { pt: ZE }),
  loc("Le royaume de Sank", "La paix totale", 2, "Royaume", "", "reserve:1 ; domi:1", "U", { pt: AC }),
  loc("PLANT", "Les colonies des Coordinateurs", 2, "Colonie", "", "reserve:1 ; domi:1", "U", { pt: CE }),
  loc("Le Ptolemaios", "Le vaisseau de Celestial Being", 2, "Vaisseau", "", "reserve:1 ; domi:1", "U", { pt: AD }),
  loc("Le QG de Tekkadan", "Mars", 2, "Base", "", "reserve:1 ; domi:1", "U", { pt: PD }),
  loc("L'école d'Asticassia", "Le Front d'Asticassia", 2, "École", "", "reserve:1 ; domi:1", "U", { pt: AS }),

  // --- Mobile Suits (à attacher à un Pilote)
  obj("Mobile Suit de série", "Zaku, GM, Leo…", 1, "Mobile Suit", "", "attStr:1", "C", { req: "Pilote" }),
  obj("RX-78-2 Gundam", "Le premier Gundam", 2, "Mobile Suit|Gundam", "", "attStr:2 ; attIcon:combat", "R", { pt: FE, req: "Pilote" }),
  obj("Le Zaku II de Char", "Le Zaku rouge", 2, "Mobile Suit", "", "attStr:1 ; attStand", "R", { pt: ZE, req: "Pilote" }),
  obj("Le Wing Gundam Zero", "Le système Zero", 3, "Mobile Suit|Gundam", "", "attStr:3", "R", { pt: AC, req: "Pilote" }),
  obj("Le Freedom", "Le Gundam de Kira", 2, "Mobile Suit|Gundam", "", "attStr:2 ; attKw:intimidation", "R", { pt: CE, req: "Pilote" }),
  obj("Le Gundam Exia", "Le Gundam aux sept épées", 2, "Mobile Suit|Gundam", "", "attStr:2 ; attKw:duel", "R", { pt: AD, req: "Pilote" }),
  obj("Le Barbatos", "Le Gundam de Tekkadan", 3, "Mobile Suit|Gundam", "", "attStr:3", "R", { pt: PD, req: "Pilote" }),
  obj("L'Aerial", "Le Gundam de Suletta", 2, "Mobile Suit|Gundam", "", "attStr:1 ; attSave", "R", { pt: AS, req: "Pilote" }),

  // --- événements
  ev("L'intuition Newtype", "Je sens ta présence", 2, "Newtype", "evSave:*", "R"),
  ev("Le duel de Mobile Suits", "En garde !", 1, "Combat", "evBuff:3", "C"),
  ev("Sieg Zeon !", "Le discours de Gihren", 2, "Zeon", "evBuffTrait:Zeon,2", "U", { pt: ZE }),
  ev("La chute de la colonie", "L'opération British", 4, "Zeon", "evKillAll:2", "R", { pt: ZE }),
  ev("Le canon solaire", "Le Solar Ray", 3, "Arme", "evKill:4", "R", { pt: `${ZE}|${FE}` }),
  ev("Le système Zero", "Il montre l'avenir", 1, "Système", "evKneel:3", "U", { pt: AC }),
  ev("L'éveil SEED", "La graine éclate", 1, "SEED", "evBuff:3", "U", { pt: CE }),
  ev("Trans-Am", "La pleine puissance", 2, "Système", "evStandAll:Anno Domini", "R", { pt: AD }),
  ev("Le système Alaya-Vijnana", "Ne faire qu'un avec le Mobile Suit", 2, "Système", "evBuffTrait:Post Disaster,2", "U", { pt: PD }),
  ev("Le duel d'Asticassia", "Le vainqueur emporte la fiancée", 1, "Duel", "evWinPower:combat,1", "U", { pt: AS }),
];

export const starters = [
  { id: "gundam-federation", name: "La Fédération", pt: FE, leader: "gundam-amuro-ray-7", like: [FE, FE, "White Base", "Newtype"], avoid: [], desc: "Amuro, Bright, Sayla, Kai et le White Base, puis Kamille, Judau et Banagher : la Fédération défend plus fort." },
  { id: "gundam-zeon", name: "Zeon", pt: ZE, leader: "gundam-char-aznable-7", like: [ZE, ZE, "Zabi", "Newtype"], avoid: [], desc: "Char la Comète rouge, la famille Zabi, Ramba Ral, Haman, Gato : Sieg Zeon, les usines Zeonic rapportent +1 or par round." },
  { id: "gundam-after-colony", name: "Gundam Wing", pt: AC, leader: "gundam-heero-yuy-7", like: [AC, AC, "Opération Météore", "Pilote"], avoid: [], desc: "Heero, Duo, Trowa, Quatre et Wufei, Zechs, Relena et Treize : l'opération Météore, les Gundam frappent par surprise." },
  { id: "gundam-cosmic-era", name: "Gundam SEED", pt: CE, leader: "gundam-kira-yamato-7", like: [CE, CE, "Coordinateur", "Archangel"], avoid: [], desc: "Kira, Athrun, Lacus, Cagalli, Mu, Rau Le Creuset et Shinn : l'éveil SEED redresse un pilote après chaque victoire." },
  { id: "gundam-anno-domini", name: "Gundam 00", pt: AD, leader: "gundam-setsuna-f-seiei-7", like: [AD, AD, "Meister", "Celestial Being"], avoid: [], desc: "Setsuna, Lockon, Allelujah et Tieria, Graham et Ribbons : Celestial Being intervient, avec un défi de Combat de plus." },
  { id: "gundam-post-disaster", name: "Iron-Blooded Orphans", pt: PD, leader: "gundam-mikazuki-augus-6", like: [PD, PD, "Tekkadan", "Pilote"], avoid: [], desc: "Mikazuki et le Barbatos, Orga et les orphelins de Tekkadan, McGillis et Gaelio : la famille frappe plus fort." },
  { id: "gundam-ad-stella", name: "The Witch from Mercury", pt: AS, leader: "gundam-suletta-mercury-6", like: [AS, AS, "Asticassia", "Pilote"], avoid: [], desc: "Suletta et l'Aerial, Miorine, Guel, Elan, Shaddiq et Prospera : le premier duel gagné du round rapporte 1 Pouvoir." },
];
