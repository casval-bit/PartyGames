// Tests : catalogue des Doudous (espèces, pièces, chaîne d'apparence). Lancer : node tools/test-avatar3d.js
// (le rendu 3D lui-même se vérifie dans le navigateur : ?avlab&slot=espece, ?avlab&slot=hat, ?avlab&n=12…)
import * as S from "../src/avatar3d/schema.js";
import { SPECIES } from "../src/avatar3d/doudou-data.js";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("ÉCHEC :", m); } else console.log("ok    :", m); };

/* --- catalogue */
ok(S.SLOTS.every((s) => s.opts.length >= 1 && s.opts.length <= 36), "chaque emplacement a 1 à 36 options (un seul caractère base 36)");
ok(S.SLOTS.every((s) => new Set(s.opts.map((o) => o.id)).size === s.opts.length), "identifiants uniques dans chaque emplacement");
ok(S.SLOTS.every((s) => s.def >= 0 && s.def < s.opts.length), "valeurs par défaut valides");
ok(new Set(S.SLOTS.map((s) => s.id)).size === S.SLOTS.length, "identifiants d'emplacements uniques");
ok(S.SLOTS.filter((s) => s.color).every((s) => s.opts.every((o) => /^#[0-9a-f]{6}$/i.test(o.hex))), "toutes les couleurs sont des #rrggbb");
ok(S.ZONES.every((z) => S.ZONE_TABS[z.id] && S.ZONE_TABS[z.id].length > 0), "chaque zone du studio a au moins un onglet");
ok(Object.values(S.ZONE_TABS).flat().every((t) => S.SLOT_BY[t.id] && (t.colors || []).every((c) => S.SLOT_BY[c] && S.SLOT_BY[c].color) && (t.extra || []).every((e) => S.SLOT_BY[e])), "les onglets ne citent que des emplacements existants (couleurs = emplacements de couleur)");
ok(S.SLOTS.every((s) => Object.values(S.ZONE_TABS).flat().some((t) => t.id === s.id || (t.colors || []).includes(s.id) || (t.extra || []).includes(s.id))), "chaque emplacement est réglable dans le studio");

/* --- espèces : silhouette complète et visage */
const NUM = ["H", "Rx", "Rz", "cy", "nb", "nt", "pear"];
ok(SPECIES.length >= 12, SPECIES.length + " espèces");
for (const sp of SPECIES) ok(NUM.every((k) => Number.isFinite(sp[k])) && sp.face && sp.face.y > 0.4 && sp.face.y < 0.9 && sp.face.er > 0.08, sp.id + " : silhouette et visage complets");
ok(SPECIES.filter((s) => !s.rule).length >= 8, "au moins 8 espèces gratuites");

/* --- chaîne d'apparence */
ok(S.DEFAULT_X[0] === "C" && S.DEFAULT_X.length === S.SLOTS.length + 1, "chaîne « C » + un caractère par emplacement");
ok(S.cleanX(S.DEFAULT_X) === S.DEFAULT_X, "la chaîne par défaut est stable");
let rt = true, valid = true;
for (let i = 0; i < 400; i++) {
  const x = S.randomX(Math.random, () => true);
  rt = rt && S.encodeX(S.decodeX(x)) === x;
  valid = valid && S.decodeX(x).every((v, k) => v >= 0 && v < S.SLOTS[k].opts.length);
}
ok(rt, "aller-retour encode/decode sur 400 Doudous au hasard");
ok(valid, "valeurs toujours dans les listes");
let free = true;
for (let i = 0; i < 300; i++) { const p = S.partsOf(S.randomX()); free = free && Object.values(p).every((o) => !o.rule); }
ok(free, "randomX par défaut ne donne que des pièces gratuites");
ok(S.cleanX("Hzzzz") === S.cleanX("Hzzzz") && S.cleanX("Hzzzz")[0] === "C", "ancien personnage (humain « H… ») → un Doudou, toujours le même");
ok(S.cleanX("n'importe quoi") !== S.cleanX("autre chose"), "deux anciennes chaînes différentes → deux Doudous différents");
ok(S.cleanX(null) === S.DEFAULT_X && S.cleanX(42) === S.DEFAULT_X, "valeur absente → Doudou par défaut");
ok(S.cleanX("C" + "z".repeat(S.SLOTS.length)) !== "", "chaîne hors limites : ramenée aux valeurs par défaut");
const x2 = S.setSlot(S.DEFAULT_X, "hat", 3);
ok(S.getSlot(x2, "hat") === 3 && S.partsOf(x2).hat.id === S.SLOT_BY.hat.opts[3].id, "setSlot / getSlot / partsOf");
ok(S.legacyX("#ff0000") === S.legacyX("#ff0000") && S.legacyX("#ff0000")[0] === "C", "legacyX : stable, renvoie un Doudou");

/* --- pièces à débloquer */
ok(S.PART_ITEMS.length > 20 && S.PART_ITEMS.every((p) => p.rule && (p.rule.lv || p.rule.ach)), S.PART_ITEMS.length + " pièces à débloquer (niveau ou succès)");
ok(new Set(S.PART_ITEMS.map((p) => p.id)).size === S.PART_ITEMS.length, "identifiants des pièces uniques");

console.log(fail ? `${fail} ÉCHEC(S)` : "Doudous : tout est OK");
process.exit(fail ? 1 : 0);
