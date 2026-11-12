import { ch, loc, obj, ev } from "./build.js";

// Star Wars : un deck choisit UN camp (Jedi, Sith, Rébellion, Empire, Pègre). Un personnage de deux camps compte pour les deux
// (Dark Vador est Sith et impérial, Han Solo rebelle et contrebandier…). Quelques créatures et droïdes vont partout.
// Luke, Dark Vador et Palpatine ont deux versions à 7.
export const meta = {
  id: "sw", name: "Star Wars", short: "Star Wars", color: "#ffe81f", color2: "#05070f", icon: "orbit", motif: "galaxy",
  desc: "Il y a bien longtemps, dans une galaxie lointaine, très lointaine… Choisis un camp : Jedi, Sith, Rébellion, Empire ou Pègre. Chacun a son bonus et ses héros.",
  passive: "",
  sub: { one: "camp", One: "Camp", fem: false, ask: "Quel camp de la galaxie ?", help: "Un deck Star Wars ne prend que les personnages de son camp (et ceux qui vont partout) ; chaque camp donne un bonus à la famille.",
    pick: "Choisis un camp de la galaxie pour ce deck.", not: "n'est pas du camp", starter: "sw" },
};

const J = "Jedi", SI = "Sith", RE = "Rébellion", EM = "Empire", PE = "Pègre";

export const types = [
  { id: J, name: "Jedi", color: "#4fa3ff", bonus: "kwAura:Jedi,discret@Les tours de l'esprit Jedi", desc: "« Ce ne sont pas les droïdes que vous recherchez » : vos Jedi ont Discret." },
  { id: SI, name: "Sith", color: "#e0283a", bonus: "kwAura:Sith,intimidation@La peur du côté obscur", desc: "La peur mène à la colère : vos Sith ont Intimidation." },
  { id: RE, name: "Rébellion", color: "#f08a24", bonus: "fWinPower:*,1@L'espoir", desc: "Les rébellions sont bâties sur l'espoir : chaque round, le premier défi gagné rapporte 1 Pouvoir." },
  { id: EM, name: "Empire", color: "#9aa7b4", bonus: "income:1@La puissance de l'Empire", desc: "La machine de guerre : +1 revenu à chaque round." },
  { id: PE, name: "Pègre", color: "#c9a227", bonus: "fFirstGold:1@Il a tiré le premier", desc: "Contrebandiers et chasseurs de primes : chaque fois que vous devenez premier joueur, +1 or." },
];

const s = (name, title, cost, str, icons, pt, traits, kw, ab, r, o = {}) => ch(name, title, cost, str, icons, traits, kw, ab, r, { pt, ...o });
const JR = `${J}|${RE}`, SE = `${SI}|${EM}`, RP = `${RE}|${PE}`;

