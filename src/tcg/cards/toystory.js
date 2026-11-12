import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "toystory", name: "Toy Story", short: "Toy Story", color: "#52b6ff", color2: "#173a6b", icon: "toy", motif: "clouds",
  desc: "Une bande de jouets solidaires : beaucoup de petits personnages pas chers qui s'entraident.",
  passive: "fEnterGold:Jouet@Vers l'infini et au-delà",
};

export const cards = [
  ch("Woody", "Shérif", 4, 3, "RI", "Jouet|Cow-boy", "", "actStand:Jouet@Pour les copains", "R"),
  ch("Woody", "Le jouet préféré d'Andy", 7, 6, "CRI", "Jouet|Cow-boy", "celebre", "aura:Jouet,1@Shérif de la chambre", "L"),
  ch("Buzz l'Éclair", "Space Ranger", 4, 4, "CI", "Jouet|Space Ranger", "", "winStand:combat@Rayon laser", "R"),
  ch("Buzz l'Éclair", "Commandant de la Garde", 6, 6, "CI", "Jouet|Space Ranger", "intimidation", "noKneel:combat@Vers l'infini et au-delà", "E"),
  ch("Jessie", "La cow-girl", 3, 3, "CR", "Jouet|Cow-boy", "", "ifName:Woody,1@Yodel", "U"),
  ch("Pile-Poil", "Le cheval", 2, 2, "C", "Jouet|Cow-boy|Animal", "", "sacSave:Cow-boy@Fidèle destrier", "U"),
  ch("Rex", "Le dinosaure", 3, 3, "C", "Jouet|Dinosaure", "", "ifDef:1", "C"),
  ch("Bayonne", "Le cochon tirelire", 2, 1, "I", "Jouet", "", "income:1", "U"),
  ch("M. et Mme Patate", "Pièces détachées", 3, 3, "CR", "Jouet", "", "enterDraw:1@Démontables", "U"),
  ch("Zig Zag", "Le chien à ressort", 2, 2, "R", "Jouet|Animal", "", "ifWith:Jouet,1", "C"),
  ch("Les Aliens", "Petits hommes verts", 1, 1, "I", "Jouet|Alien", "", "pack:Alien,1@Le Grappin !", "C", { uni: false }),
  ch("La Bergère", "Bo Peep", 4, 3, "CR", "Jouet", "discret", "winDraw:ruse,1@Jouet perdu", "R"),
  ch("Le Sergent", "Chef des soldats verts", 3, 2, "CR", "Jouet|Soldat", "", "aura:Soldat,1@Mission de reconnaissance", "U"),
  ch("Soldats verts", "Patrouille", 1, 1, "C", "Jouet|Soldat", "", "", "C", { uni: false }),
  ch("Ken", "Le dandy", 3, 2, "I", "Jouet", "", "domi:2@Garde-robe", "U"),
  ch("Barbie", "Pleine d'assurance", 3, 2, "RI", "Jouet", "", "ifName:Ken,1@Coup de foudre", "U"),
  ch("Duke Caboom", "Cascadeur", 3, 3, "C", "Jouet", "", "ifAlone:2@Cascade", "U"),
  ch("Fourchette", "Je suis une poubelle", 1, 1, "R", "Jouet", "", "escape@Direction la poubelle", "C"),
  ch("Andy", "Le propriétaire", 2, 1, "I", "Humain", "", "enterDraw:1@Mes jouets préférés", "U"),
  ch("Lotso", "L'ours qui sent la fraise", 5, 4, "RI", "Jouet|Méchant", "", "enterKneel:4@Tyran de Sunnyside", "R"),
  ch("Lotso", "Maître de Sunnyside", 6, 5, "RI", "Jouet|Méchant", "intimidation", "pack:Méchant,1@Le règne de Lotso", "E"),
  ch("Gros Bébé", "Le bras droit", 4, 4, "C", "Jouet|Méchant", "", "", "U"),
  ch("Papy Pépite", "Le prospecteur", 4, 3, "RI", "Jouet|Méchant", "", "winSteal:ruse,1@Dans sa boîte", "U"),
  ch("Gabby Gabby", "La poupée", 4, 3, "RI", "Jouet|Méchant", "", "enterKneel:3@Les pantins", "U"),
  ch("Empereur Zurg", "Ennemi juré", 6, 6, "C", "Jouet|Méchant", "intimidation", "winKill:combat,3@Canon à ions", "E"),
  ch("Sid Phillips", "Le voisin", 5, 4, "C", "Humain|Méchant", "intimidation", "enterKill:2@Expériences", "R"),
  ch("Al", "Le collectionneur", 3, 1, "I", "Humain|Méchant", "", "income:1", "U"),
  // --- les héros et les méchants au sommet (coût 7)
  ch("Buzz l'Éclair", "Vers l'infini et au-delà", 7, 6, "CI", "Jouet|Space Ranger", "celebre", "atkKneel:4@Laser ; winStandAll:*@Tomber avec style", "L"),
  ch("Lotso", "Le patron de Sunnyside", 7, 5, "RI", "Jouet|Méchant", "intimidation", "oppTax:1@La salle des Chenilles ; winFreeze:influence@La boîte à punitions", "L"),
  // --- lieux
  loc("La chambre d'Andy", "Notre maison", 2, "Maison", "", "reduce:Jouet,1@Rangement", "U"),
  loc("Pizza Planet", "Restaurant", 1, "Ville", "limite", "income:1", "C"),
  loc("La garderie Sunnyside", "Paradis des jouets", 3, "Garderie", "", "defAura:1", "U"),
  loc("Le magasin d'Al", "Al's Toy Barn", 2, "Magasin", "", "actDraw:1@Les rayons", "U"),
  // --- objets
  obj("Chapeau de shérif", "Le vrai", 1, "Chapeau", "", "attKw:celebre", "R", { req: "Cow-boy", uni: true }),
  obj("Ailes de Space Ranger", "Ça vole !", 2, "Équipement", "", "attStr:2", "U", { req: "Space Ranger" }),
  obj("Talkie-walkie", "Sergent à l'écoute", 1, "Gadget", "", "attIcon:ruse", "C"),
  obj("Un prénom sous la botte", "ANDY", 1, "Souvenir", "", "attSave", "U"),
  // --- événements
  ev("Vers l'infini !", "Et au-delà", 1, "Élan", "evBuff:2", "C"),
  ev("Mission de reconnaissance", "Les soldats verts", 2, "Mission", "evDraw:2", "U"),
  ev("Le Grappin", "Ooooh !", 2, "Alien", "evBounce:3", "U"),
  ev("Évasion de la garderie", "Tous dehors", 2, "Évasion", "evStandAll:Jouet", "R"),
  ev("Mode jouet", "On ne bouge plus !", 1, "Secret", "evSave:Jouet", "U"),
  ch("Woody", "Le shérif libre", 7, 6, "CRI", "Jouet|Cow-boy", "", "enterRevive:5@Personne n'est laissé derrière ; guard:Jouet@Il protège Fourchette", "L"),
  ch("Buzz l'Éclair", "Le mode espagnol", 7, 6, "CR", "Jouet|Space Ranger", "", "winStand:*@Buzz Lightyear à la rescousse ! ; ifAtk:2@Le danseur de flamenco", "L"),
];

export const starters = [
  { id: "ts-chambre", name: "La chambre d'Andy", leader: "toystory-woody-7", like: ["Jouet", "Cow-boy", "Space Ranger"], avoid: ["Méchant"], desc: "Woody, Buzz et toute la bande : nombreux, solidaires et toujours prêts à se relever." },
  { id: "ts-sunnyside", name: "Les méchants de Sunnyside", leader: "toystory-empereur-zurg-6", like: ["Méchant"], avoid: ["Cow-boy"], desc: "Lotso, Zurg, Sid et Papy Pépite : la terreur de la chambre." },
];
