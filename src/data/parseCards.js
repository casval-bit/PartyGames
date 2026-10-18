// Parseur pur (sans dépendance Vite) : utilisé par l'appli ET par tools/check-cards.js
//
// cards.csv : 4 colonnes séparées par ";"  ->  nom ; categories ; pays ; periode
// (colonnes facultatives : difficulte, wikidata, image. L'ordre suit la 1re ligne du fichier.)
// Plusieurs valeurs dans une colonne : séparées par |
//
// periode (plusieurs valeurs possibles) :
//   1503 = une année · 1964-2024 = plage · 1964-auj = jusqu'à aujourd'hui · 356av-323av = avant J.-C.
//   XIX = un siècle (IVav = IVe siècle av. J.-C.) · 1990s = une décennie (1990s-2010s = plage de décennies)
// Règle : on retient toujours les SIÈCLES, et en plus les DÉCENNIES à partir de 1970.
// Convention courante : l'année 1900 / 2000 compte dans le siècle suivant (XXe / XXIe).

export const DECADE_FROM = 1970;
const ROMAN = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
const ROMAN1 = Object.fromEntries(ROMAN.filter(([r]) => r.length === 1));

export function toRoman(n) {
  let out = "";
  for (const [r, v] of ROMAN) while (n >= v) { out += r; n -= v; }
  return out;
}
export function fromRoman(s) {
  if (!/^[IVXLCDM]+$/.test(s)) return null;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN1[s[i]], nx = ROMAN1[s[i + 1]];
    n += nx && nx > v ? -v : v;
  }
  return toRoman(n) === s ? n : null;
}

// siècle signé : > 0 après J.-C., < 0 avant (-4 = IVe av.)
const centuryLabel = (c) => (c < 0 ? `${toRoman(-c)}av` : toRoman(c));
const centuryOfYear = (y) => (y < 0 ? -Math.ceil(-y / 100) : Math.floor(y / 100) + 1);
const CURRENT_YEAR = new Date().getFullYear();

export function normalize(name) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseYear(s) {
  if (s === "auj") return CURRENT_YEAR;
  const m = /^(\d{1,4})(av)?$/.exec(s || "");
  return m ? (m[2] ? -Number(m[1]) : Number(m[1])) : null;
}

/** "1964-2024|XIX|1990s" -> { tokens: ["XIX","XX","XXI","1970s",...], errors: [] } */
export function parsePeriods(str) {
  const cs = new Set(), ds = new Set(), errors = [];
  const addCenturies = (a, b) => { for (let c = a; c <= b; c++) if (c !== 0) cs.add(c); };
  const addDecades = (y1, y2) => { for (let d = Math.max(DECADE_FROM, Math.floor(y1 / 10) * 10); d <= y2; d += 10) ds.add(d); };

  for (const raw of (str || "").split("|").map((s) => s.trim()).filter(Boolean)) {
    let m;
    if ((m = /^([IVXLCDM]+)(av)?$/.exec(raw))) {                       // XIX, IVav
      const n = fromRoman(m[1]);
      if (n === null) { errors.push(`siècle illisible "${raw}"`); continue; }
      cs.add(m[2] ? -n : n);
    } else if ((m = /^(\d{3})0s(?:-(\d{3})0s)?$/.exec(raw))) {          // 1990s, 1990s-2010s
      const a = Number(m[1]) * 10, b = m[2] ? Number(m[2]) * 10 : a;
      if (a > b) { errors.push(`plage inversée "${raw}"`); continue; }
      addCenturies(centuryOfYear(a), centuryOfYear(b + 9));
      if (b >= DECADE_FROM) addDecades(a, b);
    } else if ((m = /^(\d{1,4}(?:av)?|auj)(?:-(\d{1,4}(?:av)?|auj))?$/.exec(raw))) { // 1503, 1964-2024, 1964-auj, 356av-323av
      const y1 = parseYear(m[1]), y2 = m[2] ? parseYear(m[2]) : y1;
      if (y1 === null || y2 === null) { errors.push(`année illisible "${raw}"`); continue; }
      if (y1 > y2) { errors.push(`plage inversée "${raw}"`); continue; }
      addCenturies(centuryOfYear(y1), centuryOfYear(y2));
      if (y2 >= DECADE_FROM) addDecades(y1, y2);
    } else errors.push(`période illisible "${raw}"`);
  }
  const tokens = [...[...cs].sort((a, b) => a - b).map(centuryLabel), ...[...ds].sort((a, b) => a - b).map((d) => `${d}s`)];
  return { tokens, errors };
}

