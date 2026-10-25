// Tests : catalogue de l'avatar 3D (UNE seule peau, costumes, pièces, chaîne d'apparence). Lancer : node tools/test-avatar3d.js
// (le rendu 3D lui-même se vérifie dans le navigateur : ?avlab&lineup=1 — la page y compare le squelette de chaque costume)
import * as S from "../src/avatar3d/schema.js";
import { ANIMALS, ANIMAL_IDS } from "../src/avatar3d/animals.js";
import { BEAN, LIMBS, profileOf } from "../src/avatar3d/body.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

/* --- catalogue */
ok(S.SLOTS.every((s) => s.opts.length >= 1 && s.opts.length <= 36), "chaque emplacement a 1 à 36 options (un seul caractère base 36)");
ok(S.SLOTS.every((s) => new Set(s.opts.map((o) => o.id)).size === s.opts.length), "identifiants uniques dans chaque emplacement");
ok(S.SLOTS.every((s) => s.def >= 0 && s.def < s.opts.length), "valeurs par défaut valides");
ok(S.SLOTS.length === 40 && S.SLOTS[0].id === "build" && S.SLOTS[1].id === "size", "40 emplacements, dans le même ordre qu'avant (les anciens profils restent lisibles)");

/* --- UNE SEULE PEAU : plus aucun réglage de taille ni de corpulence, plus aucun personnage à corps différent */
ok(S.SLOT_BY.build.opts.length === 1 && S.SLOT_BY.size.opts.length === 1, "corpulence et taille : une seule option, donc rien à régler");
ok(S.SLOT_BY.build.tab === "hidden" && S.SLOT_BY.size.tab === "hidden" && !S.TABS.some((t) => t.id === "hidden"), "corpulence et taille ne sont affichées nulle part");
ok(!S.SLOT_BY.char && !S.SLOTS.some((s) => /char|species|body/.test(s.id)), "pas d'emplacement « personnage » : il n'y a qu'une seule peau");
const old = S.cleanX("5" + "4" + S.DEFAULT_X.slice(2));
ok(old === S.DEFAULT_X, "un ancien profil « mince » ou « géant » retrouve le corps normal");
ok(S.partsOf(S.setSlot(S.DEFAULT_X, "size", 5)).size.id === "m" && S.partsOf(S.setSlot(S.DEFAULT_X, "build", 7)).build.id === "norm", "on ne peut pas régler la taille ni la corpulence, même par la chaîne");

/* --- costumes d'animaux : seulement de l'apparence */
const ALLOWED = new Set(["name", "lv", "m", "a", "limb", "legs", "face", "faceC", "impliedNose", "noseK", "paint", "paintTop", "decor", "tail"]);
const HEX = /^#[0-9a-f]{6}$/i;
ok(ANIMAL_IDS.length === 13, "13 costumes d'animaux");
for (const id of ANIMAL_IDS) {
  const an = ANIMALS[id], bad = Object.keys(an).filter((k) => !ALLOWED.has(k));
  ok(bad.length === 0, id + " : aucun réglage de corps (clés interdites : " + (bad.join(",") || "aucune") + ")");
  ok(an.name && HEX.test(an.m) && HEX.test(an.a) && (["m", "a"].includes(an.limb) || HEX.test(an.limb)), id + " : nom et couleurs");
  ok(!an.legs || HEX.test(an.legs), id + " : couleur des jambes valide");
  const so = S.SLOT_BY.suit.opts.find((o) => o.id === id);
  ok(so && so.name === an.name, id + " : présent dans la liste des costumes");
}
ok(S.SLOT_BY.suit.opts.slice(0, 11).map((o) => o.id).join() === "none,hotdog,banana,taco,bee,astro,ninja,pirate,knight,hero,chef", "les anciens costumes gardent leur place (nouveautés ajoutées à la fin)");
ok(ANIMAL_IDS.filter((id) => !ANIMALS[id].lv).length >= 5, "au moins 5 costumes d'animaux gratuits au départ");

/* --- le corps : mesures uniques */
const p = profileOf(BEAN);
ok(p.L > 0 && Number.isFinite(p.rAt(p.yc - 0.2)) && p.below > 0, "profil du haricot valide");
ok(Object.isFrozen(BEAN) && Object.isFrozen(LIMBS) && Object.isFrozen(LIMBS.rest), "les mesures du corps sont figées (impossible de les modifier par erreur)");

/* --- chaîne d'apparence */
ok(S.DEFAULT_X.length === S.SLOTS.length && S.cleanX(S.DEFAULT_X) === S.DEFAULT_X, "apparence par défaut : une lettre par emplacement");
ok(S.cleanX("zzzz!!").length === S.SLOTS.length && S.cleanX(null) === S.DEFAULT_X, "chaîne piégée ou absente : remplacée par les valeurs par défaut");
ok(S.partsOf(S.DEFAULT_X).suit.id === "none", "départ : le haricot, sans costume");
for (let i = 0; i < S.SLOT_BY.suit.opts.length; i++) { const x = S.setSlot(S.DEFAULT_X, "suit", i); if (S.partsOf(x).suit.id !== S.SLOT_BY.suit.opts[i].id || x.length !== S.SLOTS.length) ok(false, "costume " + i + " : lecture de la chaîne"); }
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const seen = new Set(); let allValid = true;
for (let i = 0; i < 400; i++) { const x = S.randomX(rnd, (r) => !r); if (x !== S.cleanX(x) || S.partsOf(x).suit.rule) allValid = false; seen.add(S.partsOf(x).suit.id); }
ok(allValid, "aléatoire : apparences valides, costumes gratuits seulement");
ok(seen.size >= 5, "l'aléatoire tire des costumes variés (" + seen.size + ")");
ok(/^[0-9a-z]{40}$/.test(S.randomX(Math.random, () => true)), "aléatoire total : 40 caractères base 36");

console.log(fail ? "\n" + fail + " ÉCHEC(S)" : "\nTout est bon.");
process.exit(fail ? 1 : 0);