export const cards = [
  // --- Jedi
  s("Yoda", "Le Grand Maître", 7, 6, "RI", J, "Maître Jedi", "genie", "aura:Jedi,1@Le Grand Maître de l'Ordre ; winDraw:ruse,1@La sagesse de Yoda", "L"),
  s("Luke Skywalker", "Le Chevalier Jedi", 7, 6, "CRI", JR, "Skywalker", "celebre", "atkKneel:4@Le sabre vert ; defWinPower:1@Je suis un Jedi, comme mon père", "L"),
  s("Luke Skywalker", "Le dernier Jedi", 7, 5, "RI", J, "Skywalker|Maître Jedi", "", "enterKneelAll:3@La projection de Force ; immune@Calme comme les deux soleils", "L"),
  s("Luke Skywalker", "Le fermier de Tatooine", 3, 3, "C", JR, "Skywalker", "", "ifBehind:1@Un nouvel espoir", "U"),
  s("Obi-Wan Kenobi", "Ben Kenobi", 6, 5, "RI", J, "Maître Jedi", "", "dieDraw:2@Plus puissant que tu ne l'imagines ; guard:Skywalker@Il veille sur Luke", "E"),
  s("Obi-Wan Kenobi", "Le Négociateur", 4, 4, "CI", J, "Jedi", "", "ifDef:2@J'ai l'avantage du terrain", "R"),
  s("Anakin Skywalker", "Le Héros sans peur", 6, 6, "CR", J, "Skywalker", "", "winStand:combat@Le pilote prodige ; ifAtk:1@La colère", "E"),
  s("Mace Windu", "Le maître au sabre violet", 6, 6, "C", J, "Maître Jedi", "duel", "winKill:combat,3@Vaapad", "R"),
  s("Qui-Gon Jinn", "Le maître rebelle", 5, 4, "RI", J, "Maître Jedi", "", "enterSearch:Skywalker@Il a trouvé l'Élu", "R"),
  s("Ahsoka Tano", "La Togruta", 5, 5, "CR", JR, "Jedi", "", "noKneel:combat@Les deux sabres ; escape@Je ne suis pas une Jedi", "E"),
  s("Rey", "Rey Skywalker", 7, 6, "CRI", JR, "Skywalker", "", "enterRevive:6@Tous les Jedi sont avec moi ; ifBehind:2@Rien qu'une pilleuse d'épaves", "L"),
  s("Rey", "La pilleuse de Jakku", 4, 4, "CR", JR, "Pilleuse", "", "loseStand@Elle se relève", "R"),
  s("Grogu", "L'Enfant", 2, 1, "RI", `${J}|${PE}`, "Enfant", "", "actKneel:4@La Force", "R"),
  s("Kit Fisto", "Le maître nautolan", 3, 3, "C", J, "Maître Jedi", "", "ifAtk:1@Le sourire du Jedi", "U"),
  s("Plo Koon", "Le maître kel dor", 3, 3, "CR", J, "Maître Jedi", "", "ifDef:2@Il veille sur ses clones", "C"),
  s("Ezra Bridger", "Le padawan rebelle", 3, 2, "RI", JR, "Jedi", "", "enterKneel:2@Le langage des créatures", "U"),
  s("Kanan Jarrus", "Le Jedi aveugle", 4, 4, "CR", JR, "Jedi", "", "guard:Rébellion@Il protège l'équipage", "U"),
  s("Cal Kestis", "Le survivant de l'Ordre 66", 4, 4, "CR", J, "Jedi", "", "escape@La fuite", "U"),
  s("Padawan", "Le jeune Jedi", 1, 1, "R", J, "Jedi", "", "", "C", { uni: false }),

  // --- Sith
  s("Dark Vador", "Le Seigneur Sith", 7, 7, "CI", SE, "Sith|Skywalker", "intimidation", "atkTerror:3@La respiration ; winKill:combat,3@L'étranglement de Force", "L"),
  s("Dark Vador", "L'Élu déchu", 7, 6, "CRI", SE, "Sith|Skywalker", "", "actSilence:7@L'emprise de la Force ; enterKneelAll:2@Le couloir du vaisseau rebelle", "L"),
  s("Palpatine", "L'Empereur", 7, 5, "RI", SE, "Sith", "genie", "oppTax:1@La République devient l'Empire ; domSteal:1@Tout se déroule comme prévu", "L"),
  s("Palpatine", "Dark Sidious", 7, 6, "CR", SI, "Sith", "", "enterKill:4@Les éclairs de Force ; dieReturn@Palpatine est revenu", "L"),
  s("Dark Maul", "Le Sith au double sabre", 5, 5, "C", SI, "Sith", "duel", "ifAlone:2@Le double sabre ; dieReturn@Il a survécu", "E"),
  s("Comte Dooku", "Dark Tyranus", 6, 5, "CR", SI, "Sith", "", "winKill:ruse,3@Les éclairs ; winSteal:influence,1@Les Séparatistes", "E"),
  s("Kylo Ren", "Le chevalier de Ren", 6, 6, "C", SE, "Sith|Skywalker", "", "ifAtk:2@La colère ; atkKneel:3@L'arrêt de Force", "E"),
  s("Snoke", "Le Suprême Leader", 5, 5, "RI", SE, "Sith", "", "domi:2@Suprême Leader ; actSilence:5@La Force", "R"),
  s("Asajj Ventress", "L'assassin de Dooku", 4, 4, "CR", SI, "Sith", "", "winKill:combat,2@Les sabres courbes", "R"),
  s("Savage Opress", "Le frère de Maul", 4, 5, "C", SI, "Sith", "", "ifName:Dark Maul,1@Les frères", "U"),
  s("Le Grand Inquisiteur", "Le chasseur de Jedi", 5, 5, "C", SE, "Inquisiteur", "", "winKill:combat,3@Le sabre tournoyant", "R"),
  s("Inquisiteur", "Le chasseur de Jedi", 3, 3, "C", SE, "Inquisiteur", "", "", "U", { uni: false }),
  s("Dark Plagueis", "Le Sage", 6, 4, "RI", SI, "Sith", "genie", "enterRevive:5@Il pouvait empêcher la mort ; winDraw:ruse,1@La tragédie de Dark Plagueis", "E"),
  s("Dark Bane", "La règle des Deux", 6, 6, "CR", SI, "Sith", "", "ifAlone:2@Un maître, un apprenti ; winKill:combat,3@L'armure d'orbalisques", "E"),
  s("Mère Talzin", "La sorcière de Dathomir", 5, 4, "RI", SI, "Sœur de la Nuit", "", "enterRevive:4@La magie des Sœurs de la Nuit ; actKneel:4@Le chaudron", "R"),
  s("Sœur de la Nuit", "La sorcière de Dathomir", 2, 2, "R", SI, "Sœur de la Nuit", "", "ifWith:Sœur de la Nuit,1@Le clan", "C", { uni: false }),
  s("Baylan Skoll", "Le Jedi déchu", 5, 5, "CR", SI, "Jedi déchu", "", "ifDef:2@Il a survécu à l'Ordre 66 ; atkKneel:3@La lame orange", "R"),
  s("Shin Hati", "L'apprentie", 3, 3, "C", SI, "Jedi déchu", "", "ifName:Baylan Skoll,1@Le maître", "U"),
  s("La Seconde Sœur", "Trilla Suduri", 4, 4, "CR", SE, "Inquisiteur", "", "winDiscard:combat,1@Elle connaît les Jedi", "U"),
  s("Le Cinquième Frère", "L'Inquisiteur colosse", 4, 5, "C", SE, "Inquisiteur", "", "", "U"),
  s("Chevalier de Ren", "La garde de Kylo", 3, 3, "C", SI, "Chevalier de Ren", "", "ifName:Kylo Ren,1@Leur maître", "U", { uni: false }),
  s("Garde prétorien", "La garde rouge du Suprême Leader", 3, 3, "C", SE, "Garde", "", "guard:Sith@Ils protègent le maître", "U", { uni: false }),

  // --- Rébellion
  s("Leia Organa", "La princesse rebelle", 6, 5, "CRI", RE, "Skywalker|Sénatrice", "", "aura:Rébellion,1@L'espoir de la Rébellion", "E"),
  s("Leia Organa", "La générale de la Résistance", 7, 5, "RI", RE, "Skywalker|Générale", "", "enterPutPlay:Rébellion,4@L'appel de la Résistance ; immune@La Force est en elle", "L"),
  s("Han Solo", "Le contrebandier", 6, 6, "C", RP, "Contrebandier|Pilote", "", "winStand:*@Il tire le premier ; ifName:Chewbacca,1@Le copilote", "E"),
  s("Chewbacca", "Le copilote wookiee", 5, 6, "C", RP, "Wookiee", "", "ifName:Han Solo,1@Le copilote ; ifDef:1@Le rugissement", "R"),
  s("R2-D2", "Le droïde astromécano", 2, 1, "RI", JR, "Droïde", "", "enterDraw:1@Le message de Leia", "U"),
  s("C-3PO", "Le droïde de protocole", 2, 1, "I", JR, "Droïde", "", "domi:1@Six millions de formes de communication", "C"),
  s("Lando Calrissian", "Le baron de Bespin", 4, 4, "RI", RP, "Contrebandier", "", "enterGold:2@La Cité des nuages", "R"),
  s("Wedge Antilles", "Le pilote de l'Escadron Rouge", 3, 3, "C", RE, "Pilote", "", "ifWith:Pilote,1@Escadron Rouge", "U"),
  s("Poe Dameron", "Le meilleur pilote de la Résistance", 4, 4, "CR", RE, "Pilote", "", "noKneel:combat@Le X-wing noir", "R"),
  s("Finn", "Le stormtrooper déserteur", 4, 4, "C", RE, "Résistance", "", "loseStand@Il ne se rend jamais", "U"),
  s("Jyn Erso", "La rebelle de Rogue One", 4, 4, "CR", RE, "Rogue One", "", "dieDraw:2@Les plans de l'Étoile de la Mort", "R"),
  s("Cassian Andor", "L'espion", 4, 4, "CR", RE, "Rogue One|Espion", "discret", "winDraw:ruse,1@Le renseignement", "R"),
  s("K-2SO", "Le droïde reprogrammé", 3, 4, "C", RE, "Droïde|Rogue One", "", "", "U"),
  s("Mon Mothma", "La sénatrice", 3, 1, "I", RE, "Sénatrice", "", "income:1", "U"),
  s("Padmé Amidala", "La reine de Naboo", 4, 3, "RI", RE, "Sénatrice|Reine", "", "domi:1@La voix du Sénat ; escape@La servante qui joue le leurre", "R"),
  s("Amiral Ackbar", "L'amiral mon calamari", 4, 3, "RI", RE, "Amiral", "", "ifDef:2@C'est un piège !", "U"),
  s("Hera Syndulla", "La pilote du Ghost", 4, 4, "CR", RE, "Pilote", "", "actStand:Rébellion@Le Ghost", "R"),
  s("Sabine Wren", "L'artiste mandalorienne", 3, 3, "CR", RP, "Mandalorien", "", "enterDiscard:1@Les explosifs", "U"),
  s("BB-8", "Le droïde de Poe", 2, 1, "R", RE, "Droïde", "", "enterDraw:1@La carte vers Luke", "C"),
  s("Guerrier ewok", "Le petit peuple d'Endor", 1, 1, "C", RE, "Ewok", "", "ifWith:Ewok,1@Endor", "C", { uni: false }),
  s("Pilote rebelle", "L'Escadron Rouge", 2, 2, "C", RE, "Pilote", "", "ifWith:Pilote,1@Escadron Rouge", "C", { uni: false }),

  // --- Empire
  s("Grand Moff Tarkin", "Le gouverneur", 5, 4, "RI", EM, "Officier", "", "enterKill:3@La puissance de l'Étoile de la Mort", "E"),
  s("Grand Amiral Thrawn", "Le stratège chiss", 6, 5, "RI", EM, "Officier", "genie", "winKneel:ruse@L'art de l'ennemi ; firstDraw:1@Il étudie ses adversaires", "E"),
  s("Directeur Krennic", "L'architecte de l'Étoile", 4, 3, "RI", EM, "Officier", "", "domi:2@Le projet Stardust", "U"),
  s("Moff Gideon", "Le chasseur de l'Enfant", 5, 5, "CR", EM, "Officier", "", "winKill:combat,2@Le Sabre noir", "R"),
  s("Agent Kallus", "Le Bureau de la sécurité", 3, 3, "CR", EM, "Officier", "", "winDiscard:ruse,1@L'interrogatoire", "U"),
  s("Général Hux", "Le général du Premier Ordre", 3, 3, "I", EM, "Premier Ordre|Officier", "", "domi:2@Le discours de Starkiller", "U"),
  s("Capitaine Phasma", "Le capitaine chromé", 4, 4, "C", EM, "Premier Ordre", "", "atkBuff:Stormtrooper,1@Les troupes", "U"),
  s("Stormtrooper", "Les troupes de choc", 2, 2, "C", EM, "Stormtrooper", "", "ifWith:Stormtrooper,1@En formation", "C", { uni: false }),
  s("Death Trooper", "L'élite impériale", 3, 3, "C", EM, "Stormtrooper", "", "atkKneel:2@Commando", "U", { uni: false }),
  s("AT-AT", "Le marcheur impérial", 6, 7, "C", EM, "Véhicule", "intimidation", "", "R", { uni: false }),
  s("Pilote de TIE", "L'escadron impérial", 2, 2, "C", EM, "Véhicule|Pilote", "", "", "C", { uni: false }),

  // --- Pègre
  s("Din Djarin", "Le Mandalorien", 7, 6, "CI", PE, "Mandalorien|Chasseur de primes", "", "selfGuard@L'armure en beskar ; winStand:combat@C'est la Voie", "L"),
  s("Din Djarin", "Le chasseur de primes", 5, 5, "C", PE, "Mandalorien|Chasseur de primes", "", "winGold:*,1@La prime", "R"),
  s("Boba Fett", "Le chasseur de primes", 6, 6, "CR", PE, "Mandalorien|Chasseur de primes", "", "winFreeze:*@La carbonite ; escape@Le Sarlacc", "E"),
  s("Jango Fett", "Le modèle des clones", 5, 5, "C", PE, "Mandalorien|Chasseur de primes", "", "ifAtk:1@Le réacteur dorsal", "R"),
  s("Jabba le Hutt", "Le seigneur du crime", 6, 4, "I", PE, "Hutt", "", "enterGold:2@Le palais de Jabba ; winSteal:influence,2@Le prix de la dette", "E"),
  s("Le Rancor", "Le monstre de Jabba", 5, 6, "C", PE, "Créature", "", "winKill:combat,3@La fosse", "R"),
  s("Greedo", "Le chasseur malchanceux", 2, 2, "C", PE, "Chasseur de primes", "", "", "C"),
  s("Bossk", "Le chasseur trandoshan", 3, 3, "C", PE, "Chasseur de primes", "", "winGold:combat,1@La prime", "U"),
  s("IG-11", "Le droïde chasseur", 3, 3, "C", PE, "Droïde|Chasseur de primes", "", "actSacKill:4@Autodestruction", "U"),
  s("Cad Bane", "Le pistolero", 4, 4, "CR", PE, "Chasseur de primes", "", "atkKneel:3@Dégainer", "R"),
  s("Fennec Shand", "L'assassin d'élite", 4, 4, "CR", PE, "Chasseur de primes", "discret", "", "U"),
  s("Bo-Katan Kryze", "La reine de Mandalore", 5, 5, "CI", PE, "Mandalorien", "", "aura:Mandalorien,1@Pour Mandalore", "R"),
  s("Qi'ra", "La lieutenante de l'Aube écarlate", 3, 2, "RI", PE, "Aube écarlate", "", "winSteal:ruse,1@L'Aube écarlate", "U"),
  s("Maz Kanata", "La pirate millénaire", 3, 2, "RI", PE, "Pirate", "", "enterSearch:Sabre@Le sabre de Luke", "U"),
  s("Jawa", "Le ferrailleur", 1, 1, "R", PE, "Jawa", "", "enterGold:1@Utinni !", "C", { uni: false }),
  s("Chasseur de primes", "Le traqueur", 2, 2, "C", PE, "Chasseur de primes", "", "", "C", { uni: false }),

  // --- partout : les créatures de la galaxie
  s("Porg", "L'oiseau d'Ahch-To", 1, 1, "I", "", "Créature", "", "", "C", { uni: false }),
  s("Le Wampa", "Le monstre de Hoth", 4, 5, "C", "", "Créature", "", "ifDef:1@La grotte de glace", "U"),

  // --- lieux
  loc("Tatooine", "La planète aux deux soleils", 1, "Planète", "limite", "income:1", "C"),
  loc("Coruscant", "La capitale galactique", 2, "Planète", "", "reserve:1 ; domi:1", "U"),
  loc("La cantina de Mos Eisley", "Un repaire de racaille et de scélérats", 2, "Cantina", "", "reduce:*,1@On y trouve de tout ; reserve:1", "R"),
  loc("Le Sénat galactique", "La démocratie applaudit", 3, "Sénat", "", "domi:2 ; reserve:1", "R"),
  loc("Le Temple Jedi", "Le cœur de l'Ordre", 2, "Temple", "", "reserve:1 ; domi:1", "U", { pt: J }),
  loc("Mustafar", "Le château de Vador", 2, "Planète", "", "reduce:Sith,1@Les flots de lave ; reserve:1", "U", { pt: SI }),
  loc("La base de Yavin 4", "Le quartier général rebelle", 2, "Base", "", "income:1", "U", { pt: RE }),
  loc("L'Étoile de la Mort", "La station de combat", 3, "Station", "", "domi:2 ; reserve:1", "R", { pt: EM }),
  loc("Le palais de Jabba", "Le repaire de Tatooine", 2, "Palais", "", "income:1", "U", { pt: PE }),
  loc("Le Faucon Millenium", "Le tas de ferraille le plus rapide", 2, "Vaisseau", "", "actStand:*@Le saut en hyperespace", "R", { pt: RP }),

  // --- objets
  obj("Sabre laser bleu", "L'arme d'un Jedi", 2, "Sabre", "", "attStr:2 ; attKw:duel", "U", { pt: J }),
  obj("Sabre laser rouge", "L'arme d'un Sith", 2, "Sabre", "", "attStr:2 ; attKw:intimidation", "U", { pt: SI }),
  obj("Le Sabre noir", "L'arme des Mandaloriens", 2, "Sabre", "", "attStr:1 ; attKw:celebre", "R", { pt: PE }),
  obj("L'armure en beskar", "Elle arrête les sabres", 2, "Armure", "", "attSave", "R", { pt: PE }),
  obj("Le blaster de Han", "Le DL-44", 1, "Blaster", "", "attIcon:combat ; attStr:1", "C"),
  obj("Gelé dans la carbonite", "Le cadeau de Jabba", 2, "Piège", "", "attNoStand", "U"),
  obj("Chasseur X-wing", "Le chasseur rebelle", 2, "Vaisseau", "", "attStand", "U", { pt: RE }),
  obj("Chasseur TIE avancé", "Le chasseur de Vador", 2, "Vaisseau", "", "attStr:1 ; attStand", "U", { pt: SE }),

  // --- événements
  ev("Que la Force soit avec toi", "L'espoir", 1, "Force", "evBuff:3", "C"),
  ev("Utilise la Force", "Laisse-toi guider", 1, "Force", "evStand:*", "U"),
  ev("Le saut en hyperespace", "Fuir à la vitesse lumière", 2, "Fuite", "evSave:*", "R"),
  ev("C'est un piège !", "L'amiral avait raison", 1, "Ruse", "evCancel", "R", { pt: RE }),
  ev("Exécutez l'Ordre 66", "La purge des Jedi", 3, "Ordre", "evKill:4", "R", { pt: SE }),
  ev("L'étranglement de Force", "Votre manque de foi est consternant", 2, "Force", "evKneel:4", "U", { pt: SI }),
  ev("Le tir de l'Étoile de la Mort", "Adieu Alderaan", 4, "Arme", "evKillAll:2", "R", { pt: EM }),
  ev("La prime", "Recherché mort ou vif", 1, "Prime", "evSteal:2", "U", { pt: PE }),
  ev("Je ne fais qu'un avec la Force", "La Force est avec moi", 2, "Force", "evRevive", "R", { pt: J }),
];

