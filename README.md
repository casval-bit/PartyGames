# Party Hub (nom de travail de la plateforme)

Appli mobile React + Capacitor : plateforme de jeux de soirée avec lobbys en temps réel et équipes. Trois jeux : **Time's Up** (classique ou mode Bonus), **Qui est-ce ?** et **Blind test**.
« Time's Up » est une marque déposée : le nom de la plateforme et des jeux est à changer avant le Play Store (`APP_NAME` dans `src/config.js`, `capacitor.config.json`, textes de `Splash.jsx` et `Menu.jsx`).

## 1. Lancer en local (sans serveur)

    npm install
    npm run dev

Sans clés Supabase, l'appli passe en « mode local » : ouvre plusieurs onglets du même navigateur, chacun est un joueur
(un lobby créé dans un onglet apparaît dans la liste des autres). Le bouton « + Ajouter un bot (test) » du lobby permet de tester seul.

## 2. Vrai multijoueur (Supabase)

1. Crée un projet gratuit sur supabase.com.
2. Project Settings > API : copie « Project URL » et la clé « anon public ».
3. Copie `.env.example` en `.env` et remplis `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Aucune table ni SQL : l'appli utilise seulement Realtime (Broadcast + Presence).
Le créateur du lobby fait tourner la partie sur son téléphone (il distribue les cartes, gère les votes et les chronos).
S'il quitte, le lobby se ferme. Pas encore de reconnexion en cours de partie.

## 2 bis. Sécurité (ce qui est en place, ce qui ne l'est pas)

**Supabase** : l'appli n'utilise que Realtime (Broadcast + Presence), sans table ni stockage : il n'y a rien à lire ni à modifier dans ta base.
La clé `anon` est publique par conception (elle est dans l'APK). Ne mets **jamais** la clé `service_role` ni le mot de passe de la base dans l'appli,
le dépôt, un zip ou une conversation. Active la double authentification (2FA) sur Supabase et GitHub. Les clés vont dans les *Secrets* GitHub Actions, pas dans le dépôt (`.env` est ignoré par git).

**Dans l'appli** :
- *Identités signées* (`src/net/secure.js`) : chaque téléphone fabrique une clé ECDSA P-256 (la clé privée ne sort jamais de l'appareil) et signe chaque message.
  Le créateur du lobby vérifie la signature, l'ordre (anti-rejeu) et le débit ; les joueurs vérifient que l'état de la partie est bien signé par le créateur.
  Personne ne peut agir au nom d'un autre joueur, exclure quelqu'un ou fermer le lobby en écoutant le canal.
- *Entrées filtrées* : chaque type de message est reconstruit champ par champ (types et tailles), 1,6 ko maximum, limite de débit par joueur, pseudos nettoyés.
- *Liste blanche d'adresses* (`src/lib/safeUrl.js`) : images, pochettes et extraits audio ne se chargent que depuis Deezer, Wikipédia/Wikimedia, Spotify, ou les fichiers de l'appli.
- Aucune injection possible dans l'interface : pas de `innerHTML`, `eval`, etc. (React échappe le texte).

**Limites connues** (à garder en tête) :
- Le canal du salon reste lisible par quiconque connaît son code (6 caractères aléatoires) et la clé `anon` : un tricheur technique pourrait lire les cartes des autres
  (les messages privés `hand/deal/queue` ne sont pas chiffrés). Pas de danger pour les données, seulement pour l'équité de la partie.
- Le créateur du lobby est l'arbitre : un créateur tricheur peut fausser sa propre partie.
- Un tiers peut inonder le canal (quota gratuit Supabase) ; il ne peut ni voler ni modifier de données. Surveille Settings > Usage.
- Étape suivante possible : chiffrer les messages privés (ECDH + AES-GCM) et passer aux canaux privés Supabase (Realtime Authorization + connexion anonyme).

Tests : `node tools/test-secure.js` (signatures, liste blanche).

## 3. Générer l'APK

### Option A : GitHub Actions (rien à installer)
1. Pousse ce dossier sur un dépôt GitHub (branche `main`).
2. Settings > Secrets and variables > Actions : ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Onglet Actions > « Build APK » > dernier run > Artifacts > `timesup-debug-apk`. Installe `app-debug.apk` sur ton téléphone
   (autorise les sources inconnues).

### Option B : en local avec Android Studio
    npm install
    npx cap add android      # une seule fois
    npm run android:sync     # build web + copie dans le projet Android
    npm run android:open     # ouvre Android Studio > Build > Build APK(s)

### Play Store (plus tard)
Il faut un compte développeur Google Play, une clé de signature et un build « release » au format AAB
(Android Studio > Build > Generate Signed Bundle). Change aussi `appId` et `appName` dans `capacitor.config.json`.
« Time's Up » est une marque de jeu existante : prévois un autre nom pour la publication.

## 3 bis. Site de test sur téléphone (GitHub Pages)

Pour essayer le jeu (images Wikipédia comprises) sans fabriquer d'APK : 1) Settings > Pages > Source : **GitHub Actions** (une seule fois) ;
2) ajoute si tu veux les secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ; 3) Actions > « Site de test (GitHub Pages) » > Run workflow
(ou simple push sur `main`). L'adresse est `https://<ton-pseudo>.github.io/<dépôt>/`, ouvre-la sur ton téléphone. Pour avoir les images embarquées,
lance d'abord « Chercher les images des cartes » (§8).

