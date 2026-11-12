import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "onepiece", name: "One Piece", short: "One Piece", color: "#ff6b4a", color2: "#6b1a10", icon: "anchor", motif: "waves",
  desc: "Pirates, Marine et Empereurs des mers : des combats spectaculaires et beaucoup de butin.",
  passive: "fWinGold:combat,1@Butin",
};

export const cards = [
  ch("Monkey D. Luffy", "Chapeau de paille", 4, 4, "CI", "Pirate|Capitaine|Fruit du démon|Chapeau de paille", "", "winStand:combat@Gomu Gomu no Pistol", "R"),
  ch("Monkey D. Luffy", "Gear Fifth", 7, 6, "CRI", "Pirate|Capitaine|Fruit du démon|Chapeau de paille", "celebre|intimidation", "aura:Chapeau de paille,1@Futur roi des pirates", "L"),
  ch("Roronoa Zoro", "Chasseur de pirates", 4, 4, "C", "Pirate|Bretteur|Chapeau de paille", "duel", "ifAlone:1@Santoryu", "R"),
  ch("Roronoa Zoro", "Ashura", 6, 6, "CI", "Pirate|Bretteur|Chapeau de paille", "duel|intimidation", "winKill:combat,3@Ashura", "E"),
  ch("Nami", "Navigatrice", 3, 2, "RI", "Pirate|Chapeau de paille", "", "income:1 ; winSteal:ruse,1@Chatte voleuse", "U"),
  ch("Usopp", "Roi des snipers", 2, 1, "CR", "Pirate|Chapeau de paille", "", "actMinus:1@Kabuto", "C"),
  ch("Sanji", "Jambe noire", 4, 4, "CR", "Pirate|Chapeau de paille", "", "ifWith:Chapeau de paille,1@Cuisinier de l'équipage", "U"),
  ch("Tony Tony Chopper", "Médecin de bord", 2, 1, "R", "Pirate|Chapeau de paille|Fruit du démon", "", "actStand:Pirate@Rumble Ball", "U"),
  ch("Nico Robin", "Archéologue", 4, 3, "RI", "Pirate|Chapeau de paille|Fruit du démon", "genie", "actMinus:2@Hana Hana", "R"),
  ch("Franky", "Cyborg charpentier", 4, 4, "CI", "Pirate|Chapeau de paille", "", "domi:2@Suuuper !", "U"),
  ch("Brook", "Soul King", 3, 2, "CI", "Pirate|Chapeau de paille|Fruit du démon|Musicien", "", "escape@Yomi Yomi", "R"),
  ch("Jinbe", "Paladin des mers", 5, 5, "CI", "Pirate|Chapeau de paille|Homme-poisson", "", "guard:Chapeau de paille@Karaté des hommes-poissons", "R"),
  ch("Portgas D. Ace", "Poing ardent", 5, 5, "C", "Pirate|Fruit du démon", "intimidation", "dieDraw:2@Merci de m'avoir aimé", "E"),
  ch("Shanks", "Le Roux", 7, 6, "CI", "Pirate|Capitaine|Empereur", "celebre", "enterKneel:4@Haki des rois", "L"),
  ch("Edward Newgate", "Barbe Blanche", 6, 5, "CI", "Pirate|Capitaine|Empereur|Fruit du démon", "intimidation", "pack:Pirate,1@Mes fils", "E"),
  ch("Marshall D. Teach", "Barbe Noire", 6, 5, "CRI", "Pirate|Capitaine|Empereur|Fruit du démon", "", "winKill:combat,3@Les ténèbres", "E"),
  ch("Trafalgar Law", "Chirurgien de la mort", 5, 4, "CR", "Pirate|Capitaine|Corsaire|Fruit du démon", "discret", "atkKneel:3@Room", "R"),
  ch("Boa Hancock", "Impératrice pirate", 5, 4, "CI", "Pirate|Corsaire|Fruit du démon", "", "enterKneel:3@Mero Mero", "R"),
  ch("Dracule Mihawk", "Œil de faucon", 6, 6, "C", "Pirate|Bretteur|Corsaire", "duel|celebre", "noKneel:combat@Meilleur sabreur du monde", "E"),
  ch("Buggy", "Le Clown", 2, 1, "RI", "Pirate|Capitaine|Fruit du démon", "", "escape@Bara Bara", "C"),
  ch("Smoker", "Chasseur blanc", 4, 4, "CR", "Marine|Fruit du démon", "", "winKneel:combat@Logia de fumée", "U"),
  ch("Monkey D. Garp", "Héros de la Marine", 5, 5, "C", "Marine", "intimidation", "", "R"),
  ch("Akainu", "Amiral", 6, 6, "C", "Marine|Fruit du démon", "intimidation", "winKill:combat,4@Poing de magma", "R"),
  ch("Coby", "Recrue de la Marine", 1, 1, "C", "Marine", "", "", "C"),
  ch("Matelots", "Équipage", 1, 1, "C", "Pirate", "", "", "C", { uni: false }),
  // --- les puissances du Nouveau Monde (coût 7)
  ch("Monkey D. Luffy", "Gear Fourth", 7, 7, "CI", "Pirate|Capitaine|Fruit du démon|Chapeau de paille", "", "winBounce:combat,5@Kong Gun ; atkTerror:3@Haki des rois", "L"),
  ch("Roronoa Zoro", "Le Roi des Enfers", 7, 7, "C", "Pirate|Bretteur|Chapeau de paille", "duel", "ifAlone:2@Asura ; noKneel:combat@Santoryu", "L"),
  ch("Sanji", "Ifrit Jambe", 7, 6, "CR", "Pirate|Chapeau de paille", "discret", "actStandAll:Chapeau de paille@Le festin du cuisinier ; ifAtk:1@Ifrit Jambe", "L"),
  ch("Edward Newgate", "L'homme le plus fort du monde", 7, 7, "CI", "Pirate|Capitaine|Empereur|Fruit du démon", "intimidation", "enterKneelAll:2@Le fruit du Tremblement ; selfGuard@Le colosse", "L"),
  ch("Marshall D. Teach", "L'homme aux deux fruits", 7, 6, "CR", "Pirate|Capitaine|Empereur|Fruit du démon", "", "winPowerSteal:*,1@Kurouzu ; immune@Le fruit des Ténèbres", "L"),
  ch("Kaido", "La créature la plus forte du monde", 7, 7, "C", "Pirate|Capitaine|Empereur|Fruit du démon", "intimidation", "selfGuard@Impossible à tuer ; winKneel:combat@Raimei Hakke", "L"),
  // --- lieux
  loc("Le Thousand Sunny", "Navire des Chapeaux de paille", 1, "Navire", "limite", "income:1", "C"),
  loc("Le Vogue Merry", "Premier navire", 2, "Navire", "", "reduce:Pirate,1@Joyeux Merry", "U"),
  loc("Grand Line", "La route de tous les périls", 4, "Mer", "", "xtraCh:combat", "R"),
  loc("Marineford", "Quartier général de la Marine", 2, "Marine", "", "defAura:1", "U"),
  // --- objets
  obj("Fruit du démon", "Pouvoir maudit", 2, "Fruit", "", "attStr:2", "U"),
  obj("Chapeau de paille", "Le trésor de Luffy", 1, "Trésor", "", "attKw:celebre", "R", { req: "Pirate", uni: true }),
  obj("Wado Ichimonji", "Sabre légendaire", 1, "Arme", "", "attStr:2", "U", { req: "Bretteur", uni: true }),
  obj("Den Den Mushi", "Escargophone", 1, "Outil", "", "attIcon:ruse", "C"),
  obj("Menottes en granite marin", "Kairoseki", 2, "Marine", "", "attNeg:2", "U"),
  // --- événements
  ev("Gear Second", "Gomu Gomu no Jet", 1, "Technique", "evBuff:2", "C"),
  ev("Haki des rois", "Volonté du conquérant", 2, "Haki", "evKneel:3", "U"),
  ev("Tous ensemble !", "L'équipage au complet", 2, "Équipage", "evBuffTrait:Chapeau de paille,1", "U"),
  ev("Buster Call", "Ordre d'anéantissement", 4, "Marine", "evKillAll:2", "R"),
  ev("Pillage", "À l'abordage !", 0, "Pirate", "evSteal:2", "C"),
];

export const starters = [
  { id: "op-mugiwara", name: "L'équipage du Chapeau de paille", leader: "onepiece-monkey-d-luffy-7", like: ["Chapeau de paille", "Pirate"], avoid: ["Marine"], desc: "Luffy et son équipage : de l'élan, du butin et des amis qui se protègent." },
  { id: "op-empereurs", name: "Les Empereurs des mers", leader: "onepiece-shanks-7", like: ["Empereur", "Capitaine", "Corsaire", "Marine"], avoid: [], desc: "Shanks, Barbe Blanche, la Marine et les Corsaires : la force brute des grands de ce monde." },
];
