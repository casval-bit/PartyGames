# Party Hub (nom de travail de la plateforme)

Appli mobile React + Capacitor : plateforme de jeux de soirée avec lobbys en temps réel et équipes. Huit jeux : **Time's Up** (classique ou mode Bonus), **Qui est-ce ?**, **Blind test**, **Frise** (frise musicale), **Célébrité** (photo pixellisée, façon golf), **Petit bac**, **Plateau** (façon Mario Party) et **Mini-jeux** (18 jeux 3D façon Pummel Party). Chaque joueur a son **Doudou**, une petite créature 3D à personnaliser.
« Time's Up » est une marque déposée : le nom de la plateforme et des jeux est à changer avant le Play Store (`APP_NAME` dans `src/config.js`, `capacitor.config.json`, textes de `Splash.jsx` et `Menu.jsx`).

## Look & feel (« Tablette » bleu nuit)
Tablette high-tech nuit bleue : fond marine très sombre avec deux halos (bleu, cyan) et une grille cyan très fine, panneaux arrondis en dégradé marine, pastilles, barres de progression arrondies (vertes, orange quand il reste peu), contours lumineux cyan pour la sélection. Polices embarquées : **Sora** (titres, cartes, chiffres) et **Noto Sans KR** (texte). **Aucune émoji** : toutes les icônes sont des traits fins Lucide (`src/ui/Icon.jsx`, `<Icon name="trophy" />` ; `src/ui/iconPaint.js` les dessine aussi sur les textures 3D).
Dans un navigateur sur grand écran (≥ 1000 × 640), l'appli s'affiche dans un cadre de tablette (bord noir, caméra, barre d'état) ; sur téléphone et dans l'appli PC, plein écran, sans cadre. Variante de coque rouge et blanche dans les réglages du profil (navigateur).
**Écran d'accueil** (`src/screens/Splash.jsx`) : un emblème holographique (anneaux qui tournent en sens contraires, rayons, étoile qui pulse en ondes), les icônes des jeux en orbite qui s'allument chacune leur tour, des poussières de lumière qui montent, et le nom PARTY HUB dont les lettres montent d'un flou puis s'éclairent l'une après l'autre. On touche l'écran (ou clic / Entrée sur PC) pour entrer.
**Transitions** (`src/ui/ScreenFx.jsx`) : à chaque changement d'écran, un voile s'efface pendant qu'un balayage de lumière traverse l'écran ; Heavy is the Crown (collection, partie) s'ouvre directement, sans transition. **Survol à la souris** (PC) : les boutons se soulèvent, s'éclairent et leur icône sautille, avec un petit son (`ui/clickfx.js`, `sfx.hover`), réglable dans Profil > Réglages. **Sons** synthétisés (`src/lib/sfx.js`, aucun fichier : bips doux, glissandos, souffle filtré), coupables dans les réglages du profil.
**Cartes** : cartes holographiques (grille, coins lumineux, nom en Sora) ; boosters en « cartouche de données ». Les mini-jeux se jouent dans des **secteurs virtuels** (sol sombre quadrillé, horizon en grille, colonnes de lumière) à la couleur de leur zone : forêt (vert), désert (orange), banquise (bleu-blanc), montagne (gris-violet), noyau (cyan) — `candyWorld(THREE, scene, { zone })` dans `src/minigames/three/kit3d.jsx`.
Tout le thème est dans `src/tablet.css` (chargé après `src/styles.css`, il remplace les jetons de couleur et surcharge les composants).

## 1. Lancer en local (sans serveur)

    npm install
    npm run dev

Sans clés Supabase, l'appli passe en « mode local » : ouvre plusieurs onglets du même navigateur, chacun est un joueur
(un lobby créé dans un onglet apparaît dans la liste des autres). Le bouton « + Ajouter un bot (test) » du lobby permet de tester seul.

## 2. Vrai multijoueur (Supabase)

1. Crée un projet gratuit sur supabase.com.
2. Project Settings > API : copie « Project URL » et la clé « anon public ».
3. Copie `.env.example` en `.env` et remplis `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Pour jouer ensemble, aucune table ni SQL : l'appli utilise seulement Realtime (Broadcast + Presence). Les **comptes** (voir 2 ter) demandent une table `profiles`.
Les **amis** de Heavy is the Crown (voir 11) demandent deux tables : Supabase > SQL Editor > colle `supabase/amis.sql` > Run (une fois ; sans danger si on le relance).
Le créateur du lobby fait tourner la partie sur son téléphone (il distribue les cartes, gère les votes et les chronos).
S'il quitte, le lobby se ferme. Pas encore de reconnexion en cours de partie.

## 2 ter. Comptes : connexion par e-mail (niveau et avatars sauvegardés)

Dans l'appli : **Se connecter** (menu ou profil) > ton e-mail > un **code** arrive par e-mail > tu le tapes. Pas de mot de passe, pas de lien à ouvrir (un lien ne reviendrait pas dans l'appli Android).

**À qui est la progression affichée ?** Un badge le dit partout où on la voit (menu sous la carte d'identité, profil, en-tête de Heavy is the Crown ; `src/ui/AccountBadge.jsx`) :
- vert, **Compte connecté** + ton e-mail : tout est sauvegardé sur ton compte (orange si la dernière sauvegarde a échoué : touche pour réessayer) ;
- orange en pointillés, **Profil local, pas sauvegardé** (« seulement sur ce téléphone / cet ordinateur ») : un profil de cet appareil, perdu si on efface les données ; touche le badge pour te connecter et le garder ;
- gris, **Profil local (hors ligne)** : l'appli tourne sans Supabase, les comptes n'existent pas.
Le profil (niveau, XP, stats, succès, avatar, bordure, couleur) et le pseudo sont alors sauvegardés sur le compte, pas seulement sur le téléphone : on les retrouve sur un autre téléphone ou après une réinstallation.

**À faire une fois dans Supabase** (sans ça, l'envoi du code échoue) :
1. *SQL Editor > New query* : colle le contenu de `supabase/profiles.sql` > Run. (Crée la table `profiles` ; chaque joueur ne peut lire/écrire que sa ligne.)
2. *Authentication > Sign In / Providers* : « Email » doit être activé (c'est le cas par défaut).
3. *Authentication > Emails > Templates* : dans **Magic Link** ET dans **Confirm signup** (un nouveau joueur reçoit le second), remplace le contenu par quelque chose comme :

       <h2>Ton code Party Hub</h2>
       <p>Tape ce code dans l'appli :</p>
       <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>

   Il faut absolument `{{ .Token }}` (le code) : le modèle par défaut n'envoie qu'un lien. Le code fait 6 chiffres par défaut (réglable ; l'appli accepte 6 à 10 chiffres).
4. **E-mails : le point qui coince.** Le serveur d'e-mails fourni par défaut par Supabase **n'envoie qu'aux membres de ton projet** et est limité à **2 e-mails par heure** : suffisant pour TES tests, pas pour des amis. Pour que n'importe qui puisse se connecter, branche un SMTP à toi
   (*Authentication > Emails > SMTP Settings*). Exemple avec Brevo (gratuit) : hôte `smtp-relay.brevo.com`, port 587, identifiant = ton e-mail Brevo, mot de passe = une **clé SMTP** (Brevo > Settings > SMTP & API, pas la clé API) ; l'expéditeur doit être un expéditeur validé dans Brevo, identique à celui saisi dans Supabase. Pour une bonne délivrabilité (sinon : spams), Brevo demande d'authentifier un nom de domaine (enregistrements SPF/DKIM), donc un nom de domaine à toi.
   Une fois un SMTP perso actif, la limite par défaut passe à 30 e-mails/heure (réglable dans *Authentication > Rate Limits*).

**Comment la synchro se comporte** (`src/lib/useAccount.js`, `src/lib/cloud.js`, `src/data/accountMerge.js`) :
- À la connexion, le profil du téléphone et celui du compte sont **fusionnés** : le plus avancé (plus d'XP) sert de base, on lui ajoute les succès et l'historique de l'autre. On n'additionne jamais les deux (la même progression peut exister en double, elle serait comptée deux fois).
  Donc : tu as joué sans compte, tu crées ton compte > ta progression est reprise ; nouveau téléphone > tu récupères ton compte.
- Ensuite, chaque changement part sur le compte 1,5 s plus tard (et tout de suite quand l'appli passe en arrière-plan). Hors ligne : tout reste sur le téléphone et repart au retour du réseau.
- **Se déconnecter** n'est possible que si tout est sauvegardé ; le téléphone repart alors d'un profil vide (le compte garde tout), et un autre compte connecté ensuite ne reçoit rien du premier.
- Le profil reste cosmétique et modifiable par son propriétaire (comme avant) ; la table est protégée par RLS : personne ne peut lire ni écrire le profil d'un autre.
- Ton pseudo suit aussi : s'il est vide sur un nouveau téléphone, il est repris du compte.
- Sans clés Supabase, les boutons de compte n'apparaissent pas et le profil reste local. Pour les tests automatiques, `VITE_MOCK_AUTH=1` active un faux serveur (code `123456`, « cloud » dans localStorage) : jamais à activer en vrai.
Tests : `node tools/test-account.js` (fusion de profils).

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

## 3 ter. Appli PC (Windows) : Heavy is the Crown seul

L'appli PC n'a plus que le jeu de cartes, **Heavy is the Crown** (l'ancien Trône des Mondes) : pas de Party Hub ni des autres jeux
(`src/tcg/ui/TcgApp.jsx`, choisi par `TRONE_ONLY` dans `src/lib/device.js` ; dans un navigateur, ajoute `?trone` à l'adresse pour avoir la même appli).
**Écran titre** (`TitleScreen.jsx`) : simple, la couronne dorée et le nom du jeu posés sur la **salle en 3D** (la table ronde vue d'en haut, qui tourne
lentement, assombrie) ; on entre d'un clic ou avec Entrée (sans pseudo, on le choisit là). **L'entrée dans le jeu** : le titre s'envole et la caméra
descend s'asseoir à ta place, devant ton plateau, pendant que l'accueil apparaît (la même salle 3D du début à la fin, `TcgApp.jsx`). Autres
**transitions** propres au jeu (`CrownFx.jsx`) : deux battants s'écartent derrière une couronne (lobby → partie) ; ailleurs, un éventail de dos de cartes
balaie l'écran ; elles s'affichent avant le nouvel écran (plus d'éclair du nouvel écran avant la transition). Le **compte** (connexion par e-mail et code) est le même :
la collection, les decks, le profil et les amis sont sauvegardés dessus. Le web et l'APK gardent Party Hub avec tous les jeux.
La fenêtre, l'installeur et le menu s'appellent Heavy is the Crown ; le dossier des données et l'adresse interne gardent l'ancien nom (« Party Hub »,
`app://party-hub`) : sinon les joueurs qui ont déjà l'appli perdraient leur profil local et leurs illustrations importées.

Une fenêtre d'ordinateur (Electron, dossier `desktop/`). Elle s'ouvre **en plein écran** la première fois
(**F11** pour passer en fenêtre ou revenir en plein écran, aussi dans Profil > Réglages), puis reprend la taille de la dernière fois.
Pas de fausse tablette autour : l'appli occupe tout l'écran, et l'interface grandit avec la fenêtre (**Ctrl +** / **Ctrl −** pour l'ajuster,
**Ctrl 0** pour revenir à la taille normale). Le profil, les decks et les illustrations restent sur l'ordinateur ; connecté par e-mail,
on retrouve son compte comme sur le téléphone. Comme dans l'APK, les liens Spotify (playlist, morceaux) et Deezer marchent sans blocage.
La partie de Heavy is the Crown ne pivote pas sur PC, même dans une fenêtre plus haute que large.

