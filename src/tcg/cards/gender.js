// Personnages féminins : les textes de leurs effets s'accordent (« elle attaque », « remettez-la », « immunisée »…).
// Une carte peut aussi le préciser elle-même avec l'option { fem: true } (ou { fem: false }).
export const FEM = new Set([
  // Code Lyoko
  "Aelita Hopper", "Yumi Ishiyama", "Sissi Delmas", "La Méduse", "Tarentule",
  // Umbrella Academy
  "Allison Hargreeves", "Vanya Hargreeves", "Grace", "Lila Pitts", "La Gestionnaire", "Fei Hargreeves", "Sloane Hargreeves", "Cha-Cha", "Dolores",
  // Toy Story
  "La Bergère", "Jessie", "Barbie", "Gabby Gabby",
  // One Piece
  "Nami", "Nico Robin", "Boa Hancock",
  // Pokémon (Dresseuses)
  "Ondine", "Infirmière Joëlle", "Aurore", "Roseille", "Lithia", "Cynthia", "Iris", "Inezia", "Erika", "Faïza", "Donna",
  // Star Academy
  "Marine", "Ebony", "Marguerite", "Maureen", "Maylis", "Julie", "Emma", "Maïa", "Ambre", "Léa", "Jeanne", "Anouk", "Ema", "Lili", "Sarah",
  "Amel", "Isabella", "Leeloo", "Maud", "Mélina", "Noémie", "Tracy", "Zoé",
  // Les Cités d'or
  "Zia", "Isabella Laguerra", "Marinche", "La Reine des Amazones",
  // Les Légendaires
  "Jadina", "Shimy", "Ténébris", "Adeyrid", "Shamira", "Solaris", "Toopie Maker", "Chasseresse jaguarianne", "Kalandre", "Galatée", "Invidia", "Sorcière des ténèbres",
  // De cape et de crocs
  "Hermine", "Séléné", "Mademoiselle",
  // Hunger Games
  "Katniss Everdeen", "Effie Trinket", "Rue", "Primrose Everdeen", "Johanna Mason", "Mags", "Clove", "Glimmer", "Tête de renard", "Lucy Gray Baird", "Présidente Coin",
  // Cowboy Bebop
  "Faye Valentine", "Ed", "Julia", "Annie",
  // La Horde du Contrevent
  "Oroshi Melicerte", "Alme Capys", "Aoi Nan", "Callirhoé Déicoon", "Coriolis", "Silène", "Nouchka",
  // Élite
  "Lucrecia", "Carla", "Nadia", "Marina", "Rebeka", "Cayetana", "Ari", "Mencía", "Isadora", "Inspectrice",
  // Teen Wolf
  "Lydia Martin", "Allison Argent", "Malia Tate", "Kira Yukimura", "Kate Argent", "Melissa McCall", "Erica Reyes",
  // Marvel
  "Black Widow", "Scarlet Witch", "Captain Marvel", "Gamora", "Tornade", "Mystique",
  // DC
  "Wonder Woman", "Supergirl", "Batgirl", "Zatanna", "Harley Quinn", "Catwoman", "Poison Ivy",
  // Stranger Things
  "Onze", "Max Mayfield", "Erica Sinclair", "Joyce Byers", "Nancy Wheeler", "Robin Buckley", "Barbara Holland", "Karen Wheeler", "Kali",
  // Scooby-Doo
  "Daphné Blake", "Véra Dinkley", "Scooby-Dee", "Nova", "Amber", "Angel Dynamite", "Janet Nettles", "Delilah Blake", "Marcie Fleach",
  "Thorn", "Dusk", "Luna", "Crystal", "Dee Dee Sykes", "Madelyn Dinkley",
  // League of Legends
  "Xayah", "Irelia", "Ahri", "Karma", "Akali", "Lillia", "Sejuani", "Lissandra", "Ashe", "Anivia", "Caitlyn", "Vi", "Renata Glasc", "Janna",
  "Jinx", "Powder", "Camille", "Seraphine", "Mel", "Katarina", "LeBlanc", "Samira", "Cassiopeia", "Ambessa", "Briar", "Riven", "Rell",
  "Poppy", "Lux", "Fiora", "Quinn", "Shyvana", "Vayne", "Sona", "Morgana", "Kayle", "Zyra", "Nidalee", "Neeko", "Qiyana", "Tristana",
  "Lulu", "Yuumi", "Vex", "Guerrière de la Griffe d'hiver", "Ronce cracheuse", "Plante étrangleuse", "Tourelle de Heimerdinger",
  // Harry Potter
  "Hermione Granger", "Minerva McGonagall", "Ginny Weasley", "Molly Weasley", "Bellatrix Lestrange", "Narcissa Malefoy", "Dolores Ombrage",
  "Pansy Parkinson", "Rowena Serdaigle", "Luna Lovegood", "Cho Chang", "Sibylle Trelawney", "La Dame grise", "Mimi Geignarde", "Padma Patil",
  "Penelope Deauclaire", "Marietta Edgecombe", "Helga Poufsouffle", "Nymphadora Tonks", "Pomona Chourave", "Hannah Abbott", "Susan Bones",
  "Nagini", "Hedwige", "La Grosse Dame",
  // Star Wars
  "Leia Organa", "Rey", "Ahsoka Tano", "Asajj Ventress", "Jyn Erso", "Mon Mothma", "Hera Syndulla", "Sabine Wren", "Fennec Shand",
  "Bo-Katan Kryze", "Qi'ra", "Maz Kanata", "Capitaine Phasma", "Padmé Amidala", "Mère Talzin", "Sœur de la Nuit", "Shin Hati", "La Seconde Sœur",
  // Game of Thrones
  "Catelyn Stark", "Sansa Stark", "Arya Stark", "Brienne de Torth", "Lyanna Mormont", "Meera Reed", "Nymeria", "Cersei Lannister",
  "Myrcella Baratheon", "Daenerys Targaryen", "Missandei", "Rhaenyra Targaryen", "Alicent Hightower", "Vhagar", "Mélisandre",
  "Shireen Baratheon", "Yara Greyjoy", "Olenna Tyrell", "Margaery Tyrell", "Ellaria Sand", "Obara Sand", "Nymeria Sand", "Tyene Sand",
  "Elia Martell", "Ygritte", "Araignée de glace",
  // Le Seigneur des Anneaux
  "Galadriel", "Arwen", "Tauriel", "Éowyn", "Arachne", "Rosie Chaumine", "Lobelia Sacquet-de-Besace",
  // Narnia
  "Susan Pevensie", "Lucy Pevensie", "Jadis", "Mme Castor", "La Dame à la Robe Verte", "La Harpie",
  // Studio Ghibli
  "Satsuki Kusakabe", "Mei Kusakabe", "Noiraude", "Chihiro Ogino", "Yubaba", "Zeniba", "Lin", "San", "Dame Eboshi", "Moro", "Sophie Hatter",
  "La Sorcière des Landes", "Nausicaä", "Kushana", "Sheeta", "Dola", "Kiki", "Gina", "Fio Piccolo", "Ponyo", "Arrietty",
  // Gundam
  "Sayla Mass", "Fraw Bow", "Lalah Sune", "Kycilia Zabi", "Haman Karn", "Relena Peacecraft", "Lady Une", "Lucrezia Noin", "Dorothy Catalonia",
  "Lacus Clyne", "Cagalli Yula Athha", "Murrue Ramius", "Sumeragi Lee Noriega", "Marina Ismail", "Feldt Grace", "Atra Mixta",
  "Kudelia Aina Bernstein", "Lafter Frankland", "Carta Issue", "Suletta Mercury", "Miorine Rembran", "Prospera", "Chuchu", "Norea Du Noc",
  "Sophie Pulone", "Nika Nanaura", "Ericht Samaya",
  // Lot 4 : Marvel et DC (comics), Code Lyoko, Scooby-Doo
  "Jean Grey", "Malicia", "Kitty Pryde", "Psylocke", "Emma Frost", "La Femme invisible", "Gwen Stacy", "She-Hulk",
  "Jessica Cruz", "Talia al Ghul", "Power Girl", "Lois Lane", "Hawkgirl", "Black Canary", "Raven", "Starfire",
  "Suzanne Hertz", "Rosa", "Miss Grimwood", "Sibella", "Elsa Frankenteen", "Winnie", "Phantasma", "Tanis",
  "Jubilé", "Polaris", "Valeria Richards", "Alicia Masters", "Crystal", "Arisia",
]);