## 4. Ta liste de cartes

Tout est dans `src/data/cards.csv`, une ligne par carte, 4 colonnes séparées par `;` (Excel / Google Sheets : enregistre en
« CSV UTF-8 », séparateur point-virgule). Plusieurs valeurs dans une colonne : sépare-les par `|`.

    nom;categories;pays;periode
    Lenny Kravitz;chanteur|acteur;États-Unis;1989-auj
    La Joconde;tableau;Italie|France;1503-1519
    Bataille d'Alésia;evenement;France;52av
    Seconde Guerre mondiale;evenement;France|Allemagne|Royaume-Uni|Russie|Japon|États-Unis;1939-1945

- **nom** : ce qui sera deviné. Deux noms identiques (casse, accents et ponctuation ignorés) sont fusionnés en une seule carte.
- **categories** : ids de `src/data/categories.js` (`chanteur`, `film`, `evenement`, `manga`…). Plusieurs possibles. Une carte
  présente dans plusieurs catégories n'est jamais tirée deux fois dans la même partie.
- **pays** : pays d'origine, ou pays du lieu pour un événement. Plusieurs possibles. Noms français de `src/data/countries.js`
  (ajoute-y un pays si besoin). Peut rester vide (plantes, animaux…).
- **periode** : plusieurs valeurs possibles, séparées par `|` :

  | Tu écris | Ça veut dire |
  |---|---|
  | `1503` | une année |
  | `1964-2024` | une plage d'années (tous les siècles touchés) |
  | `1964-auj` | jusqu'à aujourd'hui |
  | `356av-323av` | avant J.-C. |
  | `XIX` | un siècle entier (chiffres romains) ; `IVav` = IVe siècle av. J.-C. |
  | `1990s` | une décennie entière |

  Règle appliquée automatiquement : on retient toujours les **siècles**, et en plus les **décennies à partir de 1970**.
  `1964-2024` donne donc XXe et XXIe siècles + années 1970, 1980, 1990, 2000, 2010, 2020 ; `1815` donne seulement le XIXe siècle.

`npm run check-cards` vérifie le fichier : catégories ou pays inconnus, périodes illisibles, nombre de cartes par catégorie,
par siècle, par décennie et par pays, cartes sans pays ou sans période.

Pays et périodes sont déjà lus et validés, mais ne servent pas encore en partie (seules les catégories pilotent les packs).

## 5. Règles déjà codées (mode Classique)

