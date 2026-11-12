import { ch, loc, obj, ev } from "./build.js";

export const meta = {
  id: "bebop", name: "Cowboy Bebop", short: "Bebop", color: "#4ea8de", color2: "#1b1f3b", icon: "rocket", motif: "jazz",
  desc: "Chasseurs de primes fauchés, syndicats et jazz : chaque victoire rapporte des woolongs.",
  passive: "fWinGold:ruse,1@Prime",
};

export const cards = [
  ch("Spike Spiegel", "Chasseur de primes", 4, 4, "CR", "Chasseur de primes|Équipage du Bebop", "", "winStand:combat@Jeet Kune Do", "R"),
  ch("Spike Spiegel", "Le cowboy de l'espace", 7, 7, "CRI", "Chasseur de primes|Équipage du Bebop|Syndicat", "celebre|duel", "noKneel:combat@Whatever happens, happens", "L"),
  ch("Jet Black", "Le capitaine", 4, 4, "CI", "Chasseur de primes|Équipage du Bebop|Ancien flic", "", "guard:Équipage du Bebop@Le bras de métal", "R"),
  ch("Faye Valentine", "La joueuse", 3, 3, "RI", "Chasseur de primes|Équipage du Bebop", "", "winSteal:ruse,1@Dette de jeu", "R"),
  ch("Faye Valentine", "Femme fatale", 5, 4, "CRI", "Chasseur de primes|Équipage du Bebop", "discret", "enterKneel:4@Charme", "E"),
  ch("Ed", "La hackeuse", 2, 1, "R", "Équipage du Bebop|Hacker", "genie", "actDraw:1@Radical Edward", "R"),
  ch("Ein", "Le chien de données", 1, 1, "R", "Équipage du Bebop|Animal", "discret", "", "U"),
  ch("Vicious", "L'ange noir du syndicat", 6, 6, "C", "Syndicat|Dragon rouge", "intimidation|duel", "winKill:combat,3@Le katana", "E"),
  ch("Julia", "L'amour perdu", 4, 3, "RI", "Syndicat", "discret", "ifName:Spike Spiegel,2@Retrouvailles", "R"),
  ch("Annie", "La boutique", 2, 1, "I", "Informateur", "", "income:1", "U"),
  ch("Punch et Judy", "Big Shot", 2, 1, "I", "Télévision", "", "domDraw:1@Émission des primes", "C"),
  ch("Gren", "Le saxophoniste", 4, 4, "CR", "Mercenaire", "", "ifAlone:1@Blues de Titan", "U"),
  ch("Andy", "Le cow-boy", 3, 3, "C", "Chasseur de primes", "", "ifAtk:1@Yee-haw", "C"),
  ch("Mad Pierrot", "Tueur indestructible", 5, 5, "C", "Tueur", "intimidation", "immune", "R"),
  ch("Laughing Bull", "Le chaman", 3, 1, "RI", "Mystique", "", "actStand:*@Visions", "U"),
  ch("Lin", "Garde du syndicat", 2, 2, "C", "Syndicat|Dragon rouge", "", "ifName:Shin,1@Frères", "C"),
  ch("Shin", "Garde du syndicat", 2, 2, "C", "Syndicat|Dragon rouge", "", "ifName:Lin,1@Frères", "C"),
  ch("Doohan", "Le mécanicien", 2, 1, "R", "Mécanicien", "", "enterDraw:1@Réglages", "C"),
  ch("Bob", "L'informateur de l'ISSP", 2, 1, "RI", "Informateur|Police", "", "winDraw:ruse,1@Tuyau", "C"),
  ch("Les Anciens du syndicat", "Le conseil", 5, 2, "RI", "Syndicat|Dragon rouge", "", "aura:Syndicat,1@Ordres d'en haut", "U"),
  ch("Asimov Solensan", "Le dealer", 3, 3, "C", "Criminel", "", "", "C"),
  ch("Teddy Bomber", "Le poseur de bombes", 3, 2, "R", "Criminel", "", "actSacKill:3@Boum", "U"),
  ch("Rocco Bonnaro", "Le petit voleur", 1, 1, "R", "Criminel", "", "", "C"),
  ch("Hommes de main", "Syndicat du Dragon rouge", 2, 2, "C", "Syndicat|Dragon rouge", "", "", "C", { uni: false }),
  // --- les légendes (coût 7)
  ch("Vicious", "Le serpent du Dragon rouge", 7, 7, "CR", "Syndicat|Dragon rouge", "duel", "enterKill:4@La purge des Anciens ; atkTerror:3@Le serpent", "L"),
  ch("Jet Black", "Le Chien noir", 7, 6, "CI", "Chasseur de primes|Équipage du Bebop|Ancien flic", "", "actStandAll:Équipage du Bebop@Le capitaine du Bebop ; defWinPower:1@Le Chien noir ne lâche jamais", "L"),
  // --- lieux
  loc("Le Bebop", "Vaisseau de pêche reconverti", 1, "Vaisseau", "limite", "income:1", "C"),
  loc("Mars", "Ville portuaire", 2, "Planète", "", "reduce:*,1@Bas-fonds", "U"),
  loc("Le QG du Dragon rouge", "Le syndicat", 3, "Syndicat", "", "aura:Dragon rouge,1", "R"),
  loc("Le bar de Ganymède", "Jazz et whisky", 2, "Bar", "", "actDraw:1@Rumeurs de comptoir", "U"),
  // --- objets
  obj("Swordfish II", "Le chasseur de Spike", 2, "Vaisseau", "", "attStr:2", "R", { uni: true }),
  obj("Red Tail", "Le vaisseau de Faye", 1, "Vaisseau", "", "attKw:discret", "U"),
  obj("Hammerhead", "Le vaisseau de Jet", 2, "Vaisseau", "", "attStand", "U"),
  obj("Jericho 941", "Pistolet", 1, "Arme", "", "attStr:1", "C"),
  // --- événements
  ev("Session de jazz", "Improvisation", 1, "Musique", "evBuff:2", "C"),
  ev("Prime sur la tête", "Avis de recherche", 3, "Prime", "evKill:4", "R"),
  ev("Bœuf aux poivrons", "Sans bœuf", 0, "Repas", "evGold:2", "C"),
  ev("See you, space cowboy", "Pas cette fois", 1, "Destin", "evSave", "U"),
  ev("Fausse piste", "Le butin s'envole", 2, "Prime", "evDiscard:2", "U"),
];

export const starters = [
  { id: "bb-bebop", name: "L'équipage du Bebop", leader: "bebop-spike-spiegel-7", like: ["Équipage du Bebop", "Chasseur de primes", "Informateur"], avoid: ["Dragon rouge"], desc: "Spike, Jet, Faye, Ed et Ein : chaque prime encaissée paie le carburant." },
  { id: "bb-syndicat", name: "Le Dragon rouge", leader: "bebop-vicious-6", like: ["Syndicat", "Dragon rouge", "Criminel", "Tueur"], avoid: ["Équipage du Bebop"], desc: "Vicious et le syndicat : des tueurs, des ordres d'en haut et pas de pitié." },
];