**Mise en page PC** (`src/desktop.css`, classe `html.desktop`) : plus de colonne de téléphone, tout l'écran sert.
- **Menu** : carte d'identité, badge du compte, pseudo et nom du lobby à gauche ; les quatre grandes tuiles (Créer, Rejoindre, Heavy is the Crown, Salle d'arcade) à droite, avec la liste des jeux.
- **Lobby** : le jeu et ses réglages à gauche, les joueurs (ou les équipes) à droite, « Lancer la partie » en bas à droite. **Profil** : la carte d'identité à gauche, les stats sur deux colonnes à droite. **Salle d'arcade** : grille de tous les mini-jeux.
- **Heavy is the Crown** : l'accueil du jeu prend tout l'écran (plateau de jeu 3D au centre, « Tes cartes » à gauche, « Boutique et défis » à droite, Jouer en bas, voir 11).
  Le **constructeur de deck** montre les cartes à ajouter à gauche et le deck à droite, en même temps (fenêtre d'au moins 1 100 px de large après le zoom).
- **Écrans de jeu** : centrés dans une colonne large (1 000 px), le plateau 3D est plus grand.

### Option A : GitHub Actions (rien à installer)
À chaque push sur `main` (ou Actions > « Appli PC (Windows) » > Run workflow), avec les mêmes secrets que l'APK :
Actions > « Appli PC (Windows) » > dernier run > Artifacts > `party-hub-windows`. Le zip contient :
- `Party-Hub-Setup-x.y.z.exe` : installateur (raccourcis Bureau et menu Démarrer, désinstallable depuis les paramètres de Windows) ;
- `Party-Hub-x.y.z-portable.exe` : version sans installation, à lancer directement (démarrage un peu plus lent).

L'appli n'est pas signée : au premier lancement, Windows SmartScreen affiche « Windows a protégé votre ordinateur » >
**Informations complémentaires** > **Exécuter quand même**.

### Option B : en local
    npm install                 # une seule fois (si ce n'est pas déjà fait)
    npm run desktop:install     # une seule fois : Electron (environ 100 Mo)
    npm run desktop             # construit l'appli web et l'ouvre dans une fenêtre
    npm run desktop:exe         # fabrique l'installateur et la version portable dans desktop/release/

Le mode en ligne utilise le `.env` à la racine, comme `npm run build`. Pour numéroter une nouvelle version, change `version`
dans `desktop/package.json` (elle apparaît dans le nom des fichiers).

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

**Univers** : `pokemon` (Pokémon, dresseurs, lieux, objets : surtout la 1re génération et Noir/Blanc), `legendaires` (Les Légendaires), `citesdor` (Les Mystérieuses Cités d'or), `saga` (sagas du cinéma, aussi classées en `film`). Le tirage « Mixtes » est équilibré entre catégories : on tire d'abord une catégorie au hasard, puis une carte de cette catégorie, pour qu'un grand univers ne noie pas les autres.

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

## 7. Plateforme : sept jeux

Le créateur choisit le jeu dans le lobby (« Jeu » : **Time's Up**, **Qui est-ce ?**, **Blind test**, **Frise**, **Célébrité**, **Petit bac**, **Plateau**, **Mini-jeux**, **Heavy is the Crown**, le jeu de cartes décrit au point 11, ou **Loup-garou** version Stranger Things, au point 12). Les équipes et le lobby sont communs ; le vote de catégories ne concerne que Time's Up.
À la fin d'une partie, le créateur appuie sur « Retour au lobby » : tout le monde revient au lobby avec ses équipes.

**Qui est-ce ?** : pas de vote. Trois modes d'image dans le lobby : **Mixte** (une catégorie au hasard, puis une carte de cette catégorie : équilibré), **Tout au hasard** (une carte parmi toutes celles qui existent) et **Choisi par un adversaire** (avant chaque image, un joueur choisit la catégorie de l'image d'un autre ; à 2 équipes chacun choisit pour l'autre, à 3 ou 4 le cycle est retiré au hasard à chaque manche ; sans choix à temps, catégorie au hasard). **Chaque équipe a sa propre image** (et pas forcément le même thème que les autres équipes) ; les coéquipiers voient la même. La catégorie n'est révélée qu'avec la réponse. Nombre d'images au choix : 5, 8, 10, 15.
Pour chaque image : 1) chacun touche son écran pour dire qu'il est prêt, 2) décompte rigolo 5-4-3-2-1 synchronisé sur tous les téléphones,
3) l'image de ton équipe s'affiche en plein écran, 4) quand tu as trouvé tu **maintiens l'écran 3 secondes** : ça te classe (1er, 2e…) et la manche
continue pour les autres, 5) la réponse de chaque équipe s'affiche avec le classement. Points : nombre de joueurs − rang + 1 ; ceux qui n'ont pas trouvé en 45 s ont 0.
Score final par joueur et par équipe (somme des membres). C'est du déclaratif : personne ne tape la réponse. Comme les images diffèrent d'une équipe à l'autre, la rapidité compte plus que la difficulté de l'image (la difficulté silencieuse S–F pourra servir plus tard à équilibrer).

### Blind test

Choisis « Blind test » dans le lobby, puis importe une playlist :
- **Deezer** (recommandé) : colle le lien d'une playlist **publique** (`deezer.com/…/playlist/123…`), jusqu'à 2 000 morceaux. Aucun compte ni clé : l'API Deezer est publique et chaque morceau a un extrait audio de 30 s. Les adresses d'extraits expirent : elles sont redemandées juste avant chaque morceau.
- **Liste texte** : une ligne `Artiste - Titre` par morceau (600 max d'un coup ; si Deezer demande de ralentir, l'appli patiente et réessaie) ; chaque morceau est retrouvé sur Deezer. C'est aussi la solution pour **Spotify** (export en texte, par ex. avec Exportify) ou pour transférer ta playlist Spotify vers Deezer (Soundiiz, TuneMyMusic).
- **Lien Spotify** : fonctionne seulement dans l'**appli Android** et l'**appli PC** (le lien est lu via la page publique « embed », 100 morceaux max : limite de Spotify, puis chaque morceau est retrouvé sur Deezer). Spotify ne fournit plus d'extraits audio aux nouvelles applications, donc l'audio vient toujours de Deezer. Fonction expérimentale, non testée en réel.
- **Liens de morceaux Spotify (sans limite de 100)** : sur ordinateur, ouvre la playlist dans Spotify, **Ctrl+A puis Ctrl+C**, colle dans la zone d'import. Chaque lien `open.spotify.com/track/…` est lu (page publique du morceau : titre + artiste, appli Android ou PC uniquement) puis retrouvé sur Deezer pour l'extrait audio.
- **Connexion Spotify (facultative)** : bouton « Mes playlists Spotify » dans le lobby, visible tant qu'un Client ID est renseigné (par défaut celui de l'appli Spotify « Party Hub », dans `src/config.js` ; surchargeable avec `VITE_SPOTIFY_CLIENT_ID`). Flux PKCE sans secret : la page `public/spotify.html` (sur GitHub Pages) affiche un code que le joueur colle dans l'appli ; le jeton est gardé sur le téléphone. Importe une playlist entière (pages de 50), mais Spotify (mode développement) ne laisse lire que les playlists dont on est propriétaire ou collaborateur, limite l'appli à 5 utilisateurs et exige un compte Premium pour le propriétaire de l'appli. Une grande playlist (ex. 1950 morceaux = 39 pages) est lue avec une pause de 0,25 s entre deux pages ; les pannes passagères de Spotify (erreurs 429 et 500 à 504, ex. « 503 service indisponible ») sont réessayées automatiquement (6 fois : 0,7 s, 1,8 s, 4 s, 8 s, 15 s, 25 s, ou le délai demandé par Spotify ; l'écran dit « Spotify est lent, nouvel essai dans X s ») avant d'afficher « Spotify est momentanément indisponible ». Si Spotify lâche quand même, la lecture **reprend à la page où elle s'est arrêtée** : retouche la playlist (le bouton affiche « reprendre (600 lus) »). Les erreurs d'accès (401, 403) ne sont jamais réessayées. La lecture directe de Spotify accepte jusqu'à 3 000 morceaux (le texte collé reste limité à 1 500 lignes).
- **Plusieurs playlists** : une fois une playlist chargée, « + Ajouter une autre playlist » en fusionne une autre (doublons ignorés, 3 000 morceaux au plus). Pratique pour dépasser les 100 morceaux d'un lien Spotify : ajoute-en plusieurs, colle une liste texte (1 500 lignes) ou un export CSV d'exportify.net, ou transfère la playlist sur Deezer (tunemymusic.com, gratuit) et colle le lien Deezer (jusqu'à 2 000 morceaux). Le nombre de morceaux joués par partie va de 5 à 100.
- **Playlist de démo** : 12 morceaux avec une mélodie synthétique, pour tester sans réseau.
Dans l'appli Android, `CapacitorHttp` est activé (`capacitor.config.json`) : les requêtes passent par le réseau natif, sans blocage CORS ; l'appli PC fait de même (`desktop/main.cjs`). Sur le web, Deezer est interrogé en JSONP.

Réglages du créateur : nombre de morceaux (5 à 30), temps pour répondre (10 à 30 s), réponses **illimitées** (défaut, on peut spammer) ou **une seule**, pause entre morceaux **automatique** (15 s de révélation + scores) ou **manuelle** (le créateur touche l'écran pour lancer la suite), son sur **tous les téléphones** ou celui du créateur seulement, **chacun pour soi** ou **par équipes** (nombre d'équipes et de joueurs par équipe au choix).
- L'extrait démarre à un instant aléatoire (entre 0 et 30 s − temps de réponse) et se lance tout seul sur les téléphones, synchronisé. Une seule zone de saisie : tape le titre, l'artiste ou les deux ; une réponse peut contenir les deux. Les parenthèses, « feat. », « Remastered », accents, apostrophes, tirets, espaces, majuscules, ponctuation et petits mots oubliés (« the », « le », « de »…) sont ignorés. Les petites fautes de frappe sont acceptées et rapportent les points normalement (lettre manquante, en trop, fausse ou deux lettres inversées), selon la longueur de la réponse : 0 faute jusqu'à 4 lettres (« Hole » ≠ « Halo »), 1 faute de 5 à 9 lettres, 2 de 10 à 15, 3 au-delà. Un chiffre faux est refusé (« 21 Guns » ≠ « 22 Guns »). Une faute de plus que la tolérance donne « Presque ! » sans point, et on peut réessayer. Réglage : `typoTolerance` / `closeTolerance` dans `src/data/blindtest.js`.
- **Points** (`src/data/blindtest.js`) : chaque partie trouvée (titre, artiste) vaut 300 + jusqu'à 200 selon le temps restant + bonus d'ordre d'arrivée (1er +100, 2e +60, 3e +30). Une seule des deux parties = la moitié des points possibles. **Série** : +50 × (série − 1), plafonné à 250, quand on trouve les deux ; une demi-réponse garde la série sans la faire monter, un raté la remet à zéro.
- **Équipes, score partagé** : l'équipe marque une fois (le titre peut être trouvé par un coéquipier et l'artiste par un autre) ; les coéquipiers ne voient pas les trouvailles de leur équipe et continuent de chercher, sans points en plus. **Somme des joueurs** : chaque joueur marque pour lui, le score de l'équipe est la somme.
- Fin de morceau : réponse, pochette, qui a trouvé quoi, classement ; fin de partie : podium. Retour au lobby avec la playlist conservée. Pendant l'écoute, un classement compact (top 5 + toi) reste visible en haut et bouge dès qu'une réponse est validée. Tests : `node tools/test-blindtest.js`, `node tools/test-playlist.js`, `npm run test-engine` (vote de départ, fusion de playlists).

### Quitter une partie en cours (vote)
Dans tous les jeux, le petit bouton ⏏ en haut à gauche propose de retourner au lobby. Un vote s'ouvre chez tous les joueurs (30 s) : **la majorité des joueurs humains** (les bots ne votent pas) ramène tout le monde au lobby, avec les mêmes équipes et la playlist conservée ; sinon la partie continue. Une proposition par joueur toutes les 40 s au maximum. Seul, le bouton quitte tout de suite.
- Limites : le son d'un navigateur ne démarre qu'après un geste (bouton « Touche pour activer le son » en secours) ; ne mets pas le son sur tous les téléphones si vous êtes dans la même pièce (écho), choisis « Celui du créateur ».

### Célébrité (golf)
Chacun pour soi, 1 à 16 joueurs. Le créateur règle le **nombre de célébrités (5, 10 ou 15)** et l'**indice** (le type de célébrité : acteur, sportif, personnage fictif…). À chaque manche, **tout le monde voit la même photo, très pixellisée** ; chaque proposition fausse (ou « Je sèche ») la rend plus nette **pour celui qui l'a faite** (6 niveaux, `CELEB_LEVELS` dans `src/data/celeb.js`).
- **Score façon golf, le plus bas gagne** : trouvée à la n-ième proposition = n coups (1 = « Trou en un », 3 = « Birdie », 4 = « Par »…) ; pas trouvée en 6 essais, ou à la fin du temps = **10 coups de pénalité** (`CELEB_PENALTY`). Égalités = même rang.
- **Uniquement des célébrités et des personnages fictifs** : la liste (≈ 660 cartes de `cards.csv`) est filtrée par `isCeleb` dans `src/data/celeb.js` — catégories de personnes (acteurs, sportifs, politiques, historiques, internet, rappeurs, peintres, compositeurs, K-pop, dessins animés, jeux vidéo, mythologie, personnages fictifs, personnalités françaises) ; chanteurs, réalisateurs et auteurs seulement s'ils sont dans la liste `ALLOW` ; jamais d'albums, films, séries, groupes, pays, marques, animaux, Pokémon, etc. (`EXCLUDE` retire les groupes/titres qui passeraient entre les mailles). Pour ajouter ou retirer quelqu'un : `ALLOW` / `EXCLUDE`.
- **Réponses acceptées** (`celebCheck`) : le nom entier (accents, majuscules, tirets, fautes de frappe tolérées), ou le **nom de famille seul** (« Macron », « Potter »), pas le prénom seul ; « Louis 14 » = « Louis XIV » ; ce qui est entre parenthèses est ignoré (« Steve (Minecraft) » → « Steve »). « Jaden Smith » n'est pas « Will Smith ». Un « presque » ne compte pas comme trouvé.
- La photo est cherchée sur Wikipédia par le téléphone du créateur (comme Qui est-ce ?) ; la suivante est préparée pendant la manche. Quand quelqu'un a fini, les autres n'ont plus que 30 s. La réponse reste chez le créateur jusqu'à la fin de la manche.
- Réglages `CC_*` dans `src/config.js`. Code : `src/net/hostEngine.js` (section « Célébrité »), `src/screens/Celeb.jsx` (pixellisation sur `<canvas>`), `src/data/celeb.js`. Tests : `tools/test-celeb.js`. Profil : stats Célébrité + succès « Flair de star ».

### Petit bac (jeu classique)
Chacun pour soi, 2 à 16 joueurs (avec un bot pour tester seul). Le créateur règle le **nombre de manches (3, 5 ou 8)**, le **temps pour écrire (60, 90 ou 120 s)** et les **catégories** (« Classiques » : prénom, animal, pays, métier, fruit ou légume, objet ; ou « Mélangées » : 6 tirées parmi 16, `src/data/petitbac.js`).
- **Une manche** : une lettre tirée au hasard (19 lettres, sans K Q W X Y Z U ; jamais deux fois la même dans une partie), annoncée en grand ; chacun écrit **en secret** un mot par catégorie. Le champ devient vert quand la réponse commence par la bonne lettre, rouge sinon. On voit seulement la progression des autres (ex. 4/6), jamais leurs mots : ils restent sur le téléphone du créateur jusqu'à la fin.
- **STOP** : celui qui a tout rempli (avec la bonne lettre) peut appuyer sur STOP ; les autres ont alors 8 secondes pour finir. Sinon, la manche s'arrête à la fin du chrono.
- **Contestation** : toutes les réponses sont dévoilées, catégorie par catégorie. Touche ✋ pour contester la réponse d'un autre ; **si plus de la moitié des autres joueurs la conteste, elle est refusée** (0 point). Quand tout le monde a appuyé sur « Valider » (ou après 60 s), les points tombent.
- **Points** : réponse valide **unique = 10**, **identique à celle d'un autre joueur = 5**, vide / mauvaise lettre / refusée = 0. Les réponses sont comparées sans accents, sans majuscules, sans article ni pluriel simple (« L'éléphant » = « elephants »). Le meilleur total gagne.
- Tout est calculé par le créateur (réponses cachées, contestations, points). Réglages `PB_*` dans `src/config.js`. Code : `src/net/hostEngine.js` (section « Petit bac »), `src/screens/PetitBac.jsx`, `src/data/petitbac.js`. Tests : `tools/test-petitbac.js`.
- Limite : c'est le groupe qui juge si un mot « existe » (pas de dictionnaire). Si un joueur n'est pas d'accord, il conteste.

