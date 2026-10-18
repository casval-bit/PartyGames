// npm run fetch-images : cherche une image pour chaque carte via l'API de Wikipédia (image principale de la page)
// et l'écrit dans src/data/images.json  ->  { "<id carte>": { "url": "...", "page": "Titre", "lang": "fr" } }
//
// Options :  --force       refait aussi les cartes déjà trouvées
//            --limit=50    s'arrête après 50 cartes (pour tester)
// Les fichiers images sont aussi TÉLÉCHARGÉS dans public/cards/ (360 px de large) : l'appli les embarque, donc aucune requête
// vers Wikipédia pendant la partie, ça marche hors ligne et dans l'APK. Option --no-download pour ne garder que les adresses.
// Priorité à une adresse écrite à la main dans la colonne "image" de cards.csv (elle n'est jamais écrasée).
// Il faut un accès internet (ex. ton PC, ou l'action GitHub "Chercher les images des cartes").
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { parseCards } from "../src/data/parseCards.js";
import { CATEGORIES } from "../src/data/categories.js";
import { COUNTRIES } from "../src/data/countries.js";
import { lookup as wikiLookup } from "../src/data/wikiImages.js";

const FORCE = process.argv.includes("--force");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;
const OUT = new URL("../src/data/images.json", import.meta.url);
const DOWNLOAD = !process.argv.includes("--no-download");
const SIZE = Number((process.argv.find((a) => a.startsWith("--size=")) || "").split("=")[1]) || 360;
const DIR = new URL("../public/cards/", import.meta.url);
const UA = "TimesUpPartyGame/1.0 (projet perso ; fetch-images)";
const FR_FIRST = new Set(["France", "Belgique", "Suisse", "Luxembourg", "Canada", "Haïti", "Sénégal", "Côte d'Ivoire", "Maroc", "Algérie", "Tunisie"]);

const csv = readFileSync(new URL("../src/data/cards.csv", import.meta.url), "utf8");
const { cards } = parseCards(csv, new Set(CATEGORIES.map((c) => c.id)), COUNTRIES);
const images = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8") || "{}") : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const slug = (id) => id.normalize("NFD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "carte";

/** Télécharge chaque image distante dans public/cards/ et remplace l'adresse par le chemin local ("cards/xxx.jpg"). */
async function downloadAll() {
  mkdirSync(DIR, { recursive: true });
  const todo = Object.entries(images).filter(([, v]) => v && /^https?:/.test(v.url));
  console.log(`\nTéléchargement de ${todo.length} images dans public/cards/ …`);
  let ok = 0, ko = 0;
  for (const [id, v] of todo) {
    const ext = (/\.(jpe?g|png|webp|gif)(?:$|\?)/i.exec(v.url) || [, "jpg"])[1].toLowerCase().replace("jpeg", "jpg");
    const name = `${slug(id)}.${ext}`;
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      try {
        const r = await fetch(v.url, { headers: { "User-Agent": UA } });
        if (r.status === 429 || r.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
        if (!r.ok) break;
        writeFileSync(new URL(name, DIR), Buffer.from(await r.arrayBuffer()));
        images[id] = { ...v, src: v.url, url: `cards/${name}` };
        done = true;
      } catch { await sleep(800); }
    }
    done ? ok++ : ko++;
    process.stdout.write(`\r  ${ok + ko}/${todo.length} (${ko} échecs)   `);
    await sleep(120);
  }
  console.log();
}

async function main() {
  const todo = cards.filter((c) => !c.image && (FORCE || !images[c.id])).slice(0, LIMIT);
  console.log(`${cards.length} cartes, ${todo.length} à traiter (${Object.keys(images).length} déjà dans images.json)`);
  // 1re passe dans la langue la plus probable pour la carte, 2e passe dans l'autre
  for (const pass of [0, 1]) {
    const pending = todo.filter((c) => !images[c.id] || FORCE && pass === 0);
    const langOf = (c) => {
      const frFirst = c.countries.some((x) => FR_FIRST.has(x));
      return (pass === 0) === frFirst ? "fr" : "en";
    };
    for (const lang of ["fr", "en"]) {
      const group = pending.filter((c) => langOf(c) === lang && (pass === 0 || !images[c.id]));
      for (let i = 0; i < group.length; i += 40) {
        const batch = group.slice(i, i + 40);
        try {
          const res = await wikiLookup(lang, batch.map((c) => c.name), fetch, { "User-Agent": UA }, SIZE);
          for (const c of batch) {
            const r = res.get(c.name);
            if (r) images[c.id] = { url: r.url, page: r.page, lang };
          }
        } catch (e) { console.error("  erreur :", e.message); }
        await sleep(300);
        process.stdout.write(`\r  passe ${pass + 1} · ${lang} · ${Math.min(i + 40, group.length)}/${group.length}   `);
      }
    }
    console.log();
  }
  if (DOWNLOAD) await downloadAll();
  writeFileSync(OUT, JSON.stringify(images, null, 1) + "\n");
  const missing = cards.filter((c) => !c.image && !images[c.id]);
  console.log(`\n${Object.keys(images).length} images enregistrées dans src/data/images.json`);
  if (missing.length) console.log(`${missing.length} cartes sans image (colle une adresse dans la colonne "image" de cards.csv) :\n  ${missing.slice(0, 40).map((c) => c.name).join(", ")}${missing.length > 40 ? " …" : ""}`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) main();