- Répartition des joueurs dans l'ordre d'arrivée, équipes jaune / bleue / rouge / verte (2 à 4). Équipes de 2 joueurs par défaut ; le créateur peut monter jusqu'à 6 par équipe.
- Le créateur peut exclure, régler le temps par manche, ajouter des bots de test et lancer.
- Vote : 60 s max, 3 votes par joueur (la même catégorie peut être votée plusieurs fois). Chaque catégorie a une batterie de 15 barres
  maximum : chaque vote charge une barre, visible en direct par tous (couleur du voteur masquée, sauf tes propres votes).
  À la révélation, chaque barre prend la couleur du joueur qui l'a posée. Pas de vote = Mixtes.
  Tout le monde « Prêt » = on passe tout de suite.
- 4 cartes par vote (3 × 4 = 12 par joueur), jamais de doublon dans un deck ni entre joueurs. « Random » = une catégorie au hasard,
  « Mixtes » = cartes au hasard. Si une catégorie est épuisée, complété en mixtes.
- Ouverture des 3 boosters de chacun, façon Pokémon TCG Pocket : on glisse le doigt sur les pointillés du haut pour déchirer le booster, puis on touche chaque carte pour la retourner (on voit ses 12 cartes), puis **mélange commun** : tous les boosters sont réunis et
  mélangés ensemble, et chacun reçoit 12 cartes du paquet mélangé (pas forcément les siennes).
- Chacun retire 2 cartes de ses 12 en 60 s (tirées au sort si le temps est écoulé). Toutes les cartes gardées sont ensuite
  rassemblées et remélangées en **un seul paquet commun**, puis 3-2-1 et annonce du premier tour.

## 6. Raretés des cartes (invisibles)

Toutes les cartes ont le même habillage : le nom en lettres dorées (police Cinzel Decorative) dans un cartouche, entouré d'un filigrane doré, d'un médaillon à rayons et d'une teinte propre à la carte. **Aucune icône, catégorie, pays ni époque n'est affichée** (ce seraient des indices), et **la rareté / le tier n'est jamais montrée**. `/?gallery` affiche des exemples de cartes.
Elle reste dans les données (colonne facultative `difficulte` de `cards.csv`, `F` = tout le monde connaît … `S` = très pointu, voir `src/data/rarity.js`)
pour un futur mode de jeu. Tant que la colonne n'est pas remplie, `PROVISIONAL_TIERS = true` attribue un tier au hasard mais stable par carte.
Polices : Fraunces (noms des cartes), Bungee (titres), Figtree (texte).

## 7. Plateforme : trois jeux

Le créateur choisit le jeu dans le lobby (« Jeu » : **Time's Up**, **Qui est-ce ?** ou **Blind test**). Les équipes et le lobby sont communs ; le vote de catégories ne concerne que Time's Up.
À la fin d'une partie, le créateur appuie sur « Retour au lobby » : tout le monde revient au lobby avec ses équipes.

**Qui est-ce ?** : pas de vote, tout est aléatoire pour tout le monde (trouver de quelle catégorie il s'agit fait partie du jeu ; elle n'est révélée qu'avec la réponse). Nombre d'images au choix : 5, 8, 10, 15.
Pour chaque image : 1) chacun touche son écran pour dire qu'il est prêt, 2) décompte rigolo 5-4-3-2-1 synchronisé sur tous les téléphones,
3) l'image s'affiche en plein écran pour tout le monde, 4) quand tu as trouvé tu **maintiens l'écran 3 secondes** : ça te classe (1er, 2e…) et la manche
continue pour les autres, 5) la réponse s'affiche avec le classement. Points : nombre de joueurs − rang + 1 ; ceux qui n'ont pas trouvé en 45 s ont 0.
Score final par joueur et par équipe (somme des membres). C'est du déclaratif : personne ne tape la réponse.

### Blind test

