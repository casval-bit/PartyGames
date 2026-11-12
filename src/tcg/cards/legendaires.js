import { ch, loc, obj, ev } from "./build.js";

// Les Légendaires (Patrick Sobral) : beaucoup de versions des héros, et les personnages secondaires du monde d'Alysia.
// Les versions d'un même héros partagent une clé : une seule par deck (Shimy 4 et Shimy 7 ne peuvent pas cohabiter).
export const meta = {
  id: "legendaires", name: "Les Légendaires", short: "Légendaires", color: "#5cd6a6", color2: "#0f3d33", icon: "swords", motif: "castle",
  desc: "Danaël, Jadina, Gryfenfer, Razzia, Shimy et tout le monde d'Alysia : un héros qui gagne repart aussitôt au combat.",
  passive: "fWinStand:combat@Esprit légendaire",
};

const L = "Légendaire";
export const cards = [
  // --- Danaël
  ch("Danaël", "Chevalier de Larbos", 3, 3, "C", `${L}|Humain|Larbos`, "", "ifWith:Légendaire,1@Le chef", "U", { key: "leg-danael" }),
  ch("Danaël", "Chef des Légendaires", 5, 5, "CI", `${L}|Humain|Larbos`, "celebre", "atkBuff:Légendaire,1@En avant, Légendaires !", "R", { key: "leg-danael" }),
  ch("Danaël", "L'épée d'or", 6, 6, "CI", `${L}|Humain|Larbos|Faucon d'Argent`, "duel|celebre", "winStand:combat@L'épée revient toujours", "E", { key: "leg-danael" }),
  ch("Danaël", "Le Dynaméis", 7, 7, "CRI", `${L}|Dynaméis`, "celebre|intimidation", "aura:Légendaire,1@Dignité ; enterStand:Légendaire@Ressuscité", "L", { key: "leg-danael" }),
  // --- Gryfenfer
  ch("Gryfenfer", "Jaguarian impulsif", 3, 3, "C", `${L}|Jaguarian`, "", "ifAtk:1@Coup de griffe", "U", { key: "leg-gryf" }),
  ch("Gryfenfer", "Griffes d'acier", 5, 5, "C", `${L}|Jaguarian`, "intimidation", "winKill:combat,2@Entaille la pierre", "R", { key: "leg-gryf" }),
  ch("Gryfenfer", "Prince des Jaguarians", 7, 7, "CI", `${L}|Jaguarian|Noble`, "celebre|intimidation", "aura:Jaguarian,1@Courage ; winStand:combat@Rage du jaguar", "L", { key: "leg-gryf" }),
  // --- Jadina
  ch("Jadina", "Princesse exilée", 3, 2, "RI", `${L}|Orchidia|Magicienne`, "", "winDraw:ruse,1@Intelligence", "U", { key: "leg-jadina" }),
  ch("Jadina", "Le bâton-aigle", 5, 4, "RI", `${L}|Orchidia|Magicienne`, "genie", "actMinus:2@Éclair magique", "R", { key: "leg-jadina" }),
  ch("Jadina", "Héritière de Jadilyna", 7, 6, "CRI", `${L}|Orchidia|Magicienne|Noble`, "celebre|genie", "enterKneel:5@Puissance du bâton-aigle ; winDraw:*,1@Sagesse royale", "L", { key: "leg-jadina" }),
  // --- Razzia
  ch("Razzia", "Le gros mangeur", 3, 4, "C", `${L}|Rymar`, "", "", "U", { key: "leg-razzia" }),
  ch("Razzia", "Le colosse de Rymar", 5, 6, "C", `${L}|Rymar`, "intimidation", "ifDef:1@Montagne de muscles", "R", { key: "leg-razzia" }),
  ch("Razzia", "Porteur de Léviathan", 6, 7, "CI", `${L}|Rymar`, "intimidation|celebre", "winKill:combat,3@Léviathan", "E", { key: "leg-razzia" }),
  // --- Shimy
  ch("Shimy", "Elfe élémentaire", 4, 3, "CR", `${L}|Elfe|Elfe élémentaire`, "discret", "ifName:Gryfenfer,2@L'amour de Gryf", "R", { key: "leg-shimy", st: "leg-gryf" }),
  ch("Shimy", "Fusion avec la terre", 5, 4, "CR", `${L}|Elfe|Elfe élémentaire`, "discret", "loseStand@Se fondre dans la pierre", "R", { key: "leg-shimy" }),
  ch("Shimy", "Maîtresse des éléments", 7, 6, "CRI", `${L}|Elfe|Elfe élémentaire`, "celebre|discret", "aura:Elfe,1@Pureté ; atkKneel:5@Fusion élémentaire", "L", { key: "leg-shimy" }),
  // --- Ténébris
  ch("Ténébris", "Capitaine de l'Hydarkos", 4, 4, "CR", "Orchidia|Pirate|Sorcière", "", "winSteal:combat,1@Pillage", "R", { key: "leg-tenebris" }),
  ch("Ténébris", "La Légendaire repentie", 6, 5, "CRI", `${L}|Orchidia|Sorcière`, "discret", "actMinus:2@Magie noire ; ifName:Razzia,1@Liée à Razzia", "E", { key: "leg-tenebris" }),
  // --- autres héros
  ch("Amylada", "Le bras démon", 3, 3, "C", `${L}|Chiridirelle|Démon`, "", "ifName:Razzia,2@Le bras de Razzia", "U"),
  ch("Artémus", "L'écrivain", 3, 1, "RI", "Humain|Écrivain", "genie", "enterSearch:Légendaire@Voir l'avenir", "R", { key: "leg-artemus" }),
  ch("Artémus", "Le dernier Légendaire", 5, 3, "RI", `${L}|Humain|Écrivain`, "genie|celebre", "dieDraw:2@Témoin de l'avenir", "E", { key: "leg-artemus" }),
  // --- alliés
  ch("Adeyrid", "Reine d'Orchidia", 4, 2, "I", "Orchidia|Reine|Noble", "", "income:1 ; reserve:1", "R"),
  ch("Kinder", "Roi d'Orchidia", 2, 1, "I", "Orchidia|Roi|Noble", "", "domi:2@Titre honorifique", "C"),
  ch("Vangelis", "Le tuteur", 3, 1, "RI", "Orchidia|Magicien", "genie", "actStand:Orchidia@Leçons de magie", "U"),
  ch("Halan", "Roi de Sabledoray", 3, 3, "CI", "Sabledoray|Roi|Noble", "", "ifName:Jadina,1@L'ancien fiancé", "U"),
  ch("Ikaël", "Commandant des Faucons d'Argent", 4, 4, "CI", "Faucon d'Argent|Larbos", "", "aura:Faucon d'Argent,1@Commandement", "R"),
  ch("Saryn", "Faucon d'Argent", 3, 3, "C", "Faucon d'Argent|Larbos", "", "ifName:Danaël,1@Amie d'enfance", "U"),
  ch("Faucons d'Argent", "Chevaliers de Larbos", 2, 2, "C", "Faucon d'Argent|Larbos", "", "", "C", { uni: false }),
  ch("Samaël", "Guerrier monslave", 4, 4, "C", "Monslave", "duel", "actBuff:Jaguarian,2@Le maître de Gryf", "R"),
  ch("Albion", "Le père de Shimy", 2, 1, "RI", "Elfe", "", "enterDraw:1@Koléana", "C"),
  ch("Shamira", "Capitaine de l'Escouade bleue", 4, 4, "CR", "Elfe|Elfe élémentaire", "", "ifWith:Elfe,1@Escouade bleue", "U"),
  ch("Solaris", "L'elfe noire", 5, 4, "CR", "Elfe|Elfe élémentaire", "discret", "winKill:combat,2@Trois éléments", "R"),
  ch("Regen", "Elfe de l'air", 2, 2, "R", "Elfe|Elfe élémentaire", "discret", "", "C"),
  ch("Kalgon", "Justicier elfe", 4, 4, "CR", "Elfe|Elfe élémentaire", "", "winStand:combat@Justice elfique", "U"),
  ch("Toopie Maker", "L'inventrice", 2, 1, "R", "Humain|Inventeur", "genie", "", "U"),
  ch("Ding Dong", "Le gorille mécanique", 3, 4, "C", "Machine", "", "ifName:Toopie Maker,1@Ma création", "C"),
  // --- Jaguarians
  ch("Guerrier jaguarian", "Clan des griffes", 2, 2, "C", "Jaguarian", "", "", "C", { uni: false }),
  ch("Chasseresse jaguarianne", "Œil de nuit", 3, 3, "CR", "Jaguarian", "discret", "", "C", { uni: false }),
  ch("Ancien jaguarian", "Sage du clan", 2, 1, "RI", "Jaguarian", "genie", "", "U", { uni: false }),
  ch("Chef de clan jaguarian", "Rugissement", 4, 4, "CI", "Jaguarian|Noble", "", "pack:Jaguarian,1@La horde des jaguars", "U"),
  // --- ennemis
  ch("Elysio", "Darkhell amnésique", 3, 2, "RI", "Humain", "", "loseDraw:1@Souvenirs perdus", "U", { key: "leg-darkhell" }),
  ch("Darkhell", "Le Sorcier noir", 5, 4, "RI", "Sorcier|Ténèbres", "intimidation", "enterKneel:4@Malédiction", "R", { key: "leg-darkhell" }),
  ch("Darkhell", "Maître de la Pierre de Jovénia", 7, 6, "CRI", "Sorcier|Ténèbres", "intimidation|celebre", "enterKill:3@La Pierre de Jovénia ; aura:Ténèbres,1@Armée des ténèbres", "L", { key: "leg-darkhell" }),
  ch("Anathos", "Le dieu maléfique", 7, 7, "CRI", "Dieu|Ténèbres", "intimidation", "atkKneel:5@Neuf pierres divines ; winKill:*,3@Anéantissement", "L"),
  ch("Eternity", "Fils d'Anathos", 6, 6, "CR", "Dieu|Ténèbres", "intimidation", "escape@Emprisonné, jamais vaincu", "E"),
  ch("Kalandre", "La prophétesse", 6, 4, "RI", "Elfe|Dieu|Dynaméis", "genie", "enterSearch:*@Elle voit l'avenir ; actKneel:4@Manipulation", "E"),
  ch("Asgaroth", "Dynaméis", 5, 5, "C", "Dynaméis|Ténèbres", "", "guard:Dynaméis@Garde de Kalandre", "U"),
  ch("Galatée", "Dynaméis", 4, 4, "CR", "Dynaméis|Ténèbres", "discret", "", "U"),
  ch("Halcyon", "Dynaméis", 4, 3, "RI", "Dynaméis|Elfe", "", "actMinus:2@L'elfe le plus âgé", "U"),
  ch("Skroa", "Sorcier galinas", 5, 4, "RI", "Galinas|Sorcier|Ténèbres", "", "winDiscard:ruse,2@Tortures", "R"),
  ch("Shun-Day", "L'hybride", 4, 4, "C", "Galinas|Chiridirelle", "", "ifAtk:1@Impulsive", "U"),
  ch("Invidia", "La sœur d'Adeyrid", 4, 3, "RI", "Orchidia|Sorcière|Ténèbres", "", "enterDiscard:1@Jalousie", "U"),
  ch("Kasino", "Cousin de Jadina", 2, 2, "CR", "Orchidia|Ténèbres", "", "", "C"),
  ch("Kaminodoa", "Le monstre", 6, 7, "C", "Monstre|Ténèbres", "intimidation", "", "R"),
  ch("Sbires de Darkhell", "Armée des ténèbres", 1, 1, "C", "Ténèbres", "", "", "C", { uni: false }),
  ch("Chevaucheur des ténèbres", "Monture ailée", 2, 2, "C", "Ténèbres", "", "", "C", { uni: false }),
  ch("Démon mineur", "Invoqué", 3, 3, "C", "Ténèbres|Démon", "", "", "C", { uni: false }),
  ch("Sorcière des ténèbres", "Apprentie", 2, 1, "RI", "Ténèbres|Sorcière", "", "actMinus:1@Maléfice", "U", { uni: false }),
  // --- lieux
  loc("Larbos", "Royaume de Danaël", 2, "Royaume|Larbos", "", "reduce:Légendaire,1@Retour au pays", "U"),
  loc("Orchidia", "Royaume de Jadina", 1, "Royaume|Orchidia", "limite", "income:1", "C"),
  loc("La forêt des Jaguarians", "Territoire du clan", 2, "Jaguarian", "", "reduce:Jaguarian,1@Chasse", "U"),
  loc("Koléana", "L'île elfique", 3, "Elfe", "", "aura:Elfe,1", "R"),
  loc("Arbores Elementa", "L'école élémentaire", 2, "Elfe", "", "actDraw:1@Leçons", "U"),
  loc("Le marais maudit", "Terres de Darkhell", 1, "Ténèbres", "limite", "income:1", "C"),
  loc("La forteresse de Darkhell", "Repaire du Sorcier noir", 3, "Ténèbres", "", "reduce:Ténèbres,1@Rassemblement ; defAura:1", "R"),
  // --- objets
  obj("L'épée d'or", "Forgée par les elfes", 2, "Arme", "", "attStr:2 ; attKw:celebre", "E", { uni: true, req: "Légendaire" }),
  obj("Le bâton-aigle", "L'héritage de Jadilyna", 2, "Artefact", "", "attKw:genie ; attIcon:ruse", "R", { uni: true }),
  obj("Léviathan", "L'épée de Razzia", 2, "Arme", "", "attStr:3", "R", { uni: true }),
  obj("Broches de Shimy", "Percevoir les auras", 1, "Bijou", "", "attKw:discret", "U"),
  obj("La Pierre de Jovénia", "Elle a tout changé", 3, "Artefact", "", "attNoStand", "E", { uni: true }),
  // --- événements
  ev("Le sort de Jovénia", "Retour en enfance", 3, "Magie", "evBounce:5", "R"),
  ev("Ensemble, on est Légendaires", "La devise", 2, "Légendaire", "evBuffTrait:Légendaire,2", "U"),
  ev("Résurrection", "Kalandre veille", 2, "Magie", "evRevive", "R"),
  ev("Cri du jaguar", "Le clan répond", 1, "Jaguarian", "evStandAll:Jaguarian", "U"),
  ev("Fusion élémentaire", "Terre, eau, feu", 1, "Elfe", "evBuff:2", "C"),
  ev("Malédiction", "La magie noire", 3, "Ténèbres", "evKill:4", "R"),
];

