import { ch, loc, obj, ev } from "./build.js";

// Scooby-Doo : uniquement les gentils. La bande de Mystère et Cie (plusieurs époques), la famille Doo, Crystal Cove
// (Mystères associés) et les alliés des séries et des films. La bande ne tue jamais : elle piège, démasque et file à toutes jambes.
// Traits : Mystère et Cie, Chien, Famille Doo, Froussard, Blake, Crystal Cove, Police, Hex Girls, Musicien, Héros, Magie,
// Treize fantômes, Extraterrestre, Coolsville.
export const meta = {
  id: "scooby", name: "Scooby-Doo", short: "Scooby-Doo", color: "#9bd23c", color2: "#2b1846", icon: "dog", motif: "haunted",
  desc: "Mystère et Cie : une bande d'ados, un dogue froussard et leur Mystery Machine. Ici, que des gentils : ils piègent et démasquent les faux monstres, sans jamais faire de mal à personne.",
  passive: "fWinKneel:ruse@Le piège se referme",
};

export const cards = [
  // --- Mystère et Cie
  ch("Scooby-Doo", "Où es-tu ?", 7, 6, "CRI", "Mystère et Cie|Chien|Famille Doo|Froussard", "celebre", "escape@Cours, Scooby ! ; aura:Mystère et Cie,1@Scooby-Dooby-Doo !", "L"),
  ch("Scooby-Doo", "Le dogue froussard", 4, 3, "RI", "Mystère et Cie|Chien|Famille Doo|Froussard", "discret", "escape@Cours, Scooby !", "R"),
  ch("Scooby-Doo", "Le chiot détective", 2, 2, "R", "Chien|Famille Doo", "", "ifWith:Mystère et Cie,1@Les petits détectives", "U"),
  ch("Sammy Rogers", "Le meilleur ami de Scooby", 4, 3, "CRI", "Mystère et Cie|Froussard|Coolsville", "", "ifWith:Chien,2@Inséparables ; enterDraw:1@Le frigo est plein", "E", { st: "sc-mystere" }),
  ch("Sammy Rogers", "Le froussard héroïque", 5, 4, "CR", "Mystère et Cie|Froussard", "", "escape@Sauve qui peut ! ; winStand:*@Le courage d'un Scooby Snack", "R"),
  ch("Sammy Rogers", "Le ventre sur pattes", 3, 2, "RI", "Mystère et Cie|Froussard", "", "actDraw:1@Le sandwich géant", "U"),
  ch("Fred Jones", "Le chef de la bande", 6, 6, "CI", "Mystère et Cie|Coolsville", "celebre", "winKneel:ruse@Piège à monstre ; ifDef:1", "E"),
  ch("Fred Jones", "Le roi des pièges", 4, 3, "CR", "Mystère et Cie", "genie", "enterKneel:3@Le filet tombe", "R"),
  ch("Fred Jones", "Le petit Fred", 2, 2, "C", "Mystère et Cie", "", "ifAtk:1@Tous aux pièges !", "C"),
  ch("Daphné Blake", "L'héritière des Blake", 5, 4, "RI", "Mystère et Cie|Blake", "", "enterGold:2@La fortune des Blake", "R"),
  ch("Daphné Blake", "La ceinture noire", 4, 4, "CR", "Mystère et Cie|Blake", "", "ifAlone:2@Daphné se débrouille seule", "R"),
  ch("Daphné Blake", "Toujours dans les ennuis", 2, 1, "RI", "Mystère et Cie|Blake", "discret", "loseStand@Encore enlevée !", "U"),
  ch("Véra Dinkley", "La tête pensante", 5, 4, "RI", "Mystère et Cie", "genie", "winDraw:ruse,1@Un indice ! ; winDiscard:ruse,1@L'énigme est résolue", "E"),
  ch("Véra Dinkley", "Où sont mes lunettes ?", 3, 2, "R", "Mystère et Cie", "genie", "enterDraw:1@Les voilà !", "R"),
  ch("Véra Dinkley", "La petite Véra", 1, 1, "R", "Mystère et Cie", "", "", "C"),
  // --- la famille Doo et les autres chiens
  ch("Scrappy-Doo", "Le neveu intrépide", 5, 4, "CI", "Chien|Famille Doo|Mystère et Cie", "", "ifAtk:2@Laissez-moi les attraper !", "E"),
  ch("Scrappy-Doo", "Le petit dur", 2, 2, "C", "Chien|Famille Doo", "", "ifAtk:1@Puissance chiot", "U"),
  ch("Scooby-Dum", "Le cousin des marais", 2, 1, "C", "Chien|Famille Doo", "", "ifWith:Famille Doo,1@En famille", "U"),
  ch("Yabba-Doo", "Le frère de l'Ouest", 4, 3, "CI", "Chien|Famille Doo|Police", "", "winKneel:combat@Au lasso !", "R"),
  ch("Scooby-Dee", "La cousine star de cinéma", 2, 1, "I", "Chien|Famille Doo", "", "domi:2@Star de cinéma", "C"),
  ch("Les parents de Scooby", "Mumsy-Doo et Dada-Doo", 3, 2, "I", "Chien|Famille Doo", "", "enterSearch:Famille Doo@Réunion de famille", "U"),
  ch("Dusty", "L'adjoint du shérif", 2, 2, "C", "Police", "", "ifWith:Famille Doo,1@Avec Yabba-Doo", "C"),
  ch("Nova", "L'amoureuse de Scooby", 2, 1, "RI", "Chien|Crystal Cove", "", "ifWith:Chien,1@Coup de foudre", "U"),
  ch("Nova", "La messagère des Anunnaki", 5, 4, "RI", "Chien|Crystal Cove|Magie", "discret", "enterSearch:*@Elle guide la bande ; loseStand", "E"),
  ch("Amber", "La chienne venue d'ailleurs", 2, 2, "C", "Chien|Extraterrestre", "", "ifWith:Chien,1@Le cœur de Scooby", "C"),
  ch("Dynomutt", "Le chien-robot", 3, 3, "C", "Chien|Héros", "", "defStand@Gadgets télescopiques", "U"),
  // --- Crystal Cove (Mystères associés)
  ch("Bronson Stone", "Le shérif de Crystal Cove", 6, 6, "CI", "Crystal Cove|Police", "intimidation", "winKneel:combat@Vous êtes en état d'arrestation ! ; ifDef:1", "E"),
  ch("Bronson Stone", "Le shérif grognon", 3, 3, "C", "Crystal Cove|Police", "", "ifDef:1@Encore ces gamins…", "U"),
  ch("Angel Dynamite", "La DJ de K-Goul", 3, 2, "RI", "Crystal Cove|Musicien", "", "enterDraw:1@En direct sur K-Goul", "R"),
  ch("Janet Nettles", "La maire de Crystal Cove", 3, 2, "I", "Crystal Cove", "", "income:1", "U"),
  ch("Les Dinkley", "Les parents de Véra", 2, 1, "RI", "Crystal Cove", "", "enterSearch:Mystère et Cie@Le musée de l'étrange", "C"),
  ch("Les Blake", "Les parents de Daphné", 3, 2, "I", "Crystal Cove|Blake", "", "enterGold:2@Milliardaires", "U"),
  ch("Delilah Blake", "La sœur militaire", 4, 4, "C", "Crystal Cove|Blake", "", "ifDef:1@Garde-à-vous", "U"),
  ch("Marcie Fleach", "Eau-de-boudin", 3, 3, "CR", "Crystal Cove|Mystère et Cie", "", "winDraw:ruse,1@La rivale de Véra", "U"),
  ch("Vincent Van Ghoul", "Le sorcier des Treize Fantômes", 6, 5, "RI", "Magie|Treize fantômes|Crystal Cove", "genie", "actKneel:4@Sortilège ; reserve:1", "E"),
  ch("Flim-Flam", "Le petit escroc", 2, 1, "RI", "Mystère et Cie|Treize fantômes", "discret", "enterGold:1@Une affaire en or", "U"),
  ch("Thorn", "La chanteuse des Hex Girls", 3, 2, "I", "Hex Girls|Musicien|Crystal Cove", "", "aura:Hex Girls,1@Hex Girls !", "R"),
  ch("Dusk", "La batteuse des Hex Girls", 2, 2, "C", "Hex Girls|Musicien", "", "ifWith:Hex Girls,1@En rythme", "C"),
  ch("Luna", "La claviériste des Hex Girls", 2, 2, "RI", "Hex Girls|Musicien", "", "ifWith:Hex Girls,1@Synthé gothique", "C"),
  // --- les amis des films
  ch("Beau Neville", "Le jardinier infiltré", 3, 3, "CR", "Police", "embuscade:3", "ifDef:1@Couverture", "U"),
  ch("Crystal", "L'extraterrestre photographe", 3, 2, "RI", "Extraterrestre", "discret", "enterDraw:1@Le cliché parfait", "U"),
  ch("Del Chillman", "Le cryptozoologue", 2, 2, "R", "Coolsville", "", "winDraw:ruse,1@Chasseur de monstres", "C"),
  ch("Le Faucon bleu", "Le super-héros", 5, 4, "CI", "Héros", "celebre", "ifWith:Héros,1@La Falcon Force", "R"),
  ch("Dee Dee Sykes", "La pilote", 2, 2, "R", "Héros", "", "enterStand:*@Décollage immédiat", "C"),
  ch("Capitaine Caverne", "Le héros des cavernes", 4, 3, "C", "Héros", "intimidation", "", "U"),
  ch("Jenkins", "Le majordome des Blake", 2, 1, "I", "Blake", "", "actGold:1@À votre service", "C"),
  ch("Madelyn Dinkley", "La petite sœur de Véra", 2, 2, "R", "Magie", "genie", "", "C"),
  ch("Patrick Wisely", "Le conservateur du musée", 2, 1, "RI", "Coolsville", "", "enterRecall:*@Les archives du musée", "U"),
  ch("Les habitants de Coolsville", "Les voisins de la bande", 2, 2, "C", "Coolsville", "", "", "C", { uni: false }),
  // --- au sommet (coût 7)
  ch("Fred Jones", "Le maître des pièges", 7, 6, "CI", "Mystère et Cie|Coolsville", "celebre", "enterFreeze:6@Le piège parfait ; winBounce:ruse,5@Démasqué !", "L"),
  ch("Vincent Van Ghoul", "Le Grand Sorcier", 7, 5, "RI", "Magie|Treize fantômes|Crystal Cove", "genie", "actSilence:7@Sortilège d'entrave ; reserve:1", "L"),
  // --- lieux
  loc("Coolsville", "La ville de la bande", 1, "Coolsville", "limite", "income:1", "C"),
  loc("Crystal Cove", "La ville la plus hantée du monde", 2, "Crystal Cove", "", "reserve:1 ; domi:1", "U"),
  loc("La Mystery Machine", "La camionnette de la bande", 2, "Véhicule", "", "actStand:Mystère et Cie@En route, la bande !", "U"),
  loc("Le manoir hanté", "Une nuit d'enquête", 3, "Manoir", "", "reduce:*,1@Le passage secret ; reserve:1", "R"),
  loc("Le musée de l'étrange", "Le musée des Dinkley", 3, "Crystal Cove", "", "aura:Crystal Cove,1@Pièces de collection", "R"),
  // --- objets
  obj("Les Scooby Snacks", "Le courage en biscuit", 1, "Nourriture", "", "attStr:2", "C", { req: "Chien" }),
  obj("Les lunettes de Véra", "Sans elles, elle ne voit rien", 1, "Accessoire", "", "attIcon:ruse", "C"),
  obj("Le foulard de Fred", "Toujours impeccable", 1, "Accessoire", "", "attKw:celebre", "U"),
  obj("Le sandwich géant", "Le chef-d'œuvre de Sammy", 1, "Nourriture", "", "attSave", "U"),
  obj("La boule de cristal", "Le conseil de Vincent Van Ghoul", 2, "Magie", "", "attWinDraw:1", "R", { uni: true }),
  // --- événements
  ev("Séparons-nous, la bande !", "Le plan de Fred", 2, "Enquête", "evStandAll:Mystère et Cie", "R"),
  ev("Un indice !", "La piste se précise", 1, "Enquête", "evDraw:1", "C"),
  ev("Démasqué !", "Le monstre n'était qu'un costume", 2, "Enquête", "evBounce:4", "R"),
  ev("Le piège se referme", "Une trappe bien placée", 1, "Piège", "evKneel:3", "R"),
  ev("Course-poursuite", "Sur un air de musique pop", 2, "Fuite", "evSave:Mystère et Cie", "U"),
  ev("Un Scooby Snack ?", "Il ferait n'importe quoi pour ça", 2, "Nourriture", "evBuffTrait:Chien,2", "U"),
  ev("Ces sales gosses !", "Le coupable enrage", 1, "Enquête", "evClaim:1", "R"),
];