Choisis « Blind test » dans le lobby, puis importe une playlist :
- **Deezer** (recommandé) : colle le lien d'une playlist **publique** (`deezer.com/…/playlist/123…`). Aucun compte ni clé : l'API Deezer est publique et chaque morceau a un extrait audio de 30 s. Les adresses d'extraits expirent : elles sont redemandées juste avant chaque morceau.
- **Liste texte** : une ligne `Artiste - Titre` par morceau (150 max) ; chaque morceau est retrouvé sur Deezer. C'est aussi la solution pour **Spotify** (export en texte, par ex. avec Exportify) ou pour transférer ta playlist Spotify vers Deezer (Soundiiz, TuneMyMusic).
- **Lien Spotify** : fonctionne seulement dans l'**appli Android** (le lien est lu via la page publique « embed », 100 morceaux max, puis chaque morceau est retrouvé sur Deezer). Spotify ne fournit plus d'extraits audio aux nouvelles applications, donc l'audio vient toujours de Deezer. Fonction expérimentale, non testée en réel.
- **Playlist de démo** : 12 morceaux avec une mélodie synthétique, pour tester sans réseau.
Dans l'appli Android, `CapacitorHttp` est activé (`capacitor.config.json`) : les requêtes passent par le réseau natif, sans blocage CORS. Sur le web, Deezer est interrogé en JSONP.

Réglages du créateur : nombre de morceaux (5 à 30), temps pour répondre (10 à 30 s), réponses **illimitées** (défaut, on peut spammer) ou **une seule**, pause entre morceaux **automatique** (15 s de révélation + scores) ou **manuelle** (le créateur touche l'écran pour lancer la suite), son sur **tous les téléphones** ou celui du créateur seulement, **chacun pour soi** ou **par équipes** (nombre d'équipes et de joueurs par équipe au choix).
- L'extrait démarre à un instant aléatoire (entre 0 et 30 s − temps de réponse) et se lance tout seul sur les téléphones, synchronisé. Une seule zone de saisie : tape le titre, l'artiste ou les deux ; une réponse peut contenir les deux. Les parenthèses, « feat. », « Remastered », accents, apostrophes, tirets, espaces, majuscules, ponctuation et petits mots oubliés (« the », « le », « de »…) sont ignorés. Les petites fautes de frappe sont acceptées et rapportent les points normalement (lettre manquante, en trop, fausse ou deux lettres inversées), selon la longueur de la réponse : 0 faute jusqu'à 4 lettres (« Hole » ≠ « Halo »), 1 faute de 5 à 9 lettres, 2 de 10 à 15, 3 au-delà. Un chiffre faux est refusé (« 21 Guns » ≠ « 22 Guns »). Une faute de plus que la tolérance donne « Presque ! » sans point, et on peut réessayer. Réglage : `typoTolerance` / `closeTolerance` dans `src/data/blindtest.js`.
- **Points** (`src/data/blindtest.js`) : chaque partie trouvée (titre, artiste) vaut 300 + jusqu'à 200 selon le temps restant + bonus d'ordre d'arrivée (1er +100, 2e +60, 3e +30). Une seule des deux parties = la moitié des points possibles. **Série** : +50 × (série − 1), plafonné à 250, quand on trouve les deux ; une demi-réponse garde la série sans la faire monter, un raté la remet à zéro.
- **Équipes, score partagé** : l'équipe marque une fois (le titre peut être trouvé par un coéquipier et l'artiste par un autre) ; les coéquipiers ne voient pas les trouvailles de leur équipe et continuent de chercher, sans points en plus. **Somme des joueurs** : chaque joueur marque pour lui, le score de l'équipe est la somme.
- Fin de morceau : réponse, pochette, qui a trouvé quoi, classement ; fin de partie : podium. Retour au lobby avec la playlist conservée. Tests : `node tools/test-blindtest.js`, `node tools/test-playlist.js`.
- Limites : le son d'un navigateur ne démarre qu'après un geste (bouton « Touche pour activer le son » en secours) ; ne mets pas le son sur tous les téléphones si vous êtes dans la même pièce (écho), choisis « Celui du créateur ».

## 8. Images des cartes

