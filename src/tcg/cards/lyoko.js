import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "lyoko", name: "Code Lyoko", short: "Lyoko", color: "#3fd0ff", color2: "#0b3a63", icon: "cpu", motif: "grid",
  desc: "Les Lyoko-guerriers se virtualisent pour combattre XANA. Un guerrier dévirtualisé n'est pas mort : il revient sur Terre.",
  passive: "famEscape:Lyoko@Dévirtualisation ; iconAura:Lyoko,combat@Guerriers virtuels",
};

// L'ordre compte pour les identifiants : deux versions de même nom et même coût prennent -2 dans l'ordre du fichier
// (Aelita Hopper 7 : « Fille de Franz Hopper » = lyoko-aelita-hopper-7, « L'ange de Lyoko » = lyoko-aelita-hopper-7-2).
// Cartes retirées ou remplacées (Aelita Stones, Franz Hopper 7…) : voir REPLACED et RETIRED dans cards/index.js (les sauvegardes suivent).
export const cards = [
  // --- les Lyoko-guerriers
  ch("Jérémie Belpois", "Génie de l'informatique", 3, 2, "RI", "Élève|Génie|Kadic", "genie", "actStand:Lyoko@Lancement des scanners", "R"),
  ch("Jérémie Belpois", "Opérateur du supercalculateur", 6, 3, "RI", "Élève|Génie|Kadic", "genie|celebre", "enterSearch:Lyoko@Programme de virtualisation ; actBuff:Lyoko,2@Mise à jour", "E"),
  ch("Aelita Hopper", "Fille de Franz Hopper", 7, 6, "CRI", "Lyoko|Élève|Kadic", "celebre", "enterStand:Lyoko@Création virtuelle ; winPower:ruse,1@Code : Lyoko", "L", { key: "lyoko-aelita" }),
  ch("Aelita Hopper", "L'elfe de Lyoko", 4, 3, "RI", "Lyoko|Élève|Kadic", "", "actStand:Lyoko@La Création ; winDraw:ruse,1@Elle sent la tour activée", "R", { key: "lyoko-aelita" }),
  ch("Aelita Hopper", "La Lyoko-guerrière", 5, 4, "CRI", "Lyoko|Élève|Kadic", "", "atkKneel:3@Champ d'énergie ; winRecall:ruse@Les fragments de mémoire", "E", { key: "lyoko-aelita" }),
  ch("Ulrich Stern", "Samouraï", 4, 4, "C", "Lyoko|Élève|Guerrier|Kadic", "duel", "winStand:combat@Super Sprint", "R"),
  ch("Ulrich Stern", "Triplicata", 6, 5, "CI", "Lyoko|Élève|Guerrier|Kadic", "duel|intimidation", "ifAlone:2@Triplicata", "E"),
  ch("Yumi Ishiyama", "Geisha guerrière", 3, 3, "CR", "Lyoko|Élève|Guerrier|Kadic", "", "atkKneel:2@L'éventail lancé", "U"),
  ch("Yumi Ishiyama", "L'aînée du groupe", 5, 4, "CR", "Lyoko|Élève|Guerrier|Kadic", "discret", "actMinus:2@Télékinésie", "R"),
  ch("Odd Della Robbia", "Chat virtuel", 3, 3, "CR", "Lyoko|Élève|Kadic", "discret", "winDiscard:ruse,1@Flèches laser", "U"),
  ch("Odd Della Robbia", "Rigolo de service", 5, 4, "CRI", "Lyoko|Élève|Kadic", "discret", "ifBehind:2@Pressentiment", "R"),
  ch("William Dunbar", "Cinquième guerrier", 4, 4, "C", "Lyoko|Élève|Guerrier|Kadic", "", "loseStand@Super Fumée", "U"),
  ch("William Dunbar", "Sous l'emprise de XANA", 6, 6, "CR", "XANA|Guerrier", "intimidation", "winKill:combat,2@Épée de XANA", "E"),
  ch("Franz Hopper", "Créateur de Lyoko", 5, 3, "RI", "Génie|Adulte", "genie", "actDraw:1@Journal de Franz Hopper ; income:1", "R"),
  ch("Sissi Delmas", "Fille du principal", 2, 1, "I", "Élève|Kadic", "", "enterDiscard:1@Commérages", "U"),
  ch("Jim Moralès", "Prof de sport", 3, 3, "C", "Adulte|Kadic", "", "ifDef:2@J'préfère pas en parler", "C"),
  ch("Jean-Pierre Delmas", "Principal de Kadic", 4, 3, "I", "Adulte|Kadic", "", "income:1 ; reserve:1", "U"),
  ch("Hervé et Nicolas", "Acolytes de Sissi", 1, 1, "R", "Élève|Kadic", "", "", "C"),
  ch("Kiwi", "Le chien d'Odd", 1, 1, "R", "Animal|Kadic", "discret", "", "C"),
  // --- XANA et ses monstres
  ch("XANA", "Intelligence artificielle", 7, 6, "CRI", "XANA", "discret|intimidation", "enterPutPlay:Monstre,4@Il active une tour ; winDiscard:*,1@Multi-agent", "L"),
  ch("La Méduse", "Scyphozoa", 5, 4, "RI", "XANA|Monstre", "discret", "winDiscard:ruse,2@Vol de mémoire", "R"),
  ch("Mégatank", "Sphère blindée", 5, 5, "C", "XANA|Monstre", "intimidation", "", "U", { uni: false }),
  ch("Tarentule", "Tireuse d'élite", 4, 4, "C", "XANA|Monstre", "", "atkTerror:2@Tir de barrage", "C", { uni: false }),
  ch("Krabe", "Monstre de XANA", 3, 3, "C", "XANA|Monstre", "", "", "C", { uni: false }),
  ch("Blok", "Monstre de XANA", 2, 2, "CR", "XANA|Monstre", "", "", "C", { uni: false }),
  ch("Frôlion", "Essaim volant", 2, 1, "C", "XANA|Monstre", "discret", "", "C", { uni: false }),
  ch("Kankrelat", "Petit monstre", 1, 1, "C", "XANA|Monstre", "", "sacSave:XANA@Chair à canon", "C", { uni: false }),
  // --- au sommet de leurs pouvoirs (coût 7)
  ch("Jérémie Belpois", "Retour vers le passé", 7, 4, "RI", "Élève|Génie|Kadic", "genie", "enterRevive:6@Retour vers le passé ; actStandAll:Lyoko@Le supercalculateur", "L"),
  ch("Ulrich Stern", "Le samouraï de Lyoko", 7, 7, "CR", "Lyoko|Élève|Guerrier|Kadic", "duel", "noKneel:combat@Super sprint ; claim:1@Impact", "L"),
  // --- lieux
  loc("L'Usine", "Usine désaffectée", 2, "Lyoko", "", "reduce:Lyoko,1@Ascenseur", "U"),
  loc("Le Supercalculateur", "Au cœur de l'usine", 1, "Lyoko", "limite", "income:1", "C"),
  loc("Collège Kadic", "Pensionnat", 2, "Kadic", "", "reserve:1 ; domi:1", "C"),
  loc("L'Ermitage", "Maison de Franz Hopper", 2, "Kadic", "", "actDraw:1@Indices cachés", "U"),
  loc("Le Secteur 5", "Carthage", 3, "Lyoko|XANA", "", "atkAura:*,1@Au cœur de Lyoko", "R"),
  // --- objets
  obj("Overboard", "Planche volante", 2, "Véhicule", "", "attStand", "U", { req: "Lyoko" }),
  obj("Overbike", "Moto d'Ulrich", 2, "Véhicule", "", "attStr:2", "C", { req: "Lyoko" }),
  obj("Overwing", "Scooter volant", 1, "Véhicule", "", "attKw:discret", "C", { req: "Lyoko" }),
  obj("Skidbladnir", "Le sous-marin", 3, "Véhicule", "", "attStr:1 ; attSave", "R", { req: "Lyoko", uni: true }),
  // --- événements
  ev("Retour vers le passé", "Tout recommencer", 2, "Lyoko", "evRevive", "R"),
  ev("Tour activée", "Le halo rouge", 1, "XANA", "evKneel:3", "U"),
  ev("Désactivation de la tour", "Code : Lyoko", 0, "Lyoko", "evWinDraw:ruse,1", "C"),
  ev("Dévirtualisation", "Retour au scanner", 1, "Lyoko", "evSave:Lyoko", "U"),
  ev("Champ de Force", "L'attaque d'Aelita", 1, "Lyoko", "evZap:2,4,Aelita Hopper", "R"),
  // --- plus de 7, d'élèves et de monstres
  ch("Aelita Hopper", "L'ange de Lyoko", 7, 6, "CRI", "Lyoko|Élève|Kadic", "", "enterKill:4@Les champs d'énergie ; selfGuard@Les ailes angéliques", "L", { key: "lyoko-aelita" }),
  ch("Odd Della Robbia", "Le chat aux neuf vies", 7, 6, "CRI", "Lyoko|Élève|Kadic", "discret", "atkTerror:3@Les flèches laser ; escape@Neuf vies", "L"),
  ch("Yumi Ishiyama", "La télékinésie", 7, 6, "CR", "Lyoko|Élève|Guerrier|Kadic", "", "enterKneelAll:3@Télékinésie ; defStand@Le bouclier d'éventails", "L"),
  ch("William Dunbar", "Le chevalier de XANA", 7, 7, "CR", "XANA|Guerrier", "intimidation", "atkBuff:XANA,1@Il mène l'assaut ; dieReturn@XANA le reprogramme", "L"),
  ch("Le Kolosse", "Le monstre géant de la Mer numérique", 7, 8, "C", "XANA|Monstre", "intimidation", "winRaze:combat@Il écrase le Skidbladnir", "L"),
  ch("Hiroki Ishiyama", "Le petit frère de Yumi", 1, 1, "I", "Kadic|Élève", "", "domi:1@Il espionne Yumi", "C"),
  ch("Milly et Tamiya", "Le journal du collège", 1, 1, "R", "Kadic|Élève", "", "enterDraw:1@Le scoop de la semaine", "C"),
  ch("Suzanne Hertz", "La prof de sciences", 2, 1, "RI", "Kadic|Adulte", "", "enterSearch:Génie@Le cours de physique", "C"),
  ch("Rosa", "La cuisinière de la cantine", 1, 1, "I", "Kadic|Adulte", "", "enterGold:1@Le gratin du jeudi", "C"),
  // les ninjas de Tyron (Code Lyoko Évolution) : des humains reliés à son supercalculateur, pas des programmes de XANA.
  // Ils surgissent du sol (Embuscade) et leurs encodeurs immobilisent ; peu de points de vie (force 1).
  ch("Ninjas de Tyron", "Les gardiens du Cortex", 2, 1, "CR", "Ninja|Tyron", "embuscade:2", "enterFreeze:2@Les encodeurs", "U", { uni: false }),
  ch("Rampant", "Le monstre du Secteur 5", 2, 2, "C", "XANA|Monstre", "", "ifWith:Monstre,1@L'invasion", "C", { uni: false }),
  ch("Mante", "Le monstre de la banquise", 3, 3, "CR", "XANA|Monstre", "", "atkKneel:2@La charge de la mante", "C", { uni: false }),
  ch("Kongre", "Le requin de la Mer numérique", 4, 5, "C", "XANA|Monstre", "", "ifAtk:1@Il chasse dans la Mer numérique", "U", { uni: false }),
  loc("La Mer numérique", "Au-delà de Lyoko", 2, "Lyoko", "", "reserve:1 ; domi:1", "U"),
  ev("Le code Lyoko", "La tour est désactivée", 1, "Code", "evCancel", "R"),
  ev("Matérialisation", "Transfert, scanner, virtualisation !", 1, "Code", "evPutPlay:Lyoko,4", "R"),
];

export const starters = [
  { id: "lyoko-guerriers", name: "Les Lyoko-guerriers", leader: "lyoko-aelita-hopper-7", like: ["Lyoko", "Kadic", "Élève"], avoid: ["XANA"], desc: "Aelita et ses amis : se virtualiser, désactiver les tours et ne jamais vraiment mourir." },
  { id: "lyoko-xana", name: "XANA", leader: "lyoko-xana-7", like: ["XANA", "Monstre", "Ninja"], avoid: ["Élève", "Lyoko", "Adulte"], desc: "XANA lance ses monstres depuis une tour activée, les ninjas de Tyron surgissent du sol : agenouiller, faire défausser, submerger." },
];
