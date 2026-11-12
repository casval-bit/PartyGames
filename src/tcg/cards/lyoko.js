import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "lyoko", name: "Code Lyoko", short: "Lyoko", color: "#3fd0ff", color2: "#0b3a63", icon: "cpu", motif: "grid",
  desc: "Les Lyoko-guerriers se virtualisent pour combattre XANA. Un guerrier dévirtualisé n'est pas mort : il revient sur Terre.",
  passive: "famEscape:Lyoko@Dévirtualisation ; iconAura:Lyoko,combat@Guerriers virtuels",
};

export const cards = [
  // --- les Lyoko-guerriers
  ch("Jérémie Belpois", "Génie de l'informatique", 3, 2, "RI", "Élève|Génie|Kadic", "genie", "actStand:Lyoko@Lancement des scanners", "R"),
  ch("Jérémie Belpois", "Opérateur du supercalculateur", 6, 3, "RI", "Élève|Génie|Kadic", "genie|celebre", "enterSearch:Lyoko@Programme de virtualisation ; actBuff:Lyoko,2@Mise à jour", "E"),
  ch("Aelita Stones", "Gardienne de Lyoko", 4, 3, "RI", "Lyoko|Élève|Kadic", "", "winDraw:ruse,1@Désactivation de la tour", "R", { key: "lyoko-aelita" }),
  ch("Aelita Hopper", "Fille de Franz Hopper", 7, 6, "CRI", "Lyoko|Élève|Kadic", "celebre", "enterStand:Lyoko@Création virtuelle ; winPower:ruse,1@Code : Lyoko", "L", { key: "lyoko-aelita" }),
  ch("Ulrich Stern", "Samouraï", 4, 4, "C", "Lyoko|Élève|Guerrier|Kadic", "duel", "winStand:combat@Super Sprint", "R"),
  ch("Ulrich Stern", "Triplicata", 6, 5, "CI", "Lyoko|Élève|Guerrier|Kadic", "duel|intimidation", "ifAlone:2@Triplicata", "E"),
  ch("Yumi Ishiyama", "Geisha guerrière", 3, 3, "CR", "Lyoko|Élève|Guerrier|Kadic", "", "atkKneel:2@Télékinésie", "U"),
  ch("Yumi Ishiyama", "L'aînée du groupe", 5, 4, "CR", "Lyoko|Élève|Guerrier|Kadic", "discret", "actMinus:2@Télékinésie", "R"),
  ch("Odd Della Robbia", "Chat virtuel", 3, 3, "CR", "Lyoko|Élève|Kadic", "discret", "winDiscard:ruse,1@Flèches laser", "U"),
  ch("Odd Della Robbia", "Rigolo de service", 5, 4, "CRI", "Lyoko|Élève|Kadic", "discret", "ifBehind:2@Pressentiment", "R"),
  ch("William Dunbar", "Cinquième guerrier", 4, 4, "C", "Lyoko|Élève|Guerrier|Kadic", "", "winStand:combat@Super Fumée", "U"),
  ch("William Dunbar", "Sous l'emprise de XANA", 6, 6, "CR", "XANA|Guerrier", "intimidation", "winKill:combat,2@Épée de XANA", "E"),
  ch("Franz Hopper", "Créateur de Lyoko", 5, 3, "RI", "Génie|Adulte", "genie", "actDraw:1@Journal de Franz Hopper ; income:1", "R"),
  ch("Sissi Delmas", "Fille du principal", 2, 1, "I", "Élève|Kadic", "", "enterDiscard:1@Commérages", "U"),
  ch("Jim Moralès", "Prof de sport", 3, 3, "C", "Adulte|Kadic", "", "ifDef:2@J'préfère pas en parler", "C"),
  ch("Jean-Pierre Delmas", "Principal de Kadic", 4, 3, "I", "Adulte|Kadic", "", "income:1 ; reserve:1", "U"),
  ch("Hervé et Nicolas", "Acolytes de Sissi", 1, 1, "R", "Élève|Kadic", "", "", "C"),
  ch("Kiwi", "Le chien d'Odd", 1, 1, "R", "Animal|Kadic", "discret", "", "C"),
  // --- XANA et ses monstres
  ch("XANA", "Intelligence artificielle", 7, 6, "CRI", "XANA", "discret|intimidation", "atkKneel:3@Spectre polymorphe ; winDiscard:*,1@Multi-agent", "L"),
  ch("La Méduse", "Scyphozoa", 5, 4, "RI", "XANA|Monstre", "discret", "winDiscard:ruse,2@Vol de mémoire", "R"),
  ch("Mégatank", "Sphère blindée", 5, 5, "C", "XANA|Monstre", "intimidation", "", "U", { uni: false }),
  ch("Tarentule", "Tireuse d'élite", 4, 4, "C", "XANA|Monstre", "", "ifAtk:1", "C", { uni: false }),
  ch("Krabe", "Monstre de XANA", 3, 3, "C", "XANA|Monstre", "", "", "C", { uni: false }),
  ch("Blok", "Monstre de XANA", 2, 2, "CR", "XANA|Monstre", "", "", "C", { uni: false }),
  ch("Frôlion", "Essaim volant", 2, 1, "C", "XANA|Monstre", "discret", "", "C", { uni: false }),
  ch("Kankrelat", "Petit monstre", 1, 1, "C", "XANA|Monstre", "", "sacSave:XANA@Chair à canon", "C", { uni: false }),
  // --- au sommet de leurs pouvoirs (coût 7)
  ch("Jérémie Belpois", "Retour vers le passé", 7, 4, "RI", "Élève|Génie|Kadic", "genie", "enterRevive:6@Retour vers le passé ; actStandAll:Lyoko@Le supercalculateur", "L"),
  ch("Ulrich Stern", "Le samouraï de Lyoko", 7, 7, "CR", "Lyoko|Élève|Guerrier|Kadic", "duel", "noKneel:combat@Super sprint ; winKill:combat,3@Impact", "L"),
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
  ev("Spectre polymorphe", "Attaque de XANA", 3, "XANA", "evKill:4", "R"),
];

export const starters = [
  { id: "lyoko-guerriers", name: "Les Lyoko-guerriers", leader: "lyoko-aelita-hopper-7", like: ["Lyoko", "Kadic", "Élève"], avoid: ["XANA"], desc: "Aelita et ses amis : se virtualiser, désactiver les tours et ne jamais vraiment mourir." },
  { id: "lyoko-xana", name: "XANA", leader: "lyoko-xana-7", like: ["XANA", "Monstre"], avoid: ["Élève"], desc: "L'intelligence artificielle et ses monstres : agenouiller, faire défausser, submerger." },
];