Les images sont dans `src/data/images.json` (`{ "<id carte>": { "url", "page", "lang" } }`), générées automatiquement depuis l'image principale de la page Wikipédia de chaque carte.
- **Sur GitHub (depuis ton tel)** : onglet Actions > « Chercher les images des cartes » > Run workflow. L'action enregistre `images.json` dans le dépôt.
- **Sur un PC** : `npm run fetch-images` (options : `--force`, `--limit=50`).
- **À la main** : colonne facultative `image` dans `cards.csv` (une adresse http…), elle a toujours la priorité et n'est jamais écrasée.
Le script cherche d'abord sur la Wikipédia française pour les cartes françaises/francophones, sinon l'anglaise, puis l'autre en secours.
Relis `images.json` (champ `page`) : un titre ambigu peut donner la mauvaise page.
**Deux façons d'avoir les images** (comme WikiMasters, qui part des articles Wikipédia) :
1. **Images embarquées (recommandé)** : le workflow « Chercher les images des cartes » télécharge une miniature de chaque carte dans `public/cards/` et écrit `images.json` ; elles sont ensuite **dans l'appli** (APK ou site), donc affichées instantanément, hors-ligne et sans dépendre de Wikipédia au moment de jouer. Sur PC : `npm run fetch-images` (options `--force`, `--limit=50`, `--size=360`, `--no-download`).
2. **Recherche en direct** (secours) : pendant que les joueurs touchent l'écran, le téléphone du créateur interroge Wikipédia (8 cartes au hasard, on garde la première qui a une image). Il faut que le téléphone ait Internet ; si Wikipédia est injoignable un message l'indique et c'est le nom qui s'affiche.
**Pour tester les images** il faut une vraie version : le site de test GitHub Pages (voir §3 bis) ou l'APK. L'aperçu intégré à Claude (artefact) bloque toutes les requêtes réseau et les images externes : il ne peut donc jamais afficher d'image Wikipédia.
Droits : les photos des pages Wikipédia ont des licences variées (Commons) ; les affiches de films et pochettes d'albums sont des images non libres. Pour un usage perso c'est
tout à fait jouable, pour le Play Store il faudra des images dont tu as les droits.

## 9. Time's Up : les manches (jeu complet)

Après le compte à rebours, le jeu enchaîne **3 manches** avec le même paquet (les cartes gardées après la défausse) :

1. **Manche 1** : décris librement, sans dire le nom ni un mot de la carte.
2. **Manche 2** : un seul mot par carte (même paquet, remélangé).
3. **Manche 3** : mime, sans parler.

Déroulement d'un tour : l'écran annonce l'équipe et le joueur actif → seul lui touche l'écran pour démarrer → il fait glisser la carte **à droite = trouvée**, **à gauche = passée** (la carte repart au fond du paquet). Une mèche de dynamite discrète s'affiche en bas ; les autres voient le chrono et les noms des cartes validées. Les équipes et les joueurs alternent, sans remélanger entre deux tours.

- **Score** : 1 point par carte trouvée, pour l'équipe, cumulé sur les 3 manches.
- **Paquet épuisé** en cours de tour : la manche s'arrête ; le **temps restant** (s'il dépasse 3 s) est reporté au même joueur pour démarrer la manche suivante.
- Entre deux manches : écran des scores + règle suivante, tout le monde appuie sur « Prêt » (ou 20 s).
- Fin : équipe gagnante (ou égalité), puis le créateur peut **Retour au lobby** (équipes conservées).
- Réglages dans `src/config.js` (`TU_ROUNDS`, `TU_ROUND_RULES`, `TU_MIN_CARRY_MS`, …).

### Mode « Bonus » (lobby > Mode > Bonus)

