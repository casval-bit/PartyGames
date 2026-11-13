// Registre de toutes les cartes du Trône des Mondes : familles, cartes, scénarios, sous-groupes (types Pokémon, régions de League of Legends).
import { buildCards } from "./build.js";
import { compileAbility } from "../abilities.js";
import * as lyoko from "./lyoko.js";
import * as umbrella from "./umbrella.js";
import * as toystory from "./toystory.js";
import * as onepiece from "./onepiece.js";
import * as pokemon from "./pokemon.js";
import * as starac from "./starac.js";
import * as citesdor from "./citesdor.js";
import * as legendaires from "./legendaires.js";
import * as capes from "./capes.js";
import * as hunger from "./hunger.js";
import * as bebop from "./bebop.js";
import * as horde from "./horde.js";
import * as elite from "./elite.js";
import * as teenwolf from "./teenwolf.js";
import * as marvel from "./marvel.js";
import * as dc from "./dc.js";
import * as stranger from "./stranger.js";
import * as scooby from "./scooby.js";
import * as lol from "./lol.js";
import * as hp from "./hp.js";
import * as sw from "./sw.js";
import * as got from "./got.js";
import * as lotr from "./lotr.js";
import * as narnia from "./narnia.js";
import * as ghibli from "./ghibli.js";
import * as gundam from "./gundam.js";
import * as neutral from "./neutral.js";
import * as plots from "./plots.js";

const MODS = [lyoko, umbrella, toystory, onepiece, pokemon, starac, citesdor, legendaires, capes, hunger, bebop, horde, elite, teenwolf, marvel, dc, stranger, scooby, lol, hp, sw, got, lotr, narnia, ghibli, gundam];

export const FAMILIES = [];
export const FAMILY = {};
export const CARD = {};
export const ALL = [];      // toutes les cartes à collectionner (sans les scénarios)
export const PLOTS = [];    // scénarios (communs à tous)
export const STARTER_SPECS = [];
export const TYPE_BONUS = {}; // sous-groupes (type Pokémon, région de Runeterra…) : bonus de la famille selon le choix du deck
export const POKE_TYPES = []; // (ceux de la famille Pokémon)

const used = new Set();
function addFamily(m) {
  const famDef = { name: m.meta.name, type: "fam" };
  const abs = String(m.meta.passive || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => compileAbility(s, famDef));
  const f = { ...m.meta, abs };
  FAMILIES.push(f);
  FAMILY[f.id] = f;
  for (const d of buildCards(f.id, m.cards, used)) { CARD[d.id] = d; ALL.push(d); }
  for (const s of m.starters || []) STARTER_SPECS.push({ ...s, fam: f.id });
  if (m.types) {
    f.types = [];
    for (const t of m.types) {
      if (TYPE_BONUS[t.id]) throw new Error(`Sous-groupe en double : ${t.id}`);
      const tb = { ...t, fam: f.id, abs: String(t.bonus || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => compileAbility(s, { name: t.name, type: "fam" })) };
      TYPE_BONUS[t.id] = tb;
      f.types.push(tb);
      if (f.id === "pokemon") POKE_TYPES.push(tb);
    }
  }
}
for (const m of MODS) addFamily(m);
addFamily(neutral);
for (const d of buildCards("plot", plots.cards, used)) { CARD[d.id] = d; PLOTS.push(d); }

/** Familles jouables (sans « Neutre »). */
export const PLAYABLE = FAMILIES.filter((f) => f.id !== "neutre");

/* ------------------------- cartes renommées, remplacées ou retirées -------------------------
   Les sauvegardes (collection, brillantes, decks, photo de profil) suivent : voir normalizeTcg dans progress.js. */
/** Même carte, nouvel identifiant (les illustrations importées suivent aussi). */
export const RENAMED = {};
/** Carte remplacée par une autre à la même place : les exemplaires possédés deviennent la nouvelle carte. */
export const REPLACED = {
  "lyoko-aelita-stones-4": "lyoko-aelita-hopper-4", // Aelita Stones (même personnage, même coût) : une seule Aelita Hopper 4, L'elfe de Lyoko
  "lyoko-spectre-de-xana-2": "lyoko-ninjas-de-tyron-2",
  "lyoko-spectre-polymorphe-evt": "lyoko-champ-de-force-evt",
};
/** Cartes retirées du jeu (rareté, carte 7 toujours brillante) : chaque exemplaire possédé est remboursé en Éclats. */
export const RETIRED = {
  "lyoko-franz-hopper-7": { r: "L", seven: true },
  "lyoko-le-clone-de-william-3": { r: "U", seven: false },
  "lyoko-anthea-hopper-3": { r: "U", seven: false },
};
/** Identifiant actuel d'une carte d'une ancienne sauvegarde (null si elle n'existe plus). */
export const currentId = (id) => { const k = RENAMED[id] || REPLACED[id] || id; return CARD[k] ? k : null; };
for (const [a, b] of Object.entries({ ...RENAMED, ...REPLACED })) if (CARD[a] || !CARD[b]) throw new Error(`Carte renommée ou remplacée invalide : ${a} -> ${b}`);
for (const id of Object.keys(RETIRED)) if (CARD[id]) throw new Error(`Carte retirée encore présente : ${id}`);

/** Sous-groupe choisi par un deck de cette famille (type Pokémon, région…), ou null. */
export const subOf = (fam, pt) => (pt && TYPE_BONUS[pt] && TYPE_BONUS[pt].fam === fam ? TYPE_BONUS[pt] : null);
/** Vrai si un deck de cette famille doit choisir un sous-groupe. */
export const hasSubs = (fam) => Boolean(FAMILY[fam] && FAMILY[fam].types && FAMILY[fam].types.length);
const SUB_DEFAULT = { one: "type", One: "Type", ask: "Quel type ?", help: "", pick: "Choisis un type pour ce deck.", not: "n'est pas de type" };
/** Les mots du sous-groupe d'une famille (« type », « région »…). */
export const subWords = (fam) => ({ ...SUB_DEFAULT, ...((FAMILY[fam] && FAMILY[fam].sub) || {}) });
