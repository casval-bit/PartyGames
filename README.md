# Party Hub (nom de travail de la plateforme)

Appli mobile React + Capacitor : plateforme de jeux de soirée avec lobbys en temps réel et équipes. Huit jeux : **Time's Up** (classique ou mode Bonus), **Qui est-ce ?**, **Blind test**, **Frise** (frise musicale), **Célébrité** (photo pixellisée, façon golf), **Petit bac**, **Plateau** (façon Mario Party) et **Mini-jeux** (2D et 3D).
« Time's Up » est une marque déposée : le nom de la plateforme et des jeux est à changer avant le Play Store (`APP_NAME` dans `src/config.js`, `capacitor.config.json`, textes de `Splash.jsx` et `Menu.jsx`).

## Look & feel (ambiance Mario Party / Wii Party / Smash)
Soirée jeux sur console : ciel bleu vif avec rayons et confettis, panneaux blancs très arrondis cernés d'un gros trait bleu nuit, boutons bombés brillants avec une « marche » dessous, titres en autocollants à liseré blanc, couleurs franches (rouge, bleu, jaune, vert). Polices embarquées (fonctionne hors-ligne) : Fredoka (titres, boutons) et Nunito (texte).
**Animations de clic** (`src/ui/clickfx.js`, installé une fois dans `main.jsx`) : tout bouton s'écrase puis rebondit « façon gélatine » et des étoiles giclent du point touché. Rien à ajouter sur les écrans ; `data-nofx` sur un élément le met à l'écart ; coupé automatiquement si le téléphone demande moins d'animations.
Tout se règle dans `src/styles.css` : les couleurs sont en tête de fichier (`:root`), et les blocs de thème à la fin surchargent les composants. Les cartes dorées de Time's Up, les boosters et le chrono « mèche » gardent leur look d'origine.

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
Le créateur du lobby fait tourner la partie sur son téléphone (il distribue les cartes, gère les votes et les chronos).
S'il quitte, le lobby se ferme. Pas encore de reconnexion en cours de partie.

## 2 ter. Comptes : connexion par e-mail (niveau et avatars sauvegardés)

Dans l'appli : **Se connecter** (menu ou profil) > ton e-mail > un **code** arrive par e-mail > tu le tapes. Pas de mot de passe, pas de lien à ouvrir (un lien ne reviendrait pas dans l'appli Android).
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

