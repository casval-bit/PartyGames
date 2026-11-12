import { ch, loc, obj, ev } from "./build.js";

// Le Monde de Narnia : les enfants Pevensie et les Narniens d'Aslan, l'équipage du Passeur d'Aurore,
// et l'armée de la Sorcière Blanche avec les Telmarins de Miraz et les Calormènes.
// Traits : Pevensie, Narnien, Fils d'Adam / Fille d'Ève, Passeur d'Aurore, Sorcière (ses serviteurs), Telmarin, Calormène.
export const meta = {
  id: "narnia", name: "Le Monde de Narnia", short: "Narnia", color: "#e2a93b", color2: "#16243a", icon: "sun", motif: "narnia",
  desc: "Derrière l'armoire, un pays d'éternel hiver attend son lion. Les rois et reines de Narnia, les Narniens d'Aslan, le Passeur d'Aurore, et l'armée de la Sorcière Blanche.",
  passive: "fWinStand:combat@Aslan est en marche",
};

export const cards = [
  // --- Aslan et les Pevensie
  ch("Aslan", "Le Grand Lion", 7, 7, "CI", "Narnien|Lion", "celebre", "aura:Narnien,1@Aslan est en marche ; atkTerror:3@Le rugissement", "L"),
  ch("Aslan", "La Magie plus profonde", 7, 6, "CRI", "Narnien|Lion", "", "dieReturn@La Table de Pierre se brise ; enterRevive:6@Il souffle sur les statues", "L"),
  ch("Peter Pevensie", "Le Grand Roi", 6, 5, "CI", "Pevensie|Fils d'Adam|Roi", "celebre", "winStand:combat@Pour Narnia et pour Aslan !", "E"),
  ch("Peter Pevensie", "Le frère aîné", 3, 3, "C", "Pevensie|Fils d'Adam", "", "guard:Pevensie@Le grand frère", "U"),
  ch("Susan Pevensie", "La Douce", 4, 3, "CR", "Pevensie|Fille d'Ève|Reine", "", "atkKneel:3@L'arc de Susan", "R"),
  ch("Edmund Pevensie", "Le Juste", 4, 4, "CR", "Pevensie|Fils d'Adam|Roi|Passeur d'Aurore", "", "winKill:combat,3@Il brise la baguette de la Sorcière", "R"),
  ch("Edmund Pevensie", "Le traître aux loukoums", 2, 2, "R", "Pevensie|Fils d'Adam", "", "winDiscard:ruse,1@Il raconte tout à la Sorcière", "C"),
  ch("Lucy Pevensie", "La Vaillante", 3, 2, "RI", "Pevensie|Fille d'Ève|Reine|Passeur d'Aurore", "", "enterRevive:3@Le cordial de feu-fleur", "E"),
  ch("Lucy Pevensie", "La petite fille de l'armoire", 1, 1, "I", "Pevensie|Fille d'Ève", "", "enterDraw:1@Derrière les manteaux", "C"),
  ch("Caspian", "Le roi navigateur", 5, 5, "CI", "Telmarin|Roi|Passeur d'Aurore", "", "winStand:combat@Le Passeur d'Aurore", "E"),
  ch("Ripitchip", "La souris vaillante", 2, 2, "C", "Narnien|Souris|Passeur d'Aurore", "duel", "ifAlone:2@L'honneur d'une souris", "R"),
  ch("Eustache Scrubb", "Changé en dragon", 5, 6, "C", "Fils d'Adam|Dragon|Passeur d'Aurore", "", "ifAtk:1@Le souffle du dragon", "U"),
  ch("Drinian", "Le capitaine du Passeur d'Aurore", 3, 3, "CI", "Telmarin|Passeur d'Aurore", "", "actStand:Passeur d'Aurore@Tout le monde sur le pont", "U"),
  ch("M. Tumnus", "Le faune", 2, 1, "RI", "Narnien|Faune", "", "enterDraw:1@Le thé chez M. Tumnus", "U"),
  ch("M. Castor", "Le castor bavard", 2, 2, "C", "Narnien|Castor", "", "enterGold:1@Le barrage", "C"),
  ch("Mme Castor", "La machine à coudre", 1, 1, "I", "Narnien|Castor", "", "domi:1@Le repas chaud", "C"),
  ch("Trompillon", "Le nain sceptique", 3, 3, "C", "Narnien|Nain", "", "ifDef:1@Il finit par y croire", "C"),
  ch("Oreius", "Le général centaure", 5, 5, "C", "Narnien|Centaure", "", "atkBuff:Narnien,1@Le général d'Aslan", "R"),
  ch("Glenstorm", "Le centaure prophète", 4, 4, "CR", "Narnien|Centaure", "", "firstDraw:1@Il lit les étoiles", "U"),
  ch("Le Père Noël", "Les cadeaux", 3, 2, "I", "Narnien|Noël", "", "enterSearch:*@Les cadeaux du Père Noël", "R"),
  ch("Digory Kirke", "Le vieux professeur", 2, 1, "RI", "Fils d'Adam", "", "enterDraw:1@La logique !", "C"),
  ch("Centaure de Narnia", "L'armée d'Aslan", 3, 3, "C", "Narnien|Centaure", "", "ifAtk:1@La charge", "C", { uni: false }),
  ch("Faune de Narnia", "La danse des faunes", 1, 1, "C", "Narnien|Faune", "", "ifWith:Narnien,1@Pour Aslan", "C", { uni: false }),

  // --- la Sorcière Blanche, Miraz et les Calormènes
  ch("Jadis", "La Sorcière Blanche", 7, 5, "RI", "Sorcière|Reine", "intimidation", "enterFreeze:5@Toujours l'hiver et jamais Noël ; winKill:combat,3@Changé en statue", "L"),
  ch("Jadis", "L'impératrice de Charn", 5, 4, "RI", "Sorcière|Reine", "", "domi:2@Charn ; enterKill:3@Le Mot Déplorable", "E"),
  ch("Maugrim", "Le chef de la police secrète", 4, 5, "C", "Sorcière|Loup", "", "winKill:combat,2@Les loups de la Sorcière", "R"),
  ch("Ginarrbrik", "Le nain de la Sorcière", 2, 2, "CR", "Sorcière|Nain", "", "atkKneel:2@Le fouet", "U"),
  ch("Miraz", "L'usurpateur", 5, 5, "CI", "Telmarin|Roi", "", "domi:2@Le roi usurpateur", "R"),
  ch("Rabadash", "Le prince ridicule", 4, 4, "C", "Calormène|Prince", "", "dieDraw:1@Changé en âne", "U"),
  ch("La Dame à la Robe Verte", "La reine du Monde Souterrain", 5, 4, "RI", "Sorcière|Reine", "", "enterKneel:4@L'enchantement ; winDiscard:ruse,1@Le serpent vert", "R"),
  ch("Nikabrik", "Le nain noir", 3, 3, "C", "Sorcière|Nain", "", "winKill:combat,1@Il veut ramener la Sorcière", "U"),
  ch("La Harpie", "La vieille sorcière", 2, 2, "R", "Sorcière", "", "enterRevive:2@L'incantation", "U"),
  ch("Glozelle", "Le général telmarin", 4, 4, "C", "Telmarin", "", "ifAtk:1@L'assaut du Tertre", "C"),
  ch("Sopespian", "Le seigneur telmarin", 3, 2, "RI", "Telmarin", "", "domi:1@Le conseil de Miraz", "C"),
  ch("Le Tisroc", "Le souverain de Calormen", 5, 3, "RI", "Calormène|Roi", "", "domi:2@Puisse-t-il vivre éternellement", "U"),
  ch("Shift", "Le singe rusé", 3, 2, "RI", "Calormène", "", "winDiscard:ruse,1@Le faux Aslan", "U"),
  ch("Minotaure de la Sorcière", "L'armée de Jadis", 4, 5, "C", "Sorcière|Minotaure", "", "ifAtk:1@La charge", "U", { uni: false }),
  ch("Loup de la Sorcière", "La meute de Maugrim", 2, 2, "C", "Sorcière|Loup", "", "ifWith:Loup,1@La meute", "C", { uni: false }),
  ch("Soldat telmarin", "L'armée de Miraz", 2, 2, "C", "Telmarin", "", "ifDef:1@Les arbalètes", "C", { uni: false }),
  ch("Guerrier calormène", "Pour Tash", 2, 2, "C", "Calormène", "", "ifAtk:1@Le cimeterre", "C", { uni: false }),

  // --- lieux
  loc("Le réverbère", "Au milieu de la forêt enneigée", 1, "Forêt", "limite", "income:1", "C"),
  loc("L'armoire magique", "La porte de Narnia", 2, "Passage", "", "reduce:*,1@Derrière les manteaux ; reserve:1", "R"),
  loc("Cair Paravel", "Le château des quatre trônes", 2, "Château", "", "reserve:1 ; domi:1", "U"),
  loc("La Table de Pierre", "La Magie plus profonde", 3, "Lieu sacré", "", "domi:2 ; reserve:1", "R"),
  loc("Le château de la Sorcière", "La cour des statues", 2, "Château", "", "reduce:Sorcière,1@Les serviteurs de Jadis ; reserve:1", "U"),

  // --- objets
  obj("Rhindon", "L'épée de Peter", 2, "Arme|Cadeau", "", "attStr:2 ; attKw:celebre", "R"),
  obj("Le cordial de Lucy", "Une goutte de feu-fleur", 1, "Cadeau", "", "attSave", "U"),
  obj("La baguette de la Sorcière", "Elle change en pierre", 2, "Magie", "", "attNoStand", "U"),
  obj("Les loukoums ensorcelés", "Encore un, Votre Majesté", 1, "Magie", "", "attNoAttack", "U"),

  // --- événements
  ev("Le cor de la reine Susan", "Il appelle l'aide", 1, "Cadeau", "evPutPlay:Narnien,4", "R"),
  ev("Le rugissement d'Aslan", "Aslan est en marche", 2, "Aslan", "evBuffTrait:Narnien,2", "U"),
  ev("Le printemps revient", "La fin de l'éternel hiver", 2, "Aslan", "evStandAll:Narnien", "R"),
  ev("La Magie plus profonde", "Avant l'aube des temps", 2, "Magie", "evRevive", "R"),
  ev("Changé en statue", "La baguette de pierre", 2, "Sorcière", "evKill:3", "U"),
  ev("Toujours l'hiver et jamais Noël", "Le règne de la Sorcière", 1, "Sorcière", "evKneel:3", "U"),
];

export const starters = [
  { id: "narnia-rois", name: "Les rois et reines de Narnia", leader: "narnia-aslan-7", like: ["Pevensie", "Narnien"], avoid: ["Sorcière", "Telmarin", "Calormène"], excl: ["narnia-peter-pevensie-6"], desc: "Aslan, Peter, Susan, Edmund et Lucy, les castors, Tumnus et les centaures : Aslan est en marche, les gentils se relèvent après une victoire." },
  { id: "narnia-passeur", name: "Le Passeur d'Aurore", leader: "narnia-caspian-5", like: ["Passeur d'Aurore", "Narnien", "Telmarin"], avoid: ["Sorcière", "Calormène"], desc: "Caspian, Ripitchip, Edmund, Lucy et Eustache changé en dragon : en route vers le bout du monde." },
  { id: "narnia-sorciere", name: "La Sorcière Blanche", leader: "narnia-jadis-7", like: ["Sorcière", "Telmarin", "Calormène"], avoid: ["Narnien", "Pevensie", "Passeur d'Aurore"], desc: "Jadis et ses loups, ses minotaures, Miraz et les Calormènes : toujours l'hiver et jamais Noël." },
];
