// npm run check-cards : vérifie cards.csv et affiche des statistiques
// Options : --missing  liste les cartes sans pays / sans période
import { readFileSync } from "node:fs";
import { parseCards } from "../src/data/parseCards.js";
import { CATEGORIES } from "../src/data/categories.js";
import { COUNTRIES } from "../src/data/countries.js";

const csv = readFileSync(new URL("../src/data/cards.csv", import.meta.url), "utf8");
const ids = new Set(CATEGORIES.map((c) => c.id));
const { cards, warnings } = parseCards(csv, ids, COUNTRIES);

// catégories où pays / période n'ont pas forcément de sens (pas de "manquant")
const TIMELESS = new Set(["plante", "animal"]);

const count = Object.fromEntries([...ids].map((k) => [k, 0]));
for (const c of cards) for (const k of c.cats) count[k]++;
console.log(`${cards.length} cartes uniques, ${ids.size} catégories\n`);
console.log("Cartes par catégorie :");
for (const [k, v] of Object.entries(count).sort((a, b) => a[1] - b[1])) console.log(" ", String(v).padStart(4), k, v < 12 ? "  <- trop peu (minimum conseillé : 12)" : "");

const tally = (fn) => { const m = {}; for (const c of cards) for (const x of fn(c)) m[x] = (m[x] || 0) + 1; return m; };
const per = tally((c) => c.periods);
const isDecade = (k) => k.endsWith("s");
const centuryValue = (k) => { const bc = k.endsWith("av"); const n = k.replace("av", ""); const v = ["I","V","X","L","C"].reduce((a) => a, 0); return (bc ? -1 : 1) * (n.length * 0 + romanToInt(n)); };
function romanToInt(s) { const m = { I: 1, V: 5, X: 10, L: 50, C: 100 }; let n = 0; for (let i = 0; i < s.length; i++) n += m[s[i + 1]] > m[s[i]] ? -m[s[i]] : m[s[i]]; return n; }
console.log("\nPar siècle   :", Object.entries(per).filter(([k]) => !isDecade(k)).sort((a, b) => centuryValue(a[0]) - centuryValue(b[0])).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log("Par décennie :", Object.entries(per).filter(([k]) => isDecade(k)).sort().map(([k, v]) => `${k} ${v}`).join(" · "));
console.log("Par pays     :", Object.entries(tally((c) => c.countries)).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k} ${v}`).join(" · "), "…");

const noCountry = cards.filter((c) => !c.countries.length && !c.cats.every((k) => TIMELESS.has(k)));
const noPeriod = cards.filter((c) => !c.periods.length && !c.cats.every((k) => TIMELESS.has(k)));
const tiered = cards.filter((c) => c.tier).length;
console.log(`\nSans pays : ${noCountry.length} · sans période : ${noPeriod.length} · difficulté renseignée : ${tiered}`);
if (process.argv.includes("--missing")) {
  noCountry.forEach((c) => console.log("  sans pays    :", c.name));
  noPeriod.forEach((c) => console.log("  sans période :", c.name));
}
console.log(`${cards.filter((c) => c.cats.length > 1).length} cartes dans plusieurs catégories (jamais piochées deux fois dans une partie)`);
if (warnings.length) {
  console.log("\nAvertissements :");
  warnings.forEach((w) => console.log(" -", w));
  process.exitCode = 1;
}
