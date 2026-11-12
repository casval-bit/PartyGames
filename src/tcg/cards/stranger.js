import { ch, loc, obj, ev } from "./build.js";

// Stranger Things : la bande de Hawkins, les grands qui s'en mêlent, le laboratoire et le Monde à l'envers.
// Traits : Bande (Mike, Dustin, Lucas, Will, Max, Onze…), Ado, Adulte, Hawkins, Laboratoire, Psychique,
// Monde à l'envers, Créature, Hellfire, Scoops Ahoy, Russe, Police.
export const meta = {
  id: "stranger", name: "Stranger Things", short: "Stranger Things", color: "#e0303c", color2: "#120d1c", icon: "bulb", motif: "upside",
  desc: "Hawkins, Indiana : une bande de gamins à vélo, une fille aux pouvoirs étranges, et le Monde à l'envers qui guette sous la ville.",
  passive: "fLoseDraw:*,1@Les amis ne mentent pas",
};

export const cards = [
  // --- Onze et la bande
  ch("Onze", "Pouvoirs déchaînés", 7, 6, "CRI", "Psychique|Bande|Hawkins", "celebre", "immune ; atkKneel:5@Télékinésie", "L"),
  ch("Onze", "La fugitive du laboratoire", 4, 3, "CR", "Psychique|Laboratoire", "discret", "actKneel:3@Regard fixe", "R"),
  ch("Mike Wheeler", "Le chef de la bande", 4, 3, "CI", "Bande|Hawkins|Hellfire", "", "aura:Bande,1@Le Club", "R"),
  ch("Mike Wheeler", "Le paladin", 2, 2, "I", "Bande|Hawkins", "", "ifWith:Psychique,1@Pour El", "C"),
  ch("Dustin Henderson", "Le génie de la bande", 3, 2, "RI", "Bande|Hawkins|Hellfire", "genie", "actDraw:1@Les dents qui poussent", "R"),
  ch("Dustin Henderson", "Le roi du Cerebro", 4, 3, "RI", "Bande|Hawkins|Hellfire", "genie", "enterSearch:Bande@Le Cerebro ; actDraw:1@Allô, Suzie ?", "E", { st: "st-bande" }),
  ch("Lucas Sinclair", "Le lance-pierre", 3, 3, "C", "Bande|Hawkins", "", "ifAtk:1@Lance-pierre", "U"),
  ch("Lucas Sinclair", "Le capitaine de basket", 5, 4, "CI", "Bande|Hawkins", "", "winKneel:combat@Contre-attaque", "R"),
  ch("Will Byers", "Le garçon disparu", 2, 1, "R", "Bande|Hawkins", "discret", "escape@Disparu", "U"),
  ch("Will Byers", "Le sixième sens", 4, 3, "RI", "Bande|Hawkins|Psychique", "", "enterSearch:Bande@Il le sent dans sa nuque", "R"),
  ch("Max Mayfield", "MadMax", 3, 3, "CR", "Bande|Hawkins", "discret", "loseStand@Échapper à Vecna", "R"),
  ch("Erica Sinclair", "La petite sœur de Lucas", 1, 1, "R", "Hawkins", "discret", "", "C"),
  // --- les grands
  ch("Joyce Byers", "La mère courage", 4, 3, "RI", "Adulte|Hawkins", "", "guard:Bande@Les guirlandes", "R"),
  ch("Jim Hopper", "Le shérif de Hawkins", 5, 5, "CI", "Adulte|Hawkins|Police", "intimidation", "winKneel:combat@Interrogatoire musclé", "R"),
  ch("Jim Hopper", "Le père adoptif", 6, 6, "CI", "Adulte|Hawkins|Police", "celebre|intimidation", "guard:Hawkins@Pas dans ma ville ; ifDef:1", "E"),
  ch("Steve Harrington", "Le roi du lycée", 3, 3, "CI", "Ado|Hawkins", "", "", "C"),
  ch("Steve Harrington", "Le meilleur baby-sitter", 5, 5, "C", "Ado|Hawkins|Scoops Ahoy", "", "guard:Bande@Baby-sitter ; ifDef:1", "E"),
  ch("Nancy Wheeler", "La journaliste", 3, 2, "RI", "Ado|Hawkins", "", "winDiscard:ruse,1@Enquête", "U"),
  ch("Nancy Wheeler", "La tireuse", 5, 5, "CR", "Ado|Hawkins", "", "winKill:combat,3@Le fusil à pompe", "R"),
  ch("Jonathan Byers", "Le photographe", 3, 2, "R", "Ado|Hawkins", "discret", "enterDraw:1@La pellicule", "U"),
  ch("Robin Buckley", "La reine des codes", 2, 1, "RI", "Ado|Scoops Ahoy", "genie", "ifWith:Scoops Ahoy,1@La Scoops Troop", "U"),
  ch("Eddie Munson", "Le maître du jeu", 4, 4, "CR", "Ado|Hellfire", "", "sacSave:Bande@Le dernier concert", "R"),
  ch("Billy Hargrove", "Le frère de Max", 4, 4, "C", "Ado|Hawkins", "intimidation", "", "U"),
  ch("Billy Hargrove", "Le possédé", 6, 5, "CR", "Monde à l'envers|Possédé", "intimidation", "atkKneel:3@L'emprise", "E"),
  ch("Murray Bauman", "Le complotiste", 2, 1, "RI", "Adulte", "genie", "winDiscard:ruse,1@Théories", "U"),
  ch("Bob Newby", "Le super-héros", 2, 1, "I", "Adulte|Hawkins", "", "dieDraw:2@Bob, le super-héros", "U"),
  ch("Barbara Holland", "Barb", 1, 1, "I", "Ado|Hawkins", "", "dieDraw:1@Justice pour Barb", "C"),
  ch("Karen Wheeler", "La maman de Mike", 2, 1, "I", "Adulte|Hawkins", "", "income:1", "U"),
  ch("Argyle", "Le livreur de pizza", 2, 2, "C", "Ado", "", "enterGold:1@Livraison express", "C"),
  // --- le laboratoire
  ch("Kali", "Huit", 4, 3, "RI", "Psychique|Laboratoire", "discret", "atkKneel:3@Illusions", "R"),
  ch("Dr Martin Brenner", "Papa", 5, 3, "RI", "Laboratoire|Adulte", "", "enterKneel:3@Retour au labo ; reduce:Laboratoire,1@Expériences", "E"),
  ch("Dr Sam Owens", "Le directeur du labo", 3, 2, "I", "Laboratoire|Adulte", "", "actStand:*@Couvrir l'incident", "U"),
  ch("Agents du laboratoire", "Les hommes en noir", 2, 2, "C", "Laboratoire", "", "", "C", { uni: false }),
  ch("Un", "Le surveillant", 4, 3, "CR", "Laboratoire|Psychique", "discret", "enterKill:2@001", "R", { key: "stranger-vecna" }),
  // --- le Monde à l'envers
  ch("Vecna", "Le maître des cauchemars", 7, 6, "RI", "Monde à l'envers|Psychique", "celebre", "enterKill:3@La malédiction ; winDiscard:ruse,1@Cauchemars", "L", { key: "stranger-vecna" }),
  ch("Le Flagelleur mental", "L'ombre sur Hawkins", 7, 6, "CRI", "Monde à l'envers|Créature", "intimidation", "aura:Monde à l'envers,1@Esprit de ruche", "E"),
  ch("Le Démogorgon", "Le prédateur", 5, 5, "C", "Monde à l'envers|Créature", "intimidation", "winKill:combat,3@Il emporte sa proie", "R"),
  ch("Démochiens", "La meute de l'autre monde", 3, 2, "C", "Monde à l'envers|Créature", "", "ifWith:Créature,1@La meute", "U", { uni: false }),
  ch("Chauves-souris démoniaques", "La nuée", 2, 2, "C", "Monde à l'envers|Créature", "", "ifAtk:1", "C", { uni: false }),
  // --- les Russes
  ch("Alexei", "Le scientifique russe", 2, 1, "R", "Russe", "", "enterDraw:1@Slurpee à la cerise", "C"),
  ch("Dmitri Antonov", "Enzo, le garde", 3, 3, "C", "Russe", "", "ifDef:1", "C"),
  ch("Soldats russes", "La base secrète", 3, 3, "C", "Russe", "", "", "C", { uni: false }),
  // --- au sommet (coût 7)
  ch("Jim Hopper", "Le shérif revenu de Russie", 7, 7, "C", "Adulte|Hawkins|Police", "intimidation", "selfGuard@Increvable ; winKill:combat,3@L'épée du Kamtchatka", "L"),
  ch("Will Byers", "Le Sorcier", 7, 5, "RI", "Bande|Hawkins|Psychique", "", "enterKill:4@Will le Sage ; immune@Le lien avec la ruche", "L"),
  // --- lieux
  loc("Hawkins", "Petite ville de l'Indiana", 1, "Hawkins", "limite", "income:1", "C"),
  loc("Le Laboratoire de Hawkins", "Le portail", 3, "Laboratoire", "", "reduce:*,1@Expériences ; reserve:1", "R"),
  loc("Le Monde à l'envers", "La dimension parallèle", 3, "Monde à l'envers", "", "aura:Créature,1@Spores", "R"),
  loc("Le sous-sol des Wheeler", "Le QG de la bande", 2, "Bande", "", "actStand:Bande@La campagne du samedi", "U"),
  loc("Starcourt Mall", "Le centre commercial", 2, "Hawkins", "", "reserve:1 ; domi:1", "U"),
  // --- objets
  obj("Talkies-walkies", "Tu me reçois ?", 1, "Radio", "", "attIcon:influence", "C"),
  obj("La batte cloutée", "L'arme de Steve", 2, "Arme", "", "attStr:2", "U", { req: "Ado" }),
  obj("Les guirlandes de Noël", "Le message de Will", 1, "Lumière", "", "attSave", "U"),
  obj("Le Cerebro", "La radio géante", 2, "Radio", "", "attWinDraw:1", "R", { uni: true }),
  // --- événements
  ev("Saignement de nez", "Trop de pouvoir", 1, "Pouvoir", "evKneel:3", "R"),
  ev("Les amis ne mentent pas", "Une promesse", 2, "Amitié", "evStandAll:Bande", "R"),
  ev("Fermer le portail", "La mission", 3, "Portail", "evKill:4", "R"),
  ev("Partie de jeu de rôle", "Le samedi soir", 1, "Jeu", "evDraw:1", "C"),
  ev("Le bal d'hiver", "Une soirée au collège", 2, "Fête", "evBuffTrait:Bande,1", "U"),
  ev("Les spores", "L'air du Monde à l'envers", 2, "Monde à l'envers", "evMinus:2", "U"),
  ev("Sauvé de justesse", "Retour du Monde à l'envers", 2, "Portail", "evSave:Bande", "R"),
  ch("Onze", "Elle ferme le portail", 7, 6, "CRI", "Psychique|Bande|Hawkins", "", "enterKill:5@Le portail se referme ; loseStand@Les amis ne mentent pas", "L"),
];

export const starters = [
  { id: "st-bande", name: "La bande de Hawkins", leader: "stranger-onze-7", like: ["Bande", "Hawkins"], avoid: ["Monde à l'envers", "Laboratoire", "Russe"], excl: ["stranger-dustin-henderson-4"], desc: "Onze, Mike, Dustin, Lucas, Will et Max, avec une version de Dustin qu'on ne trouve que dans ce deck : on ne laisse jamais tomber un ami." },
  { id: "st-grands", name: "Les grands s'en mêlent", leader: "stranger-jim-hopper-6", like: ["Ado", "Adulte", "Police", "Scoops Ahoy"], avoid: ["Monde à l'envers", "Laboratoire", "Russe"], desc: "Hopper, Joyce, Steve, Nancy, Robin et Eddie : les grands montent au front pour protéger les petits." },
  { id: "st-envers", name: "Le Monde à l'envers", leader: "stranger-vecna-7", like: ["Monde à l'envers", "Créature", "Laboratoire", "Psychique"], avoid: ["Bande", "Ado"], desc: "Vecna, le Flagelleur mental, le Démogorgon et les expériences du laboratoire : les cauchemars de Hawkins." },
];