### Plateau (jeu de plateau façon Mario Party)
Chacun pour soi (1 à 16 joueurs), plateau en boucle de **32 cases** (`src/data/board.js`). Le créateur choisit le nombre de **tours de table : 5, 8, 10 ou 12**. Chacun démarre avec **10 pièces**. Règles calquées sur Mario Party :
- **Ordre de jeu** : au départ, chacun lance un dé ; le plus haut joue en premier.
- **Un tour** : (facultatif) utiliser un objet, puis lancer le dé (1 à 10) ; le pion avance et la case agit. Au bout de 30 s sans jouer, le dé est lancé tout seul.
- **Cases** : 🔵 bleue +3 pièces · 🔴 rouge −3 pièces · 🎁 objet · ❓ événement · 🛒 boutique · 🏴‍☠️ marché noir (objets vicieux) · 🎰 coup de chance (roulette) · 👹 Gredin (case du boss) · 🏁 départ. Pas de pièces en passant par le départ.
- **Gemme** 💎 (l'étoile de Mario Party) : en t'arrêtant ou en passant dessus avec **20 pièces**, tu peux l'acheter ; elle change alors de case (au moins 8 cases plus loin).
- **Dernière ligne droite** : les 5 derniers tours (3 ou 2 sur un plateau court) sont en « sprint » : les cases bleues et rouges comptent **double**.
- **Mini-jeu après chaque tour de table** : la couleur de la dernière case bleue ou rouge de chacun décide du camp ; les modes sont ceux de Mario Party : **chacun pour soi**, **2 contre 2**, **1 contre 3**, **1 contre 2**. En chacun pour soi, seul le vainqueur gagne 10 pièces (égalité : tous les premiers) ; en équipes, **chaque membre de l'équipe gagnante gagne 10 pièces** (égalité 5, défaite 0).
- **Objets (3 maximum)** : 19 objets. Boutique : 🎲 double dé, 🎲 triple dé, 👟 bottes de vitesse, 🛡️ bouclier, 🪤 piège, 🌀 téléporteur, 🪔 lampe magique, 🧲 aimant à gemmes, 🎒 sac à surprises. Marché noir (pour embêter les autres) : 🍄 champignon toxique, ↩️ dé à l'envers, 🦹 voleur, 🔄 échange, 🧰 coffre pilleur, 📞 téléphone du Gredin, 🦖 costume de monstre, 👻 fantôme voleur. Raretés (trouvées, jamais vendues) : ⌛ sablier, 🔁 troc. Prix, effets et cases sont expliqués dans le « ? » du plateau et dans `ITEMS` (`src/data/board.js`).
- **Gemmes bonus en fin de partie** (comme les étoiles bonus de Mario Party, dès 2 joueurs) : 🎮 le plus de mini-jeux gagnés, 🪙 la plus grosse fortune à un moment de la partie, ❓ le plus de surprises. +1 gemme pour le meilleur de chaque catégorie (ex æquo : partagé).
- **Classement** : le plus de gemmes, puis le plus de pièces, puis un lancer de dé pour départager les égalités parfaites.
- Tout est calculé par le créateur du lobby (dés, pièces, pièges cachés). Réglages dans `src/config.js` (`BD_*`). Code : `src/net/hostEngine.js` (section « Plateau »), `src/screens/Board.jsx`. Tests : `tools/test-board.js` (~100 vérifications : dés truqués, tous les objets, cases, bonus).
- **Vue 3D** (par défaut) : une île de nuit avec la boucle de 32 cases lumineuses (un dessin sur chaque case : « + », « − », cadeau, ?, boutique, roulette…), des torches, des arbres, des champignons qui brillent, des échoppes sur les cases boutique, les piques du Gredin et son donjon au centre. **Chaque joueur est représenté par son avatar costumé** (le même que dans l'éditeur) qui **saute de case en case** ; sur une case partagée les pions se mettent en cercle ; une bague de la couleur du joueur et son pseudo restent au-dessus de lui. La **caméra suit le joueur dont c'est le tour** (elle prend de la hauteur sur un grand saut : génie, téléporteur, échange) ; le bouton 🗺️ montre tout le plateau (🎯 pour re-suivre le joueur), vue d'ensemble aussi pendant le tirage de l'ordre. La gemme 💎 est un cristal qui tourne et qui **s'envoie** vers sa nouvelle case ; des bulles « +3 », « −3 », « +1 gemme » montent au-dessus du pion ; pendant le sprint final le ciel et les lumières virent au rouge (« 🔥 ×2 »). Le bouton **2D** (ou `?bd2d` à la fin de l'adresse) affiche la grille d'avant : elle sert aussi de **secours automatique** si l'appareil ne sait pas faire de 3D ou si le chargement échoue. La 3D ne décide de rien : elle lit exactement le même état de partie que la grille 2D (le moteur n'a pas changé) et le chargement de `three` ne se fait qu'à l'ouverture du plateau.
  Code : `src/board3d/` (`layout.js` : tracé de la boucle, calcul pur et testé ; `world.js` : décor ; `Board3D.jsx` : pions, caméra, bulles), `src/screens/Board.jsx` (choix 3D / 2D). Salle d'essai : `?bd3dlab` (partie fictive à 4 joueurs costumés avec des boutons pour faire avancer un pion, gagner des pièces, lancer un grand saut, voir le sprint ; réglable : `&n=3&cur=1&pos=0,5,5,12&sub=order&sprint=1&gem=9`). Tests : `tools/test-board3d.js` (17 vérifications du tracé : cases à égale distance, ordre, chemins) et le test de bout en bout `e2e_board3d` (un téléphone en 3D, un en 2D : les pions sont sur la même case).
- **Pas encore codé** : cases Duel / Banque / Combat de Mario Party, objet « gant de duel », plusieurs plateaux, chemins qui se séparent.

### Mini-jeux (façon Mario Party / Pummel Party)
Pas de lobby en équipes : chacun pour soi à l'écran des réglages (1 à 16 joueurs, un joueur seul peut s'entraîner). Le créateur choisit **5, 8, 10 ou 15 manches** et peut **choisir les mini-jeux joués** (bouton « Choisir » du lobby, au moins 3 ; par défaut tous). Une manche est :
- un **mini-jeu** : présentation + décompte, puis **tout le monde joue la même partie en même temps sur son téléphone** (même graine, donc même difficulté pour tous, contre les mêmes bots). Chaque mini-jeu donne un score (plus haut = mieux) ; classement de la manche : **10 points au premier**, puis décroissant (`rankPoints` dans `src/minigames/meta.js`), égalité = mêmes points, pas fini = 0 ;
- un **test d'amitié** (une manche sur trois, dès 2 joueurs) : 3 questions « Plutôt… ? » (`src/data/friendQs.js`) sur un joueur tiré au sort ; 3 points par bonne devinette, 1 point au joueur visé par personne qui l'a deviné.
- **Modes d'équipe** (dès 3 joueurs, tirés au sort, annoncés à la présentation) : 2 contre 2, 1 contre 3, 1 contre 2… Score d'équipe = moyenne de ses membres ; gagnants 10 points, égalité 5.
Tirage (`makeDraw`) : tous les jeux à égalité, un jeu sorti ne revient pas avant 6 autres tirages.
**18 mini-jeux 3D** avec ton **Doudou** (voir section 10) et trois bots (noms, règles et décors : **créations originales** inspirées du genre, pas des copies) :
- **Arène** : Patate explosive (bombe qui passe de main en main), Poseur de bombes (grille, caisses, bonus), Chars d'assaut (obus qui rebondissent), Roi de la colline (zone qui change de place), Boules de neige géantes, Sumo de l'arène (arène qui rétrécit), **Guerre de peinture** (nouveau : repeins le sol à ta couleur, rouleau = peinture XXL, le plus de dalles gagne).
- **Survie** : Canons en cercle, Plancher fragile, Barre tournante, **Plateformes musicales** (nouveau : les chaises musicales — au « STOP ! » il manque toujours une plateforme, petite musique synthétisée), **Traînées de lumière** (nouveau : ta planche laisse un mur de lumière, virages à angle droit, Turbo ; fais s'écraser les autres).
- **Course** : Grand Prix de karts, Pilotes de l'extrême, Course d'obstacles. **Collecte** : Labyrinthe des gloutons, Chasse aux pièces. **Adresse** : Palets glacés.
Les anciens petits jeux 2D (tape au bon moment, réflexes…) ont été retirés.
- **Salle d'arcade** (menu > « Salle d'arcade », ou `?minilab` à la fin de l'adresse) : jouer seul contre les bots à n'importe quel mini-jeu, filtres par genre. `&g=kart&secs=60` lance directement un jeu avec une durée.
- **Technique** : chaque jeu récent a une **simulation pure** (`src/minigames/sim/*.js`, sans three ni React, graine commune, bots) et un **décor 3D** qui la lit (`src/minigames/three/games*.jsx`, outils communs dans `party.jsx` et `kit3d.jsx`). Règles **testées sans navigateur** : `tools/test-arena.js` (fin de partie, scores entiers dans [0, max], pas de NaN, règles de chaque jeu). `three` (v0.169) est chargé à la demande ; sans WebGL, le jeu affiche un message et compte 0.
- **Ajouter un mini-jeu** : (1) une ligne dans `MINIGAMES` (`src/minigames/meta.js` : id, titre, icône, genre, règle, durée, score max, affichage), (2) une simulation dans `src/minigames/sim/` + un composant `({ seed, seconds, onFinish, color, look })` dans `three/games*.jsx` qui appelle `onFinish(score)`, (3) une ligne dans `src/minigames/index.js`.
- **Honnêteté** : le score est calculé sur le téléphone du joueur ; le créateur le limite au maximum possible de chaque jeu.
- Réglages dans `src/config.js` (`MG_*`). Code : `src/net/hostEngine.js` (section « Mini-jeux »), `src/screens/MiniGames.jsx`, `src/screens/MiniLab.jsx`. Tests : `node tools/run-engine-tests.mjs`.

### Frise (frise musicale)
Une équipe = une frise. À son tour, un joueur de l'équipe (ils tournent) écoute un extrait de 30 s dont il ne sait ni le titre ni l'année, et touche l'endroit de la frise où l'insérer (avant, entre ou après les cartes déjà posées, rangées de la plus ancienne à la plus récente).
Puis l'année est révélée : bien placé (l'ordre des années reste croissant ; **même année = juste des deux côtés**), la carte rejoint la frise ; sinon elle est défaussée. Chaque équipe démarre avec 1 carte (année visible). La **première équipe qui atteint l'objectif gagne : 10, 15 ou 20 cartes, au choix du créateur**. Si la playlist est épuisée avant, la frise la plus longue gagne. Une frise seule (1 équipe, même 1 joueur) est possible pour s'entraîner.
- **Source : ta playlist Spotify.** Dans le lobby, le créateur colle le lien de la playlist (même mécanisme que le blind test : lien lu dans l'appli Android ou PC, 100 premiers morceaux ; « + Ajouter une autre playlist » ou liste « Artiste - Titre » pour en avoir plus). Le **son** est l'extrait de 30 s du morceau retrouvé sur Deezer (Spotify ne donne plus d'extraits aux nouvelles applis), invisible pour les joueurs.
- **Années** (`src/data/musicbrainz.js`) : l'année de l'album Spotify/Deezer est fausse pour un remaster ou un best-of. L'appli cherche donc chaque morceau (titre nettoyé de « Remastered », « Live », « feat. »…) sur **MusicBrainz**, ne garde que les enregistrements qui correspondent au titre ET à l'artiste, et prend la **plus ancienne date de sortie**. Si MusicBrainz et Deezer ne sont pas d'accord de façon suspecte, ou si MusicBrainz ne connaît pas le morceau, la date est **incertaine** : le morceau est écarté (réglage « Morceaux dont l'année est incertaine » : écartés / acceptés ; la révélation signale alors « date à vérifier »).
  La préparation se fait pendant la partie, une carte d'avance (MusicBrainz impose 1 requête par seconde) : un écran « Préparation des cartes… » de quelques secondes au lancement.
- Le créateur est l'arbitre : seul son téléphone connaît l'année avant la révélation (elle n'est jamais dans l'état diffusé aux autres).
- Réglages : `TL_GOAL_OPTIONS`, `TL_PLACE_SECONDS` (60 s pour placer), `TL_REVEAL_SECONDS` dans `src/config.js`. Code : `src/net/hostEngine.js` (section « Frise musicale »), `src/screens/Timeline.jsx`.
- **Non vérifié en réel** : depuis le développement, ni MusicBrainz ni Deezer n'étaient joignables ; la logique des dates est testée avec des réponses simulées (`node tools/test-dates.js`). À tester sur téléphone : lien Spotify réel, dates (le format de réponse de MusicBrainz est celui de sa documentation), son.
- Idée pour plus tard : jetons (passer un morceau, voler une carte), lecture de playlists Spotify de plus de 100 titres via la connexion Spotify.
Tests : `npm run test-engine` (moteur : tours, placement, égalité d'année, victoire, dates incertaines, fuite de l'année), `node tools/test-dates.js`, `npm run test-all` (tout).

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

Bouton **Mon profil** dans le menu (et ☺ dans le lobby). Le profil est lu et écrit **sur le téléphone** (localStorage, clé `ph-profile-v1`), même hors ligne.
Sans compte, il y reste (il disparaît si on efface les données de l'appli) ; **connecté par e-mail** (voir 2 ter), il est aussi sauvegardé sur ton compte et te suit d'un téléphone à l'autre.

- **Apparence** : ton **personnage 3D** (voir ci-dessous), 10 bordures (certaines animées) et 16 couleurs de fond. Les autres joueurs voient ton apparence et ton niveau dans le lobby et pendant les parties.
  Tu peux la changer dans le lobby : tout le monde voit le changement tout de suite.
- **Personnage 3D = un « Doudou »** (`src/avatar3d/`) : une petite créature ronde et douce (grands yeux brillants, joues roses, petite bouche, oreilles, petits bras et pieds), entièrement fabriquée en code (aucun modèle à télécharger). **16 espèces** (chat, lapin, ourson, renard, chiot, souris, grenouille, pingouin, poussin, hibou, axolotl, fantôme, dragon, slime, extraterrestre, robot), 24 couleurs, 14 motifs, 11 yeux, 10 bouches, joues et détails (taches de rousseur, moustaches, pansement…), et une **garde-robe** : 24 couvre-chefs, 9 lunettes, 9 accessoires de cou, 10 objets de dos (sac, cape, ailes…), 20 tenues (une couche de tissu qui épouse le corps : sweat, salopette, robe de mage, combinaison numérique, armure…) et 7 chaussures. Beaucoup de pièces se débloquent par niveau ou par succès.
  Le visage est **peint** sur une pièce qui épouse le corps, avec des **expressions** (cligne des yeux, joie, tristesse, colère, surprise, étourdi, amoureux) ; l'animation se fait par écrasement / étirement (course qui sautille, saut, chute, étourdi, victoire, assis, sur une planche) et **12 émotes**.
  **Personnalisation** (bouton « Personnaliser » du profil, ou l'avatar du menu) : le Doudou en grand sur sa plateforme de scan ; on touche une zone (**Tête, Visage, Corps, Dos, Pieds**), la caméra s'approche, une fenêtre montre les apparences (vignettes 3D de TON Doudou avec la pièce), on essaie, on applique, il se re-matérialise. Bouton **Émotes** (roue d'émotes) aussi dans le **lobby** : la bulle s'affiche à côté de ton nom chez tout le monde.
  Stockage : une chaîne « C » + 22 caractères (un par réglage, `src/avatar3d/schema.js`) ; un ancien personnage (humain ou haricot) devient automatiquement un Doudou, toujours le même. Code : `doudou-data.js` (catalogue), `doudou.js` (corps, visage, oreilles, animation), `doudou-paint.js` (textures : pelage, visage, tissus), `doudou-gear.js` (garde-robe). Outils : `?avlab&slot=espece` (une pièce par vignette, `slot=hat`, `slot=outfit`…), `?avlab&n=12` (au hasard), `&view=face|bust|full|back|feet`, `&pose=run|cheer|stun…`, `&emote=wave&et=1` ; test : `node tools/test-avatar3d.js`.
- **Niveaux** : de l'XP à chaque partie terminée (20 de base, +30 victoire, +10 égalité, + un bonus selon les cartes/images/morceaux trouvés). Niveau max : 50.
- **Déblocages** : par niveau (ex. Flamme niv. 2, Couronne niv. 20) ou par **succès** (18 succès : séries de victoires, 20 morceaux trouvés, être le premier 10 fois, etc.).
  Toucher un cadenas indique comment le débloquer.
- **Stats** : parties, victoires / défaites / égalités, % de victoires, série en cours et meilleure série, et par jeu :
  Time's Up (cartes trouvées/passées, précision, tours joués, parties Bonus), Qui est-ce ? (images trouvées, premier à trouver, temps moyen, record),
  Blind test (morceaux trouvés en entier, titre ou artiste seulement, **temps de réponse moyen**, réponse la plus rapide, meilleure série, parties sans faute), Petit bac (réponses valides et uniques), Célébrité (trouvées, moyenne de coups, trous en un), et les 10 dernières parties.

Comment ça marche : le créateur du lobby mesure les statistiques détaillées pendant la partie (`pstats` dans l'état, `gameNo` = numéro de partie) ;
à l'écran de fin, chaque téléphone calcule son propre résultat (`summarize`) et l'ajoute à son profil (`recordGame`), une seule fois par partie.
Code : `src/data/profile.js` (catalogues, niveaux, succès, règles), `src/lib/useProfile.js`, `src/screens/Profile.jsx`, `src/ui/Avatar.jsx`.
Pour ajouter une bordure / une couleur / un succès : une ligne dans `profile.js` (+ le style CSS `.pav.b-<id>` pour une bordure). Pour ajouter une pièce de Doudou : une option à la FIN de sa liste dans `doudou-data.js` (+ son dessin dans `doudou-gear.js` ou `doudou-paint.js`). `node tools/test-profile.js` et `node tools/test-avatar3d.js` vérifient la logique.

**Sécurité** : l'apparence reçue du réseau est filtrée (seuls des identifiants du catalogue passent). Le statut « débloqué » est local : quelqu'un qui bidouille son
stockage peut s'équiper d'éléments verrouillés chez lui, ce qui est sans conséquence (purement cosmétique).

## 11. Heavy is the Crown (jeu de cartes à collectionner, anciennement « Trône des Mondes »)

Le nom est dans une seule constante (`GAME_NAME` dans `src/tcg/rules.js`) : il suffit de la changer pour renommer le jeu partout.

**Nouveautés de Heavy is the Crown** :
- **Familles mélangées librement** : un deck prend n'importe quelles cartes de n'importe quelles familles ; seules comptent les règles de construction
  (voir « Decks » plus bas). Plus de famille alliée ni de choix de type ou de région.
- **Plus de bonus de famille** : comme dans le Trône de Fer JCE, où la carte de faction n'a aucun effet (elle identifie le deck et reçoit le Pouvoir),
  la famille d'un deck (la plus présente dans ses cartes, `mainFamily` dans `deck.js`) n'a aucun effet ; les bonus de type, de région et de maison non plus
  (`FAMILY_BONUSES = false` dans `rules.js`, les anciens textes restent dans les fichiers de famille).
- **Lobby à code et amis** (`TcgLobby.jsx`, appli PC ou `?trone`) : voir « Jouer » plus bas.
- **Bannières de profil** verticales, **créateur de deck** refait, **règles en plusieurs pages** (bouton « ? »).

Les familles :
Code Lyoko, Umbrella Academy, Toy Story, One Piece, Pokémon (types et régions, avec leurs Dresseurs : voir plus bas), Star Academy, Les Mystérieuses Cités d'or,
Les Légendaires, De cape et de crocs, Hunger Games, Cowboy Bebop, La Horde du Contrevent, Élite, Teen Wolf, Marvel, DC, Stranger Things, Scooby-Doo (que des gentils)
League of Legends (les **régions** de Runeterra), Harry Potter (les **maisons** de Poudlard),
Star Wars (les **camps** : Jedi, Sith, Rébellion, Empire, Pègre), Game of Thrones (les **factions** : les grandes maisons, la Garde de Nuit, les Marcheurs blancs)
Le Seigneur des Anneaux (les **peuples** de la Terre du Milieu), Le Monde de Narnia, Studio Ghibli,
Gundam (les **univers** : Fédération, Zeon, After Colony, Cosmic Era, Anno Domini, Post Disaster, Ad Stella) et JoJo's Bizarre Adventure, plus des cartes Neutres.
Types, régions, maisons et camps sont écrits dans la ligne des traits de chaque carte ; certaines cartes s'y réfèrent, mais ils ne donnent plus de bonus.
**Cartes neutres** (`cards/neutral.js`, 42 cartes) : jouables dans tous les decks. Les **communes, peu communes et rares sont offertes à tout le monde**
(2 exemplaires de chacune, rien à débloquer : `giftNeutral` dans `progress.js`) et ne sortent jamais des boosters, de la boutique ni des Portails ;
les **épiques et légendaires** se gagnent comme les autres cartes (boosters, boutique, Portails) : Sherlock Holmes, L, Ryuk et le Death Note, Loid et Yor Forger,
Shrek, Doc Brown et la DeLorean, le Vote de confiance, et les futures cartes 7 neutres. En plus des cartes de base (Mercenaire, Espion,
Portail interdimensionnel…), des personnages d'univers trop petits pour avoir leur famille : Perceval, Karadoc et la Table ronde (Kaamelott),
Marty McFly, Doc Brown et la DeLorean (Retour vers le futur), Shrek, l'Âne, le Chat Potté et le marais (Shrek), Anya, Loid et Yor Forger (Spy x Family),
L, Ryuk et le Death Note (Death Note), Sherlock Holmes et le Docteur Watson, l'Imposteur (Among Us), le Creeper (Minecraft), Kirikou et Rémy (Ratatouille).
Les decks de départ ne s'en servent jamais pour se compléter (option `fill: false`).
2282 cartes à collectionner (personnages, lieux, objets, événements) en 5 raretés, et 62 Scénarios (les « intrigues ») qui mélangent tous les univers.

**Les cartes de coût 7** (les plus puissantes, souvent légendaires ; **toujours brillantes**) : chaque grande famille en a plusieurs, et un même personnage peut avoir deux versions à 7
(ex. Monkey D. Luffy en Gear Fourth et en Gear Fifth : une seule des deux par deck). Elles ont des pouvoirs à part, tirés de leur univers :
le Haki des rois (Luffy, Gear Fourth : les petits personnages n'osent pas défendre), le festin de Sanji (il redresse tout l'équipage),
le séisme de Barbe Blanche (il agenouille tous les petits adversaires en arrivant), Kaido impossible à tuer (il s'agenouille pour survivre),
Barbe Noire et Sylas qui volent du Pouvoir, la rumeur d'Allison (« J'ai entendu une rumeur… » : un adversaire ne peut ni attaquer ni défendre),
Doctor Strange, Jérémie et Viktor qui ramènent un allié de la pile des morts, Captain America qui fait entrer un Avenger, Lex Luthor et Lotso
qui font payer plus cher les personnages adverses, Scarlet Witch, Fred et Veigar qui gèlent une cible (elle ne se redresse pas au round suivant),
Peter Hale qui revient en main après sa mort, Jet Black qui marque en défense… Sur la table, une carte gelée ou neutralisée porte une étiquette.
Les plus connus ont deux versions à 7 aux pouvoirs différents : Dracaufeu (et Méga-Dracaufeu X), Mewtwo (*Génétique* / *L'évadé du laboratoire*), N Harmonia,
Katniss (*Le Geai moqueur* / *La fille du feu*), Onze (*Pouvoirs déchaînés* / *Elle ferme le portail*), Woody, Buzz l'Éclair (et son mode espagnol),
Wolverine (*Arme X* / *Old Man Logan*), Jean Grey (*Le Phénix* / *Le Phénix noir*), Batman, Superman, Scooby-Doo, Aelita…
Marvel et DC suivent maintenant les comics : X-Men, Quatre Fantastiques, Fatalis, Galactus, Spider-verse et Défenseurs ; Corps des Green Lantern, Bat-famille,
Teen Titans, Doomsday, Ra's al Ghul… (decks de départ : Les X-Men, Le Spider-verse, Les Quatre Fantastiques, Le Corps des Green Lantern, La Bat-famille).
Code Lyoko a neuf cartes 7 dont aucune ne partage ses deux pouvoirs avec une autre carte 7 du jeu : Aelita (*Fille de Franz Hopper* / *L'ange de Lyoko*),
Jérémie (le retour vers le passé), Ulrich (Super sprint, et son Impact augmente la revendication), Yumi (sa télékinésie renvoie un vaincu en main),
Odd (ses flèches laser font fuir les petits défenseurs ; neuf vies), William (il mène l'assaut des monstres et XANA le reprogramme),
XANA (il active une tour : un monstre entre en jeu) et le Kolosse (il écrase un lieu ou un objet du perdant). Aelita a aussi deux versions moins chères
(4 : *L'elfe de Lyoko*, qui redresse un allié ; 5 : *La Lyoko-guerrière*) ; l'ancienne « Aelita Stones » 4 est devenue cette Aelita Hopper 4. L'événement *Champ de Force* (l'attaque d'Aelita, 1 or) fait perdre 2 force à un adversaire, 4 si Aelita est dans le défi,
et le tue s'il tombe à 0 ; les *Ninjas de Tyron* (Code Lyoko Évolution) surgissent du sol (Embuscade) et immobilisent un petit personnage avec leurs encodeurs.
Franz Hopper 7, le Clone de William et Anthea Hopper ont été retirés : les exemplaires possédés sont remboursés en Éclats (valeur de recyclage),
et les sauvegardes suivent les cartes remplacées (`RENAMED`, `REPLACED`, `RETIRED` dans `cards/index.js`).
League of Legends : Veigar a une version 6, *Le Seigneur du mal* (sa Matière noire tue un petit vaincu, et il gagne du Pouvoir à chaque mort adverse).
Scooby-Doo gagne Sammy « à 1 % de sa puissance », Véra, Daphné, Scrappy et l'École des Goules de Miss Grimwood (nouveau deck de départ).
Les textes s'accordent au féminin (« Lissandra devrait être tuée, remettez-la… » ; liste dans `cards/gender.js`).

**Tester sur son compte en local** (`npm run dev`, `npm run desktop`) : le fichier `.env` à la racine du projet (jamais versionné) donne
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (les mêmes que les secrets GitHub) ; sans lui, l'appli locale reste en mode local, sans compte.
`VITE_TESTEURS` (adresses séparées par des virgules) : sur un ordinateur où elle est remplie, Heavy is the Crown > Paramètres montre des outils de test
pour le profil local (pas connecté) et pour les comptes de la liste : Éclats, jetons de brillance, tickets de portail, boosters, « Débloquer les cartes illustrées »
(2 exemplaires de chaque carte qui a une vraie image) et **« Recevoir un deck à thème »** (ses cartes et le deck prêt à jouer, sans toucher au deck de départ :
pour les comptes créés avant les decks à thème ; `grantTheme` dans `progress.js`), un par un ou d'un coup : **« Les 8 de départ »** ou **« Les 16 autres »** (`grantAllThemes`, `{ extra: true }` pour les autres ; un deck déjà reçu n'est pas doublé). Connecté, c'est sauvegardé sur le compte. Les builds GitHub n'ont pas cette variable : personne d'autre ne les voit.
« Éclats et jetons à volonté » (activé par défaut, réglable au même endroit) : jamais moins de 100 000 Éclats et 500 jetons sur ces profils.
**Decks et cartes retirées** : si une carte disparaît du jeu, chaque deck qui la contenait est complété tout seul (cartes possédées d'abord,
sinon cartes du deck de départ de la famille offertes) ; les decks Code Lyoko abîmés par le retrait de Franz Hopper 7, du Clone de William
et d'Anthea Hopper (48/50) sont réparés à l'ouverture. Dans le constructeur, « Compléter avec mes cartes » remplit les places libres d'un deck
avec des cartes possédées (et les scénarios manquants avec la sélection conseillée).
**Jouer** (appli PC, ou `?trone`) : « Jouer » ouvre le **lobby du jeu** (`TcgLobby.jsx`). **Créer le salon** donne un **code de 6 caractères**
(sans 0/O ni 1/I/L) à copier et à donner ; les amis le tapent dans « Rejoindre avec un code ». Les salons du jeu ne sont pas dans la liste publique
de Party Hub, et le jeu y est verrouillé (`settings.tcg`). Dans le salon, chaque joueur est sur sa **bannière** (photo dans son cadre, pseudo, niveau, deck choisi,
couronne du créateur) ; les places libres proposent « Inviter un ami » et « Ajouter un bot » ; dessous, mon deck, les réglages du créateur (objectif, temps)
et « Lancer la partie ». Le bouton **« ? »** ouvre les règles en plusieurs pages (`RulesGuide.jsx` : onglets, boutons < et >, flèches du clavier) ;
il est aussi sur l'accueil du jeu. Après la partie, retour au salon.
**Amis** (il faut être connecté ; une fois `supabase/amis.sql` exécuté) : chaque joueur a un **code ami** (8 caractères) ; on cherche quelqu'un par pseudo
ou par code, on lui envoie une demande, il l'accepte (liste rafraîchie toutes les 15 s). On voit qui est **en ligne** (ou dans un salon, ou en partie) et on
l'**invite** d'un clic : un bandeau « X t'invite dans son salon » avec « Rejoindre » apparaît chez lui. Depuis le salon, « Ami » sur la bannière d'un joueur
lui envoie une demande. Tables `tcg_players` (pseudo, code ami, photo, cadre, bannière, niveau ; jamais l'e-mail) et `tcg_friends` (demandes et amitiés),
avec RLS ; la présence en ligne et les invitations passent par Realtime (canal `tcg-online`, sans table). `src/lib/friends.js` (vrai serveur, ou simulé
pour les tests), `src/lib/useFriends.js`.
Dans Party Hub (web, APK), on joue toujours depuis le lobby de Party Hub : Jeu > **Heavy is the Crown** ; 2 à 4 joueurs, chacun avec un deck valide (choisi dans le lobby), bots possibles.
Réglages : objectif de Pouvoir (15, ou 10 en partie rapide) et temps par décision (trop long : l'ordinateur joue le coup). Un round = 7 phases
(Scénario, Pioche, Recrutement, Défis, Domination, Redressement, Taxe), défis de Combat / Ruse / Influence, revendication, Domination, doublons, mots-clés
(Célèbre, Discret, Intimidation, Génie, Pillard, Duel, Embuscade, Limité…). Le bouton « ? » (accueil du jeu, lobby) explique les règles.
Pendant la partie (en paysage, plein écran ; l'appli Android tourne l'écran toute seule, l'appli PC garde l'écran tel quel) : ton plateau en grand et ta main en éventail en bas. Les pastilles des joueurs, en haut,
font passer sur le plateau d'un adversaire (« Ma table » pour revenir) ; pendant un défi, toucher la pastille d'un adversaire le choisit comme défenseur.
On touche n'importe quelle carte visible (scénarios compris) pour la lire en grand. Journal de partie (icône horloge).

**Accueil du jeu** (bouton « Heavy is the Crown » du menu de Party Hub, dans l'appli PC après l'écran titre, ou depuis le lobby ; `src/tcg/ui/HubHome.jsx`) : un écran épuré, façon lobby de jeu de cartes.
- En haut : ta **photo de profil du jeu** (pas ton personnage Party Hub) avec ton pseudo et ton niveau, tes boosters à ouvrir, tes **Éclats** (le diamant ; le « + » ouvre la boutique) et les **paramètres du jeu**.
- Derrière tout l'accueil : la **salle en 3D** (`table3d/TableScene.jsx` et `table3d/tableWorld.js`, three.js chargé à part) : une **table ronde en bois**
  (planches, filet de laiton, vernis), six **chaises** à dossier haut (sans personne), une grosse lampe chaude qui vacille un peu. **Un plateau par joueur** :
  le tien devant toi, et ceux de deux autres joueurs (des decks à thème d'autres familles, qui changent chaque jour) devant leurs places, qu'on voit en
  partie au fond ; **au milieu de la table**, ce qui est commun : le trésor (piles d'Or), les trois défis (Combat, Ruse, Influence) et la réserve de Pouvoir.
  Ton plateau est le vrai (`HubBoard.jsx`, en CSS 3D, ci-dessous) : il envoie sa place à l'écran (événement `tcg-board`) et la caméra se cale pour
  que la table soit juste dessous. Ombres et grandes textures sur PC ; plus légère sur téléphone ; immobile avec les animations réduites ; le rendu
  s'arrête dès qu'un autre écran la recouvre. Dans un navigateur (Party Hub), l'accueil met sa propre salle (sans l'écran titre).
- Au centre, en grand : **ton plateau** (`HubBoard.jsx`, tout en CSS 3D, sur la table ronde : seulement ton côté, sans cadre en bois).
  De ton côté, ton deck joué posé comme en partie : tes 4 personnages les plus forts (l'un agenouillé, un autre avec un objet **attaché** glissé dessous, des **jetons de Pouvoir**),
  puis ta rangée, chaque emplacement gravé dans le tapis avec son nom : **Scénarios** (l'actif posé sur deux déjà joués), **Famille**, **Lieu**, **Pioche**, **Défausse**
  et **Morts** (un personnage éteint, une tête de mort dessus) ; le jeton **1er joueur** et **ton Or**. Sans la table ronde (`ontable` absent), en face, **l'adversaire du jour** (le deck de départ d'une autre famille,
  le même toute la journée, jamais Star Academy) : ses personnages face visible tournés vers lui, sa rangée (scénario face cachée, famille, lieu, pioche, défausse), sa main en éventail
  et son Or. Au milieu, la ligne qui sépare les camps : le **Trésor**, les trois **défis** (Combat, Ruse, Influence) et la réserve de **Pouvoir** (15 pour gagner) ;
  les blasons des deux familles en filigrane. Toutes les cartes face visible (les siennes aussi) se soulèvent au survol et s'ouvrent en grand ; les pioches se **mélangent**,
  la main adverse se bat, son scénario se révèle un instant, les pièces d'Or sautent en tournant, les défis s'illuminent. À l'arrivée, les cartes sont distribuées sur la table.
  Le plateau se met à l'échelle de la place (et se recentre) ; sur grand écran ses coins passent au-dessus et au-dessous des boutons des côtés, sur téléphone les bords de la table débordent un peu.
- À gauche, **« Tes cartes »**, chaque bouton avec une phrase qui dit à quoi il sert : **Mes decks** (créer, modifier, choisir le deck que tu joues),
  **Mes cartes** (les cartes que tu possèdes : chercher, recycler les doubles, illustrations) et **Album** (toutes les cartes du jeu, celles qui te manquent en gris).
- À droite, **« Boutique et défis »** : la **Boutique** et **Quêtes et succès** (pastilles : boosters à ouvrir, tickets offerts, nouvelle boutique, récompenses à récupérer…).
  **Boutique** (`ShopHub` dans `Hub.jsx`) : un bandeau vertical à **4 onglets**, et le contenu de l'onglet en grand à côté : **Boutique du jour** (6 cartes à l'unité),
  **Portail des Légendes** et **Monde à l'honneur** (une bannière par onglet, jamais côte à côte ; l'onglet montre l'illustration de ta cible) et **Boosters** (ceux à ouvrir,
  un par un ou par 5, et ceux à acheter). Sur téléphone, le bandeau est étroit (icône et nom court).
  En haut, à côté des boosters, des jetons et des Éclats : les **tickets de portail** (sur grand écran). La pastille des boosters ouvre l'onglet Boosters, celle des tickets
  le Portail des Légendes, celle des Éclats la boutique ; le bouton « Boosters » du lobby et de la fin de partie ouvre aussi l'onglet Boosters.
- En bas : **Jouer** (appli PC : le lobby du jeu ; Party Hub : crée un lobby réglé sur Heavy is the Crown, ou ramène au lobby si tu viens de là) et le deck joué (« Changer »). Sur téléphone : le plateau en haut, puis Jouer et les cinq boutons.
  Chaque bouton ouvre sa partie en plein écran, avec un retour à l'accueil ; changer de partie fait glisser une carte (son).
- **Profil du jeu** (`TcgProfile.jsx`) : statistiques du jeu de cartes (parties, victoires, défis gagnés, éliminations, Dominations, boosters, collection, brillantes, cartes 7, succès).
  **Photo** : n'importe quelle carte 7 que tu possèdes (par défaut, celle du deck joué ; sans carte 7, le blason du jeu).
  **Cadres** à débloquer par des missions : Bronze (offert), Argent (5 victoires), Duelliste (60 défis gagnés), Voyageur des mondes (8 familles jouées), Bourreau (40 éliminations),
  Collectionneur (300 cartes différentes), Or (25 victoires), Holographique (15 brillantes, animé), Dominateur (30 Dominations), Légende (niveau 20, animé), Trône (tous les succès, avec une couronne).
  **Bannières** (`Banner.jsx`, `BANNERS` dans `progress.js`) : un étendard vertical suspendu à une hampe dorée, derrière la photo, dans le lobby et en tête du profil.
  Trois offertes (Héraut, Aube, Braise), sept par mission (Marée : 5 parties ; Conquérant : 10 victoires ; Prisme : 10 brillantes ; Portail : 30 invocations ;
  Archives : 250 cartes différentes ; Multivers : 10 familles jouées ; Souverain : niveau 25) et **une par famille** (aux couleurs et au décor de la famille),
  débloquée avec 20 cartes différentes de cette famille. Le **pseudo** se change aussi dans le profil (appli PC : il n'y a plus le menu de Party Hub).
- **Réglages** (roue dentée, `TcgSettings.jsx` + `settings.css`, propres à Heavy is the Crown et enregistrés sur l'appareil, `src/tcg/prefs.js`), présentés comme un menu
  d'options de jeu vidéo : les catégories dans une colonne à gauche (une rangée d'onglets sur téléphone), leurs options à droite avec de grands interrupteurs,
  des choix et un curseur. **Compte** (connecté ou profil local, pseudo), **Partie** (ouverture des boosters : animation ou directe, règles du jeu),
  **Affichage** (animations complètes ou réduites, **taille des cartes** dans la collection, l'album et l'outil de deck sur grand écran : petites, moyennes,
  grandes, via la variable CSS `--tcg-k`, plein écran sur PC), **Son** (sons du jeu, volume, son au survol), **Testeur** (si `VITE_TESTEURS`), **Aide** (règles, raccourcis clavier).
  Ces sons s'appliquent dans l'accueil, les parties du jeu et pendant les parties de Heavy is the Crown (`sfx.enter("tcg")`) ; les autres jeux gardent les réglages du profil.

**Collection** :
- **Deck de départ** : choisi une seule fois parmi **8 decks à thème** faits à la main (`cards/themes.js`) : Team Rocket (Giovanni et Mewtwo à 7), Orchidia (Jadina et Jadilyna),
  Hawkins (Onze et Hopper), Gryffondor (Harry et Dumbledore), Demacia (Galio et le roi Jarvan IV, avec Poppy), Sith (Dark Vador et Dark Sidious), DC Comics (Superman et Supergirl)
  et La Meute de Teen Wolf (Scott et Derek). Deux cartes 7 par deck, et personne d'incohérent dedans (pas de Sacha ni de Pikachu chez la Team Rocket, pas de Queudver
  chez les Gryffondor, pas de Sylas chez Demacia, pas de méchant avec Superman et Supergirl). Il débloque ses 50 cartes (dont une version exclusive : Shimy 4 dans Orchidia,
  Dustin 4 dans Hawkins) + 300 Éclats et 3 boosters. Les autres decks de départ (`starters` de chaque famille) ne sont plus proposés : ce sont ceux des bots,
  et les modèles de « Compléter avec mes cartes ». Un ancien joueur garde le sien.
  Équilibrage (`node tools/test-tcg.js --sim 4000 --themes` : les 8 decks entre eux) : entre 41 % et 60 % de victoires environ (DC en tête, Hawkins en dernier), sans aucun bonus de famille.
  Ce que les bonus apportaient est passé sur des cartes : Intimidation sur les Sith et les Inquisiteurs (sauf les moins chers) et sur les loups-garous de Teen Wolf ;
  +1 force aux membres de la Meute, aux humains de Beacon Hills (Shérif, Deaton, Melissa) et à la bande de Hawkins (Mike, Dustin, Lucas 3, Will, Max) ;
  la ville de Hawkins (+1 force en défense pour Hawkins), la Grande Cité de Demacia (+1 en défense pour Demacia) et la salle commune de Gryffondor
  (+1 en attaque pour Gryffondor), uniques ; la clinique de Deaton fait recruter moins cher. Forteresse et Themyscira sont uniques (plus d'empilement),
  Power Girl passe à 5 de force. Decks : un seul Artikodin et le Magicarpe de James chez la Team Rocket, Albion (le père de Shimy) à la place du Diplomate
  à Orchidia, le manoir Hale en double dans la Meute et la ville de Hawkins en double.
- **Les autres decks à thème** (`MORE_THEMES` dans `cards/themes.js`, `extra: true`) : 16 decks faits à la main en plus des 8 de départ, **jamais proposés
  au premier lancement** (`baseThemes()` ne garde que les 8 ; `chooseStarter` refuse les autres). Ils servent de modèles (« Partir d'un deck à thème »,
  en deux groupes) et les bots les jouent. Par région : **Les Champions de Hoenn** (Rayquaza et Marc à 7), **La Ligue de Sinnoh** (Cynthia et Giratina),
  **Les Clans de Hisui** (Arceus et Dialga, Adamantin et Nacchara), **Illumis** (Xerneas et Dianthéa, A.Z. et les héros de Légendes Z-A),
  **Les épreuves d'Alola** (Solgaleo et Lunala, Doyens et Capitaines), **Le défi des Arènes de Galar** (Zacian et Tarak, tous les Champions),
  **La Ligue de Paldea** (Kassis et Miraidon, Conseil 4 et Team Star). Par bande d'amis : **Les amis de l'Académie** (Koraidon, Menzi, Pepper, Pania, Turum),
  **Sacha et ses compagnons** (Sacha et Pikachu, Pierre, Ondine, Aurore, Iris, Serena, Lilie), **Tcheren et Bella** (Tcheren et N, Unys).
  Par maître de type : **Les maîtres de l'Eau** (Kyogre et Marc), **Les maîtres Spectre** (Giratina et Agatha), **Les maîtres Dragon** (Méga-Dracolosse et Peter).
  Les méchants : **Team Arc-en-Ciel Rocket** (Giovanni et Lysandre, avec Ghetis, Guzma, Elsa-Mina, Ariane, Lance, Mars, Apocyne, Liv, Corvault).
  Et **Les Légendaires** (Danaël et Razzia à 7) et **La Trinité** DC (Superman et Batman à 7, Wonder Woman 6). Deux cartes 7 au plus (une pour l'Académie).
  Équilibrage contre les 8 decks de départ (`--sim … --themes`) : entre 41 % et 61 % ; les 24 decks ensemble : entre 40 % et 63 %.
- **Decks** : **toutes les familles se mélangent** ; un deck qui ne respecte pas les règles reste un brouillon et ne peut pas être joué (message d'erreur, ex. Shimy 7 et Shimy 4 dans le même deck).
  Règles : 50 cartes + 7 scénarios différents ; 2 exemplaires max par carte, mais **une carte 7 est unique (1 exemplaire)** ; **une seule version par personnage**
  (Aelita 5 ou Aelita 7, pas les deux : les autres versions sont grisées) ; au plus 3 cartes de coût 7+ (différentes), 6 de coût 6, 8 de coût 5 ;
  au moins 24 personnages ; au plus 18 objets + événements et 10 lieux. C'est tout : plus de famille principale imposée ni de famille alliée.
  **Mes decks** : chaque deck montre ses familles ; « Créer un deck » part d'un deck vide, « Partir d'un deck à thème » d'une copie d'un des 24 decks à thème
  (les 8 de départ, puis les autres ; les cartes qui manquent sont signalées).
  **Outil de deck** (`DeckBuilder.jsx`, `deckbuilder.css`) : un nouveau deck commence par **« Comment veux-tu commencer ? »** (un deck à thème, « Remplir
  avec mes cartes » d'une famille choisie, ou un deck vide). En haut, la **prochaine étape** en une phrase (« Ajoute encore 18 cartes, dont 6 personnages »,
  « Retire 3 cartes », « Choisis encore 2 scénarios »…) avec son bouton, les trois étapes (cartes, scénarios, enregistrer) et une barre de progression ;
  toutes les règles cochées sont dans « Les règles ». À gauche les cartes : recherche, type, et le reste replié dans **« Filtres et tri »** (mes cartes,
  coût, rareté, tri, familles ; les filtres actifs restent visibles en pastilles qu'on retire d'un clic). Sous chaque carte, un bouton **« Ajouter »**, puis
  **− 1/2 +** une fois dans le deck (la carte est cerclée de vert, avec ×1 ou ×2). À droite le deck : la liste par type avec − / + et la **corbeille**,
  les compteurs (personnages, lieux, objets et événements), le détail replié (familles, courbe). Sur téléphone : trois onglets (Ajouter, Mon deck, Scénarios).
- **Album** (Collection > « Album : toutes les cartes ») : toutes les cartes qui existent, avec un en-tête par groupe et son compte, filtres
  Obtenues / Manquantes / Brillantes, famille, type et rareté. **Tri** (album, collection et outil de deck, `sortCards.jsx`, gardé sur l'appareil) : par famille,
  coût, force, rareté, nom ou exemplaires, et le bouton du sens juste à côté (croissant / décroissant, A → Z / Z → A, légendaires d'abord…). Celles qui manquent sont grisées mais s'ouvrent en grand (toujours grisées).
  En grand, la carte s'incline un peu sous le doigt ou la souris (et quand on penche le téléphone) ; le reflet arc-en-ciel des brillantes suit la direction
  et se renforce quand on penche ou agite la carte (pas de balayage lumineux en grand ; sur la table et dans la collection, un éclat passe toutes les 11 s environ,
  décalé d'une carte à l'autre), et on feuillette l'album avec les flèches (← → au clavier).
  Chaque carte a une **tranche** (son épaisseur, à l'échelle de la carte : la même en miniature et en grand), de la couleur de son cadre : commune dans la couleur
  de la famille, argentée (peu commune ou brillante faite avec des jetons), dorée (rare, légendaire, carte 7), dorée et violette (épique).
  À plat, elle dépasse sous la carte en couches (arête claire, couleur du cadre, ombre), et le cadre a un léger biseau (`.tc-edge`, `--bevel` dans `tcg.css`) ;
  en grand, c'est une vraie tranche en 3D, plus épaisse, qui se voit aussi sur le côté quand la carte penche.
- **Boosters** (5 cartes, au moins une rare) : Multivers (120 Éclats), Héros et Arsenal (140), **Découverte** (200 : que des cartes que tu n'as pas encore, tant qu'il en reste),
  Prestige (600 : rares ou mieux). Il n'y a plus de booster par famille : ceux qui n'étaient pas encore ouverts sont remboursés 160 Éclats chacun.
  **Ouvrir par 5** : quand tu en as plusieurs du même type, « ×5 » en ouvre jusqu'à 5 d'un coup (`openPacks`) : un paquet de boosters en éventail qu'on déchire une fois,
  puis les cartes booster par booster (« Booster 2 / 5 »), et à la fin les 25 cartes de la plus rare à la moins rare.
  **Ouverture** (`PackOpen.jsx`) : le paquet s'incline vers la souris et la lumière glisse dessus ; la carte du dessus brille à travers son dos selon sa rareté
  (dorée : rare, violette : épique, orange qui pulse : légendaire) ; au retournement, le fond prend la couleur de la rareté, un reflet balaie la carte,
  et une légendaire fait trembler l'écran (rayons et flash) ; des pastilles en bas comptent les cartes du booster (de la couleur de leur rareté une fois retournées) ;
  au résumé, les nouvelles brillent et on touche une carte pour la voir en grand.
  **Brillantes** : une carte 7 l'est toujours (reflet arc-en-ciel, cadre doré). Les autres ne le sont jamais en sortant d'un booster ou de la boutique :
  on les rend brillantes avec des **jetons de brillance** (Mes cartes ou Album, touche une carte : 1 jeton jusqu'au coût 2, puis 2, 3, 4 et 5 jetons
  pour les coûts 3 à 6), et elles ont un autre foil, un peu moins éclatant : cadre chromé argenté, reflet argenté (sans paillettes : ni les 7 ni elles n'ont de grille de points).
  Sur une épique, un bouton grisé « Pleine carte · Bientôt » annonce la suite : une épique brillante pourra passer en pleine carte (même image), pas encore disponible. Les jetons viennent
  du recyclage des doubles (1 par commune ou peu commune, 2 par rare, 3 par épique, 5 par légendaire) et de chaque booster (1, ou 3 pour un Prestige ;
  un de plus une fois sur 4). 1 booster sur 200 est **doré** : que des rares ou mieux, et 10 jetons en plus. Ouverture façon TCG Pocket : on déchire le paquet en glissant le doigt, puis on retourne les cartes une à une.
- **Éclats** (la monnaie) : fins de partie (jamais zéro, même en perdant), quêtes, niveaux, succès, recyclage des doubles. Ils achètent des boosters et les cartes de la **boutique du jour**
  (6 cartes au hasard parmi toutes, renouvelées à minuit ; commune 80, peu commune 200, rare 500, épique 1 200, légendaire 3 000 ; pas de brillante en vente, sauf les cartes 7).
  Recycler les doubles (au-delà de 2 normales et 1 brillante) rapporte des Éclats selon la rareté, et des jetons de brillance.
- **Portails** (onglets de la boutique, `Portals.jsx`, calendrier et thèmes dans `src/tcg/portals.js`, tirages dans `progress.js` : `pull`) : des invocations façon gacha, **en plus** des boosters.
  Chaque bannière en grand : à gauche les vedettes (« Viser » pour choisir sa cible), les épiques à l'honneur ou, pour le Monde à l'honneur, les autres cartes 7 de la famille
  (une bande qui défile) ; à droite tes tickets et tes Éclats, la garantie et les boutons d'invocation ; dessous, le portail suivant du même genre et les taux.
  Deux portails ouverts en même temps, qui changent **toutes les deux semaines** (le dimanche à minuit, les mêmes pour tout le monde ; le premier : du 15 au 28 novembre 2026) :
  le **Portail des Légendes** (un thème à travers les univers, 3 cartes 7 en vedette et 4 épiques à l'honneur : Seigneurs des ténèbres, Les plus forts du monde, Magie suprême,
  L'heure des dragons, Les Élus, Le temps s'arrête, Les génies, Sous le masque, Rois et reines, Pirates et capitaines, Créatures de la nuit, Esprits de la forêt, Les rebelles,
  Dieux et cosmos : 14 thèmes) et le **Monde à l'honneur** (une famille, toutes ses cartes ; JoJo d'abord, puis toutes les familles à tour de rôle, jamais Star Academy).
  **Trois vedettes au plus par portail** : le Monde à l'honneur en a 3 pour une grande famille (8 cartes 7 ou plus), 2 pour une moyenne, 1 pour une petite
  (`MONDE_STARS` dans `portals.js` ; JoJo : Jotaro *Star Platinum*, Dio *New Body*, Giorno *Golden Wind*) ; ses autres cartes 7 peuvent aussi sortir,
  et au passage suivant de la famille, d'autres cartes 7 prennent la vedette. On choisit sa **cible** parmi les vedettes. Une invocation : 100 Éclats ou 1 ticket ; par 10 : 900 Éclats (ou 10 tickets, les tickets passent avant les Éclats),
  avec une épique au moins. Taux : Légendaire (une carte 7) 2 %, Épique 10 %, Rare 38 %, Peu commune 50 % ; **une légendaire sur deux est la cible**, et elle est
  **garantie au plus tard à la 50e invocation** dans ce portail (compteur gardé quand les portails changent). En moyenne une cible coûte environ 3 600 Éclats (au pire 4 500),
  contre 3 000 pour une légendaire au hasard dans la boutique : on paie un peu plus pour choisir. Révélation : un vortex qu'on touche, qui prend la couleur de la meilleure carte
  (violet : épique, or : légendaire) avant de s'ouvrir. Cadeau d'ouverture : 10 tickets.
- **Tickets de portail** et quêtes : chaque quête du jour rapporte de l'XP et une récompense : des Éclats, un **ticket de portail** (Gagne une partie, Ouvre 2 boosters),
  un **booster** (Domination : Multivers ; 10 Pouvoir : Héros) ou, pour la quête de famille, **deux tickets**.
  **Coffre du jour** : les 3 quêtes récupérées, 1 ticket et 100 Éclats de plus.
- **Niveaux** : un booster à chaque niveau (un Prestige tous les 5). **3 quêtes par jour** (une peut être changée) et 13 succès.
- Tout est enregistré dans le profil (`profile.tcg`, y compris la photo `av`, le cadre `fr`, les tickets `tk`, les Portails `por` et les compteurs à vie de `st`), donc sauvegardé sur le compte quand on est connecté.

**Illustrations** : chaque carte a une illustration originale générée par l'appli (décor de sa famille, plus riche selon la rareté : les légendaires sont en pleine carte).
Tu peux la remplacer par tes propres images : touche une carte > « Choisir une image », ou Collection > Illustrations > « Importer des images » (plusieurs d'un coup) en nommant
chaque fichier comme la carte : `Gryfenfer 7.jpg` (personnage : nom + coût), `Gryfenfer.jpg` (toutes ses versions), le nom seul pour un lieu, un objet ou un événement.
Le bouton **« Liste des cartes et noms de fichiers »** donne le nom exact de chaque carte (recherche, filtre par famille, « Sans illustration », copie d'un nom ou de toute la liste,
tri par famille ou par coût toutes familles mêlées ; la collection a le même choix de tri) ;
quand deux cartes auraient le même nom, la famille ou le sous-titre est ajouté entre parenthèses : `Mendoza 5 (Cités d'or).jpg`, `Noah 2 (Promo 2024).jpg`.
Chaque image est recadrée **au format où la carte l'affiche** (pleine carte pour les légendaires, bandeau large pour les autres) : peu importe sa taille
ou son format, l'appli cherche où est le sujet (contours et couleurs qui tranchent) et centre le cadre dessus. Avec « Choisir une image », on fait glisser l'image
dans le cadre avant de valider. Après un import en lot, les cartes illustrées s'affichent en dessous : touche-en une puis **« Recadrer »** si le sujet est mal placé
(sans rechoisir le fichier, tant que l'appli reste ouverte). **Images intégrées à l'appli, sans import (dépôt privé d'illustrations)** : les images vivent dans un **second dépôt GitHub, privé**
(par défaut `<ton-pseudo>/PartyGames-illustrations`, ou la variable `ILLUSTRATIONS_REPO`), nommées comme pour l'import (sous-dossiers permis).
Sur ton PC, ce dépôt est le dossier `illustrations/` du projet, que le dépôt public ignore. À chaque build (`npm run dev`, `npm run build`,
APK, appli PC), `tools/build-art.mjs` reconnaît chaque image, la recadre au format de sa carte (même cadrage automatique que l'appli,
réglable à la main dans `cadrages.json` : position, et zoom pour dézoomer une image trop serrée, le vide étant rempli par la même image floutée ;
ou `"rogne"` pour ne garder qu'un rectangle de l'image, par exemple sans le cadre d'une vraie carte Pokémon : voir l'en-tête de `tools/build-art.mjs`) et la range dans `public/art/` (généré, jamais versionné).
Une image dont toutes les cartes ont déjà une image plus précise est signalée « en double ». Un nom porté par deux familles se départage
par le nom exact (« Mars.jpg » : le lieu de Cowboy Bebop ; « Mars 4.jpg » : la commandante de la Team Galaxie), sinon par le dossier de la famille (`illustrations/ghibli/Lin 2.jpg`). Les workflows « Build APK » et
« Appli PC (Windows) » récupèrent le dépôt privé grâce au secret `ILLUSTRATIONS_TOKEN` (jeton GitHub en lecture seule sur ce seul dépôt) ;
sans ce secret, ils construisent sans images. Le site GitHub Pages ne contient jamais ces images (`PARTY_ART=off`), et le dépôt public
reste public (site de test et page Spotify inchangés). Mode d'emploi du dépôt privé : `tools/LISEZ-MOI-illustrations.txt`.
`npm run art` refait les images et liste les noms non reconnus.
Les images sont gardées sur le téléphone. **Pour qu'elles apparaissent chez tous tes amis** : Supabase > SQL Editor > colle `supabase/tcg_art.sql` > Run (une fois) ;
ensuite, chaque image ajoutée par un joueur connecté à son compte est partagée (tout le monde la voit, seuls les joueurs connectés peuvent en ajouter).

**Pokémon** (`cards/pokemon.js`, 466 cartes) : un deck choisit **un type ou une région** (« Quel type ou quelle région ? »), qui donne un bonus à la famille ;
il joue les Pokémon et les Dresseurs de ce type ou de cette région (un Pokémon à deux types compte pour les deux, chaque Pokémon a une région ; les formes
« de Galar », « d'Alola », « de Hisui » (= Sinnoh) et « de Paldea » suivent la leur), plus ce qui va partout : **Pikachu, Mew, Mewtwo et Arceus** (dans tous les decks Pokémon),
les Dresseurs sans type (Sacha, N Harmonia « Le garçon qui parle aux Pokémon », Red, Ondine, Pierre, Professeur Chen, Jessie et James, Lilie, Pania…), les lieux, objets et événements.
Échelle des coûts : **7** les plus forts (légendaires, Méga-Évolutions, Maîtres, Conseil 4, boss : chaque type a au moins un Pokémon 7, et presque tous un Dresseur 7) ;
**6** Amphinobi, Ectoplasma, Noctali, Tokorico, Ghetis, Goyah… ; **4-5** Ronflex, Raichu, Lugulabre, Spiritomb, le Miaouss de la Team Rocket… ;
**3** les formes intermédiaires ; **1-2** les bébés et premières formes (Vipélierre, Salamèche…). Les Évolitions ont le trait Évolition (Évoli en cherche une en entrant).
Les Dresseurs à un type ne vont que dans le deck de ce type et dans celui de leur région : Giovanni 7 (Sol), Morgane 7 (Psy), Olga 7 (Glace), Aldo 7 (Combat),
Agatha 7 (Spectre), Koga 7 (Poison), Major Bob 5 (Électrik), Erika 4 (Plante) pour Kanto ; Peter 7 (Vol) pour Johto ; Marc 7 (Eau), Pierre Rochard 7 (Acier) pour Hoenn ;
Cynthia 7 (Dragon), Hélio 7 (Ténèbres), Penséa 5 (Fée) pour Sinnoh ; N Harmonia 7 « Le roi de la Team Plasma » (Électrik), Ghetis 6 (Ténèbres), Goyah 7 (Insecte),
Tcheren 7 (Normal), Nikolaï 5 (Acier), Iris 5 (Dragon), Pieris 5 (Ténèbres), Inezia 4 (Électrik) pour Unys ; Dianthéa 7 (Fée) pour Kalos ; Guzma 6 (Insecte) pour Alola ;
Tarak 7 (Feu), Roy 5 (Dragon), Faïza 4 (Combat), Donna 4 (Eau) pour Galar ; Kassis 7 (Plante), Dendra 4 (Combat) pour Paldea.
Les cartes qui ont changé de coût avec cette échelle (Ronflex 6 devenu 5, Giovanni 5 et Tcheren 6 devenus 7, Goyah 6 devenu 7 comme les autres Maîtres…) gardent les exemplaires, les decks et les images importées (`RENAMED` dans `cards/index.js`).
**Ajoutés le 17/11/2026** (avec les images de Brice) : des Dresseurs de toutes les régions, à un type (Champions, Conseil 4, Doyens, Capitaines, chefs et cadres des Teams)
ou sans type (Serena, Bella, Juliette, Beladonis, Cardus, le Professeur Turum, Apia, Elsa-Mina, Bélila, Selena, et trois Dresseurs non uniques : Journaliste Télé,
Montagnard, Ouvrière) : Jeannine (Kanto), Ariane et Lance de la Team Rocket (Johto), Roxanne, Adriane, Norman, Alizée, Amaryllis 6 et Timmy (Hoenn),
Flo, Kiméra, Gladys, Tanguy, Mars, et pour Hisui Adamantin, Nacchara, Marcia et Graham (Sinnoh), Strykna (Unys), Lysandre 7, A.Z. (6 et 3), Cornélia, Lino, Albia, Corvault, Inno, Violine (Kalos),
Gladio, Saubohne, Apocyne, Danh, Alyxia, Margie, Kahili, Chrys, Oléa (Alola), Kabu, Percy, Sally, Travis, Peterson, Rosemary, Mustar 6, Saturnin, Liv (Galar),
Menzi, Cayenn, Popi, Tully, Kombu, Meloco, Ortiga, Rubépin, Taro (Paldea) ; les Pokémon Zeraora 6, Favianos 5, Pashmilla 4 et Filentrappe 3 ;
les cartes Dresseur du jeu de cartes : Stades (Illumis, Plage de Surf, Forêt de Vitalité, Usine de la Team Rocket), Outils (Bracelet Vaillant, Rattrape-Riposte :
+2 force quand on est derrière au Pouvoir, Bombe Géniale : le porteur adverse ne peut plus attaquer) et Objets (Carton Rouge Spécial, Méga Signal, PP Plus de N,
Poffin Copain-Copain, Puissance Premium Pro, Émetteur-Récepteur de la Team Rocket). Flo redresse n'importe quel Pokémon. Plage de Surf : +1 force aux Pokémon Eau qui défendent.
Nouvelles versions ailleurs : Gryfenfer 6, Jadina 6, Jadilyna 6, Razzia 7, Ténébris 7 et Vangelis 7 (Légendaires) ; Superman 5 « Clark Kent », Wonder Woman 6
et une deuxième Supergirl 7 « Woman of Tomorrow » (DC).
Sur la carte, le type et la région s'écrivent dans la ligne des traits, sous l'image (« Pokémon. Feu. Kanto. », « Dresseur. Humain. Fée. Sinnoh. ») ; c'est pareil pour
les sous-groupes des autres familles (régions de Runeterra, maisons de Poudlard…), et la recherche de l'album les trouve (« Kanto », « Gryffondor »).

| Type ou région | Bonus | Deck de départ (en tête) |
|---|---|---|
| Normal | chaque victoire rapporte de l'or | Arceus 7, Tcheren 7, Ronflex 5 |
| Feu | vos Pokémon Feu frappent plus fort en attaque | Dracaufeu 7, Tarak 7, Arcanin 5 |
| Eau | chaque round, le premier défi gagné fait piocher | Kyogre 7, Marc 7, Milobellus 5 |
| Plante | +1 revenu à chaque round | Florizarre 7, Kassis 7, Majaspic 5 |
| Électrik | après un défi de Combat gagné, un participant se redresse | Pikachu 7, Major Bob 5, Raichu 5 |
| Glace | un défi de Combat gagné agenouille un personnage adverse | Artikodin 7, Olga 7, Lokhlass 5 |
| Combat | vos Pokémon Combat frappent plus fort en attaque | Shifours 7, Aldo 7, Mackogneur 6 |
| Poison | un défi de Combat gagné fait défausser l'adversaire | Éthernatos 7, Koga 7, Ectoplasma 6 |
| Sol | +1 revenu à chaque round | Groudon 7, Giovanni 7, Carchacrok 6 |
| Vol | vos Pokémon Vol frappent plus fort en attaque | Lugia 7, Peter 7, Roucarnage 5 |
| Psy | un défi de Ruse gagné agenouille un personnage adverse | Mewtwo 7, Morgane 7, Alakazam 5 |
| Insecte | chaque round, l'arrivée d'un Pokémon rapporte de l'or | Genesect 7, Guzma 6, Cizayox 5 |
| Roche | vos Pokémon Roche gagnent l'icône Influence | Tyranocif 7, Lougaroc 5, Ptéra 5 |
| Spectre | un Spectre qui devrait mourir peut revenir en main | Giratina 7, Agatha 7, Ectoplasma 6 |
| Dragon | vos Pokémon Dragon ont tous Intimidation | Méga-Dracolosse 7, Cynthia 7, Carchacrok 6 |
| Ténèbres | vos Pokémon Ténèbres ont tous Discret | Darkrai 7, Hélio 7, Noctali 6 |
| Acier | +1 revenu à chaque round | Dialga 7, Pierre Rochard 7, Métalosse 6 |
| Fée | remporter la Domination fait piocher | Xerneas 7, Dianthéa 7, Gardevoir 5 |
| Kanto | chaque round, une victoire rapporte de l'or | Dracaufeu 7, Giovanni 7, Pikachu 7, Jessie et James, Miaouss 4 |
| Johto | vos Pokémon qui défendent gagnent +1 force | Ho-Oh 7, Lugia 7, Noctali 6 |
| Hoenn | remporter la Domination fait piocher | Rayquaza 7, Marc 7, Latios 6 |
| Sinnoh | chaque round, perdre un défi fait piocher | Cynthia 7, Dialga 7, Spiritomb 5 |
| Unys | chaque round, le premier défi gagné fait piocher | N Harmonia 7, Zekrom 7, Ghetis 6, Tcheren 7 |
| Kalos | vos Pokémon qui attaquent gagnent +1 force | Méga-Amphinobi 7, Dianthéa 7, Goupelin 5 |
| Alola | chaque round, la mort d'un de vos personnages fait piocher | Solgaleo 7, Tokorico 6, Guzma 6 |
| Galar | un défi de Combat gagné agenouille un personnage du perdant | Zacian 7, Tarak 7, Corvaillus 5 |
| Paldea | chaque round, l'arrivée d'un Pokémon rapporte de l'or | Koraidon 7, Kassis 7, Forgelina 5 |

**League of Legends** (`cards/lol.js`, 170 cartes) : un deck choisit une région, qui donne un bonus à la famille ; il joue les champions de cette région
(un champion de deux régions compte pour les deux : Mel est de Noxus et de Piltover, les yordles Poppy, Gnar, Kennen, Heimerdinger, Ziggs et Kled sont aussi de Bandle City),
plus ce qui va partout : Bard et ses meeps, les sbires, le Héraut, le Baron Nashor, les objets (Ange gardien, Lame d'infini…) et les sorts d'invocateur (Saut éclair, Embrasement…).

| Région | Bonus | Deck de départ (héros) |
|---|---|---|
| Ionia | une fois par round, un champion d'Ionia qui devrait mourir retourne en main | Shen |
| Freljord | un défi de Combat gagné agenouille un adversaire | Sejuani |
| Piltover et Zaun | +1 revenu | Caitlyn |
| Noxus | +1 force en attaque | Rell |
| Demacia | +1 force en défense | Poppy |
| Ixtal | après un défi de Combat gagné, un participant se redresse | Zyra |
| Bandle City | l'arrivée d'un yordle rapporte 1 or (une fois par round) | Méga Gnar |

Les pouvoirs viennent de l'histoire des champions : Shen protège un allié qui allait mourir (Unis dans l'adversité), Kennen attaque sans s'agenouiller (Ruée de foudre),
Rakan et Xayah gagnent +2 quand l'autre est en jeu, Varus enchaîne un défenseur (Chaîne de corruption), Sejuani mène la charge de la Griffe d'hiver,
Lissandra gèle en arrivant et survit en reprenant sa place (Mille ans de mensonges), Gnar devient Méga Gnar, Caitlyn abat une cible en arrivant (As dans la manche),
Vi interpelle un défenseur, Renata rachète un allié (Renflouement) et prend l'or des perdants, Janna protège (Œil du cyclone), Rell attire les défenseurs (Tempête magnétique),
Mel est immunisée aux événements (Réfutation), Poppy est plus forte quand on est mené (« Pas une héroïne »), Zyra fait pousser ses plantes, Nidalee se change en couguar,
Milio redresse un allié en arrivant (Souffle de vie), Bard fige un adversaire (Destin altéré) et grandit avec ses meeps.

**Harry Potter** (`cards/hp.js`, 135 cartes) : un deck choisit une maison de Poudlard ; chaque maison a son fondateur en carte 7, son fantôme, sa salle commune
et son objet (l'épée de Gryffondor, le médaillon, le diadème, la coupe). Les créatures (Dobby, Fumseck, Buck, le Magyar à pointes…), les Aurors, le Ministère,
les sortilèges (Expelliarmus, Stupéfix, Spero Patronum…) et les Reliques de la Mort vont dans toutes les maisons. Harry, Dumbledore et Voldemort ont chacun deux versions à 7.

| Maison | Bonus | Deck de départ (héros) |
|---|---|---|
| Gryffondor | +2 force en attaque | Harry Potter (Le Survivant) |
| Serpentard | un défi de Ruse gagné fait défausser une carte au perdant | Lord Voldemort |
| Serdaigle | après un défi de Ruse gagné, un participant se redresse | Luna Lovegood |
| Poufsouffle | une fois par round, un Poufsouffle qui devrait mourir retourne en main | Norbert Dragonneau |

**Star Wars** (`cards/sw.js`, 118 cartes) : un deck choisit un camp (Dark Vador est Sith et impérial, Han Solo rebelle et contrebandier…).
Luke, Dark Vador et Palpatine ont deux versions à 7 (le Chevalier Jedi et le dernier Jedi ; le Seigneur Sith et l'Élu déchu ; l'Empereur et Dark Sidious, qui revient toujours).

| Camp | Bonus | Deck de départ (héros) |
|---|---|---|
| Jedi | les Jedi ont Discret (les tours de l'esprit Jedi) | Yoda |
| Sith | les Sith ont Intimidation (la peur) | Dark Vador |
| Rébellion | le premier défi gagné du round rapporte 1 Pouvoir (l'espoir) | Luke Skywalker |
| Empire | +1 revenu | Palpatine |
| Pègre | +1 or quand on devient premier joueur (« il a tiré le premier ») | Din Djarin |

**Game of Thrones** (`cards/got.js`, 189 cartes) : un deck choisit une faction (Jon Snow est Stark et frère juré, Theon Greyjoy a grandi à Winterfell…) ;
Varys, Littlefinger, Jaqen H'ghar, le Grand Moineau et Syrio Forel vont partout. Jon Snow (*Le Roi du Nord* / *Le Lord Commandant*), Arya (*Personne* / *La tueuse du Roi de la Nuit*),
Tyrion (*La Main du Roi* / *La Main de la Reine*), Daenerys (*La Mère des Dragons* / *Briseuse de chaînes*) et le Roi de la Nuit ont deux versions à 7.

| Faction | Bonus | Deck de départ (héros) |
|---|---|---|
| Stark | après un défi de Combat gagné, un participant se redresse | Jon Snow (Le Roi du Nord) |
| Lannister | le premier défi gagné du round rapporte 1 or | Tyrion Lannister |
| Targaryen | les Targaryen ont Intimidation (Feu et Sang) | Daenerys Targaryen |
| Baratheon | le premier défi de Combat gagné du round rapporte 1 Pouvoir | Stannis Baratheon |
| Greyjoy | un défi de Combat de plus, et les Fer-nés ont Discret | Euron Greyjoy |
| Tyrell | la Domination gagnée fait piocher une carte | Olenna Tyrell |
| Martell | un défi de Ruse gagné agenouille un personnage du perdant | Oberyn Martell |
| Garde de Nuit | +1 force en défense, et un participant se redresse après une victoire | Jon Snow (Le Lord Commandant) |
| Marcheurs blancs | un défi de Combat gagné agenouille un personnage du perdant | Le Roi de la Nuit |

**Le Seigneur des Anneaux** (`cards/lotr.js`, 130 cartes) : un deck choisit un camp ; Gandalf, Radagast, les Aigles et Beorn vont dans tous les camps des Peuples libres,
les Ents chez les Hobbits, les Elfes et le Rohan, Azog et les gobelins chez le Mordor et l'Isengard. Gandalf (*le Gris* / *le Blanc*), Aragorn (*Grand-Pas* / *Le Roi Elessar*)
et Sauron (*L'Œil sans paupière* / *Le Seigneur des Anneaux*) ont deux versions à 7.

| Camp | Bonus | Deck de départ (héros) |
|---|---|---|
| Hobbits | les Hobbits ont Discret (personne ne les remarque) | Frodon Sacquet |
| Elfes | +1 force en défense, et un participant se redresse après une victoire | Galadriel |
| Nains | +1 revenu | Thorin Écu-de-Chêne |
| Gondor | +1 force en défense | Aragorn (Le Roi Elessar) |
| Rohan | un défi de Combat de plus (la charge des Rohirrim) | Théoden |
| Mordor | les personnages du Mordor ont Intimidation | Sauron |
| Isengard | +1 revenu, et les Uruk-hai ont Intimidation | Saroumane |

**Le Monde de Narnia** (`cards/narnia.js`, 55 cartes) : passif « Aslan est en marche » (après un défi de Combat gagné, un participant se redresse) ;
3 decks : les rois et reines de Narnia (Aslan), le Passeur d'Aurore (Caspian), la Sorcière Blanche (Jadis). Aslan a deux 7 (*Le Grand Lion* / *La Magie plus profonde*, qui revient de la Table de Pierre).

**Studio Ghibli** (`cards/ghibli.js`, 69 cartes) : passif « Le vent se lève » (+1 force en défense, et un participant se redresse après une victoire) ;
3 decks : les esprits de la forêt (Totoro, Mononoké, le Dieu-Cerf), les bains d'Aburaya (Chihiro, Haku, Yubaba, le Château ambulant), les aventuriers du ciel
(Nausicaä, Laputa, Kiki, Porco Rosso). Totoro a deux 7 (*Le roi de la forêt* / *L'arrêt de bus sous la pluie*, qui fait arriver le Chatbus).

**Gundam** (`cards/gundam.js`, 129 cartes) : les pilotes sont des personnages et les **Mobile Suits des objets** qu'on attache à un Pilote (RX-78-2, Zaku rouge, Wing Zero, Freedom, Exia,
Barbatos, Aerial). Amuro, Char et Kira ont deux versions à 7.

| Univers | Bonus | Deck de départ (héros) |
|---|---|---|
| Fédération | +1 force en défense | Amuro Ray |
| Zeon | +1 revenu (les usines Zeonic) | Char Aznable |
| After Colony | les pilotes ont Discret (opération Météore) | Heero Yuy |
| Cosmic Era | après un défi gagné, un participant se redresse (l'éveil SEED) | Kira Yamato |
| Anno Domini | un défi de Combat de plus (l'intervention armée) | Setsuna F. Seiei |
| Post Disaster | +1 force en attaque (Tekkadan) | Mikazuki Augus |
| Ad Stella | le premier défi de Combat gagné du round rapporte 1 Pouvoir (le duel) | Suletta Mercury |

**JoJo's Bizarre Adventure** (`cards/jojo.js`, 97 cartes, des neuf parties, de Phantom Blood à The JOJOLands ; motif « menaçant » ゴゴゴ sur les cartes sans image) :
passif « Un contre un » (après un défi gagné auquel **un seul** de vos personnages participe, piochez 1 carte). Un deck de départ, « La lignée des Joestar »
(Jotaro et Giorno, avec Lisa Lisa, Bucciarati, Caesar, Speedwagon, les Croisés, Koichi, Mista, Narancia, Trish…), réglé autour de 50 % de victoires contre les autres
decks de départ ; on le personnalise en remplaçant Jotaro ou Giorno par une autre carte 7. Les versions d'un même personnage sont des alternatives (une seule par deck) :
Dio (*Le vampire* / *New Body*), Jotaro (*Yare yare daze* / *Star Platinum*), Giorno (*Gold Experience* / *Golden Wind*), Jolyne (*La prisonnière* / *Stone Free*),
Johnny (*Le jockey* / *Tusk*), Gyro 5 / 6, Rohan 2 / 6 ; Josuke Higashikata (JoJolion) est un autre personnage que Josuke Higashikata (Diamond is Unbreakable).
Chaque carte 7 alternative a été testée à la place de celle du deck de départ (entre 48 et 54 % de victoires). Pouvoirs propres : ZA WARUDO (Dio New Body et Jotaro Star Platinum,
en attaquant, agenouillent chaque petit défenseur possible : `atkKneelAll`), Gold Experience Requiem (sauve un de vos personnages de la mort : `saveAny`),
King Crimson (Diavolo efface une revendication : `claimCancel`), Tusk Act 4 (tue un participant du perdant quelle que soit sa force : `winSlay`).
Une version qui a son propre nom d'image le donne avec l'option `art` (« Dio Brando (New Body) 7 », « Jotaro Kujo (Star Platinum) 7 », « Ceasar 5 ») : voir `cards/build.js`.

Code : `src/tcg/` — `rules.js` (règles, mots-clés), `abilities.js` (modèles d'effets : le texte d'une carte et son effet viennent du même modèle), `engine.js` (moteur),
`bot.js` (adversaire), `cards/*.js` (une famille par fichier, une ligne par carte), `deck.js` (règles de deck, decks de départ), `progress.js` (collection, boosters, boutique, quêtes),
`view.js` (ce qui part sur le réseau), `ui/` (cartes, partie, collection, boosters) ; côté créateur du lobby : `src/net/hostTrone.js`.
Pour ajouter une carte : une ligne dans le fichier de sa famille (voir l'en-tête de `cards/build.js`). Une famille peut avoir des sous-groupes que chaque deck choisit
(`types` et `sub` dans son fichier : les types et les régions Pokémon (`kind: "region"`, voir `subGroups`), les régions de League of Legends, les maisons de Poudlard, les camps de Star Wars, les factions de Westeros, les camps de la Terre du Milieu, les univers de Gundam ; voir `subOf` et `subWords` dans `cards/index.js`). Tests : `node tools/test-tcg.js` (cartes, règles, parties entre bots ;
`--sim 400` pour l'équilibrage), `node tools/test-tcg-progress.js` (collection) et `node tools/test-tcg-host.js` (partie en réseau).

## 12. Loup-garou, version Stranger Things

Les règles des **Loups-Garous de Thiercelieux** (jeu de base, Nouvelle Lune, Personnages, le Corbeau du Village) et des rôles fanmade
très joués en ligne (Wolfy, Loups-Garous en ligne). Seuls les noms et l'ambiance changent : les loups-garous sont les créatures du
**Monde à l'envers**, les villageois les **habitants de Hawkins**. L'appli fait le meneur : chacun joue sur son téléphone.

**Jouer** : lobby > Jeu > **Loup-garou** ; de 4 à 18 joueurs (bots possibles pour tester, ils jouent au hasard).
Réglages : composition automatique (on coche les boîtes de rôles et le nombre de créatures) ou choisie rôle par rôle, durée de chaque
étape de la nuit, du débat et du vote, capitaine, composition visible ou secrète.
- **La nuit** : tout le monde a quelque chose à toucher (ceux qui n'ont pas de pouvoir désignent la personne qui leur paraît louche,
  pour que personne ne devine qui agit). La meute vote en direct et discute dans son canal secret ; la nuit continue dès qu'elle est d'accord.
- **Le jour** : annonce des morts (rôle révélé, jamais la cause), élection du capitaine le premier jour (voix double, départage),
  débat (à voix haute ou dans la discussion ; on passe au vote quand plus de la moitié est prête), puis vote en direct (on peut changer d'avis).
- **Discussions** : village (le jour), meute, amoureux, sœurs, frères et morts (Mama, la Chaman, les entend la nuit). Erica (Petite Fille) voit la meute sans savoir qui écrit.

| Personnage | Rôle | | Personnage | Rôle |
|---|---|---|---|---|
| Onze | Voyante | | Démochien | Loup-garou |
| Dr Sam Owens | Sorcière (potion de vie, potion de mort) | | Le Démogorgon | Grand méchant loup |
| Jim Hopper | Chasseur | | Le Flagelleur mental | Infect père des loups |
| Murray Bauman | Cupidon | | Billy Hargrove | Loup bavard (fanmade) |
| Erica Sinclair | Petite Fille | | Vecna | Loup-garou blanc (solitaire) |
| Suzie | Voleur (elle pirate le système) | | Papa (Dr Brenner) | Joueur de flûte (solitaire) |
| Steve Harrington | Salvateur | | Barb | Ange (solitaire) |
| Max Mayfield | Ancien (Running Up That Hill) | | Jason Carver | Abominable sectaire (Tigers / Hellfire) |
| Argyle | Idiot du village | | Grigori, l'agent russe | Mercenaire (fanmade) |
| Eddie Munson | Bouc émissaire | | Dart | Chien-loup |
| M. Clarke | Juge bègue | | Will Byers | Enfant sauvage |
| Lucas Sinclair | Chevalier à l'épée rouillée | | Mike Wheeler | Comédien |
| Joyce Byers | Montreur d'ours (ses guirlandes clignotent) | | Jonathan Byers | Servante dévouée |
| Dustin Henderson | Renard | | Nancy Wheeler | Corbeau (la journaliste) |
| Karen et Claudia | Deux Sœurs | | Powell, Callahan et Flo | Trois Frères |
| Ted Wheeler | Villageois-villageois | | Habitants (Benny, Keith, Chrissy…) | Simples villageois |
| Robin Buckley | Mentaliste (fanmade) | | Bob Newby | Fossoyeur (fanmade) |
| Larry Kline | Dictateur (fanmade) | | Mama (Terry Ives) | Chaman (fanmade) |
| Kali | Noctambule (fanmade) | | Holly Wheeler | Chaperon rouge (fanmade) |

Les cartes de rôle sont carrées ; leurs illustrations sont celles des cartes Stranger Things de Heavy is the Crown (une image importée pour « Onze 7 » apparaît aussi sur la Voyante).

Code : `src/lg/` — `roles.js` (rôles, compositions), `engine.js` (moteur : nuit, jour, morts en chaîne, victoires), `view.js` (ce qui part
sur le réseau), `ui/` (écran de partie, réglages du lobby) ; côté créateur du lobby : `src/net/hostLg.js` (minuteurs, bots).
Tests : `node tools/test-lg.js` via `npm run test-engine` (compositions, 420 parties entre bots, partie en réseau, départ d'un joueur).
Limite connue : comme pour les autres jeux, les messages privés passent par le salon et sont filtrés par chaque téléphone ; un joueur qui
bidouille la version web avec les outils de développement pourrait lire des rôles. Entre amis sur l'APK, ce n'est pas un problème.
