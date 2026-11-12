import { ch, loc, obj, ev } from "./build.js";

// Star Academy : les élèves des promos 2024-2025, 2025-2026 et 2026-2027 (prénoms tels qu'annoncés par l'émission).
// Ici, un personnage « tué » est « éliminé du château ».
export const meta = {
  id: "starac", name: "Star Academy", short: "Star Ac", color: "#ffcc33", color2: "#3b1066", icon: "mic", motif: "stage",
  desc: "Les élèves du château : le vote du public (la Domination) et le charisme (l'Influence) font les gagnants.",
  passive: "fDomDraw:1@Vote du public",
  killWord: "est éliminé du château",
};

const P24 = "Élève|Chanteur|Promo 2024", P25 = "Élève|Chanteur|Promo 2025", P26 = "Élève|Chanteur|Promo 2026";

export const cards = [
  // --- promo 2024-2025
  ch("Marine", "Élève, promo 2024", 3, 2, "RI", P24, "", "domPower:1@Chouchoute du public", "R", { key: "starac-marine" }),
  ch("Marine", "Gagnante de la promo 2024", 7, 6, "CRI", P24 + "|Finaliste|Gagnant", "celebre", "domPower:1@Le public a tranché ; winDraw:influence,1@Esprit de promo", "L", { key: "starac-marine" }),
  ch("Ebony", "Finaliste de la promo 2024", 6, 5, "RI", P24 + "|Finaliste", "celebre", "winDraw:influence,1@Vibrato", "E"),
  ch("Ulysse", "Promo 2024", 4, 3, "CI", P24, "", "winGold:influence,1@Guitare-voix", "R"),
  ch("Charles", "Promo 2024", 3, 2, "RI", P24, "", "winDraw:influence,1@Charisme", "U"),
  ch("Franck", "Promo 2024", 3, 3, "CI", P24, "", "ifWith:Promo 2024,1@Énergie de scène", "U"),
  ch("Marguerite", "Promo 2024", 3, 2, "RI", P24, "", "enterDraw:1@Coup de cœur", "U"),
  ch("Masséo", "Promo 2024", 3, 3, "C", P24, "", "ifAtk:1@Battle", "U"),
  ch("Maureen", "Promo 2024", 2, 2, "I", P24, "", "", "C"),
  ch("Maylis", "Promo 2024", 2, 1, "RI", P24, "", "loseDraw:1@Nommée mais pas abattue", "C"),
  ch("Julie", "Promo 2024", 2, 2, "R", P24, "", "", "C"),
  ch("Paul", "Promo 2024", 2, 2, "C", P24, "", "", "C"),
  ch("Emma", "Promo 2024", 2, 1, "I", P24, "", "domDraw:1@Applaudissements", "C"),
  ch("Thomas", "Promo 2024", 2, 2, "CR", P24, "", "", "C"),
  ch("Noah", "Promo 2024", 2, 2, "I", P24, "", "", "C", { key: "starac-noah-2024" }),
  ch("Maïa", "Promo 2024", 1, 1, "I", P24, "", "", "C"),
  // --- promo 2025-2026
  ch("Ambre", "Élève, promo 2025", 3, 2, "RI", P25, "", "domPower:1@Chouchoute du public", "R", { key: "starac-ambre" }),
  ch("Ambre", "Gagnante de la promo 2025", 7, 6, "CRI", P25 + "|Finaliste|Gagnant", "celebre", "domPower:1@Victoire au vote ; enterDraw:2@Le château en fête", "L", { key: "starac-ambre" }),
  ch("Léa", "Finaliste de la promo 2025", 6, 5, "CRI", P25 + "|Finaliste", "celebre", "ifFirst:1@Tête d'affiche", "E"),
  ch("Victor", "Promo 2025", 4, 3, "RI", P25, "", "winDraw:influence,1@Immunisé au premier prime", "R"),
  ch("Bastiaan", "Promo 2025", 3, 3, "CI", P25, "", "ifWith:Promo 2025,1@Acteur et chanteur", "U"),
  ch("Jeanne", "Promo 2025", 3, 2, "RI", P25, "", "enterDraw:1@Single sorti", "U"),
  ch("Anouk", "Promo 2025", 3, 2, "RI", P25, "", "domDraw:1@Venue de Belgique", "U"),
  ch("Léo", "Promo 2025", 3, 3, "C", P25, "", "", "U"),
  ch("Théo", "Promo 2025", 2, 2, "CR", P25, "", "", "C"),
  ch("Ema", "Promo 2025", 2, 1, "RI", P25, "", "loseDraw:1@Toujours debout", "C"),
  ch("Lenny", "Promo 2025", 2, 2, "C", P25, "", "", "C"),
  ch("Noah", "Promo 2025", 2, 2, "I", P25, "", "", "C", { key: "starac-noah-2025" }),
  ch("Lili", "Promo 2025", 2, 1, "I", P25, "", "domDraw:1@Sourire", "C"),
  ch("Sarah", "Promo 2025", 2, 2, "R", P25, "", "", "C"),
  ch("Mehdi", "Promo 2025", 1, 1, "C", P25, "", "", "C"),
  // --- promo 2026-2027 (saison en cours)
  ch("Amel", "Promo 2026", 3, 2, "RI", P26, "", "winDraw:influence,1@Grande voix", "U"),
  ch("Antoine", "Promo 2026", 3, 3, "C", P26, "", "", "U"),
  ch("Brieuc", "Promo 2026", 2, 2, "CI", P26, "", "", "C"),
  ch("Cameron", "Promo 2026", 3, 2, "CI", P26, "", "ifAtk:1@Show", "U"),
  ch("Elija", "Promo 2026", 2, 1, "RI", P26, "", "enterDraw:1@Première impression", "C"),
  ch("Félix", "Promo 2026", 2, 2, "C", P26, "", "", "C"),
  ch("Isabella", "Promo 2026", 3, 2, "RI", P26, "", "domPower:1@Voix du public", "R"),
  ch("Khalil", "Promo 2026", 3, 3, "CR", P26, "", "", "U"),
  ch("Kylian", "Promo 2026", 2, 2, "C", P26, "", "", "C"),
  ch("Leeloo", "Promo 2026", 2, 1, "I", P26, "", "domDraw:1@Coup de cœur des profs", "C"),
  ch("Maud", "Promo 2026", 2, 2, "R", P26, "", "", "C"),
  ch("Mélina", "Promo 2026", 3, 2, "RI", P26, "", "ifWith:Promo 2026,1@Esprit de promo", "U"),
  ch("Morgan", "Promo 2026", 2, 2, "CR", P26, "", "", "C"),
  ch("Noémie", "Promo 2026", 2, 1, "I", P26, "", "loseDraw:1@Jamais découragée", "C"),
  ch("Tracy", "Promo 2026", 4, 3, "CI", P26, "", "winGold:influence,1@Venue de Guadeloupe", "R"),
  ch("Ydriss", "Promo 2026", 3, 3, "CI", P26, "", "", "U"),
  ch("Zoé", "Promo 2026", 1, 1, "I", P26, "", "", "C"),
  // --- l'équipe du château (rôles génériques)
  ch("Professeur de chant", "Cours du matin", 2, 1, "I", "Professeur", "", "actStand:Élève@Échauffement vocal", "U", { uni: false }),
  ch("Professeur de danse", "Chorégraphie", 2, 1, "C", "Professeur", "", "actBuff:Élève,1@Répétition", "U", { uni: false }),
  ch("Coach scénique", "Présence sur scène", 2, 1, "RI", "Professeur", "", "actIcon:influence@Prends la lumière", "U", { uni: false }),
  ch("La direction du château", "Les règles du jeu", 4, 2, "RI", "Professeur", "", "reserve:1 ; income:1", "R"),
  // --- lieux
  loc("Le Château", "Dammarie-lès-Lys", 2, "Château", "", "reduce:Élève,1@Bienvenue au château", "U"),
  loc("La salle de répétition", "Travail, travail", 2, "Château", "", "actDraw:1@Répéter encore", "U"),
  loc("Le plateau du prime", "Samedi soir", 3, "Plateau", "", "domi:3", "R"),
  loc("La tournée", "Les Zéniths", 1, "Tournée", "limite", "income:1", "C"),
  // --- objets
  obj("Micro d'or", "Le trophée", 2, "Trophée", "", "attKw:celebre", "R", { uni: true }),
  obj("Tenue de scène", "Paillettes", 2, "Tenue", "", "attStr:2", "C"),
  obj("Oreillette", "Retour son", 1, "Matériel", "", "attIcon:influence", "C"),
  obj("Carnet de chansons", "Composer", 1, "Carnet", "", "attKw:genie", "U"),
  // --- événements
  ev("Immunité", "Le joker des profs", 1, "Évaluation", "evSave:Élève", "U"),
  ev("Duo avec un artiste", "Invité surprise", 1, "Prime", "evBuff:2", "C"),
  ev("Évaluation", "Les profs ont noté", 1, "Évaluation", "evMinus:2", "C"),
  ev("Nomination", "Sur la sellette", 2, "Évaluation", "evKneel:3", "U"),
  ev("Le public a voté", "Résultats", 1, "Prime", "evDomPower:1", "R"),
  ev("Répétition générale", "Tous sur scène", 2, "Prime", "evStandAll:Élève", "R"),
];

export const starters = [
  { id: "sa-2024", name: "Promo 2024", leader: "starac-marine-7", like: ["Promo 2024", "Professeur"], avoid: ["Promo 2025", "Promo 2026"], desc: "Marine, Ebony et toute la promo 2024 : la Domination, c'est le vote du public." },
  { id: "sa-2025", name: "Promo 2025", leader: "starac-ambre-7", like: ["Promo 2025", "Professeur"], avoid: ["Promo 2024", "Promo 2026"], desc: "Ambre, Léa et la promo 2025 : des élèves soudés qui piochent à chaque vote." },
  { id: "sa-2026", name: "Promo 2026", leader: "starac-tracy-4", like: ["Promo 2026", "Professeur"], avoid: ["Promo 2024", "Promo 2025"], desc: "La promo en cours : beaucoup d'élèves, beaucoup d'énergie, l'avenir s'écrit maintenant." },
];