const HEAD = {
  nom: "name", name: "name",
  categories: "cats", "catégories": "cats", categorie: "cats", "catégorie": "cats",
  pays: "countries", nationalite: "countries", "nationalité": "countries",
  periode: "periods", "période": "periods",
  difficulte: "tier", "difficulté": "tier", tier: "tier",
  wikidata: "qid",
  image: "image", img: "image", "image (url)": "image",
};
const DEFAULT_COLS = ["name", "cats", "countries", "periods", "tier", "qid", "image"];
const list = (s) => (s || "").split("|").map((x) => x.trim()).filter(Boolean);

/**
 * @param {string} csv
 * @param {Set<string>} validCategoryIds
 * @param {Set<string>=} validCountries  noms de pays autorisés (si omis : pas de contrôle)
 * @returns {{cards: {id,name,cats:string[],countries:string[],periods:string[],tier:string,qid:string}[], warnings: string[]}}
 */
export function parseCards(csv, validCategoryIds, validCountries) {
  const warnings = [];
  const byId = new Map();
  let cols = DEFAULT_COLS;
  let headerSeen = false;
  csv.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/^﻿/, "").trim();
    if (!line || line.startsWith("#")) return;
    const cells = line.split(";").map((c) => c.trim());
    if (!headerSeen) {
      headerSeen = true;
      const mapped = cells.map((c) => HEAD[c.toLowerCase()]);
      if (mapped[0] === "name") { cols = mapped.map((m, k) => m || `x${k}`); return; }
    }
    const row = { name: "", cats: "", countries: "", periods: "", tier: "", qid: "", image: "", ...Object.fromEntries(cols.map((c, k) => [c, cells[k] || ""])) };
    const name = row.name;
    if (!name) return;
    const where = `Ligne ${i + 1} (${name})`;

    const cats = [];
    for (const c of list(row.cats)) validCategoryIds.has(c) ? cats.push(c) : warnings.push(`${where} : catégorie inconnue "${c}"`);
    if (!list(row.cats).length) warnings.push(`${where} : aucune catégorie`);

    const countries = [];
    for (const c of list(row.countries)) {
      if (!validCountries || validCountries.has(c)) countries.push(c);
      else warnings.push(`${where} : pays inconnu "${c}" (ajoute-le dans src/data/countries.js)`);
    }

    const per = parsePeriods(row.periods);
    per.errors.forEach((e) => warnings.push(`${where} : ${e}`));

    let tier = row.tier.toUpperCase();
    if (tier && !"SABCDF".includes(tier)) { warnings.push(`${where} : difficulté "${row.tier}" (attendu S, A, B, C, D ou F)`); tier = ""; }

    const image = /^https?:\/\//.test(row.image) ? row.image : "";
    if (row.image && !image) warnings.push(`${where} : image "${row.image}" (attendu : une adresse http…)`);
    const id = normalize(name);
    if (!id) return;
    const prev = byId.get(id);
    if (prev) {
      for (const c of cats) if (!prev.cats.includes(c)) prev.cats.push(c);
      for (const c of countries) if (!prev.countries.includes(c)) prev.countries.push(c);
      prev.periods = [...new Set([...prev.periods, ...per.tokens])];
      prev.tier = prev.tier || tier;
      prev.qid = prev.qid || row.qid;
      prev.image = prev.image || image;
    } else byId.set(id, { id, name, cats: [...cats], countries, periods: per.tokens, tier, qid: row.qid, image });
  });
  const cards = [...byId.values()].filter((c) => c.cats.length);
  return { cards, warnings };
}