- **2 votes × 10 cartes** : chacun ouvre 2 boosters de 10 cartes = **20 cartes**. Pas de mélange commun ni de défausse : aucune carte n'est écartée.
- **Choix des bonus** (75 s, ou dès que tout le monde valide) : chacun pose **jusqu'à 2 bonus** sur ses 20 cartes, au choix : *Temps* (+10 s au chrono quand la carte est réussie) ou *Score* (3 points au lieu de 1). 1 + 1, 2 temps, 2 scores, 1 seul ou **aucun** (un bonus profite à toute équipe qui réussit la carte, même l'adverse).
- La carte choisie **se transforme** (animation éclair, carte « basique » → « spéciale ») : cyan = temps, magenta = score, cadre irisé, foil animé, pastille +10 s / × 3.
- Les 20 × N cartes sont mélangées et la manche commence. Les bonus **ne valent que pour la manche** ; une carte passée garde son bonus.
- Un bonus réussi déclenche un éclat « +10 s » / « +3 » chez tout le monde et le chrono s'allonge d'autant.
- **Fin de manche** : scores, puis chacun reçoit **20 autres cartes du paquet** (jamais celles qu'il avait à la manche précédente quand c'est possible) et repose ses bonus. Pareil pour la manche 3.
- Réglages : `BONUS_SLOTS`, `TIME_BONUS_S`, `SCORE_BONUS_PTS`, `BONUS_SECONDS`, `TU_VARIANTS` dans `src/config.js` ; `VARIANT_RULES` (votes × cartes) dans `src/data/categories.js`.
- Attention : le paquet fait 20 × joueurs cartes (80 cartes à 4 joueurs) ; une manche peut donc être longue.

## 10. Profil, avatars et statistiques

Bouton **Mon profil** dans le menu (et ☺ dans le lobby). Tout est enregistré **sur le téléphone** (localStorage, clé `ph-profile-v1`) : pas de compte,
rien n'est envoyé à Supabase. Conséquence : le profil ne suit pas d'un téléphone à l'autre et disparaît si on efface les données de l'appli
(pour un profil qui te suit partout, il faudra des comptes : Supabase Auth + une table, à prévoir plus tard).

- **Apparence** : 25 avatars (icônes), 10 bordures (certaines animées), 16 couleurs. Les autres joueurs voient ton apparence et ton niveau dans le lobby et pendant les parties.
  Tu peux la changer dans le lobby : tout le monde voit le changement tout de suite.
- **Niveaux** : de l'XP à chaque partie terminée (20 de base, +30 victoire, +10 égalité, + un bonus selon les cartes/images/morceaux trouvés). Niveau max : 50.
- **Déblocages** : par niveau (ex. Flamme niv. 2, Couronne niv. 20) ou par **succès** (15 succès : séries de victoires, 20 morceaux trouvés, être le premier 10 fois, etc.).
  Toucher un cadenas indique comment le débloquer.
- **Stats** : parties, victoires / défaites / égalités, % de victoires, série en cours et meilleure série, et par jeu :
  Time's Up (cartes trouvées/passées, précision, tours joués, parties Bonus), Qui est-ce ? (images trouvées, premier à trouver, temps moyen, record),
  Blind test (morceaux trouvés en entier, titre ou artiste seulement, **temps de réponse moyen**, réponse la plus rapide, meilleure série, parties sans faute), et les 10 dernières parties.

Comment ça marche : le créateur du lobby mesure les statistiques détaillées pendant la partie (`pstats` dans l'état, `gameNo` = numéro de partie) ;
à l'écran de fin, chaque téléphone calcule son propre résultat (`summarize`) et l'ajoute à son profil (`recordGame`), une seule fois par partie.
Code : `src/data/profile.js` (catalogues, niveaux, succès, règles), `src/lib/useProfile.js`, `src/screens/Profile.jsx`, `src/ui/Avatar.jsx`.
Pour ajouter un avatar / une bordure / une couleur / un succès : une ligne dans `profile.js` (+ le style CSS `.pav.b-<id>` pour une bordure). `node tools/test-profile.js` vérifie la logique.

**Sécurité** : l'apparence reçue du réseau est filtrée (seuls des identifiants du catalogue passent). Le statut « débloqué » est local : quelqu'un qui bidouille son
stockage peut s'équiper d'éléments verrouillés chez lui, ce qui est sans conséquence (purement cosmétique).