export const starters = [
  { id: "sc-mystere", name: "Mystère et Cie", leader: "scooby-scooby-doo-7", maxChars: 30, like: ["Mystère et Cie", "Coolsville", "Héros"], avoid: ["Police", "Hex Girls"], excl: ["scooby-sammy-rogers-4"], desc: "Scooby, Sammy, Fred, Daphné et Véra au grand complet, avec une version de Sammy qu'on ne trouve que dans ce deck : on se sépare, on fouille, on démasque." },
  { id: "sc-doo", name: "La famille Doo", leader: "scooby-scrappy-doo-5", like: ["Chien", "Famille Doo", "Héros"], avoid: ["Hex Girls", "Treize fantômes"], desc: "Scrappy, Scooby-Dum, Yabba-Doo, Nova, Dynomutt et le Faucon bleu : tous les chiens de l'histoire, et quelques héros, pour une meute très attachante." },
  { id: "sc-cove", name: "Crystal Cove", leader: "scooby-bronson-stone-6", maxChars: 30, like: ["Crystal Cove", "Police", "Hex Girls", "Magie"], avoid: ["Famille Doo"], desc: "Le shérif Stone, Angel Dynamite, la maire Nettles, les Hex Girls et Vincent Van Ghoul : toute la ville la plus hantée du monde vient en aide à la bande." },
];
