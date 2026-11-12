import { ch, loc, obj, ev } from "./build.js";

// Studio Ghibli : les héros et les esprits des films du studio (Totoro, Chihiro, Mononoké, Nausicaä, Laputa, Kiki, Porco Rosso,
// le Château ambulant, Ponyo…). Traits : Esprit, Forêt, Aburaya (les bains), Magie, Ciel, Pilote, Pirate, Enfant, Chat, Mer.
export const meta = {
  id: "ghibli", name: "Studio Ghibli", short: "Ghibli", color: "#5fb3d9", color2: "#16351f", icon: "trees", motif: "ghibli",
  desc: "Les esprits de la forêt, les bains d'Aburaya et les aventuriers du ciel : les héros et les créatures des films du Studio Ghibli.",
  passive: "fWinStand:*@Le vent se lève ; defAura:1@Il faut tenter de vivre",
};

export const cards = [
  // --- Mon voisin Totoro
  ch("Totoro", "Le roi de la forêt", 7, 7, "CI", "Esprit|Forêt", "celebre", "ifDef:2@Le grand camphrier ; enterKneelAll:2@Le grand cri", "L"),
  ch("Totoro", "L'arrêt de bus sous la pluie", 7, 6, "RI", "Esprit|Forêt", "", "enterPutPlay:*,4@Le Chatbus arrive ; immune@Seuls les enfants le voient", "L"),
  ch("Le Chatbus", "Le bus à douze pattes", 4, 4, "C", "Esprit|Chat|Forêt", "", "noKneel:combat@Il file à travers champs", "R"),
  ch("Chibi-Totoro", "Les petits Totoro", 1, 1, "R", "Esprit|Forêt", "", "enterDraw:1@Les glands", "C", { uni: false }),
  ch("Satsuki Kusakabe", "La grande sœur", 3, 2, "CR", "Enfant|Humain", "", "ifName:Mei Kusakabe,1@Les sœurs", "U"),
  ch("Mei Kusakabe", "La petite sœur", 1, 1, "I", "Enfant|Humain", "", "escape@Elle s'est perdue", "U"),
  ch("Noiraude", "Les noiraudes", 1, 1, "R", "Esprit|Aburaya", "", "ifWith:Esprit,1@Le petit peuple de la suie", "C", { uni: false }),

  // --- Le Voyage de Chihiro
  ch("Chihiro Ogino", "Sen, la servante des bains", 6, 4, "RI", "Enfant|Humain|Aburaya", "celebre", "loseStand@Elle ne baisse jamais les bras ; winDraw:*,1@Elle se souvient du nom de Haku", "E"),
  ch("Chihiro Ogino", "La petite fille du tunnel", 2, 1, "R", "Enfant|Humain", "", "escape@Ne mange rien ici !", "C"),
  ch("Haku", "Le dragon blanc", 6, 6, "CR", "Esprit|Dragon|Aburaya", "", "winStand:combat@L'esprit de la rivière Kohaku ; escape@Il se souvient de son nom", "E"),
  ch("Yubaba", "La sorcière des bains", 6, 4, "RI", "Sorcière|Magie|Aburaya", "", "enterGold:2@Le contrat ; actSilence:5@Elle vole les noms", "E"),
  ch("Zeniba", "La sœur jumelle", 4, 3, "RI", "Sorcière|Magie", "", "enterRevive:3@Le fil tressé par tous", "R"),
  ch("Sans-Visage", "L'esprit qui offre de l'or", 5, 5, "RI", "Esprit|Aburaya", "", "winSteal:influence,2@L'or qu'il distribue", "R"),
  ch("Kamaji", "Le maître des chaudières", 3, 3, "C", "Esprit|Aburaya", "", "actStand:*@Six bras", "U"),
  ch("Lin", "La servante", 2, 2, "C", "Aburaya", "", "ifName:Chihiro Ogino,1@Sa grande sœur des bains", "C"),
  ch("Bô", "Le bébé géant", 2, 3, "C", "Aburaya|Enfant", "", "ifDef:1@Il ne veut pas sortir", "C"),

  // --- Princesse Mononoké
  ch("San", "La princesse Mononoké", 6, 5, "CR", "Forêt|Humain", "", "atkKneel:3@Le masque de la louve ; ifName:Moro,1@Sa mère louve", "E"),
  ch("Ashitaka", "Le prince maudit", 6, 5, "CR", "Humain|Forêt", "", "winKill:combat,3@Le bras maudit ; ifName:Yakul,1@Yakul", "E"),
  ch("Dame Eboshi", "La dame des forges", 5, 4, "CI", "Humain|Forges", "", "income:1@Les forges de fer ; winKill:combat,2@Les arquebuses", "R"),
  ch("Moro", "La déesse louve", 6, 6, "C", "Esprit|Forêt|Loup", "", "ifDef:2@La louve blanche", "R"),
  ch("Le Dieu-Cerf", "L'esprit de la forêt", 7, 4, "RI", "Esprit|Forêt", "", "enterRevive:6@Il donne la vie ; dieKill:7@Il reprend la vie", "L"),
  ch("Okkoto", "Le dieu sanglier", 5, 6, "C", "Esprit|Forêt", "", "ifAtk:2@La charge des sangliers", "U"),
  ch("Yakul", "L'élan rouge", 3, 3, "C", "Forêt", "", "noKneel:combat@Il galope", "C"),
  ch("Kodama", "Les esprits des arbres", 1, 1, "R", "Esprit|Forêt", "", "enterDraw:1@Ils tournent la tête", "C", { uni: false }),
  ch("Jigo", "Le moine chasseur", 3, 2, "RI", "Humain", "", "winSteal:ruse,1@Il veut la tête du Dieu-Cerf", "U"),

  // --- Le Château ambulant
  ch("Hauru", "Le magicien", 6, 5, "RI", "Magie|Ciel", "", "escape@Il s'envole en oiseau ; ifName:Sophie Hatter,1@Sophie", "E"),
  ch("Sophie Hatter", "La chapelière ensorcelée", 4, 3, "RI", "Humain|Magie", "", "guard:*@Son cœur est fort", "R"),
  ch("Calcifer", "Le démon du feu", 3, 2, "R", "Esprit|Magie", "", "income:1@Il fait avancer le château", "R"),
  ch("La Sorcière des Landes", "La malédiction", 5, 4, "RI", "Sorcière|Magie", "", "enterFreeze:3@La malédiction de Sophie", "U"),
  ch("Navet", "L'épouvantail sauteur", 2, 2, "C", "Magie", "", "escape@Il saute", "C"),

  // --- Nausicaä, Laputa, Kiki, Porco Rosso, Ponyo
  ch("Nausicaä", "La princesse de la Vallée du Vent", 7, 5, "CRI", "Humain|Ciel|Pilote", "celebre", "actSilence:7@Elle apaise la colère des Ômus ; winStand:*@Le planeur", "L"),
  ch("Ômu", "La colère des insectes", 6, 7, "C", "Insecte|Forêt", "intimidation", "", "U", { uni: false }),
  ch("Kushana", "La princesse de Tolmèque", 5, 5, "CI", "Humain", "", "winKill:combat,2@Les armées de Tolmèque", "R"),
  ch("Le Géant Divin", "Le dieu de la guerre", 7, 8, "C", "Géant", "", "atkTerror:4@Les sept jours de feu", "E"),
  ch("Pazu", "Le petit mineur", 3, 3, "C", "Enfant|Ciel", "", "loseStand@Il ne lâche pas Sheeta", "U"),
  ch("Sheeta", "La princesse de Laputa", 3, 2, "RI", "Enfant|Ciel|Magie", "", "escape@La pierre volante ; enterDraw:1@Le collier", "R"),
  ch("Muska", "Le colonel", 5, 4, "RI", "Humain", "", "domi:2@Le roi de Laputa ; winKill:ruse,3@Ses agents", "R"),
  ch("Dola", "La pirate du ciel", 4, 3, "CI", "Pirate|Ciel", "", "winGold:combat,1@Les pirates de Dola", "U"),
  ch("Robot de Laputa", "Le gardien du château", 5, 6, "C", "Robot|Ciel", "", "ifDef:1@Il protège le jardin", "U", { uni: false }),
  ch("Kiki", "La petite sorcière", 3, 2, "RI", "Sorcière|Ciel", "", "noKneel:influence@Le service de livraison", "R"),
  ch("Jiji", "Le chat noir", 1, 1, "R", "Chat", "", "enterDraw:1@Le chat qui parle", "C"),
  ch("Tombo", "L'apprenti aviateur", 2, 2, "C", "Enfant|Ciel", "", "ifName:Kiki,1@L'ami de Kiki", "C"),
  ch("Porco Rosso", "Le cochon volant", 5, 5, "CR", "Pilote|Ciel", "duel", "winGold:combat,1@Plutôt cochon que fasciste", "E"),
  ch("Gina", "La chanteuse de l'Hôtel Adriano", 3, 2, "I", "Humain", "", "domi:2@Le temps des cerises", "U"),
  ch("Curtis", "L'aviateur américain", 4, 4, "C", "Pilote|Ciel", "duel", "ifAlone:1@Le duel aérien", "U"),
  ch("Fio Piccolo", "L'ingénieure", 2, 2, "RI", "Humain", "", "enterDraw:1@Elle répare l'hydravion", "C"),
  ch("Ponyo", "La petite fille poisson", 3, 3, "RI", "Mer|Magie|Enfant", "", "ifName:Sosuke,1@Ponyo aime Sosuke !", "R"),
  ch("Sosuke", "Le petit garçon", 2, 2, "C", "Enfant|Humain", "", "enterDraw:1@Le seau vert", "C"),
  ch("Fujimoto", "Le sorcier des mers", 4, 3, "RI", "Mer|Magie", "", "enterKneel:3@Les vagues", "U"),

  // --- partout dans les films
  ch("Le Baron", "Humbert von Gikkingen", 4, 4, "C", "Chat", "duel", "ifAlone:1@Le gentleman", "U"),
  ch("Arrietty", "La chapardeuse", 2, 1, "R", "Chapardeur", "discret", "escape@Sous le plancher", "U"),
  ch("Tanuki de Pompoko", "Les métamorphoses", 1, 1, "C", "Esprit|Forêt", "", "escape@Il se transforme", "C", { uni: false }),

  // --- lieux
  loc("Le grand camphrier", "La maison de Totoro", 1, "Forêt", "limite", "income:1", "C"),
  loc("Les bains d'Aburaya", "La maison des esprits", 3, "Aburaya", "", "domi:2 ; reserve:1", "R"),
  loc("La forêt des esprits", "Le bassin du Dieu-Cerf", 2, "Forêt", "", "reserve:1 ; domi:1", "U"),
  loc("Le château ambulant", "Il marche sur ses pattes", 2, "Château", "", "reduce:*,1@Les portes vers partout ; reserve:1", "R"),
  loc("La Vallée du Vent", "Les moulins du royaume", 2, "Vallée", "", "income:1", "U"),
  loc("Laputa", "Le château dans le ciel", 2, "Ciel", "", "reserve:1 ; domi:1", "U"),

  // --- objets
  obj("Le planeur de Nausicaä", "Le Möwe", 2, "Planeur|Ciel", "", "attStr:1 ; attStand", "U"),
  obj("Le balai de Kiki", "Le service de livraison", 1, "Magie|Ciel", "", "attIcon:influence", "C"),
  obj("La pierre volante", "Le collier de Sheeta", 2, "Magie", "", "attSave", "R"),
  obj("L'hydravion de Porco", "Le Savoia S.21", 2, "Avion|Ciel", "", "attStr:2 ; attKw:duel", "U"),

  // --- événements
  ev("Le festin", "Un repas de Ghibli", 1, "Repas", "evDraw:2", "U"),
  ev("Le vent se lève", "Il faut tenter de vivre", 1, "Vent", "evStandAll:Ciel", "R"),
  ev("La danse des graines", "Les arbres poussent en une nuit", 2, "Esprit", "evRevive", "R"),
  ev("Le contrat de Yubaba", "Elle te prend ton nom", 2, "Magie", "evKneel:4", "U"),
  ev("La colère de la forêt", "Les sangliers attaquent", 3, "Forêt", "evKill:4", "R"),
  ev("La formule de destruction", "La chute de Laputa", 4, "Magie", "evKillAll:2", "R"),
  ev("Le parapluie", "Sous la pluie à l'arrêt de bus", 1, "Esprit", "evSave:Enfant", "U"),
];

export const starters = [
  { id: "ghibli-foret", name: "Les esprits de la forêt", leader: "ghibli-totoro-7", like: ["Esprit", "Forêt"], avoid: ["Aburaya", "Pirate", "Robot"], desc: "Totoro et le Chatbus, Mononoké, Ashitaka, Moro, le Dieu-Cerf, les kodamas et les noiraudes : la forêt veille." },
  { id: "ghibli-bains", name: "Les bains d'Aburaya", leader: "ghibli-chihiro-ogino-6", like: ["Aburaya", "Magie", "Sorcière"], avoid: ["Forêt", "Pirate"], excl: ["ghibli-haku-6"], desc: "Chihiro, Haku, Yubaba, Sans-Visage, Kamaji, Hauru, Sophie et Calcifer : la magie et les esprits des bains." },
  { id: "ghibli-ciel", name: "Les aventuriers du ciel", leader: "ghibli-nausicaa-7", like: ["Ciel", "Pilote", "Pirate"], avoid: ["Aburaya"], desc: "Nausicaä, Pazu et Sheeta, les pirates de Dola, Kiki, Porco Rosso et Curtis : le vent se lève." },
];