export const starters = [
  { id: "sw-jedi", name: "Les Jedi", pt: J, leader: "sw-yoda-7", like: [J, J, "Maître Jedi", "Skywalker"], avoid: [], desc: "Yoda, Obi-Wan, Anakin, Qui-Gon, Ahsoka, Grogu… Les tours de l'esprit Jedi empêchent un adversaire de défendre." },
  { id: "sw-sith", name: "Les Sith", pt: SI, leader: "sw-dark-vador-7", like: [SI, SI, "Inquisiteur"], avoid: [], desc: "Dark Vador, Dark Maul, Dooku, Kylo Ren, Snoke et les Inquisiteurs : la peur du côté obscur agenouille les vaincus." },
  { id: "sw-rebellion", name: "La Rébellion", pt: RE, leader: "sw-luke-skywalker-7", like: [RE, RE, "Pilote", "Rogue One"], avoid: [], desc: "Luke, Leia, Han et Chewie, Rogue One, Poe et l'Escadron Rouge : chaque round, la première victoire rapporte 1 Pouvoir." },
  { id: "sw-empire", name: "L'Empire", pt: EM, leader: "sw-palpatine-7", like: [EM, EM, "Officier", "Stormtrooper"], avoid: [], desc: "L'Empereur, Vador, Tarkin, Thrawn, les stormtroopers et l'Étoile de la Mort : la machine de guerre rapporte +1 or par round." },
  { id: "sw-pegre", name: "La Pègre", pt: PE, leader: "sw-din-djarin-7", like: [PE, PE, "Chasseur de primes", "Mandalorien"], avoid: [], desc: "Le Mandalorien et Grogu, Boba Fett, Jango, Cad Bane, Lando et Chewie : le premier joueur encaisse 1 or." },
];