export const starters = [
  { id: "leg-gryf", name: "Gryfenfer et les Jaguarians", leader: "legendaires-gryfenfer-7", like: ["Jaguarian", "Monslave"], avoid: ["Ténèbres", "Dynaméis", "Elfe"], excl: ["legendaires-shimy-4"], desc: "Gryfenfer à 7, le clan des Jaguarians et une version de Shimy qu'on ne trouve que dans ce deck." },
  { id: "leg-danael", name: "Les Légendaires", leader: "legendaires-danael-7", like: ["Légendaire", "Faucon d'Argent", "Larbos", "Orchidia"], avoid: ["Ténèbres", "Dynaméis"], desc: "Danaël, Jadina, Razzia et les Faucons d'Argent : ensemble, on est Légendaires." },
  { id: "leg-shimy", name: "Shimy et les elfes", leader: "legendaires-shimy-7", like: ["Elfe", "Elfe élémentaire"], avoid: ["Ténèbres", "Jaguarian"], desc: "Shimy à 7 et les elfes élémentaires : se fondre dans les éléments." },
  { id: "leg-darkhell", name: "Darkhell et les ténèbres", leader: "legendaires-darkhell-7", like: ["Ténèbres", "Sorcier", "Dynaméis", "Galinas"], avoid: ["Légendaire"], desc: "Darkhell, Anathos, Kalandre et les Dynaméis : malédictions et monstres." },
];