Le créateur choisit le jeu dans le lobby (« Jeu » : **Time's Up**, **Qui est-ce ?**, **Blind test**, **Frise**, **Célébrité**, **Petit bac**, **Plateau** ou **Mini-jeux**). Les équipes et le lobby sont communs ; le vote de catégories ne concerne que Time's Up.
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
- **Lien Spotify** : fonctionne seulement dans l'**appli Android** (le lien est lu via la page publique « embed », 100 morceaux max : limite de Spotify, puis chaque morceau est retrouvé sur Deezer). Spotify ne fournit plus d'extraits audio aux nouvelles applications, donc l'audio vient toujours de Deezer. Fonction expérimentale, non testée en réel.
- **Liens de morceaux Spotify (sans limite de 100)** : sur ordinateur, ouvre la playlist dans Spotify, **Ctrl+A puis Ctrl+C**, colle dans la zone d'import. Chaque lien `open.spotify.com/track/…` est lu (page publique du morceau : titre + artiste, appli Android uniquement) puis retrouvé sur Deezer pour l'extrait audio.
- **Connexion Spotify (facultative)** : bouton « Mes playlists Spotify » dans le lobby, visible tant qu'un Client ID est renseigné (par défaut celui de l'appli Spotify « Party Hub », dans `src/config.js` ; surchargeable avec `VITE_SPOTIFY_CLIENT_ID`). Flux PKCE sans secret : la page `public/spotify.html` (sur GitHub Pages) affiche un code que le joueur colle dans l'appli ; le jeton est gardé sur le téléphone. Importe une playlist entière (pages de 50), mais Spotify (mode développement) ne laisse lire que les playlists dont on est propriétaire ou collaborateur, limite l'appli à 5 utilisateurs et exige un compte Premium pour le propriétaire de l'appli.
- **Plusieurs playlists** : une fois une playlist chargée, « + Ajouter une autre playlist » en fusionne une autre (doublons ignorés, 3 000 morceaux au plus). Pratique pour dépasser les 100 morceaux d'un lien Spotify : ajoute-en plusieurs, colle une liste texte (1 500 lignes) ou un export CSV d'exportify.net, ou transfère la playlist sur Deezer (tunemymusic.com, gratuit) et colle le lien Deezer (jusqu'à 2 000 morceaux). Le nombre de morceaux joués par partie va de 5 à 100.
- **Playlist de démo** : 12 morceaux avec une mélodie synthétique, pour tester sans réseau.
Dans l'appli Android, `CapacitorHttp` est activé (`capacitor.config.json`) : les requêtes passent par le réseau natif, sans blocage CORS. Sur le web, Deezer est interrogé en JSONP.

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
- **Pas encore codé** : cases Duel / Banque / Combat de Mario Party, objet « gant de duel », plusieurs plateaux, chemins qui se séparent.

### Mini-jeux (façon Wii Party / Mario Party)
Pas de lobby en équipes : chacun pour soi à l'écran des réglages (1 à 16 joueurs, un joueur seul peut s'entraîner). Le créateur choisit **5, 8, 10 ou 15 manches**. Une manche est :
- un **mini-jeu** : présentation + décompte, puis **tout le monde joue la même partie en même temps sur son téléphone** (même graine aléatoire, donc même difficulté pour tous). Chaque mini-jeu donne un score (plus haut = mieux) ; classement de la manche : **10 points au premier**, puis décroissant (`rankPoints` dans `src/minigames/meta.js`), égalité = mêmes points, pas fini = 0 ;
- un **test d'amitié** (une manche sur trois, dès 2 joueurs) : 3 questions « Plutôt… ? » (`src/data/friendQs.js`), chacune sur un joueur tiré au sort. Il répond pour lui, les autres devinent en même temps ; **3 points par bonne devinette**, et le joueur visé gagne 1 point par personne qui l'a bien deviné (5 max). La réponse reste secrète tant que tout le monde n'a pas répondu.
- **Modes d'équipe** (à partir de 3 joueurs, tirés au sort à chaque mini-jeu, annoncés à l'écran de présentation) : **2 contre 2**, **1 contre 3**, **1 contre 2** (et 2 contre 3 à 5 joueurs…). Le score d'une équipe est **la moyenne** des scores de ses membres (pas de jeu coopératif en direct : chacun joue sur son téléphone). L'équipe gagnante : 10 points chacun, égalité 5, défaite 0. Un camp vidé par des départs bascule en chacun pour soi (`MG_SIDES`, `randomTeams`, `teamAvg` dans `src/minigames/meta.js`).
Le meilleur total gagne (podium à la fin). Chaque mini-jeu n'apparaît qu'une fois avant que tous soient passés.
**31 mini-jeux** dont **9 en 3D** (avec ton avatar en haricot façon Fall Guys) : 
- **2D (22)** : Tape-tape, Réflexe, Taupes, Simon, Pile au centre, Compte-les !, Calcul mental, Couleur ou mot ?, Paires, Rattrape-les, Esquive, Chrono à l'aveugle, L'intrus, Dans l'ordre, Cibles, Envol, Saute-obstacles, Mémo-grille, Le plus grand, Flèches, Pierre-feuille-ciseaux, Rythme.
- **3D (9)** : Course de haricots (couloir à obstacles), Plancher fragile (dalles qui s'effondrent), Sumo bonbon (arène qui rétrécit, on pousse les autres), Barre tournante (saut de corde géant), Chasse aux pièces (boulets rouges à éviter), Tunnel champêtre (on tourne autour d'un tube), Cueillette de champis (type « mousse pousse » : on cueille quand ça brille), Safari photo (type « safari » : on photographie le bon animal), Bowling bonbon.
  Les noms et règles des jeux inspirés de Mario Party sont des **créations originales** (pas de copie).
