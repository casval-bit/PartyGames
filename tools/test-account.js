// Tests : fusion des profils téléphone / compte. Lancer : node tools/test-account.js
import * as P from "../src/data/profile.js";
import { mergeProfiles, isBlank, sameProfile } from "../src/data/accountMerge.js";

let fail = 0;
let clock = 1_700_000_000_000;
Date.now = () => (clock += 60_000); // chaque partie a sa propre heure, comme en vrai
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

const game = (p, key, win = true) => P.recordGame(p, {
  key, game: "blindtest", result: win ? "win" : "loss", rank: 1, of: 3, pts: 7, bt: { songs: 10, full: 8, half: 1, msSum: 30000, msN: 8, fastest: 2500, bestStreak: 4 },
}).profile;

const empty = P.emptyProfile();
ok(isBlank(empty) && isBlank(null), "profil vide reconnu");

// téléphone neuf + compte avancé -> on récupère le compte tel quel
let cloud = P.emptyProfile();
for (let i = 0; i < 6; i++) cloud = game(cloud, "r:" + i);
cloud.look.c = "coral";
let m = mergeProfiles(empty, cloud);
ok(m.xp === cloud.xp && m.stats.played === 6, "téléphone neuf : on récupère la progression du compte");
ok(m.look.c === "coral", "téléphone neuf : on récupère l'apparence du compte");
ok(sameProfile(mergeProfiles(cloud, empty), m), "fusion indépendante de l'ordre");

// compte vide + téléphone avancé (premier compte créé après avoir joué) -> on garde la progression locale
let local = P.emptyProfile();
for (let i = 0; i < 3; i++) local = game(local, "l:" + i);
local.look.a = "star";
m = mergeProfiles(local, empty);
ok(m.stats.played === 3 && m.xp === local.xp, "premier compte : la progression du téléphone est conservée");
ok(m.look.a === "star", "premier compte : l'apparence du téléphone est conservée");

// la même progression des deux côtés (copie) : jamais comptée deux fois
m = mergeProfiles(cloud, JSON.parse(JSON.stringify(cloud)));
ok(m.stats.played === 6 && m.xp === cloud.xp, "copie identique : aucune partie comptée deux fois");
ok(m.history.length === cloud.history.length, "copie identique : historique non dupliqué");

// deux progressions différentes : la plus avancée gagne, les succès des deux sont gardés
let a = P.emptyProfile(); for (let i = 0; i < 2; i++) a = game(a, "a:" + i);
let b = P.emptyProfile(); for (let i = 0; i < 5; i++) b = game(b, "b:" + i);
a.ach.fakeless = 1; delete a.ach.fakeless;
const onlyA = Object.keys(a.ach).filter((k) => !b.ach[k]);
a.ach.btFast = a.ach.btFast || 123;
b = JSON.parse(JSON.stringify(b)); delete b.ach.btFast;
m = mergeProfiles(a, b);
ok(m.stats.played === 5, "deux progressions : la plus avancée sert de base");
ok(Boolean(m.ach.btFast), "deux progressions : un succès présent d'un seul côté est gardé");
ok(m.seen.includes("a:0") && m.seen.includes("b:0"), "deux progressions : les parties déjà comptées des deux côtés sont connues (pas de recomptage)");
ok(m.history.length === 7 && m.history.every((h, i, arr) => i === 0 || arr[i - 1].t >= h.t), "deux progressions : historique fusionné et trié");

// apparence verrouillée dans la fusion : retombe sur une valeur débloquée
let hacked = P.emptyProfile(); hacked.look.a = "crown"; // niveau 20 requis
m = mergeProfiles(hacked, empty);
ok(m.look.a === "smile", "apparence verrouillée refusée après fusion");

// données cloud invalides
m = mergeProfiles(local, { xp: "999999", stats: 5, look: { a: "<x>" }, ach: { bidon: 1 }, history: "oups" });
ok(m.stats.played === 3 && !m.ach.bidon && m.history.length === 3, "données cloud invalides : ignorées sans casser");
ok(mergeProfiles(null, undefined).xp === 0, "deux profils absents : profil vide");

console.log(fail ? `\n${fail} ÉCHEC(S)` : "\nRÉSULTAT: TOUT BON");
process.exit(fail ? 1 : 0);
