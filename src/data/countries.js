// Pays utilisables dans la colonne "pays" de cards.csv (noms français, orthographe exacte).
// Pour en ajouter un : une ligne ici. Pays disparus (URSS, Empire romain...) : mets les pays actuels concernés.
export const COUNTRY_NAMES = [
  "Afrique du Sud", "Algérie", "Allemagne", "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Barbade", "Belgique",
  "Brésil", "Bulgarie", "Cameroun", "Canada", "Chili", "Chine", "Colombie", "Congo (RDC)", "Corée du Nord", "Corée du Sud",
  "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Espagne", "Finlande", "France", "Géorgie", "Ghana", "Grèce", "Haïti", "Hongrie",
  "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Kenya", "Koweït", "Liban",
  "Luxembourg", "Madagascar", "Mali", "Maroc", "Mexique", "Mongolie", "Nigeria", "Norvège", "Nouvelle-Zélande", "Pays-Bas", "Pérou",
  "Philippines", "Pologne", "Portugal", "Qatar", "Roumanie", "Royaume-Uni", "Russie", "Serbie", "Slovaquie", "Slovénie", "Suède",
  "Suisse", "Sénégal", "Syrie", "Taïwan", "Tanzanie", "Tchéquie", "Thaïlande", "Trinité-et-Tobago", "Tunisie", "Turquie", "Ukraine",
  "Uruguay", "Vatican", "Venezuela", "Vietnam", "Égypte", "Éthiopie", "Érythrée", "États-Unis",
];
export const COUNTRIES = new Set(COUNTRY_NAMES);