- **Technique 3D** : `three` (v0.169) chargé à la demande (la bibliothèque n'est téléchargée qu'au premier mini-jeu 3D) ; `src/minigames/three/kit3d.jsx` (scène bonbon, haricot animé, joystick, boutons) et `gamesA.jsx` / `gamesB.jsx`. Si l'appareil ne sait pas faire de 3D (WebGL), le jeu affiche un message et compte 0.
- **Ajouter un mini-jeu** : (1) une ligne dans `MINIGAMES` (`src/minigames/meta.js` : identifiant, titre, règle, durée, score maximum, affichage du score), (2) un composant `({ seed, seconds, onFinish, color })` dans `src/minigames/games*.jsx` ou `three/games*.jsx` qui appelle `onFinish(score)` (entier ≥ 0, plus haut = mieux) et utilise `rng(seed)` pour tout ce qui est aléatoire, (3) une ligne dans `src/minigames/index.js`. Pour la 3D, partir de `Stage3D` + `makeBean` de `kit3d.jsx`.
- **Salle d'essai** : ouvre l'appli avec `?minilab` à la fin de l'adresse (ex. `.../PartyGames/?minilab`) pour jouer seul à chaque mini-jeu, sans lobby.
- **Honnêteté** : le score est calculé sur le téléphone du joueur ; le créateur le limite au maximum possible de chaque jeu, mais un joueur modifié pourrait tricher à l'intérieur de cette limite. Entre amis, ça suffit. Les jeux 3D n'ont pas encore été essayés sur un vrai téléphone (fluidité, difficulté à régler).
- Réglages dans `src/config.js` (`MG_*`). Code : `src/net/hostEngine.js` (section « Mini-jeux »), `src/screens/MiniGames.jsx`. Tests : `node tools/run-engine-tests.mjs` (`tools/test-party.js`).

### Frise (frise musicale)
Une équipe = une frise. À son tour, un joueur de l'équipe (ils tournent) écoute un extrait de 30 s dont il ne sait ni le titre ni l'année, et touche l'endroit de la frise où l'insérer (avant, entre ou après les cartes déjà posées, rangées de la plus ancienne à la plus récente).
Puis l'année est révélée : bien placé (l'ordre des années reste croissant ; **même année = juste des deux côtés**), la carte rejoint la frise ; sinon elle est défaussée. Chaque équipe démarre avec 1 carte (année visible). La **première équipe qui atteint l'objectif gagne : 10, 15 ou 20 cartes, au choix du créateur**. Si la playlist est épuisée avant, la frise la plus longue gagne. Une frise seule (1 équipe, même 1 joueur) est possible pour s'entraîner.
- **Source : ta playlist Spotify.** Dans le lobby, le créateur colle le lien de la playlist (même mécanisme que le blind test : lien lu dans l'appli Android, 100 premiers morceaux ; « + Ajouter une autre playlist » ou liste « Artiste - Titre » pour en avoir plus). Le **son** est l'extrait de 30 s du morceau retrouvé sur Deezer (Spotify ne donne plus d'extraits aux nouvelles applis), invisible pour les joueurs.
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

- **Apparence** : 26 avatars (icônes), 10 bordures (certaines animées), 16 couleurs. Les autres joueurs voient ton apparence et ton niveau dans le lobby et pendant les parties.
  Tu peux la changer dans le lobby : tout le monde voit le changement tout de suite.
- **Niveaux** : de l'XP à chaque partie terminée (20 de base, +30 victoire, +10 égalité, + un bonus selon les cartes/images/morceaux trouvés). Niveau max : 50.
- **Déblocages** : par niveau (ex. Flamme niv. 2, Couronne niv. 20) ou par **succès** (18 succès : séries de victoires, 20 morceaux trouvés, être le premier 10 fois, etc.).
  Toucher un cadenas indique comment le débloquer.
- **Stats** : parties, victoires / défaites / égalités, % de victoires, série en cours et meilleure série, et par jeu :
  Time's Up (cartes trouvées/passées, précision, tours joués, parties Bonus), Qui est-ce ? (images trouvées, premier à trouver, temps moyen, record),
  Blind test (morceaux trouvés en entier, titre ou artiste seulement, **temps de réponse moyen**, réponse la plus rapide, meilleure série, parties sans faute), Petit bac (réponses valides et uniques), Célébrité (trouvées, moyenne de coups, trous en un), et les 10 dernières parties.

Comment ça marche : le créateur du lobby mesure les statistiques détaillées pendant la partie (`pstats` dans l'état, `gameNo` = numéro de partie) ;
à l'écran de fin, chaque téléphone calcule son propre résultat (`summarize`) et l'ajoute à son profil (`recordGame`), une seule fois par partie.
Code : `src/data/profile.js` (catalogues, niveaux, succès, règles), `src/lib/useProfile.js`, `src/screens/Profile.jsx`, `src/ui/Avatar.jsx`.
Pour ajouter un avatar / une bordure / une couleur / un succès : une ligne dans `profile.js` (+ le style CSS `.pav.b-<id>` pour une bordure). `node tools/test-profile.js` vérifie la logique.

**Sécurité** : l'apparence reçue du réseau est filtrée (seuls des identifiants du catalogue passent). Le statut « débloqué » est local : quelqu'un qui bidouille son
stockage peut s'équiper d'éléments verrouillés chez lui, ce qui est sans conséquence (purement cosmétique).
